import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../database';
import { supabase } from '../config/supabase';


let isSyncing = false;

export const SyncService = {
    async sync() {
        // Prevent concurrent sync calls
        if (isSyncing) {
            console.log('Sync already in progress, skipping...');
            return;
        }

        isSyncing = true;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                isSyncing = false;
                return;
            }

            await synchronize({
                database,
                pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
                    const timestamp = Date.now();
                    const lastPulled = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();

                    // Helper to fetch updates for a table
                    const fetchUpdates = async (table: string) => {
                        const { data, error } = await supabase
                            .from(table)
                            .select('*')
                            .gt('updated_at', lastPulled);

                        if (error) throw error;

                        // Map deleted records? 
                        // WatermelonDB expects { created: [], updated: [], deleted: [] }
                        // But querying "deleted" records requires a "deleted" column or Soft Delete strategy.
                        // Our tables have "deleted" column.

                        const created = data.filter(r => new Date(r.created_at) > new Date(lastPulled) && !r.deleted);
                        const updated = data.filter(r => new Date(r.created_at) <= new Date(lastPulled) && !r.deleted);
                        const deleted = data.filter(r => r.deleted).map(r => r.id);

                        return { created, updated, deleted };
                    };

                    const membersChanges = await fetchUpdates('members');
                    const settingsChanges = await fetchUpdates('settings');
                    const userPreferencesChanges = await fetchUpdates('user_preferences');

                    return {
                        changes: {
                            members: membersChanges,
                            settings: settingsChanges,
                            user_preferences: userPreferencesChanges,
                        },
                        timestamp,
                    };
                },
                pushChanges: async ({ changes, lastPulledAt }) => {
                    // Push Mettings
                    // Push Members
                    // Push User Preferences

                    const changesAny = changes as any;
                    const { members, settings, user_preferences } = changesAny;

                    // 1. Members
                    if (members) {
                        const { created, updated, deleted } = members;

                        // Created
                        for (const record of created) {
                            await supabase.from('members').insert({
                                id: record.id,
                                ...record,
                                profile_id: user.id // Enforced by client, backed by trigger
                            });
                        }

                        // Updated
                        for (const record of updated) {
                            await supabase.from('members').update({
                                ...record,
                                profile_id: user.id
                            }).eq('id', record.id);
                        }

                        // Deleted
                        for (const id of deleted) {
                            await supabase.from('members').delete().eq('id', id);
                        }
                    }

                    // 2. Settings
                    if (settings) {
                        const { created, updated, deleted } = settings;
                        for (const record of created) {
                            await supabase.from('settings').insert({ id: record.id, ...record, profile_id: user.id });
                        }
                        for (const record of updated) {
                            await supabase.from('settings').update({ ...record, profile_id: user.id }).eq('id', record.id);
                        }
                        for (const id of deleted) {
                            await supabase.from('settings').delete().eq('id', id);
                        }
                    }

                    // 3. User Preferences
                    if (user_preferences) {
                        const { created, updated, deleted } = user_preferences;
                        for (const record of created) {
                            await supabase.from('user_preferences').insert({ id: record.id, ...record, profile_id: user.id });
                        }
                        for (const record of updated) {
                            await supabase.from('user_preferences').update({ ...record, profile_id: user.id }).eq('id', record.id);
                        }
                        for (const id of deleted) {
                            await supabase.from('user_preferences').delete().eq('id', id);
                        }
                    }
                },
                migrationsEnabledAtVersion: 1,
            });
            console.log('Sync completed successfully');
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            isSyncing = false;
        }
    }
};
