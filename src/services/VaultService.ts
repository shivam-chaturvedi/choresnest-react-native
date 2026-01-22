import { database } from '../database';
import Document from '../database/models/Document';
import { Q } from '@nozbe/watermelondb';

export const VaultService = {
    observeGlobalDocuments: () => {
        return database.get<Document>('documents').query(Q.where('member_id', 'global')).observe();
    },

    observeMemberDocuments: (memberId: string) => {
        return database.get<Document>('documents').query(Q.where('member_id', memberId)).observe();
    },

    observeAllDocuments: () => {
        return database.get<Document>('documents').query().observe();
    },

    addDocument: async (data: Partial<Document>) => {
        try {
            return await database.write(async () => {
                return await database.get<Document>('documents').create(d => {
                    d.name = data.name || 'Untitled Doc';
                    d.type = data.type || 'other';
                    d.icon = data.icon || 'file';
                    d.date = data.date || new Date().toISOString();
                    d.memberId = data.memberId || 'global';
                    d.sharedWithIds = data.sharedWithIds || [];
                    d.filePath = data.filePath || '';
                    d.meta = data.meta || {};
                });
            });
        } catch (error) {
            console.error('Error adding document:', error);
            return null;
        }
    },

    updateDocument: async (id: string, updates: Partial<Document>) => {
        try {
            await database.write(async () => {
                const doc = await database.get<Document>('documents').find(id);
                await doc.update(d => {
                    if (updates.name) d.name = updates.name;
                    // Apply other updates as needed
                });
            });
        } catch (error) {
            console.error('Error updating document:', error);
        }
    }
};
