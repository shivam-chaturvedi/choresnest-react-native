import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';
import { getDatabase } from '../database';
import Document from '../database/models/Document';

const STORAGE_KEY = '@familychore:document-metadata-sync';

type MetadataQueue = Record<string, number>;

class DocumentMetadataSyncService {
  private pendingMetadata: MetadataQueue = {};
  private loadingPromise: Promise<void> | null = null;
  private flushing = false;

  constructor() {
    // Load persisted queue on startup
    void this.ensureReady();
    // Kick off a sync when network becomes reachable
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void this.flushPendingMetadataUpdates();
      }
    });
  }

  private async ensureReady(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    this.loadingPromise = (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.pendingMetadata = JSON.parse(stored) as MetadataQueue;
        }
      } catch (error) {
        console.warn('DocumentMetadataSyncService: failed to load queue', error);
      }
    })();
    return this.loadingPromise;
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.pendingMetadata));
    } catch (error) {
      console.warn('DocumentMetadataSyncService: failed to persist queue', error);
    }
  }

  private async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return Boolean(state.isConnected && state.isInternetReachable !== false);
    } catch (error) {
      console.warn('DocumentMetadataSyncService: failed to read network state', error);
      return false;
    }
  }

  async markDocumentDirty(documentId: string, metadataVersion: number): Promise<void> {
    if (!documentId) {
      return;
    }
    await this.ensureReady();
    const existing = this.pendingMetadata[documentId];
    if (typeof existing === 'number' && existing >= metadataVersion) {
      return;
    }
    this.pendingMetadata[documentId] = metadataVersion;
    await this.persistQueue();
    void this.flushPendingMetadataUpdates();
  }

  private async buildPayload(doc: Document): Promise<Record<string, any>> {
    const raw = { ...(doc._raw as Record<string, any>) };
    raw.metadata_version = doc.metadataVersion ?? raw.metadata_version ?? 0;
    raw.profile_id = doc.profileId;
    raw.updated_at = raw.updated_at ?? raw.updatedAt ?? new Date().toISOString();
    return raw;
  }

  async flushPendingMetadataUpdates(): Promise<void> {
    await this.ensureReady();
    if (this.flushing) {
      return;
    }
    if (!(await this.isOnline())) {
      return;
    }
    const entries = Object.entries(this.pendingMetadata);
    if (entries.length === 0) {
      return;
    }
    this.flushing = true;
    try {
      for (const [documentId, queuedVersion] of entries) {
        const doc = await getDatabase()
          .get<Document>('documents')
          .find(documentId)
          .catch(() => null);
        if (!doc || doc.deleted) {
          delete this.pendingMetadata[documentId];
          continue;
        }
        const currentVersion = doc.metadataVersion ?? 0;
        if (currentVersion < queuedVersion) {
          // The local metadata version was rolled back; remove the stale queue entry
          delete this.pendingMetadata[documentId];
          continue;
        }
        if (currentVersion > queuedVersion) {
          this.pendingMetadata[documentId] = currentVersion;
          await this.persistQueue();
        }
        const payload = await this.buildPayload(doc);
        const { error } = await supabase.from('documents').upsert(payload, { onConflict: 'id' });
        if (error) {
          console.warn('DocumentMetadataSyncService: failed to push metadata', error.message ?? error);
          break;
        }
        delete this.pendingMetadata[documentId];
        await this.persistQueue();
      }
    } finally {
      this.flushing = false;
    }
  }
}

export const documentMetadataSyncService = new DocumentMetadataSyncService();
