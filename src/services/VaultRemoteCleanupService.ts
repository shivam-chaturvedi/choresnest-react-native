import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';
import { VaultStorageService } from './VaultStorageService';
import { getDatabase } from '../database';
import Document from '../database/models/Document';

const STORAGE_KEY = '@familychore:vault-remote-delete-queue';

export type PendingRemoteDeletion = {
  documentId: string;
  profileId: string;
  remotePath?: string | null;
};

class VaultRemoteCleanupService {
  private queue: PendingRemoteDeletion[] = [];
  private readyPromise: Promise<void>;
  private flushing = false;

  constructor() {
    this.readyPromise = this.loadQueue();
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void this.flushQueue();
      }
    });
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored) as PendingRemoteDeletion[];
      }
    } catch (error) {
      console.warn('VaultRemoteCleanupService: failed to load queue', error);
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('VaultRemoteCleanupService: failed to persist queue', error);
    }
  }

  private async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return Boolean(state.isConnected && state.isInternetReachable !== false);
    } catch (error) {
      console.warn('VaultRemoteCleanupService: failed to read network state', error);
      return false;
    }
  }

  async scheduleDeletion(entry: PendingRemoteDeletion, attemptNow: boolean): Promise<{ queued: boolean }> {
    await this.readyPromise;
    this.queue = this.queue.filter(item => item.documentId !== entry.documentId);
    this.queue.push(entry);
    await this.persistQueue();
    if (attemptNow) {
      await this.flushQueue();
    }
    return { queued: this.queue.some(item => item.documentId === entry.documentId) };
  }

  private async flushQueue(): Promise<void> {
    await this.readyPromise;
    if (this.flushing) {
      return;
    }
    if (!(await this.isOnline())) {
      return;
    }
    if (this.queue.length === 0) {
      return;
    }
    this.flushing = true;
    try {
      for (const entry of [...this.queue]) {
        try {
          if (entry.remotePath) {
            await VaultStorageService.deleteObject(entry.remotePath);
          }
          const { error } = await supabase.from('documents').delete().eq('id', entry.documentId);
          if (error) {
            throw error;
          }
          this.queue = this.queue.filter(item => item.documentId !== entry.documentId);
          await this.persistQueue();
          await this.clearLocalPendingFlag(entry.documentId);
        } catch (error) {
          console.warn('VaultRemoteCleanupService: failed to delete remote document', error?.message ?? error);
          break;
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  private async clearLocalPendingFlag(documentId: string): Promise<void> {
    try {
      await getDatabase().write(async () => {
        const doc = await getDatabase().get<Document>('documents').find(documentId).catch(() => null);
        if (!doc) {
          return;
        }
        await doc.update(d => {
          d.remoteDeletePending = false;
        });
      });
    } catch (error) {
      console.warn('VaultRemoteCleanupService: failed to clear local delete flag', error);
    }
  }
}

export const vaultRemoteCleanupService = new VaultRemoteCleanupService();
