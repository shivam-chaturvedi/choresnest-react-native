import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { getDatabase } from '../database';
import { resetWatermelonCursor } from './sync/cursor';

/**
 * DataCleanupService
 *
 * Two distinct tiers of cleanup:
 *
 *  1. clearSessionCaches() — NON-DESTRUCTIVE. Clears in-memory caches and
 *     session-specific AsyncStorage keys. Called on logout / profile switch.
 *     NEVER touches WatermelonDB rows or tables.
 *
 *  2. deleteAllData() — DESTRUCTIVE. Full factory-reset: clears AsyncStorage,
 *     resets WatermelonDB, and deletes local files. Called ONLY from
 *     "Delete Account / Delete all local data" UX flows.
 *
 * Legacy alias: clearDatabase() now delegates to clearSessionCaches() so
 * any code still referencing the old name gets safe non-destructive behaviour.
 */
export const DataCleanupService = {
    /**
     * NON-DESTRUCTIVE session cleanup.
     *
     * Stops sync, unregisters realtime listeners, clears in-memory caches,
     * and removes session-specific AsyncStorage keys.
     * Does NOT touch WatermelonDB rows, tables, or sync cursors.
     */
    clearSessionCaches: async (): Promise<void> => {
        console.log('[DataCleanupService] clearSessionCaches: clearing in-memory session state (DB untouched)');

        try {
            // Stop sync and clear in-memory sync state (no cursor reset)
            const { SyncService } = await import('./SyncService');
            SyncService.stopPeriodicSync();
            // Reset in-memory counters/flags only — cursors are preserved per-profile
            SyncService.resetSyncStateInMemory?.();
        } catch (err) {
            console.warn('[DataCleanupService] clearSessionCaches: failed to stop SyncService', err);
        }

        // Remove session tokens / volatile AsyncStorage keys — preserve profile data
        const SESSION_KEYS = [
            'AUTH_USER',
            'LAST_SYNC_SUCCESS_AT',
            'LAST_WRITE_SYNC_TIME',
        ];
        try {
            await AsyncStorage.multiRemove(SESSION_KEYS);
            console.log('[DataCleanupService] clearSessionCaches: session AsyncStorage keys removed');
        } catch (err) {
            console.warn('[DataCleanupService] clearSessionCaches: failed to remove session keys', err);
        }

        console.log('[DataCleanupService] clearSessionCaches: complete. WatermelonDB rows PRESERVED.');
    },

    /**
     * Legacy alias — previously called unsafeResetDatabase().
     * Now delegates to non-destructive clearSessionCaches() so callers that
     * have not yet been updated get safe behaviour automatically.
     *
     * @deprecated Prefer clearSessionCaches() for new code.
     */
    clearDatabase: async (): Promise<void> => {
        console.warn(
            '[DataCleanupService] clearDatabase() is deprecated and now NON-DESTRUCTIVE. ' +
            'Use clearSessionCaches() for session cleanup, or deleteAllData() for a full factory reset.'
        );
        return DataCleanupService.clearSessionCaches();
    },

    /**
     * DESTRUCTIVE full factory reset.
     * Clears AsyncStorage, resets WatermelonDB, and deletes local files.
     * MUST only be called from explicit "Delete account / Delete all local data" UX.
     */
    deleteAllData: async (): Promise<void> => {
        console.log('=== Starting Complete Data Deletion ===');

        try {
            // Step 1: Clear AsyncStorage entirely
            await DataCleanupService.clearAsyncStorage();

            // Step 2: Reset WatermelonDB (only permissible destructive path)
            await DataCleanupService._unsafeWipeDatabase();

            // Step 3: Clear file system
            await DataCleanupService.clearFileSystem();

            console.log('=== Data Deletion Completed Successfully ===');
        } catch (error) {
            console.error('Error during data deletion:', error);
            throw error;
        }
    },

    /**
     * Internal: physically wipes the WatermelonDB SQLite database and resets
     * all sync cursors. Only called from deleteAllData().
     * @private
     */
    _unsafeWipeDatabase: async (): Promise<void> => {
        try {
            console.log('[DataCleanupService] _unsafeWipeDatabase: resetting WatermelonDB...');

            // WARNING: DO NOT use markAsDeleted() here or background sync
            // will try to propagate deletions to Supabase, deleting cloud data!
            await getDatabase().write(async () => {
                await getDatabase().unsafeResetDatabase();
            });

            // Reset all sync cursors since the entire DB was wiped
            try {
                await resetWatermelonCursor();
                console.log('[DataCleanupService] _unsafeWipeDatabase: sync cursors reset');
            } catch (cursorError) {
                console.warn('[DataCleanupService] _unsafeWipeDatabase: failed to reset sync cursors', cursorError);
            }

            console.log('[DataCleanupService] _unsafeWipeDatabase: complete');
        } catch (error) {
            console.error('[DataCleanupService] _unsafeWipeDatabase: error', error);
            throw new Error('Failed to wipe database');
        }
    },

    /**
     * Clear all AsyncStorage data
     */
    clearAsyncStorage: async (): Promise<void> => {
        try {
            console.log('Clearing AsyncStorage...');
            await AsyncStorage.clear();
            console.log('✓ AsyncStorage cleared');
        } catch (error) {
            console.error('Error clearing AsyncStorage:', error);
            throw new Error('Failed to clear AsyncStorage');
        }
    },

    /**
     * Clear all files from the file system
     */
    clearFileSystem: async (): Promise<void> => {
        try {
            console.log('Clearing file system...');

            const directories = [
                RNFS.DocumentDirectoryPath,
                RNFS.CachesDirectoryPath,
            ];

            for (const dir of directories) {
                try {
                    const exists = await RNFS.exists(dir);
                    if (exists) {
                        const files = await RNFS.readDir(dir);
                        console.log(`Found ${files.length} items in ${dir}`);

                        for (const file of files) {
                            try {
                                if (file.name.startsWith('.')) {
                                    continue;
                                }
                                await RNFS.unlink(file.path);
                                console.log(`Deleted: ${file.name}`);
                            } catch (fileError) {
                                console.warn(`Could not delete file ${file.name}:`, fileError);
                            }
                        }
                    }
                } catch (dirError) {
                    console.warn(`Error processing directory ${dir}:`, dirError);
                }
            }

            console.log('✓ File system cleared');
        } catch (error) {
            console.error('Error clearing file system:', error);
            throw new Error('Failed to clear file system');
        }
    },

    /**
     * Clear specific file types (optional, more targeted cleanup)
     */
    clearSpecificFiles: async (extensions: string[]): Promise<void> => {
        try {
            const dir = RNFS.DocumentDirectoryPath;
            const files = await RNFS.readDir(dir);

            for (const file of files) {
                const fileExtension = file.name.split('.').pop()?.toLowerCase();
                if (fileExtension && extensions.includes(fileExtension)) {
                    await RNFS.unlink(file.path);
                    console.log(`Deleted ${fileExtension} file: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('Error clearing specific files:', error);
        }
    },

    /**
     * Get storage usage statistics
     */
    getStorageStats: async (): Promise<{
        asyncStorageKeys: number;
        databaseRecords: number;
        fileSystemSize: number;
    }> => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const asyncStorageKeys = keys.length;

            let databaseRecords = 0;
            try {
                const collections = ['users', 'events', 'tasks', 'grocery_items', 'vault_documents', 'recipes', 'meals', 'notes'];
                for (const collectionName of collections) {
                    try {
                        const collection = getDatabase().get(collectionName);
                        const records = await collection.query().fetch();
                        databaseRecords += records.length;
                    } catch {
                        // Collection might not exist
                    }
                }
            } catch {
                // Database might not be initialized
            }

            let fileSystemSize = 0;
            try {
                const dirs = [RNFS.DocumentDirectoryPath, RNFS.CachesDirectoryPath];
                for (const dir of dirs) {
                    const files = await RNFS.readDir(dir);
                    for (const file of files) {
                        fileSystemSize += file.size || 0;
                    }
                }
            } catch {
                // Directory might not be accessible
            }

            return { asyncStorageKeys, databaseRecords, fileSystemSize };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return { asyncStorageKeys: 0, databaseRecords: 0, fileSystemSize: 0 };
        }
    },
};
