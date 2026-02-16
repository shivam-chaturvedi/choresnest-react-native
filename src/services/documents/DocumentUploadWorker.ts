import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import Document from '../../database/models/Document';
import { DocumentStorageClient, DocumentUploadResult } from './DocumentStorageClient';

export type DocumentUploadStatus = 'pending_upload' | 'uploading' | 'uploaded' | 'failed';

type DocumentRecord = {
    id: string;
    profileId?: string;
    localUri?: string | null;
    filePath?: string | null;
    remotePath?: string | null;
    uploadStatus?: DocumentUploadStatus | null;
    uploadAttempts?: number | null;
    model?: Document;
};

type PersistUpdates = {
    uploadStatus?: DocumentUploadStatus | null;
    uploadAttempts?: number | null;
    lastUploadError?: string | null;
    remotePath?: string | null;
    filePath?: string | null;
    contentType?: string | null;
    fileSize?: number | null;
    checksum?: string | null;
};

type DocumentUploadWorkerDependencies = {
    fetchDocuments?: (profileId: string) => Promise<DocumentRecord[]>;
    persist?: (record: DocumentRecord, updates: PersistUpdates) => Promise<void>;
    upload?: (profileId: string, documentId: string, localUri: string) => Promise<DocumentUploadResult>;
    isOnline?: () => Promise<boolean>;
    isGuest?: () => Promise<boolean>;
};

const DEFAULT_BACKOFF_DELAY_MS = 1000;
const MAX_BACKOFF_DELAY_MS = 60000;
const PENDING_STATUSES: DocumentUploadStatus[] = ['pending_upload', 'failed'];

const defaultIsOnline = async (): Promise<boolean> => {
    try {
        const NetInfo = require('@react-native-community/netinfo').default;
        const state = await NetInfo.fetch();
        return Boolean(state.isConnected && state.isInternetReachable !== false);
    } catch (error) {
        console.warn('DocumentUploadWorker: failed to determine network state', error);
        return true;
    }
};

const defaultIsGuest = async (): Promise<boolean> => {
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const guest = await AsyncStorage.getItem('IS_GUEST');
        return guest === 'true';
    } catch (error) {
        console.warn('DocumentUploadWorker: failed to read guest flag', error);
        return false;
    }
};

const defaultFetchDocuments = async (profileId: string): Promise<DocumentRecord[]> => {
    const query = database
        .get<Document>('documents')
        .query(
            Q.where('profile_id', profileId),
            Q.where('deleted', false),
            Q.where('upload_status', Q.oneOf(PENDING_STATUSES))
        );
    const records = await query.fetch();
    return records.map(record => ({
        id: record.id,
        profileId: record.profileId,
        localUri: record.localUri,
        filePath: record.filePath,
        remotePath: record.remotePath,
        uploadStatus: record.uploadStatus,
        uploadAttempts: record.uploadAttempts,
        model: record,
    }));
};

const defaultPersist = async (record: DocumentRecord, updates: PersistUpdates): Promise<void> => {
    if (!record?.model) {
        return;
    }
    await database.write(async () => {
        await record.model!.update(doc => {
            if (updates.uploadStatus !== undefined) doc.uploadStatus = updates.uploadStatus ?? 'pending_upload';
            if (updates.uploadAttempts !== undefined) doc.uploadAttempts = updates.uploadAttempts ?? 0;
            if (updates.lastUploadError !== undefined) doc.lastUploadError = updates.lastUploadError ?? null;
            if (updates.remotePath !== undefined) doc.remotePath = updates.remotePath ?? null;
            if (updates.filePath !== undefined) doc.filePath = updates.filePath ?? null;
            if (updates.contentType !== undefined) doc.contentType = updates.contentType ?? null;
            if (updates.fileSize !== undefined) doc.fileSize = updates.fileSize ?? null;
            if (updates.checksum !== undefined) doc.checksum = updates.checksum ?? null;
        });
    });
};

export class DocumentUploadWorker {
    private dependencies: DocumentUploadWorkerDependencies;
    private profileId: string | null = null;
    private running = false;
    private processing = false;
    private uploadLocks = new Set<string>();
    private nextAttemptAt = new Map<string, number>();
    private retryTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(dependencies: DocumentUploadWorkerDependencies = {}) {
        this.dependencies = {
            fetchDocuments: defaultFetchDocuments,
            persist: defaultPersist,
            upload: DocumentStorageClient.uploadDocument,
            isOnline: defaultIsOnline,
            isGuest: defaultIsGuest,
            ...dependencies,
        };
    }

    setProfileId(profileId: string | null) {
        this.profileId = profileId;
    }

    start() {
        if (!this.profileId) {
            return;
        }
        if (this.running) {
            this.triggerProcessing(0);
            return;
        }
        this.running = true;
        this.triggerProcessing(0);
    }

