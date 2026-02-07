import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../database';
import { supabase } from '../config/supabase';

let isSyncing = false;
let syncPromise: Promise<void> | null = null; // Track the current sync promise
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
     * Get last write sync timestamp from storage
     */
    async getLastWriteSyncTime(): Promise<number | null> {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const lastSyncStr = await AsyncStorage.getItem('LAST_WRITE_SYNC_TIME');
            if (lastSyncStr) {
                return parseInt(lastSyncStr, 10);
            }
            return null;
        } catch (error) {
            console.warn('Failed to get last write sync time:', error);
            return null;
        }
    },

    /**
     * Save last write sync timestamp to storage
     */
    async saveLastWriteSyncTime(): Promise<void> {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('LAST_WRITE_SYNC_TIME', Date.now().toString());
        } catch (error) {
            console.warn('Failed to save last write sync time:', error);
        }
    },

    /**
     * Check if write sync is needed (1 hour gap)
     */
    async shouldDoWriteSync(): Promise<boolean> {
        const lastSyncTime = await this.getLastWriteSyncTime();
        if (!lastSyncTime) {
            // Never synced before, do write sync
            return true;
        }
        const oneHourMs = 60 * 60 * 1000; // 1 hour in milliseconds
        const timeSinceLastSync = Date.now() - lastSyncTime;
        return timeSinceLastSync >= oneHourMs;
    },

    /**
     * Main sync function - syncs all tables
     * @param readOnly - If true, only pull changes from server (no push)
     */
    async sync(readOnly: boolean = false): Promise<void> {
        // CRITICAL: Check for existing promise FIRST (most reliable check)
        // If a promise exists, it means sync is in progress - wait for it
        if (syncPromise) {
            console.log('Sync already in progress, waiting for existing sync to complete...');
            try {
                await syncPromise;
            } catch (error) {
                // Ignore errors from waiting - we'll handle them in the original sync
            }
            return;
        }

        // If too many consecutive failures, skip sync temporarily
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.log(`Sync paused due to ${consecutiveFailures} consecutive failures. Reset sync state to retry.`);
            return Promise.resolve();
        }

        // CRITICAL: Set flags and create promise IMMEDIATELY (synchronously) before any async work
        // This prevents race conditions where multiple calls pass the check simultaneously
        isSyncing = true;
        this._notifySyncStatus(true);
        lastSyncError = null;

        // Create the promise IMMEDIATELY and store it before any async operations
        // This ensures all concurrent calls will get the same promise
        syncPromise = (async () => {
            // Set a timeout to prevent infinite syncing (max 2 minutes)
            let syncTimeout: ReturnType<typeof setTimeout> | null = null;
            syncTimeout = setTimeout(() => {
                if (isSyncing) {
                    console.warn('⚠️ Sync timeout - forcing completion after 2 minutes');
                    isSyncing = false;
                    syncPromise = null;
                    this._notifySyncStatus(false);
                }
            }, 120000); // 2 minutes max

            try {
                // NOW do async checks (after promise is created and stored)
                // Check if online
                const online = await this.isOnline();
                if (!online) {
                    console.log('Device is offline, skipping sync');
                    isSyncing = false;
                    syncPromise = null;
                    this._notifySyncStatus(false);
                    return;
                }

                // Check authentication and guest status
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    console.log('No user logged in or auth error, skipping sync', authError);
                    isSyncing = false;
                    syncPromise = null;
                    this._notifySyncStatus(false);
                    return;
                }

                // Check if user is a guest - guests should NEVER sync
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    const isGuest = await AsyncStorage.getItem("IS_GUEST");
                    if (isGuest === "true") {
                        console.log('Guest mode detected - skipping sync (guests do not sync)');
                        isSyncing = false;
                        syncPromise = null;
                        this._notifySyncStatus(false);
                        return;
                    }
                } catch (guestCheckError) {
                    // If we can't check guest status, continue (better to sync than skip)
                    console.warn('Could not check guest status, continuing with sync');
                }

                const syncMode = readOnly ? 'READ-ONLY' : 'FULL';
                console.log(`🔄 Starting ${syncMode} sync for user:`, user.id);
                await synchronize({
                database,
                pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
                    // Handle migrations if needed
                    if (migration) {
                        console.log(`Sync migration: ${migration}`);
                    }
                    const timestamp = Date.now();
                    const lastPulled = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();
                    console.log(`📥 Pulling changes since: ${lastPulled}`);

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
                pushChanges: readOnly ? async () => {
                    // Read-only mode: skip pushing changes
                    console.log('📤 Read-only sync: Skipping push changes');
                    return;
                } : async ({ changes }) => {
                    console.log('📤 Pushing local changes to Supabase...');
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
                    
                    // Check if there are any changes to sync
                    const hasChanges = Object.values(changesAny).some((tableChanges: any) => {
                        if (!tableChanges) return false;
                        const created = tableChanges.created || [];
                        const updated = tableChanges.updated || [];
                        const deleted = tableChanges.deleted || [];
                        return created.length > 0 || updated.length > 0 || deleted.length > 0;
                    });

                    if (!hasChanges) {
                        console.log('📤 No local changes to push - sync complete');
                        return;
                    }
                    
                    // Log what we're syncing
                    if (events) {
                        console.log(`📅 Events to sync: ${events.created?.length || 0} created, ${events.updated?.length || 0} updated, ${events.deleted?.length || 0} deleted`);
                        if (events.created && events.created.length > 0) {
                            console.log(`📅 Sample event to create:`, JSON.stringify(events.created[0], null, 2));
                        }
                    }

                    // Helper to transform WatermelonDB field names to Supabase column names
                    const transformRecordForSupabase = (record: any, table: string): any => {
                        const transformed: any = { ...record };
                        
                        // Field name mappings: WatermelonDB property -> Supabase column
                        const fieldMappings: Record<string, Record<string, string>> = {
                            events: {
                                dateString: 'date', // WatermelonDB uses dateString, Supabase uses date
                            },
                            tasks: {
                                dateString: 'date', // WatermelonDB uses dateString, Supabase uses date
                                dueDisplay: 'due_display', // WatermelonDB uses dueDisplay, Supabase uses due_display
                                assigneeId: 'assignee_id', // WatermelonDB uses assigneeId, Supabase uses assignee_id
                                reminderEnabled: 'reminder_enabled', // WatermelonDB uses reminderEnabled, Supabase uses reminder_enabled
                            },
                        };

                        const mappings = fieldMappings[table];
                        if (mappings) {
                            Object.keys(mappings).forEach(wmField => {
                                if (transformed[wmField] !== undefined) {
                                    transformed[mappings[wmField]] = transformed[wmField];
                                    delete transformed[wmField];
                                }
                            });
                        }

                        return transformed;
                    };

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
                                        // Special validation for list_items: must have a valid list_id
                                        if (table === 'list_items' && (!record.list_id || record.list_id.trim() === '')) {
                                            console.warn(`Skipping invalid list_items record ${record.id} (empty or missing list_id)`);
                                            return false;
                                        }
                                        return true;
                                    })
                                    .map(record => {
                                        let data = addProfileId ? { ...record, profile_id: user.id } : record;
                                        // Remove fields that shouldn't be sent (like _changed, _status from WatermelonDB)
                                        const { _changed, _status, ...cleanData } = data;
                                        
                                        // Transform field names to match Supabase columns
                                        const transformed = transformRecordForSupabase(cleanData, table);
                                        
                                        // Ensure created_at and updated_at are set (WatermelonDB auto-generates these)
                                        const now = new Date().toISOString();
                                        if (!transformed.created_at) {
                                            // If created_at is missing, use updated_at or current time
                                            transformed.created_at = transformed.updated_at 
                                                ? (typeof transformed.updated_at === 'number' 
                                                    ? new Date(transformed.updated_at).toISOString() 
                                                    : transformed.updated_at)
                                                : now;
                                        }
                                        
                                        // Convert timestamps from number (WatermelonDB) to ISO string (Supabase) if needed
                                        // Handle both number timestamps and already-formatted ISO strings
                                        if (transformed.updated_at) {
                                            if (typeof transformed.updated_at === 'number') {
                                                transformed.updated_at = new Date(transformed.updated_at).toISOString();
                                            } else if (typeof transformed.updated_at === 'string' && !transformed.updated_at.includes('T')) {
                                                // If it's a string but not ISO format, try to parse it
                                                const parsed = new Date(transformed.updated_at);
                                                if (!isNaN(parsed.getTime())) {
                                                    transformed.updated_at = parsed.toISOString();
                                                }
                                            }
                                        } else {
                                            transformed.updated_at = now;
                                        }
                                        
                                        if (transformed.created_at) {
                                            if (typeof transformed.created_at === 'number') {
                                                transformed.created_at = new Date(transformed.created_at).toISOString();
                                            } else if (typeof transformed.created_at === 'string' && !transformed.created_at.includes('T')) {
                                                const parsed = new Date(transformed.created_at);
                                                if (!isNaN(parsed.getTime())) {
                                                    transformed.created_at = parsed.toISOString();
                                                }
                                            }
                                        }
                                        
                                        return transformed;
                                    });
                                
                                if (recordsToInsert.length === 0) {
                                    console.warn(`No valid records to insert for ${table}`);
                                } else {
                                    console.log(`Syncing ${recordsToInsert.length} new records to ${table}...`);
                                    // Use upsert instead of insert to handle duplicates gracefully
                                    // This will insert new records and update existing ones
                                    const { data, error } = await supabase
                                        .from(table)
                                        .upsert(recordsToInsert, { onConflict: 'id' })
                                        .select();
                                    if (error) {
                                        console.error(`Failed to batch upsert ${table} (${recordsToInsert.length} records):`, error);
                                        console.error(`Error details:`, JSON.stringify(error, null, 2));
                                        // Log first record for debugging
                                        if (recordsToInsert.length > 0) {
                                            console.error(`First record sample:`, JSON.stringify(recordsToInsert[0], null, 2));
                                        }
                                        errors += recordsToInsert.length;
                                        // Fallback to individual upserts for better error isolation
                                        for (const record of recordsToInsert) {
                                            try {
                                                const { error: individualError } = await supabase
                                                    .from(table)
                                                    .upsert(record, { onConflict: 'id' });
                                                if (individualError) {
                                                    // If upsert fails, try update as last resort
                                                    if (individualError.code === '23505' || individualError.code === '23503') {
                                                        console.log(`Record ${record.id} conflict in ${table}, trying update...`);
                                                        const { error: updateError } = await supabase
                                                            .from(table)
                                                            .update(record)
                                                            .eq('id', record.id);
                                                        if (updateError) {
                                                            console.error(`Failed to update ${table} record ${record.id}:`, updateError);
                                                            errors++;
                                                        } else {
                                                            console.log(`✓ Successfully updated ${table} record ${record.id}`);
                                                        }
                                                    } else {
                                                        console.error(`Failed to upsert ${table} record ${record.id}:`, individualError);
                                                        console.error(`Record data:`, JSON.stringify(record, null, 2));
                                                        errors++;
                                                    }
                                                } else {
                                                    console.log(`✓ Successfully upserted ${table} record ${record.id}`);
                                                }
                                            } catch (individualErr: any) {
                                                // Handle errors in catch block
                                                if (individualErr?.code === '23505' || individualErr?.code === '23503') {
                                                    console.log(`Record ${record.id} conflict in ${table}, trying update...`);
                                                    try {
                                                        const { error: updateError } = await supabase
                                                            .from(table)
                                                            .update(record)
                                                            .eq('id', record.id);
                                                        if (updateError) {
                                                            console.error(`Failed to update ${table} record ${record.id}:`, updateError);
                                                            errors++;
                                                        } else {
                                                            console.log(`✓ Successfully updated ${table} record ${record.id}`);
                                                        }
                                                    } catch (updateErr) {
                                                        console.error(`Exception updating ${table} record ${record.id}:`, updateErr);
                                                        errors++;
                                                    }
                                                } else {
                                                    console.error(`Exception upserting ${table} record ${record.id}:`, individualErr);
                                                    errors++;
                                                }
                                            }
                                        }
                                    } else {
                                        console.log(`✓ Successfully synced ${recordsToInsert.length} records to ${table}`);
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
                                // Special validation for list_items: must have a valid list_id
                                if (table === 'list_items' && (!record.list_id || record.list_id.trim() === '')) {
                                    console.warn(`Skipping invalid list_items update record ${record.id} (empty or missing list_id)`);
                                    return false;
                                }
                                return true;
                            });

                            const updatePromises = validUpdates.map(async (record) => {
                                try {
                                    let data = addProfileId ? { ...record, profile_id: user.id } : record;
                                    // Remove WatermelonDB internal fields
                                    const { _changed, _status, ...cleanData } = data;
                                    
                                    // Transform field names to match Supabase columns
                                    const transformed = transformRecordForSupabase(cleanData, table);
                                    
                                    // Convert timestamps (handle both number and string formats)
                                    if (transformed.updated_at) {
                                        if (typeof transformed.updated_at === 'number') {
                                            transformed.updated_at = new Date(transformed.updated_at).toISOString();
                                        } else if (typeof transformed.updated_at === 'string' && !transformed.updated_at.includes('T')) {
                                            const parsed = new Date(transformed.updated_at);
                                            if (!isNaN(parsed.getTime())) {
                                                transformed.updated_at = parsed.toISOString();
                                            }
                                        }
                                    } else {
                                        transformed.updated_at = new Date().toISOString();
                                    }
                                    
                                    if (transformed.created_at) {
                                        if (typeof transformed.created_at === 'number') {
                                            transformed.created_at = new Date(transformed.created_at).toISOString();
                                        } else if (typeof transformed.created_at === 'string' && !transformed.created_at.includes('T')) {
                                            const parsed = new Date(transformed.created_at);
                                            if (!isNaN(parsed.getTime())) {
                                                transformed.created_at = parsed.toISOString();
                                            }
                                        }
                                    }
                                    
                                    const { error } = await supabase
                                        .from(table)
                                        .update(transformed)
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

                    // Push tables in dependency order to avoid foreign key constraint violations
                    // Run phases sequentially to ensure dependencies exist before dependent records are inserted
                    
                    const allPushResults: PromiseSettledResult<{ success: boolean; errors: number }>[] = [];
                    
                    // Phase 1: Base tables (no foreign key dependencies) - run in parallel
                    const phase1Results = await Promise.allSettled([
                        pushTableChanges('members', members), // Must be first - events/tasks reference members
                        pushTableChanges('settings', settings),
                        pushTableChanges('user_preferences', user_preferences, true), // Ensure profile_id is added
                        pushTableChanges('app_lock', app_lock),
                        pushTableChanges('notification_preferences', notification_preferences),
                        pushTableChanges('quiet_hours', quiet_hours),
                        pushTableChanges('app_settings', app_settings),
                        pushTableChanges('list_categories', list_categories),
                        pushTableChanges('folders', folders), // Notes depend on folders
                    ]);
                    allPushResults.push(...phase1Results);
                    
                    // Phase 2: Tables that depend on base tables (sync after members) - run in parallel
                    const phase2Results = await Promise.allSettled([
                        pushTableChanges('events', events), // Depends on members
                        pushTableChanges('tasks', tasks), // Depends on members
                        pushTableChanges('lists', lists), // List items depend on lists
                        pushTableChanges('recipes', recipes),
                        pushTableChanges('collections', collections), // Collection recipes depend on collections
                        pushTableChanges('transactions', transactions),
                        pushTableChanges('budgets', budgets),
                        pushTableChanges('documents', documents),
                        pushTableChanges('meal_plans', meal_plans),
                    ]);
                    allPushResults.push(...phase2Results);
                    
                    // Phase 3: Tables that depend on other tables (sync last) - run in parallel
                    const phase3Results = await Promise.allSettled([
                        pushTableChanges('list_items', list_items, false), // Depends on lists (profile_id comes from parent list)
                        pushTableChanges('collection_recipes', collection_recipes, false), // Depends on collections (profile_id comes from parent collection)
                        pushTableChanges('notes', notes, false), // Depends on folders (profile_id comes from parent folder)
                    ]);
                    allPushResults.push(...phase3Results);
                    
                    const pushResults = allPushResults;

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

                console.log(`✓ ${readOnly ? 'Read-only' : 'Full'} sync completed successfully`);
                consecutiveFailures = 0; // Reset failure counter on success
                
                // Save write sync time only if we did a full sync (not read-only)
                if (!readOnly) {
                    await this.saveLastWriteSyncTime();
                }
            } catch (error: any) {
                consecutiveFailures++;
                lastSyncError = error;
                
                // Don't log sync errors if it's a guest user (expected)
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    const isGuest = await AsyncStorage.getItem("IS_GUEST");
                    if (isGuest === "true") {
                        // Guest mode - silently skip, don't count as failure
                        consecutiveFailures = Math.max(0, consecutiveFailures - 1);
                        isSyncing = false;
                        syncPromise = null;
                        this._notifySyncStatus(false);
                        return;
                    }
                } catch {
                    // Continue with error handling
                }
                
                console.error(`✗ Sync failed (attempt ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);
                
                // Log detailed error information
                if (error?.message) {
                    console.error('Sync error details:', error.message);
                }
                if (error?.code) {
                    console.error('Sync error code:', error.code);
                }
                
                // Handle specific error types
                const isConcurrentError = error?.message?.includes('Concurrent synchronization');
                const isNetworkError = error?.message?.includes('network') || error?.message?.includes('fetch');
                const isAuthError = error?.code === 'PGRST301' || error?.message?.includes('JWT') || error?.message?.includes('token');
                
                if (isConcurrentError) {
                    // Concurrent sync errors shouldn't count as failures - it's expected when multiple triggers fire
                    console.warn('Concurrent sync detected - this is expected when multiple sync triggers fire');
                    consecutiveFailures = Math.max(0, consecutiveFailures - 1); // Don't count as failure
                } else if (isAuthError) {
                    console.error('Authentication error during sync - user may need to re-login');
                    // Don't retry auth errors immediately
                    consecutiveFailures = MAX_CONSECUTIVE_FAILURES;
                } else if (isNetworkError) {
                    console.error('Network error during sync - will retry when connection is restored');
                    // Network errors are expected, don't count as failures
                    consecutiveFailures = Math.max(0, consecutiveFailures - 1);
                }
                
                // If too many consecutive failures, pause syncing temporarily
                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    console.warn(`Sync paused after ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Will retry on next network change or manual trigger.`);
                }
            } finally {
                // Clear timeout if sync completes normally
                if (syncTimeout) {
                    clearTimeout(syncTimeout);
                }
                isSyncing = false;
                syncPromise = null; // Clear the promise
                this._notifySyncStatus(false);
            }
        })();

        // Wait for sync to complete and return
        return syncPromise;
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
