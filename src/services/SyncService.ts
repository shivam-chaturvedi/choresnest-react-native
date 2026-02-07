import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../database';
import { supabase } from '../config/supabase';

let isSyncing = false;
let syncListeners: Set<(isSyncing: boolean) => void> = new Set();
let lastSyncError: Error | null = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

export const SyncService = {
    /**
     * Subscribe to sync status changes
     */
    onSyncStatusChange: (listener: (isSyncing: boolean) => void) => {
        syncListeners.add(listener);
        return () => {
            syncListeners.delete(listener);
        };
    },

    /**
     * Notify all listeners of sync status
     */
    _notifySyncStatus: (syncing: boolean) => {
        syncListeners.forEach(listener => listener(syncing));
    },

    /**
     * Check if device is online
     */
    async isOnline(): Promise<boolean> {
        try {
            const NetInfo = require('@react-native-community/netinfo').default;
            const state = await NetInfo.fetch();
            return state.isConnected ?? false;
        } catch (error) {
            // If NetInfo is not available, assume online (fallback)
            console.warn('NetInfo not available, assuming online');
            return true;
        }
    },

    /**
     * Main sync function - syncs all tables
     */
    async sync(): Promise<void> {
        // Prevent concurrent sync calls
        if (isSyncing) {
            console.log('Sync already in progress, skipping...');
            return;
        }

        // If too many consecutive failures, skip sync temporarily
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.log('Sync paused due to consecutive failures. Reset sync state to retry.');
            return;
        }

        // Check if online
        const online = await this.isOnline();
        if (!online) {
            console.log('Device is offline, skipping sync');
            return;
        }

        isSyncing = true;
        this._notifySyncStatus(true);
        lastSyncError = null;

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                console.log('No user logged in or auth error, skipping sync', authError);
                isSyncing = false;
                this._notifySyncStatus(false);
                return;
            }

            await synchronize({
                database,
                pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
                    // Handle migrations if needed
                    if (migration) {
                        console.log(`Sync migration: ${migration}`);
                    }
                    const timestamp = Date.now();
                    const lastPulled = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();

                    // Helper to fetch updates for a table with profile_id filter
                    const fetchUpdates = async (table: string, hasProfileId: boolean = true) => {
                        let query = supabase.from(table).select('*');
                        
                        if (hasProfileId) {
                            query = query.eq('profile_id', user.id);
                        }
                        
                        // Fetch records updated after lastPulled (this includes both created and updated)
                        // We use updated_at for filtering since it changes on every modification
                        query = query.gt('updated_at', lastPulled);

                        const { data, error } = await query;
                        if (error) {
                            console.error(`Error fetching ${table}:`, error);
                            throw error;
                        }

                        if (!data || data.length === 0) {
                            return { created: [], updated: [], deleted: [] };
                        }

                        // Categorize records: created vs updated vs deleted
                        // A record is "created" if it was created after lastPulled
                        // A record is "updated" if it was created before lastPulled but updated after
                        // A record is "deleted" if it has deleted=true flag (soft delete)
                        const lastPulledDate = new Date(lastPulled);
                        const created: any[] = [];
                        const updated: any[] = [];
                        const deleted: string[] = [];

                        for (const r of data) {
                            // Handle deleted records
                            if (r.deleted === true) {
                                deleted.push(r.id);
                                continue;
                            }

                            // Skip records without created_at (shouldn't happen, but be defensive)
                            if (!r.created_at) {
                                console.warn(`Record ${r.id} in ${table} missing created_at, skipping`);
                                continue;
                            }

                            // Parse created_at (handle both ISO string and number timestamp)
                            let createdAt: Date;
                            if (typeof r.created_at === 'string') {
                                createdAt = new Date(r.created_at);
                            } else if (typeof r.created_at === 'number') {
                                createdAt = new Date(r.created_at);
                            } else {
                                console.warn(`Record ${r.id} in ${table} has invalid created_at format, skipping`);
                                continue;
                            }

                            // Categorize as created or updated
                            if (createdAt > lastPulledDate) {
                                created.push(r);
                            } else {
                                updated.push(r);
                            }
                        }

                        return { created, updated, deleted };
                    };

                    // Fetch all tables
                    const [
                        membersChanges,
                        settingsChanges,
                        userPreferencesChanges,
                        eventsChanges,
                        tasksChanges,
                        listsChanges,
                        listItemsChanges,
                        listCategoriesChanges,
                        recipesChanges,
                        collectionsChanges,
                        collectionRecipesChanges,
                        mealPlansChanges,
                        documentsChanges,
                        transactionsChanges,
                        budgetsChanges,
                        foldersChanges,
                        notesChanges,
                        appLockChanges,
                        notificationPreferencesChanges,
                        quietHoursChanges,
                        appSettingsChanges,
                    ] = await Promise.all([
                        fetchUpdates('members'),
                        fetchUpdates('settings'),
                        fetchUpdates('user_preferences'),
                        fetchUpdates('events'),
                        fetchUpdates('tasks'),
                        fetchUpdates('lists'),
                        fetchUpdates('list_items', false), // Uses RLS via parent list
                        fetchUpdates('list_categories'),
                        fetchUpdates('recipes'),
                        fetchUpdates('collections'),
                        fetchUpdates('collection_recipes', false), // Uses RLS via parent collection
                        fetchUpdates('meal_plans'),
                        fetchUpdates('documents'),
                        fetchUpdates('transactions'),
                        fetchUpdates('budgets'),
                        fetchUpdates('folders'),
                        fetchUpdates('notes', false), // Uses RLS via parent folder
                        fetchUpdates('app_lock'),
                        fetchUpdates('notification_preferences'),
                        fetchUpdates('quiet_hours'),
                        fetchUpdates('app_settings'),
                    ]);

                    return {
                        changes: {
                            members: membersChanges,
                            settings: settingsChanges,
                            user_preferences: userPreferencesChanges,
                            events: eventsChanges,
                            tasks: tasksChanges,
                            lists: listsChanges,
                            list_items: listItemsChanges,
                            list_categories: listCategoriesChanges,
                            recipes: recipesChanges,
                            collections: collectionsChanges,
                            collection_recipes: collectionRecipesChanges,
                            meal_plans: mealPlansChanges,
                            documents: documentsChanges,
                            transactions: transactionsChanges,
                            budgets: budgetsChanges,
                            folders: foldersChanges,
                            notes: notesChanges,
                            app_lock: appLockChanges,
                            notification_preferences: notificationPreferencesChanges,
                            quiet_hours: quietHoursChanges,
                            app_settings: appSettingsChanges,
                        },
                        timestamp,
                    };
                },
                pushChanges: async ({ changes }) => {
                    const changesAny = changes as any;
                    const {
                        members,
                        settings,
                        user_preferences,
                        events,
                        tasks,
                        lists,
                        list_items,
                        list_categories,
                        recipes,
                        collections,
                        collection_recipes,
                        meal_plans,
                        documents,
                        transactions,
                        budgets,
                        folders,
                        notes,
                        app_lock,
                        notification_preferences,
                        quiet_hours,
                        app_settings,
                    } = changesAny;

                    // Helper to push changes for a table with proper error handling
                    const pushTableChanges = async (
                        table: string,
                        tableChanges: { created: any[]; updated: any[]; deleted: string[] } | undefined,
                        addProfileId: boolean = true
                    ): Promise<{ success: boolean; errors: number }> => {
                        if (!tableChanges) return { success: true, errors: 0 };

                        const { created = [], updated = [], deleted = [] } = tableChanges;
                        let errors = 0;

                        // Validate inputs
                        if (!Array.isArray(created) || !Array.isArray(updated) || !Array.isArray(deleted)) {
                            console.error(`Invalid table changes format for ${table}`);
                            return { success: false, errors: created.length + updated.length + deleted.length };
                        }

                        // Batch insert created records (more efficient)
                        if (created.length > 0) {
                            try {
                                const recordsToInsert = created
                                    .filter(record => {
                                        // Validate record has required fields
                                        if (!record || !record.id) {
                                            console.warn(`Skipping invalid record in ${table} (missing id)`);
                                            return false;
                                        }
                                        return true;
                                    })
                                    .map(record => {
                                        const data = addProfileId ? { ...record, profile_id: user.id } : record;
                                        // Remove fields that shouldn't be sent (like _changed, _status from WatermelonDB)
                                        const { _changed, _status, ...cleanData } = data;
                                        // Convert timestamps from number (WatermelonDB) to ISO string (Supabase) if needed
                                        // Handle both number timestamps and already-formatted ISO strings
                                        if (cleanData.updated_at) {
                                            if (typeof cleanData.updated_at === 'number') {
                                                cleanData.updated_at = new Date(cleanData.updated_at).toISOString();
                                            } else if (typeof cleanData.updated_at === 'string' && !cleanData.updated_at.includes('T')) {
                                                // If it's a string but not ISO format, try to parse it
                                                const parsed = new Date(cleanData.updated_at);
                                                if (!isNaN(parsed.getTime())) {
                                                    cleanData.updated_at = parsed.toISOString();
                                                }
                                            }
                                        }
                                        if (cleanData.created_at) {
                                            if (typeof cleanData.created_at === 'number') {
                                                cleanData.created_at = new Date(cleanData.created_at).toISOString();
                                            } else if (typeof cleanData.created_at === 'string' && !cleanData.created_at.includes('T')) {
                                                const parsed = new Date(cleanData.created_at);
                                                if (!isNaN(parsed.getTime())) {
                                                    cleanData.created_at = parsed.toISOString();
                                                }
                                            }
                                        }
                                        return cleanData;
                                    });
                                
                                if (recordsToInsert.length === 0) {
                                    console.warn(`No valid records to insert for ${table}`);
                                } else {
                                    const { error } = await supabase.from(table).insert(recordsToInsert);
                                    if (error) {
                                        console.error(`Failed to batch insert ${table} (${recordsToInsert.length} records):`, error);
                                        errors += recordsToInsert.length;
                                        // Fallback to individual inserts for better error isolation
                                        for (const record of recordsToInsert) {
                                            try {
                                                const { error: individualError } = await supabase.from(table).insert(record);
                                                if (individualError) {
                                                    console.error(`Failed to insert ${table} record ${record.id}:`, individualError);
                                                    errors++;
                                                }
                                            } catch (individualErr) {
                                                console.error(`Exception inserting ${table} record ${record.id}:`, individualErr);
                                                errors++;
                                            }
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error(`Exception during batch insert ${table}:`, err);
                                errors += created.length;
                            }
                        }

                        // Batch update records
                        if (updated.length > 0) {
                            const validUpdates = updated.filter(record => {
                                if (!record || !record.id) {
                                    console.warn(`Skipping invalid update record in ${table} (missing id)`);
                                    return false;
                                }
                                return true;
                            });

                            const updatePromises = validUpdates.map(async (record) => {
                                try {
                                    const data = addProfileId ? { ...record, profile_id: user.id } : record;
                                    // Remove WatermelonDB internal fields
                                    const { _changed, _status, ...cleanData } = data;
                                    // Convert timestamps (handle both number and string formats)
                                    if (cleanData.updated_at) {
                                        if (typeof cleanData.updated_at === 'number') {
                                            cleanData.updated_at = new Date(cleanData.updated_at).toISOString();
                                        } else if (typeof cleanData.updated_at === 'string' && !cleanData.updated_at.includes('T')) {
                                            const parsed = new Date(cleanData.updated_at);
                                            if (!isNaN(parsed.getTime())) {
                                                cleanData.updated_at = parsed.toISOString();
                                            }
                                        }
                                    }
                                    if (cleanData.created_at) {
                                        if (typeof cleanData.created_at === 'number') {
                                            cleanData.created_at = new Date(cleanData.created_at).toISOString();
                                        } else if (typeof cleanData.created_at === 'string' && !cleanData.created_at.includes('T')) {
                                            const parsed = new Date(cleanData.created_at);
                                            if (!isNaN(parsed.getTime())) {
                                                cleanData.created_at = parsed.toISOString();
                                            }
                                        }
                                    }
                                    const { error } = await supabase
                                        .from(table)
                                        .update(cleanData)
                                        .eq('id', record.id);
                                    
                                    if (error) {
                                        console.error(`Failed to update ${table} record ${record.id}:`, error);
                                        return false;
                                    }
                                    return true;
                                } catch (err) {
                                    console.error(`Exception updating ${table} record ${record.id}:`, err);
                                    return false;
                                }
                            });

                            const results = await Promise.all(updatePromises);
                            errors += results.filter(r => !r).length;
                            // Count skipped invalid records as errors
                            errors += updated.length - validUpdates.length;
                        }

                        // Batch delete records (soft delete by updating deleted flag, or hard delete)
                        if (deleted.length > 0) {
                            const validIds = deleted.filter(id => {
                                if (!id || typeof id !== 'string') {
                                    console.warn(`Skipping invalid delete ID in ${table}`);
                                    return false;
                                }
                                return true;
                            });

                            const deletePromises = validIds.map(async (id) => {
                                try {
                                    // Try soft delete first (update deleted flag)
                                    const { error: updateError } = await supabase
                                        .from(table)
                                        .update({ deleted: true, updated_at: new Date().toISOString() })
                                        .eq('id', id);
                                    
                                    if (!updateError) {
                                        return true;
                                    }

                                    // If soft delete fails, try hard delete
                                    const { error: deleteError } = await supabase.from(table).delete().eq('id', id);
                                    if (deleteError) {
                                        console.error(`Failed to delete ${table} record ${id}:`, deleteError);
                                        return false;
                                    }
                                    return true;
                                } catch (err) {
                                    console.error(`Exception deleting ${table} record ${id}:`, err);
                                    return false;
                                }
                            });

                            const results = await Promise.all(deletePromises);
                            errors += results.filter(r => !r).length;
                            // Count skipped invalid IDs as errors
                            errors += deleted.length - validIds.length;
                        }

                        return { success: errors === 0, errors };
                    };

                    // Push all tables and track errors
                    const pushResults = await Promise.allSettled([
                        pushTableChanges('members', members),
                        pushTableChanges('settings', settings),
                        pushTableChanges('user_preferences', user_preferences),
                        pushTableChanges('events', events),
                        pushTableChanges('tasks', tasks),
                        pushTableChanges('lists', lists),
                        pushTableChanges('list_items', list_items, false), // profile_id comes from parent list
                        pushTableChanges('list_categories', list_categories),
                        pushTableChanges('recipes', recipes),
                        pushTableChanges('collections', collections),
                        pushTableChanges('collection_recipes', collection_recipes, false), // profile_id comes from parent collection
                        pushTableChanges('meal_plans', meal_plans),
                        pushTableChanges('documents', documents),
                        pushTableChanges('transactions', transactions),
                        pushTableChanges('budgets', budgets),
                        pushTableChanges('folders', folders),
                        pushTableChanges('notes', notes, false), // profile_id comes from parent folder
                        pushTableChanges('app_lock', app_lock),
                        pushTableChanges('notification_preferences', notification_preferences),
                        pushTableChanges('quiet_hours', quiet_hours),
                        pushTableChanges('app_settings', app_settings),
                    ]);

                    // Log any failed pushes (but don't fail the entire sync)
                    const failedPushes = pushResults.filter(r => r.status === 'rejected');
                    if (failedPushes.length > 0) {
                        console.warn(`Some tables failed to push: ${failedPushes.length} failures`);
                    }

                    // Count total errors from successful pushes
                    let totalErrors = 0;
                    pushResults.forEach((result, index) => {
                        if (result.status === 'fulfilled' && result.value.errors > 0) {
                            totalErrors += result.value.errors;
                        }
                    });

                    if (totalErrors > 0) {
                        console.warn(`Sync completed with ${totalErrors} errors during push operations`);
                    }
                },
                migrationsEnabledAtVersion: 5, // Match schema version
            });

            console.log('✓ Sync completed successfully');
            consecutiveFailures = 0; // Reset failure counter on success
        } catch (error: any) {
            consecutiveFailures++;
            lastSyncError = error;
            console.error(`✗ Sync failed (attempt ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);
            
            // Log detailed error information
            if (error?.message) {
                console.error('Sync error details:', error.message);
            }
            if (error?.code) {
                console.error('Sync error code:', error.code);
            }
            
            // Handle specific error types
            if (error?.code === 'PGRST301' || error?.message?.includes('JWT') || error?.message?.includes('token')) {
                console.error('Authentication error during sync - user may need to re-login');
                // Don't retry auth errors immediately
                consecutiveFailures = MAX_CONSECUTIVE_FAILURES;
            } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
                console.error('Network error during sync - will retry when connection is restored');
                // Network errors are expected, don't count as failures
                consecutiveFailures = Math.max(0, consecutiveFailures - 1);
            }
            
            // If too many consecutive failures, pause syncing temporarily
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                console.warn(`Sync paused after ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Will retry on next network change or manual trigger.`);
            }
        } finally {
            isSyncing = false;
            this._notifySyncStatus(false);
        }
    },

    /**
     * Get current sync status
     */
    getSyncStatus(): boolean {
        return isSyncing;
    },

    /**
     * Get last sync error
     */
    getLastSyncError(): Error | null {
        return lastSyncError;
    },

    /**
     * Reset sync error state (useful after fixing issues)
     */
    resetSyncState(): void {
        consecutiveFailures = 0;
        lastSyncError = null;
    },
};