    stop() {
        this.running = false;
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    isRunning(): boolean {
        return this.running;
    }

    async triggerProcessing(delayMs = 0) {
        if (!this.running) {
            return;
        }
        if (delayMs > 0) {
            if (this.retryTimer) {
                clearTimeout(this.retryTimer);
            }
            this.retryTimer = setTimeout(() => {
                this.retryTimer = null;
                void this.processPendingDocuments();
            }, delayMs);
            return;
        }
        await this.processPendingDocuments();
    }

    private async processPendingDocuments() {
        if (!this.running || this.processing || !this.profileId) {
            return;
        }
        this.processing = true;
        try {
            const online = await this.dependencies.isOnline!();
            const guest = await this.dependencies.isGuest!();
            if (!online || guest) {
                this.scheduleRetry(online ? 10000 : 5000);
                return;
            }
            const documents = await this.dependencies.fetchDocuments!(this.profileId);
            const now = Date.now();
            let nextDueDelay: number | null = null;
            let processed = false;
            for (const doc of documents) {
                if (!this.running) {
                    break;
                }
                if (this.uploadLocks.has(doc.id)) {
                    continue;
                }
                const waitingUntil = this.nextAttemptAt.get(doc.id);
                if (waitingUntil && waitingUntil > now) {
                    const delay = waitingUntil - now;
                    if (nextDueDelay === null || delay < nextDueDelay) {
                        nextDueDelay = delay;
                    }
                    continue;
                }
                if (!this.hasLocalUri(doc)) {
                    await this.markMissingLocalUri(doc);
                    continue;
                }
                processed = true;
                void this.uploadDocument(doc);
            }
            if (!processed && nextDueDelay !== null) {
                this.scheduleRetry(nextDueDelay);
            }
        } finally {
            this.processing = false;
        }
    }

    private resolveLocalUri(doc: DocumentRecord): string | null {
        if (doc.localUri) {
            return doc.localUri;
        }
        if (doc.filePath && doc.filePath !== doc.remotePath) {
            return doc.filePath;
        }
        return null;
    }

    private hasLocalUri(doc: DocumentRecord): boolean {
        return Boolean(this.resolveLocalUri(doc));
    }

    private async markMissingLocalUri(doc: DocumentRecord) {
        const attempts = (doc.uploadAttempts ?? 0) + 1;
        console.error('DocumentUploadWorker: missing local URI for document', doc.id);
        await this.dependencies.persist!(doc, {
            uploadStatus: 'failed',
            uploadAttempts: attempts,
            lastUploadError: 'Missing document bytes for upload',
        });
    }

    private async uploadDocument(doc: DocumentRecord) {
        if (!this.profileId) {
            return;
        }
        this.uploadLocks.add(doc.id);
        const localUri = this.resolveLocalUri(doc);
        const attempts = (doc.uploadAttempts ?? 0) + 1;
        try {
            console.log('DocumentUploadWorker: starting upload', doc.id, localUri);
            await this.dependencies.persist!(doc, {
                uploadStatus: 'uploading',
                uploadAttempts: attempts,
                lastUploadError: null,
            });
            if (!localUri) {
                throw new Error('DocumentUploadWorker: local path missing');
            }
            const metadata = await this.dependencies.upload!(this.profileId, doc.id, localUri);
            console.log('DocumentUploadWorker: upload succeeded', {
                documentId: doc.id,
                localUri,
                sizeDetails: metadata.sizeDetails,
            });
            await this.dependencies.persist!(doc, {
                uploadStatus: 'uploaded',
                uploadAttempts: attempts,
                lastUploadError: null,
                remotePath: metadata.remotePath,
                filePath: metadata.remotePath,
                contentType: metadata.contentType ?? null,
                fileSize: metadata.fileSize ?? null,
                checksum: metadata.checksum ?? null,
            });
            this.nextAttemptAt.delete(doc.id);
        } catch (error: any) {
            const message = (error?.message ?? 'Document upload failed').toString();
            console.error('DocumentUploadWorker: upload failed', {
                documentId: doc.id,
                localUri,
                message,
                stack: error?.stack,
                supabaseError: (error as any)?.cause ?? error,
            });
            await this.dependencies.persist!(doc, {
                uploadStatus: 'failed',
                uploadAttempts: attempts,
                lastUploadError: message,
            });
            const delay = this.computeBackoff(attempts);
            this.nextAttemptAt.set(doc.id, Date.now() + delay);
            this.scheduleRetry(delay);
        } finally {
            this.uploadLocks.delete(doc.id);
        }
    }

    private computeBackoff(attempts: number): number {
        const exponent = Math.min(attempts - 1, 10);
        const delay = Math.min(DEFAULT_BACKOFF_DELAY_MS * 2 ** exponent, MAX_BACKOFF_DELAY_MS);
        return Math.max(DEFAULT_BACKOFF_DELAY_MS, delay);
    }

    private scheduleRetry(delayMs: number) {
        if (!this.running) {
            return;
        }
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            void this.processPendingDocuments();
        }, Math.max(1000, Math.min(MAX_BACKOFF_DELAY_MS, delayMs)));
    }
}
