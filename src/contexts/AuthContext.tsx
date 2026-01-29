import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    login: (email: string, pass: string) => Promise<void>;
    loginAsGuest: () => Promise<void>;
    logout: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAuthState();
    }, []);

    const loadAuthState = async () => {
        try {
            const storedGuest = await AsyncStorage.getItem("IS_GUEST");
            const storedUser = await AsyncStorage.getItem("AUTH_USER");
            const storedOnboarding = await AsyncStorage.getItem("HAS_COMPLETED_ONBOARDING");

            if (storedGuest === "true") {
                setIsGuest(true);
            } else if (storedUser) {
                setUser(JSON.parse(storedUser));
            }

            if (storedOnboarding === "true") {
                setHasCompletedOnboarding(true);
            }
        } catch (error) {
            console.error("Failed to load auth state", error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, pass: string) => {
        try {
            setIsLoading(true);
            // Simulate API call
            await new Promise<void>(resolve => setTimeout(resolve, 1000));

            // Mock user
            const newUser: User = { id: "u1", email, name: "User" };
            setUser(newUser);
            setIsGuest(false);
            setHasCompletedOnboarding(true); // Ensure this is true on login

            await AsyncStorage.setItem("AUTH_USER", JSON.stringify(newUser));
            await AsyncStorage.removeItem("IS_GUEST");
            await AsyncStorage.setItem("HAS_COMPLETED_ONBOARDING", "true");
        } catch (error) {
            console.error("Login failed:", error);
            // Re-throw with user-friendly message
            throw new Error("Failed to log in. Please try again.");
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
        try {
            setIsLoading(true);
            setUser(null);
            setIsGuest(false);

            // We DO NOT clear HAS_COMPLETED_ONBOARDING here
            await AsyncStorage.removeItem("AUTH_USER");
            await AsyncStorage.removeItem("IS_GUEST");
        } catch (error) {
            console.error("Logout failed:", error);
            // Don't throw - logout should always succeed from UI perspective
            // Even if storage fails, we clear the state
        } finally {
            setIsLoading(false);
        }
    };

    const completeOnboarding = async () => {
        try {
            setHasCompletedOnboarding(true);
            await AsyncStorage.setItem("HAS_COMPLETED_ONBOARDING", "true");
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
