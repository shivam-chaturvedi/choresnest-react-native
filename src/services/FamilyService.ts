import { database } from '../database';
import Member from '../database/models/Member';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';

export const FamilyService = {
    // Family Name Logic
    getFamilyName: async (): Promise<string> => {
        try {
            const settings = await database.get<Setting>('settings').query(Q.where('key', 'family_name')).fetch();
            return settings.length > 0 ? settings[0].value : 'Family Chores';
        } catch (e) {
            console.error('Error fetching family name:', e);
            return 'Family Chores';
        }
    },

    setFamilyName: async (name: string) => {
        await database.write(async () => {
            const settingsCollection = database.get<Setting>('settings');
            const settings = await settingsCollection.query(Q.where('key', 'family_name')).fetch();

            if (settings.length > 0) {
                await settings[0].update(s => {
                    s.value = name;
                });
            } else {
                await settingsCollection.create(s => {
                    s.key = 'family_name';
                    s.value = name;
                });
            }
        });
    },

    // Member Logic
    observeMembers: () => {
        return database.get<Member>('members').query().observe();
    },

    getAllMembers: async () => {
        return await database.get<Member>('members').query().fetch();
    },

    addMember: async (name: string, symbol: string, color: string, isActive: boolean = false) => {
        await database.write(async () => {
            await database.get<Member>('members').create(m => {
                m.name = name;
                m.symbol = symbol;
                m.color = color;
                m.isActive = isActive;
            });
        });
    },

    updateMember: async (id: string, updates: Partial<Member>) => {
        await database.write(async () => {
            const member = await database.get<Member>('members').find(id);
            await member.update(m => {
                if (updates.name) m.name = updates.name;
                if (updates.symbol) m.symbol = updates.symbol;
                if (updates.color) m.color = updates.color;
                if (updates.isActive !== undefined) m.isActive = updates.isActive;
            });
        });
    },

    deleteMember: async (id: string) => {
        await database.write(async () => {
            const member = await database.get<Member>('members').find(id);
            await member.markAsDeleted(); // or destroyPermanently()
        });
    },

    setActiveMember: async (id: string) => {
        try {
            console.log('FamilyService.setActiveMember called with ID:', id);
            await database.write(async () => {
                const members = await database.get<Member>('members').query().fetch();
                console.log('Found members:', members.length);
                console.log('Members before update:', members.map(m => ({ id: m.id, name: m.name, isActive: m.isActive })));

                const batch = members.map(m =>
                    m.prepareUpdate(record => {
                        record.isActive = record.id === id;
                    })
                );
                await database.batch(...batch);

                console.log('Members updated successfully');
                const updatedMembers = await database.get<Member>('members').query().fetch();
                console.log('Members after update:', updatedMembers.map(m => ({ id: m.id, name: m.name, isActive: m.isActive })));
            });
        } catch (error) {
            console.error('Error setting active member:', error);
            throw error;
        }
    }
};
