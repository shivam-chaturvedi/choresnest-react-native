import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { LocalCacheService } from './LocalCacheService';

const ACTIVE_PROFILE_KEY = 'ACTIVE_PROFILE_ID';
const GUEST_PROFILE_KEY = 'GUEST_PROFILE_ID';
const IS_GUEST_KEY = 'IS_GUEST';

// In-memory fast cache — avoids any AsyncStorage or Supabase call on the hot path
let cachedProfileId: string | null = null;

const persistActiveProfile = async (profileId: string | null) => {
    if (profileId) {
        cachedProfileId = profileId;
        await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
    } else {
        cachedProfileId = null;
        await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
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
        await persistActiveProfile(profileId);
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
        // 1. In-memory cache
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
                const guestProfile = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
                if (guestProfile) {
                    await persistActiveProfile(guestProfile);
                    return guestProfile;
                } else {
                    const defaultGuestId = 'local_guest_profile';
                    await persistActiveProfile(defaultGuestId);
                    await AsyncStorage.setItem(GUEST_PROFILE_KEY, defaultGuestId);
                    return defaultGuestId;
                }
            }

            // 4. Live Supabase auth session (with timeout)
            try {
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Supabase Auth Timeout')), 3500)
                );
                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
                if (session?.user) {
                    await persistActiveProfile(session.user.id);
                    return session.user.id;
                }
            } catch (authError: any) {
                if (authError?.message === 'Supabase Auth Timeout') {
                    // 5. Fallback: read Supabase's own locally cached session token
                    const cachedUserId = await tryReadCachedSupabaseSession();
                    if (cachedUserId) {
                        console.log('ProfileService: Auth timed out but found cached session; using cached user ID.');
                        await persistActiveProfile(cachedUserId);
                        return cachedUserId;
                    }
                    console.warn('ProfileService: Supabase Auth Timeout — no cached session found either.');
                } else {
                    console.error('ProfileService: Failed to resolve active profile ID (auth):', authError);
                }
            }
        } catch (error) {
            console.error('ProfileService: Unexpected error resolving profile ID:', error);
        }

        return null;
    },

    /**
     * Persists the selected profile ID for guest mode.
     */
    async setGuestProfileId(profileId: string | null): Promise<void> {
        if (profileId) {
            await AsyncStorage.setItem(GUEST_PROFILE_KEY, profileId);
            await persistActiveProfile(profileId);
        } else {
            await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
            await persistActiveProfile(null);
        }
    },

    /**
     * Resets the in-memory cache and clears stored profile IDs from AsyncStorage.
     * Should be called on logout.
     */
    async resetCache() {
        console.log('ProfileService: Resetting in-memory cache and AsyncStorage profile keys');
        cachedProfileId = null;
        try {
            await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
            await AsyncStorage.removeItem(GUEST_PROFILE_KEY);
            await AsyncStorage.removeItem(IS_GUEST_KEY);
        } catch (error) {
            console.error('ProfileService: Failed to clear AsyncStorage during reset', error);
        }
    }
};


