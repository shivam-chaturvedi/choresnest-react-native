import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../config/supabase";
import { SupabaseService } from "../services/SupabaseService";
import { AppSettingsService } from "../services/AppSettingsService";
import { ProfileBootstrapService } from "../services/ProfileBootstrapService";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getHumanReadableMessage } from "../utils/SupabaseErrorHandler";
import { DocumentUploadScheduler } from "../services/sync/DocumentUploadScheduler";
import { getDatabase } from "../database";
import UserRecord from "../database/models/User";
import { Q } from "@nozbe/watermelondb";
import { ProfileService } from "../services/ProfileService";

interface User {
    id: string;
    email: string;
    name?: string;
}

interface AuthContextType {
    user: User | null;
    isGuest: boolean;
    isAuthenticated: boolean;
    hasCompletedOnboarding: boolean;
    isLoading: boolean;
    /**
     * Monotonically-increasing integer. Incremented on every login / logout /
     * guest-login / profile-switch. Pass this into any async bootstrap/sync
     * function and bail out early if it changes mid-flight to avoid acting on
     * stale auth state.
     */
    sessionEpoch: number;
    login: (email: string, pass: string) => Promise<boolean>;
    signup: (email: string, pass: string, name: string) => Promise<boolean>;
    loginAsGuest: () => Promise<void>;
    logout: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    onError?: (title: string, message: string) => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onError }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionEpoch, setSessionEpoch] = useState(0);

    // Ref copy so async callbacks can read the latest epoch without closure capture
    const epochRef = useRef(0);
    const bumpEpoch = () => {
        epochRef.current += 1;
        setSessionEpoch(epochRef.current);
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const timeoutId = setTimeout(() => {
                if (isLoading) {
                    console.warn("AuthContext: initializeAuth timed out after 5s - forcing loading to false");
                    setIsLoading(false);
                }
            }, 5000);

            try {
                console.log("AuthContext: Starting auth initialization...");
                const start = Date.now();

                // Immediately check local cached user to prevent UI blocking
                const cachedUserStr = await AsyncStorage.getItem("AUTH_USER");
                if (cachedUserStr) {
                    try {
                        const cachedUser = JSON.parse(cachedUserStr);
                        setUser(cachedUser);
                        DocumentUploadScheduler.startForUser(cachedUser.id);
                    } catch (e) {
                        console.error("AuthContext: Failed to parse cached user", e);
                    }
                } else {
                    // No AUTH_USER in our cache → user is logged-out.
                    //
                    // CRITICAL: If a stale/expired Supabase session exists in AsyncStorage,
                    // onAuthStateChange registration triggers _recoverAndRefresh internally,
                    // making a network token-refresh call that fails with "Network request failed".
                    //
                    // DO NOT call supabase.auth.signOut() — despite scope:'local', the SDK
                    // still makes a network attempt first and blocks for 46+ seconds on failure.
                    //
                    // Instead: directly delete Supabase's AsyncStorage keys. Zero network. Instant.
                    try {
                        const supabaseUrl = (await AsyncStorage.getItem('__supabase_url__')) || '';
                        // Extract project ref from stored URL OR from known keys via getAllKeys
                        const allKeys = await AsyncStorage.getAllKeys();
                        const supabaseKeys = allKeys.filter(k =>
                            k.startsWith('sb-') ||
                            k === 'supabase.auth.token' ||
                            k.includes('-auth-token') ||
                            k.includes('-auth-code-verifier')
                        );
                        if (supabaseKeys.length > 0) {
                            await AsyncStorage.multiRemove(supabaseKeys);
                            console.log(`AuthContext: Cleared ${supabaseKeys.length} stale Supabase session key(s) from AsyncStorage (no network)`);
                        }
                    } catch (e) {
                        // Ignore — stoarge error does not block auth init
                    }
                    setUser(null);
                    setIsGuest(false);
                    DocumentUploadScheduler.stop();

                }

                // Check guest mode independently
                const guest = await AsyncStorage.getItem("IS_GUEST");
                if (guest === "true") {
                    setIsGuest(true);
                }

                // Check Onboarding status globally across all profiles for this device
                let completed = await AppSettingsService.hasAnyProfileCompletedOnboarding();
                if (!completed) {
                    const asyncComplete = await AsyncStorage.getItem("HAS_COMPLETED_ONBOARDING");
                    if (asyncComplete === "true") completed = true;
                }
                setHasCompletedOnboarding(completed);
                console.log(`AuthContext: Auth initialization total time: ${Date.now() - start}ms`);

            } catch (error) {
                console.error("Failed to initialize auth state:", error);
                setUser(null);
                setIsGuest(false);
                setHasCompletedOnboarding(false);
            } finally {
                clearTimeout(timeoutId);
                setIsLoading(false);
            }
        };

        initializeAuth();

        // Listen for Supabase auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const userData = {
                    id: session.user.id,
                    email: session.user.email!,
                    name: session.user.user_metadata?.name
                };
                setUser(userData);
                setIsGuest(false);
                // Start token auto-refresh only when we have a real authenticated session
                supabase.auth.startAutoRefresh();
                AsyncStorage.removeItem("IS_GUEST");
                AsyncStorage.removeItem("GUEST_PROFILE_ID");
                AsyncStorage.setItem("AUTH_USER", JSON.stringify(userData));
                // Bind the new user's ID as the active profile before any query runs
                AsyncStorage.setItem('ACTIVE_PROFILE_ID', session.user.id);
                void ProfileService.setActiveProfileId(session.user.id);
                DocumentUploadScheduler.startForUser(session.user.id);

                // Cache user record locally for guest-mode discovery
                try {
                    await getDatabase().write(async () => {
                        const usersCol = getDatabase().get<UserRecord>('users');
                        const existing = await usersCol.query(Q.where('id', session.user.id)).fetch();
                        if (existing.length > 0) {
                            await existing[0].update(u => {
                                u.email = userData.email;
                                u.name = userData.name || '';
                                u.isGuest = false;
                                u.version = (u.version ?? 0) + 1;
                            });
                        } else {
                            await usersCol.create(u => {
                                (u._raw as any).id = session.user.id;
                                u.email = userData.email;
                                u.name = userData.name || '';
                                u.isGuest = false;
                                u.hasCompletedOnboarding = true;
                                u.version = 1;
                            });
                        }
                    });
                } catch (e) {
                    console.error("AuthContext: Failed to cache user record:", e);
                }

                // Trigger sync in background — AppNavigator handles INITIAL_SESSION with 8s delay
                if (_event !== 'INITIAL_SESSION') {
                    (async () => {
                        try {
                            const { SyncService } = await import("../services/SyncService");
                            if (!SyncService.getSyncStatus()) {
                                SyncService.sync().catch(err => {
                                    if (!err?.message?.includes('Concurrent synchronization')) {
                                        console.error("Background sync failed:", err);
                                    }
                                });
                            }
                        } catch (err) {
                            console.error("Failed to load SyncService", err);
                        }
                    })();
                }
            } else {
                // No session — stop background token refresh to prevent spurious network errors
                supabase.auth.stopAutoRefresh();
                setUser(null);
                AsyncStorage.removeItem("AUTH_USER");
                DocumentUploadScheduler.stop();
            }
        });

        return () => {
            subscription.unsubscribe();
            DocumentUploadScheduler.stop();
        };
    }, []);

    const login = async (email: string, pass: string): Promise<boolean> => {
        ProfileBootstrapService.resetCache();
        try {
            // Race against a 10-second timeout so the spinner never hangs indefinitely
            // when the device has no internet access.
            const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
                setTimeout(
                    () => resolve({ data: null, error: new Error('Network request timed out. Please check your internet connection and try again.') }),
                    10000
                )
            );
            const { error } = await Promise.race([SupabaseService.signIn(email, pass), timeoutPromise]);
            if (error) {
                const message = getHumanReadableMessage(error, 'login');
                onError?.('Login Failed', message);
                return false;
            }

            // ✅ NON-DESTRUCTIVE: bump epoch so stale async work self-aborts.
            // Do NOT call DataCleanupService.clearDatabase() — it wipes local rows.
            // The active profile will be set by onAuthStateChange above.
            bumpEpoch();
            console.log("[AuthContext] login: success — DB preserved. sessionEpoch:", epochRef.current);
            return true;
        } catch (error: any) {
            const message = getHumanReadableMessage(error, 'login');
            onError?.('Login Failed', message);
            return false;
        }
    };

    const signup = async (email: string, pass: string, name: string): Promise<boolean> => {
        ProfileBootstrapService.resetCache();
        try {
            const { error } = await SupabaseService.signUp(email, pass, name);
            if (error) {
                const message = getHumanReadableMessage(error, 'signup');
                onError?.('Signup Failed', message);
                return false;
            }

            // ✅ NON-DESTRUCTIVE: bump epoch only.
            bumpEpoch();
            console.log("[AuthContext] signup: success — DB preserved. sessionEpoch:", epochRef.current);
            return true;
        } catch (error: any) {
            const message = getHumanReadableMessage(error, 'signup');
            onError?.('Signup Failed', message);
            return false;
        }
    };

    const loginAsGuest = async (): Promise<void> => {
        try {
            console.log("AuthContext: loginAsGuest starting...");
            ProfileBootstrapService.resetCache();

            // ✅ NON-DESTRUCTIVE: set guest profile — no DB wipe.
            await ProfileService.setGuestProfileId();

            setIsGuest(true);
            setUser(null);
            DocumentUploadScheduler.stop();
            setHasCompletedOnboarding(true);
            bumpEpoch();

            await AsyncStorage.setItem("IS_GUEST", "true");
            await AsyncStorage.removeItem("AUTH_USER");
            await AsyncStorage.setItem("HAS_COMPLETED_ONBOARDING", "true");
            console.log("AuthContext: loginAsGuest complete. DB preserved. sessionEpoch:", epochRef.current);
        } catch (error) {
            console.error("Guest login failed:", error);
            throw new Error("Failed to continue as guest. Please try again.");
        }
    };

    const logout = async () => {
        try {
            // Immediately clear UI state
            setUser(null);
            setIsGuest(false);
            bumpEpoch();

            // Non-blocking background cleanup
            (async () => {
                try {
                    // Stop sync — no DB wipe, no cursor reset
                    const { SyncService } = await import('../services/SyncService');
                    SyncService.stopPeriodicSync();

                    // ✅ NON-DESTRUCTIVE session cleanup: clears in-memory caches +
                    // session AsyncStorage keys only. DB rows are PRESERVED.
                    const { DataCleanupService } = await import('../services/DataCleanupService');
                    await DataCleanupService.clearSessionCaches();
                } catch (err) {
                    console.error("AuthContext: Session cleanup error during logout", err);
                }

                ProfileBootstrapService.resetCache();
                await ProfileService.resetCache();
                await AsyncStorage.multiRemove(["IS_GUEST", "GUEST_PROFILE_ID"]);
                DocumentUploadScheduler.stop();
                await SupabaseService.signOut();
                console.log("[AuthContext] logout complete. Local DB rows PRESERVED. sessionEpoch:", epochRef.current);
            })();
        } catch (error: any) {
            const message = getHumanReadableMessage(error, 'logout');
            onError?.('Logout Failed', message);
        }
    };

    const completeOnboarding = async () => {
        try {
            setHasCompletedOnboarding(true);
            await AsyncStorage.setItem("HAS_COMPLETED_ONBOARDING", "true");
            await AppSettingsService.completeOnboarding();
        } catch (error) {
            console.error("Failed to save onboarding completion:", error);
            // Don't throw — onboarding is complete in memory even if storage fails
        }
    };

    const deleteAccount = async () => {
        setIsLoading(true);
        try {
            ProfileBootstrapService.resetCache();
            await ProfileService.resetCache();

            // ✅ DESTRUCTIVE — intentional. This is the ONLY place that wipes the DB.
            const { DataCleanupService } = await import('../services/DataCleanupService');
            await DataCleanupService.deleteAllData();

            setUser(null);
            setIsGuest(false);
            setHasCompletedOnboarding(false);
            bumpEpoch();

            console.log('Account deleted successfully');
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isGuest,
            isAuthenticated: !!user || isGuest,
            hasCompletedOnboarding,
            isLoading,
            sessionEpoch,
            login,
            signup,
            loginAsGuest,
            logout,
            completeOnboarding,
            deleteAccount
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
