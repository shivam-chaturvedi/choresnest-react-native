import AsyncStorage from '@react-native-async-storage/async-storage';
import { setActiveProfile, GUEST_PROFILE_ID as DATABASE_GUEST_PROFILE_ID } from '../database';
import { NotificationCenter } from '../services/NotificationCenter';

const ACTIVE_PROFILE_KEY = 'ACTIVE_PROFILE_ID';
const GUEST_PROFILE_KEY = 'GUEST_PROFILE_ID';
const IS_GUEST_KEY = 'IS_GUEST';

// In-memory fast cache — avoids any AsyncStorage or Supabase call on the hot path
let cachedProfileId: string | null = null;
const activeProfileListeners = new Set<(profileId: string | null) => void>();

const persistActiveProfile = async (profileId: string | null) => {
    if (profileId) {
        cachedProfileId = profileId;
        await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
    } else {
        cachedProfileId = null;
        await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
    activeProfileListeners.forEach(listener => {
        try {
            listener(profileId);
        } catch (error) {
            console.error('ProfileService: Active profile listener threw', error);
        }
    });
};

/**
 * Try to read the Supabase session that the Supabase JS client persists locally
 * in AsyncStorage (key: `supabase.auth.token`). This is a fallback when the live
 * Supabase auth call times out but we know the user is logged in.
 */
const tryReadCachedSupabaseSession = async (): Promise<string | null> => {
    try {
        // Supabase JS v2 persists the session under this key by default
        const raw = await AsyncStorage.getItem('supabase.auth.token');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const userId = parsed?.currentSession?.user?.id ?? parsed?.session?.user?.id;
        return typeof userId === 'string' ? userId : null;
    } catch {
        return null;
    }
};

export const ProfileService = {
    /**
     * Call this immediately after Supabase auth state resolves (e.g. in AuthContext)
     * so that the profile ID is in the in-memory cache before any component needs it.
     */
    async setActiveProfileId(profileId: string | null): Promise<void> {
        if (profileId) {
            setActiveProfile(profileId);
            await persistActiveProfile(profileId);
            NotificationCenter.setActiveProfileId(profileId);
        } else {
            setActiveProfile(DATABASE_GUEST_PROFILE_ID);
            await persistActiveProfile(null);
            NotificationCenter.setActiveProfileId(null);
        }
    },

    /**
     * Resolves the active profile ID.
     * Resolution order (each step falls through to the next only if null):
     *  1. In-memory cache  (instant)
     *  2. AsyncStorage ACTIVE_PROFILE_ID key  (fast, offline-safe)
     *  3. Guest profile from AsyncStorage  (guest sessions)
     *  4. Live Supabase auth session  (network — 3.5 s timeout)
     *  5. Supabase session token cached in AsyncStorage  (offline fallback)
     */
    async getActiveProfileId(): Promise<string | null> {
        // 1. In-memory cache (instant — hot path)
        if (cachedProfileId) {
            return cachedProfileId;
        }

        try {
            // 2. AsyncStorage fast path
            const cachedActive = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
            if (cachedActive) {
                cachedProfileId = cachedActive;
                return cachedActive;
            }

            // 3. Guest mode
            const isGuest = await AsyncStorage.getItem(IS_GUEST_KEY);
            if (isGuest === 'true') {
                await persistActiveProfile(GUEST_PROFILE_ID);
                await AsyncStorage.setItem(GUEST_PROFILE_KEY, GUEST_PROFILE_ID);
                return GUEST_PROFILE_ID;
            }

            // No cached profile found and no guest session.
            // Do NOT fall through to a live Supabase network call here — calling
            // supabase.auth.getSession() when unauthenticated produces repeated
            // "Network request failed" errors on every effect cycle.
            // The caller (AuthContext / AppNavigator) will handle the null case
            // and redirect to the auth screen.
            return null;
        } catch (error) {
            console.error('ProfileService: Unexpected error resolving profile ID:', error);
        }

        return null;
    },

    /**
     * Persists the selected profile ID for guest mode.
     */
    async setGuestProfileId(): Promise<void> {
        await AsyncStorage.setItem(GUEST_PROFILE_KEY, DATABASE_GUEST_PROFILE_ID);
        await persistActiveProfile(DATABASE_GUEST_PROFILE_ID);
        setActiveProfile(DATABASE_GUEST_PROFILE_ID);
        NotificationCenter.setActiveProfileId(DATABASE_GUEST_PROFILE_ID);
    },

    /**
     * Resets the in-memory cache and clears stored profile IDs from AsyncStorage.
     * Should be called on logout.
     */
    async resetCache() {
        console.log('ProfileService: Resetting in-memory cache and AsyncStorage profile keys');
        cachedProfileId = null;
        setActiveProfile(DATABASE_GUEST_PROFILE_ID);
        try {
            await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
            await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
            await AsyncStorage.removeItem(IS_GUEST_KEY);
        } catch (error) {
            console.error('ProfileService: Failed to clear AsyncStorage during reset', error);
        } finally {
            NotificationCenter.setActiveProfileId(null);
            activeProfileListeners.forEach(listener => {
                try {
                    listener(null);
                } catch (inner) {
                    console.error('ProfileService: Active profile listener threw during reset', inner);
                }
            });
        }
    }
};

export const onActiveProfileChange = (listener: (profileId: string | null) => void) => {
    activeProfileListeners.add(listener);
    return () => activeProfileListeners.delete(listener);
};

export { DATABASE_GUEST_PROFILE_ID as GUEST_PROFILE_ID };
