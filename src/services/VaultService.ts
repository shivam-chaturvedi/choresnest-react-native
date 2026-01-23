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

    updateDocument: async (id: string, updates: Partial<Document> | any) => {
        try {
            await database.write(async () => {
                const doc = await database.get<Document>('documents').find(id);
                await doc.update(d => {
                    if (updates.name) d.name = updates.name;
                    if (updates.type) d.type = updates.type;
                    if (updates.icon) d.icon = updates.icon;
                    if (updates.date) d.date = updates.date;
                    if (updates.memberId) d.memberId = updates.memberId;
                    if (updates.sharedWithIds) d.sharedWithIds = updates.sharedWithIds;
                    if (updates.filePath) d.filePath = updates.filePath;
                    if (updates.meta) d.meta = { ...d.meta, ...updates.meta };

                    // Handle flat meta fields
                    const metaUpdates: any = d.meta || {};
                    if (updates.category) metaUpdates.category = updates.category;
                    if (updates.expiryDate) metaUpdates.expiryDate = updates.expiryDate;
                    if (updates.purchaseDate) metaUpdates.purchaseDate = updates.purchaseDate;
                    if (updates.warrantyTillDate) metaUpdates.warrantyTillDate = updates.warrantyTillDate;
                    if (updates.billAmount) metaUpdates.billAmount = updates.billAmount;
                    if (updates.billDate) metaUpdates.billDate = updates.billDate;
                    if (updates.provider) metaUpdates.provider = updates.provider;
                    if (updates.policyNumber) metaUpdates.policyNumber = updates.policyNumber;
                    if (updates.premiumAmount) metaUpdates.premiumAmount = updates.premiumAmount;
                    if (updates.serviceDate) metaUpdates.serviceDate = updates.serviceDate;
                    if (updates.nextServiceDate) metaUpdates.nextServiceDate = updates.nextServiceDate;
                    if (updates.cost) metaUpdates.cost = updates.cost;

                    d.meta = metaUpdates;
                });
            });
        } catch (error) {
            console.error('Error updating document:', error);
        }
    }
};
