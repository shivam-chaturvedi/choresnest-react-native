import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { database } from '../database';

/**
 * DataCleanupService
 * 
 * Handles complete data deletion across all storage mechanisms:
 * - AsyncStorage (app preferences, settings, cached data)
 * - WatermelonDB (SQLite database with all family data)
 * - File System (images, documents, audio files, etc.)
 */
export const DataCleanupService = {
    /**
     * Delete all application data
     * This is called when user deletes their account
     */
    deleteAllData: async (): Promise<void> => {
        console.log('=== Starting Complete Data Deletion ===');

        try {
            // Step 1: Clear AsyncStorage
            await DataCleanupService.clearAsyncStorage();

            // Step 2: Clear WatermelonDB (SQLite)
            await DataCleanupService.clearDatabase();

            // Step 3: Clear File System
            await DataCleanupService.clearFileSystem();

            console.log('=== Data Deletion Completed Successfully ===');
        } catch (error) {
            console.error('Error during data deletion:', error);
            throw error;
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
     * Clear WatermelonDB database
     * This deletes all tables and resets the database
     */
    clearDatabase: async (): Promise<void> => {
        try {
            console.log('Clearing WatermelonDB database...');

            // Directly reset the database to initial state.
            // WARNING: DO NOT use markAsDeleted() here or background sync
            // will try to propagate deletions to Supabase, deleting cloud data!
            await database.write(async () => {
                await database.unsafeResetDatabase();
            });

            console.log('✓ WatermelonDB database cleared and reset');
        } catch (error) {
            console.error('Error clearing database:', error);
            throw new Error('Failed to clear database');
        }
    },

    /**
     * Clear all files from the file system
     * This includes:
     * - Document directory (vault documents, images)
     * - Cache directory (temporary files)
     * - Any app-specific directories
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
                                // Skip system files and directories we shouldn't delete
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
     * Get storage usage statistics (useful for showing user what will be deleted)
     */
    getStorageStats: async (): Promise<{
        asyncStorageKeys: number;
        databaseRecords: number;
        fileSystemSize: number;
    }> => {
        try {
            // AsyncStorage keys count
            const keys = await AsyncStorage.getAllKeys();
            const asyncStorageKeys = keys.length;

            // Database records count
            let databaseRecords = 0;
            try {
                const collections = ['members', 'events', 'tasks', 'grocery_items', 'vault_documents', 'recipes', 'meals', 'notes'];
                for (const collectionName of collections) {
                    try {
                        const collection = database.get(collectionName);
                        const records = await collection.query().fetch();
                        databaseRecords += records.length;
                    } catch {
                        // Collection might not exist
                    }
                }
            } catch {
                // Database might not be initialized
            }

            // File system size
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

            return {
                asyncStorageKeys,
                databaseRecords,
                fileSystemSize
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                asyncStorageKeys: 0,
                databaseRecords: 0,
                fileSystemSize: 0
            };
        }
    }
};
