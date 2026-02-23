import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import Document from '../../database/models/Document';
import { VaultStorageService } from '../VaultStorageService';
import { VaultService } from '../VaultService';
import RNFS from 'react-native-fs';

export const VAULT_CACHE_DIR = `${RNFS.CachesDirectoryPath}/vault_cache`;

/**
 * Compute the stable, deterministic local cache path for a document.
 *
 * The path is derived from: documentId + the UUID-based remote filename.
 * When a document is re-uploaded, remotePath changes (new UUID), so the
 * old localPath no longer exists on disk → automatic cache bust, re-download.
 * No AsyncStorage or version tracking needed.
 */
export const buildLocalCachePath = (documentId: string, remotePath: string): string => {
    const segments = remotePath.split('/');
    const remoteFileName = segments.pop() ?? documentId;
    const safe = remoteFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${VAULT_CACHE_DIR}/${documentId}_${safe}`;
};

/**
 * DocumentDownloadWorker
 *
 * Version-aware, RNFS-persistent background downloader for vault documents.
 *
 * Cache persistence strategy:
 *   - The local file path is DERIVED from (documentId + remotePath).
 *   - RNFS is the persistent store — files survive app restarts.
 *   - No AsyncStorage or WatermelonDB mutations needed.
 *
 * Decision per document:
 *   RNFS file exists at computed path  → serve from disk, skip download
 *   RNFS file missing (new/re-upload)  → download once and cache
 */
export class DocumentDownloadWorker {
    private profileId: string | null = null;
    private downloadLocks = new Set<string>();
    private running = false;

    setProfileId(profileId: string | null) {
        this.profileId = profileId;
    }

    /**
     * Called after every sync pull and on network reconnect.
     * Scans WatermelonDB for uploaded docs missing a local cache file.
     */
    async triggerDownloads() {
        if (!this.profileId || this.running) {
            return;
        }
        this.running = true;
        try {
            await ensureCacheDir();
            await this.restoreMemoryCache();  // populate in-memory cache from RNFS
            await this.processDocuments();    // download only what's missing
        } finally {
            this.running = false;
        }
    }

    /**
     * On startup/restart the in-memory cache is empty.
     * Walk all known docs and check if RNFS file already exists → restore to memory.
     */
    private async restoreMemoryCache() {
        if (!this.profileId) return;

        const records = await database
            .get<Document>('documents')
            .query(
                Q.where('profile_id', this.profileId),
                Q.where('deleted', false),
                Q.where('upload_status', 'uploaded'),
                Q.where('remote_path', Q.notEq(null))
            )
            .fetch();

        for (const record of records) {
            if (!record.remotePath) continue;
            const localPath = buildLocalCachePath(record.id, record.remotePath);
            const exists = await RNFS.exists(localPath).catch(() => false);
            if (exists) {
                VaultService.setCachedLocalUri(record.id, localPath);
            }
        }
    }

    private async processDocuments() {
        if (!this.profileId) return;

        const records = await database
            .get<Document>('documents')
            .query(
                Q.where('profile_id', this.profileId),
                Q.where('deleted', false),
                Q.where('upload_status', 'uploaded'),
                Q.where('remote_path', Q.notEq(null))
            )
            .fetch();

        for (const record of records) {
            if (this.downloadLocks.has(record.id)) continue;

            // Skip if in-memory cache is already populated (restored from disk above)
            if (VaultService.getCachedLocalUri(record.id)) continue;

            // Skip if this device is the uploader and the local file still exists
            if (record.localUri) {
                const localOwnExists = await RNFS.exists(record.localUri).catch(() => false);
                if (localOwnExists) {
                    VaultService.setCachedLocalUri(record.id, record.localUri);
                    continue;
                }
            }

            void this.downloadDocument(record);
        }
    }

    private async downloadDocument(record: Document) {
        if (!record.remotePath) return;
        this.downloadLocks.add(record.id);

        const localPath = buildLocalCachePath(record.id, record.remotePath);

        try {
            // Double-check: file might have been placed by another concurrent call
            const alreadyExists = await RNFS.exists(localPath).catch(() => false);
            if (alreadyExists) {
                VaultService.setCachedLocalUri(record.id, localPath);
                return;
            }

            console.log(`DocumentDownloadWorker: downloading ${record.id}`);
            const signedUrl = await VaultStorageService.getSignedUrl(record.remotePath, 3600);

            const result = await RNFS.downloadFile({
                fromUrl: signedUrl,
                toFile: localPath,
            }).promise;

            if (result.statusCode !== 200) {
                throw new Error(`HTTP ${result.statusCode}`);
            }

            // Register in memory — next open is instant from RNFS
            VaultService.setCachedLocalUri(record.id, localPath);
            console.log(`DocumentDownloadWorker: ✓ saved ${record.id} → ${localPath}`);
        } catch (error) {
            // Clean up partial download
            await RNFS.unlink(localPath).catch(() => { /* ignore */ });
            console.warn(`DocumentDownloadWorker: failed ${record.id}`, error);
        } finally {
            this.downloadLocks.delete(record.id);
        }
    }
}

export const ensureCacheDir = async () => {
    try {
        const exists = await RNFS.exists(VAULT_CACHE_DIR);
        if (!exists) await RNFS.mkdir(VAULT_CACHE_DIR);
    } catch (err) {
        console.warn('DocumentDownloadWorker: failed to create cache dir', err);
    }
};
