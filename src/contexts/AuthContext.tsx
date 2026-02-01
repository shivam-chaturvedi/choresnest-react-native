import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../config/supabase";
import { SupabaseService } from "../services/SupabaseService";
import { AppSettingsService } from "../services/AppSettingsService";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getHumanReadableMessage } from "../utils/SupabaseErrorHandler";

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
            try {
                // Check active session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email!,
                        name: session.user.user_metadata?.full_name
                    });
                }

                // Check guest mode independently
                const guest = await AsyncStorage.getItem("IS_GUEST");
                if (guest === "true") {
                    setIsGuest(true);
                }

                // Check Onboarding status from AppSettingsService
                const completed = await AppSettingsService.hasCompletedOnboarding();
                setHasCompletedOnboarding(completed);

            } catch (error) {
                console.error("Failed to initialize auth state:", error);
                // Default to safe states if initialization fails
                setUser(null);
                setIsGuest(false);
                setHasCompletedOnboarding(false);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    name: session.user.user_metadata?.full_name
                });
                setIsGuest(false);
                AsyncStorage.removeItem("IS_GUEST");
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, pass: string): Promise<boolean> => {
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (email: string, pass: string, name: string): Promise<boolean> => {
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const loginAsGuest = async () => {
        try {
            setIsLoading(true);
            setIsGuest(true);
            setUser(null);
            setHasCompletedOnboarding(true); // Ensure this is true on login

            await AsyncStorage.setItem("IS_GUEST", "true");
            await AsyncStorage.removeItem("AUTH_USER");
            await AsyncStorage.setItem("HAS_COMPLETED_ONBOARDING", "true");
        } catch (error) {
            console.error("Guest login failed:", error);
            // Re-throw with user-friendly message
            throw new Error("Failed to continue as guest. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await SupabaseService.signOut();
            setUser(null);
            setIsGuest(false);
            await AsyncStorage.removeItem("IS_GUEST");
            // Supabase client handles session removal
        } catch (error: any) {
            const message = getHumanReadableMessage(error, 'logout');
            onError?.('Logout Failed', message);
        } finally {
            setIsLoading(false);
        }
    };

    const completeOnboarding = async () => {
        try {
            setHasCompletedOnboarding(true);
            await AppSettingsService.completeOnboarding();
        } catch (error) {
            console.error("Failed to save onboarding completion:", error);
            // Don't throw - onboarding is complete in memory even if storage fails
        }
    };

    const deleteAccount = async () => {
        setIsLoading(true);
        try {
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
