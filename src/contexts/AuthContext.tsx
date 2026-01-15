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
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    loginAsGuest: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAuthState();
    }, []);

    const loadAuthState = async () => {
        try {
            const storedGuest = await AsyncStorage.getItem("IS_GUEST");
            const storedUser = await AsyncStorage.getItem("AUTH_USER");

            if (storedGuest === "true") {
                setIsGuest(true);
            } else if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to load auth state", error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, pass: string) => {
        setIsLoading(true);
        // Simulate API call
        await new Promise<void>(resolve => setTimeout(resolve, 1000));

        // Mock user
        const newUser: User = { id: "u1", email, name: "User" };
        setUser(newUser);
        setIsGuest(false);

        await AsyncStorage.setItem("AUTH_USER", JSON.stringify(newUser));
        await AsyncStorage.removeItem("IS_GUEST");
        setIsLoading(false);
    };

    const loginAsGuest = async () => {
        setIsLoading(true);
        setIsGuest(true);
        setUser(null);
        await AsyncStorage.setItem("IS_GUEST", "true");
        await AsyncStorage.removeItem("AUTH_USER");
        setIsLoading(false);
    };

    const logout = async () => {
        setIsLoading(true);
        setUser(null);
        setIsGuest(false);
        await AsyncStorage.removeItem("AUTH_USER");
        await AsyncStorage.removeItem("IS_GUEST");
        setIsLoading(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isGuest,
            isAuthenticated: !!user || isGuest,
            isLoading,
            login,
            loginAsGuest,
            logout
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
