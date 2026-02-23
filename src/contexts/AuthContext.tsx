import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../config/supabase";
import { SupabaseService } from "../services/SupabaseService";
import { AppSettingsService } from "../services/AppSettingsService";
import { ProfileBootstrapService } from "../services/ProfileBootstrapService";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getHumanReadableMessage } from "../utils/SupabaseErrorHandler";
import { DocumentUploadScheduler } from "../services/sync/DocumentUploadScheduler";
import { database } from "../database";
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
                    // No cache? Fallback to async check without blocking UI completely
                    supabase.auth.getSession().catch(e => console.warn('Background session fetch failed', e));
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
                // Default to safe states if initialization fails
                setUser(null);
                setIsGuest(false);
                setHasCompletedOnboarding(false);
            } finally {
                clearTimeout(timeoutId);
                setIsLoading(false);
            }
        };

        initializeAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const userData = {
                    id: session.user.id,
                    email: session.user.email!,
                    name: session.user.user_metadata?.name
                };
                setUser(userData);
                setIsGuest(false);
                AsyncStorage.removeItem("IS_GUEST");
                AsyncStorage.removeItem("GUEST_PROFILE_ID");
                AsyncStorage.setItem("AUTH_USER", JSON.stringify(userData));
                // Explicitly bind the new user's ID as the active profile to eliminate cross-login caching
                AsyncStorage.setItem('ACTIVE_PROFILE_ID', session.user.id);
                // Also update the ProfileService in-memory cache so getActiveProfileId() returns instantly
                void ProfileService.setActiveProfileId(session.user.id);
                DocumentUploadScheduler.startForUser(session.user.id);

                // Cache user details locally for guest mode discovery
                try {
                    await database.write(async () => {
                        const usersCol = database.get<UserRecord>('users');
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

                // Trigger Sync dynamically to avoid circular dependency - run in background, don't block
                // AppNavigator handles the INITIAL_SESSION sync with an 8 second delay to prevent splash screen blocking
                if (_event !== 'INITIAL_SESSION') {
                    (async () => {
                        try {
                            const { SyncService } = await import("../services/SyncService");
                            // Check if sync is already in progress before triggering
                            if (!SyncService.getSyncStatus()) {
                                // Don't await - let sync run in background
                                SyncService.sync().catch(err => {
                                    // Don't log concurrent sync errors - they're expected
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
            const { error } = await SupabaseService.signIn(email, pass);
            if (error) {
                const message = getHumanReadableMessage(error, 'login');
                onError?.('Login Failed', message);
                return false;
            }
            // State updates via onAuthStateChange
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
            // State updates via onAuthStateChange if auto-confirm is on, otherwise user waits
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
            await ProfileService.setGuestProfileId();

            setIsGuest(true);
            setUser(null);
            DocumentUploadScheduler.stop();
            setHasCompletedOnboarding(true);

            await AsyncStorage.setItem("IS_GUEST", "true");
            await AsyncStorage.removeItem("AUTH_USER");
            await AsyncStorage.setItem("HAS_COMPLETED_ONBOARDING", "true");
            console.log("AuthContext: loginAsGuest state sequence completed");
        } catch (error) {
            console.error("Guest login failed:", error);
            throw new Error("Failed to continue as guest. Please try again.");
        }
    };

    const logout = async () => {
        try {
            // First drop immediately from UI before running heavy wipe operations
            setUser(null);
            setIsGuest(false);

            // Background cleanup operations
            (async () => {
                try {
                    // Start clearing database but don't block the UI
                    const { SyncService } = await import('../services/SyncService');
                    SyncService.stopPeriodicSync();

                    const { DataCleanupService } = await import('../services/DataCleanupService');
                    await DataCleanupService.clearDatabase();
                } catch (err) {
                    console.error("AuthContext: Failed to clear database on logout", err);
                }

                ProfileBootstrapService.resetCache();
                await ProfileService.resetCache();
                await AsyncStorage.removeItem("IS_GUEST");
                DocumentUploadScheduler.stop();
                await SupabaseService.signOut();
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
            // Don't throw - onboarding is complete in memory even if storage fails
        }
    };

    const deleteAccount = async () => {
        setIsLoading(true);
        try {
            ProfileBootstrapService.resetCache();
            await ProfileService.resetCache();
            // Import DataCleanupService dynamically to avoid circular dependencies
            const { DataCleanupService } = await import('../services/DataCleanupService');

            // Delete all data from all storage mechanisms
            await DataCleanupService.deleteAllData();

            // Reset auth state
            setUser(null);
            setIsGuest(false);
            setHasCompletedOnboarding(false);

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
