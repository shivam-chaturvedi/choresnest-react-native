import { database } from '../database';
import Document from '../database/models/Document';
import { Q } from '@nozbe/watermelondb';
import { NotificationScheduler } from './NotificationScheduler';
import { DocumentInput } from './DocumentInput';
import { SyncService } from './SyncService';
import { SupabaseService } from './SupabaseService';
import { uuidv4 } from '../utils/uuid';

const localUriCache = new Map<string, string>();

const cacheLocalUri = (documentId: string, uri?: string) => {
    if (uri) {
        localUriCache.set(documentId, uri);
    } else {
        localUriCache.delete(documentId);
    }
};

const buildMetaFromInput = (data: DocumentInput, baseMeta: Record<string, any> = {}): Record<string, any> => {
    const meta: Record<string, any> = {
        ...(baseMeta ?? {}),
        ...(data.meta ?? {}),
    };

    const mergeMeta = (key: keyof DocumentInput, value: any) => {
        if (value !== undefined && value !== null && value !== '') {
            meta[key as string] = value;
        } else if (meta[key as string] === undefined) {
            delete meta[key as string];
        }
    };

    const metaFields: Array<keyof DocumentInput> = [
        'purchaseDate',
        'warrantyTillDate',
        'billDate',
        'billAmount',
        'provider',
        'policyNumber',
        'premiumAmount',
        'serviceDate',
        'nextServiceDate',
        'cost',
        'expiryDate',
        'reminderRules',
    ];

    metaFields.forEach(field => {
        mergeMeta(field, data[field]);
    });

    return meta;
};

const resolveProfileId = async (): Promise<string | null> => {
    try {
        const {
            data: { user },
            error,
        } = await SupabaseService.getUser();
        if (error) {
            console.warn('VaultService: failed to resolve profile id', error.message);
            return null;
        }
        if (!user) {
            console.warn('VaultService: profile id missing for vault write');
            return null;
        }
        return user.id;
    } catch (error) {
        console.error('VaultService: unexpected error resolving profile id', error);
        return null;
    }
};

const syncAfterWrite = () => {
    void SyncService.requestSyncSoon();
};

export const VaultService = {
    observeGlobalDocuments: (profileId: string) => {
        return database
            .get<Document>('documents')
            .query(
                Q.where('profile_id', profileId),
                Q.where('member_id', 'global'),
                Q.where('deleted', false),
                Q.sortBy('updated_at', Q.desc)
            )
            .observe();
    },

    observeMemberDocuments: (profileId: string, memberId: string) => {
        return database
            .get<Document>('documents')
            .query(
                Q.where('profile_id', profileId),
                Q.where('member_id', memberId),
                Q.where('deleted', false),
                Q.sortBy('updated_at', Q.desc)
            )
            .observe();
    },

    observeAllDocuments: (profileId: string) => {
        return database
            .get<Document>('documents')
            .query(
                Q.where('profile_id', profileId),
                Q.where('deleted', false),
                Q.sortBy('updated_at', Q.desc)
            )
            .observe();
    },

    getCachedLocalUri: (documentId: string): string | undefined => {
        return localUriCache.get(documentId);
    },

    addDocument: async (data: DocumentInput) => {
        const localUri = data.localUri ?? data.filePath;
        if (!localUri) {
            console.error('VaultService: localUri or filePath is required to add a document');
            return null;
        }

        const profileId = await resolveProfileId();
        if (!profileId) {
            console.error('VaultService: cannot create document without profile id');
            return null;
        }

        const documentId = String(uuidv4());

        try {
            const createdDoc = await database.write(async () => {
                return await database.get<Document>('documents').create(d => {
                    const now = Date.now();
                    d._raw.id = documentId;
                    d.profileId = profileId;
                    d.name = data.name || 'Untitled Doc';
                    d.type = data.type || 'other';
                    d.icon = data.icon || 'file';
                    d.date = data.date || new Date().toISOString();
                    d.memberId = data.memberId || 'global';
                    d.sharedWithIds = data.sharedWithIds || [];
                    d.localUri = localUri;
                    d.remotePath = null;
                    d.filePath = null;
                    d.uploadStatus = 'pending_upload';
                    d.uploadAttempts = 0;
                    d.lastUploadError = null;
                    d.contentType = null;
                    d.fileSize = null;
                    d.checksum = null;
                    d.createdAt = now;
                    d.updatedAt = now;
                    d.deleted = false;
                    d.version = 1;
                    if (typeof data.reminderDaysBefore === 'number') {
                        d.reminderDaysBefore = data.reminderDaysBefore;
                    }
                    d.meta = buildMetaFromInput(data);
                });
            });

            cacheLocalUri(documentId, localUri);

            NotificationScheduler.syncDocumentReminders(createdDoc).catch(err =>
                console.error('Failed to schedule document notifications:', err)
            );

            syncAfterWrite();
            return createdDoc;
        } catch (error) {
            console.error('Error adding document:', error);
            return null;
        }
    },

    updateDocument: async (id: string, updates: DocumentInput) => {
        const profileId = await resolveProfileId();
        if (!profileId) {
            console.error('VaultService: cannot update document without profile id');
            return;
        }

        let updatedDoc: Document | null = null;
        try {
            await database.write(async () => {
                const doc = await database.get<Document>('documents').find(id);
                if (doc.profileId !== profileId) {
                    console.warn('VaultService: refusing to update document that does not belong to active profile');
                    return;
                }

                await doc.update(d => {
                    if (updates.name !== undefined) d.name = updates.name;
                    if (updates.type !== undefined) d.type = updates.type;
                    if (updates.icon !== undefined) d.icon = updates.icon;
                    if (updates.date !== undefined) d.date = updates.date;
                    if (updates.memberId !== undefined) d.memberId = updates.memberId;
                    if (updates.sharedWithIds !== undefined) d.sharedWithIds = updates.sharedWithIds;
                    const updatedLocalUri = updates.localUri ?? updates.filePath;
                    if (updatedLocalUri) {
                        d.localUri = updatedLocalUri;
                        d.remotePath = null;
                        d.filePath = null;
                        d.uploadStatus = 'pending_upload';
                        d.uploadAttempts = 0;
                        d.lastUploadError = null;
                        d.contentType = null;
                        d.fileSize = null;
                        d.checksum = null;
                        cacheLocalUri(id, updatedLocalUri);
                    }
                    d.meta = buildMetaFromInput(updates, d.meta || {});
                    if (typeof updates.reminderDaysBefore === 'number') {
                        d.reminderDaysBefore = updates.reminderDaysBefore;
                    }
                    d.updatedAt = Date.now();
                    d.version = (d.version ?? 0) + 1;
                });
                updatedDoc = doc;
            });

            if (updatedDoc) {
                NotificationScheduler.syncDocumentReminders(updatedDoc).catch(err =>
                    console.error('Failed to schedule document notifications:', err)
                );
                syncAfterWrite();
            }
        } catch (error) {
            console.error('Error updating document:', error);
        }
    },

    deleteDocument: async (id: string) => {
        const profileId = await resolveProfileId();
        if (!profileId) {
            console.error('VaultService: cannot delete document without profile id');
            return;
        }

        try {
            await database.write(async () => {
                const doc = await database.get<Document>('documents').find(id);
                if (doc.profileId !== profileId) {
                    console.warn('VaultService: refusing to delete document that does not belong to active profile');
                    return;
                }
                await doc.update(d => {
                    d.deleted = true;
                    d.updatedAt = Date.now();
                    d.version = (d.version ?? 0) + 1;
                });
            });
            cacheLocalUri(id);
            syncAfterWrite();
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    },
};
