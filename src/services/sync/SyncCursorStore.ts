import { database } from '../../database';

// Global (legacy) keys — still used by WatermelonDB's synchronize() internally
// and by the global wipe path (deleteAllData).
const LAST_PULLED_AT_KEY = '__watermelon_last_pulled_at';
const LAST_PULLED_SCHEMA_VERSION_KEY = '__watermelon_last_pulled_schema_version';

// Per-profile keys stored in AsyncStorage (NOT the WatermelonDB adapter store)
// so switching profiles does not clobber another profile's continuation cursor.
const profileCursorKey = (profileId: string) => `sync_cursor_last_pulled_at:${profileId}`;
const profileSchemaKey = (profileId: string) => `sync_cursor_schema_version:${profileId}`;

// ---------------------------------------------------------------------------
// Low-level adapter helpers
// ---------------------------------------------------------------------------

const removeLocalKey = (key: string): Promise<void> =>
    new Promise((resolve, reject) => {
        const adapter: any = database.adapter;
        if (typeof adapter.removeLocal !== 'function') {
            resolve();
            return;
        }
        adapter.removeLocal(key, (error: Error | null) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });

// ---------------------------------------------------------------------------
// Global reset — used ONLY by deleteAllData() (full factory wipe)
// ---------------------------------------------------------------------------

/**
 * Resets the global WatermelonDB sync cursors.
 * This forces a full re-pull on the next sync.
 * ONLY call this from deleteAllData() / forceFullSync() — never from logout/login.
 */
export const resetSyncCursorState = async (): Promise<void> => {
    try {
        await Promise.all([
            removeLocalKey(LAST_PULLED_AT_KEY),
            removeLocalKey(LAST_PULLED_SCHEMA_VERSION_KEY),
        ]);
        console.log('[SyncCursorStore] Global sync cursors reset');
    } catch (error) {
        console.warn('[SyncCursorStore] Failed to reset global sync cursors:', error);
    }
};

// ---------------------------------------------------------------------------
// Per-profile cursor helpers (AsyncStorage-backed)
// ---------------------------------------------------------------------------

/**
 * Reads the last-pulled-at timestamp for a specific profile from AsyncStorage.
 * Returns null if this profile has never synced (triggers a full pull).
 */
export const getProfileLastPulledAt = async (profileId: string): Promise<number | null> => {
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const raw = await AsyncStorage.getItem(profileCursorKey(profileId));
        if (raw == null) return null;
        const parsed = parseInt(raw, 10);
        return Number.isNaN(parsed) ? null : parsed;
    } catch (error) {
        console.warn(`[SyncCursorStore] Failed to read cursor for profile ${profileId}:`, error);
        return null;
    }
};

/**
 * Persists the last-pulled-at timestamp for a specific profile.
 * Call this after a successful pull completes.
 */
export const setProfileLastPulledAt = async (profileId: string, timestamp: number): Promise<void> => {
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(profileCursorKey(profileId), timestamp.toString());
    } catch (error) {
        console.warn(`[SyncCursorStore] Failed to persist cursor for profile ${profileId}:`, error);
    }
};

/**
 * Resets the sync cursor for a single profile only.
 * Safe to call on profile switch — does NOT affect other profiles.
 */
export const resetSyncCursorStateForProfile = async (profileId: string): Promise<void> => {
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.multiRemove([
            profileCursorKey(profileId),
            profileSchemaKey(profileId),
        ]);
        console.log(`[SyncCursorStore] Cursor reset for profile: ${profileId}`);
    } catch (error) {
        console.warn(`[SyncCursorStore] Failed to reset cursor for profile ${profileId}:`, error);
    }
};
