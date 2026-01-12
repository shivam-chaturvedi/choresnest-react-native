import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, palettes } from '../theme';

type ThemeKey = keyof typeof palettes;
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    currentPalette: ThemeKey;
    themeMode: ThemeMode;
    isDark: boolean;
    themeVersion: number; // Version counter to force re-renders
    setPalette: (key: ThemeKey) => void;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    currentPalette: 'sapphire',
    themeMode: 'system',
    isDark: true,
    themeVersion: 0,
    setPalette: () => { },
    setThemeMode: () => { },
});

export const useTheme = () => useContext(ThemeContext);

/**
 * Hook to get current theme colors.
 * Components using this hook will automatically re-render when the theme changes.
 * Use this instead of importing `theme.colors` directly.
 */
export const useThemeColors = () => {
    const { themeVersion } = useTheme();
    // themeVersion dependency ensures re-render when theme changes
    return theme.colors;
};

const THEME_STORAGE_KEY = '@app_theme_palette';
const THEME_MODE_STORAGE_KEY = '@app_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [currentPalette, setCurrentPalette] = useState<ThemeKey>('sapphire');
    const [themeMode, setThemeMode] = useState<ThemeMode>('system');
    const [themeVersion, setThemeVersion] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    // Derive actual mode (light/dark)
    const activeMode: 'light' | 'dark' = themeMode === 'system'
        ? ((systemScheme === 'light' || systemScheme === 'dark') ? systemScheme : 'dark')
        : themeMode;

    // Load theme from AsyncStorage on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const [savedPalette, savedMode] = await Promise.all([
                    AsyncStorage.getItem(THEME_STORAGE_KEY),
                    AsyncStorage.getItem(THEME_MODE_STORAGE_KEY)
                ]);

                if (savedPalette && savedPalette in palettes) {
                    setCurrentPalette(savedPalette as ThemeKey);
                }

                if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
                    setThemeMode(savedMode as ThemeMode);
                }
            } catch (error) {
                console.error('Failed to load theme from storage:', error);
            } finally {
                setIsLoaded(true);
            }
        };

        loadTheme();
    }, []);

    // Save theme to AsyncStorage whenever it changes
    useEffect(() => {
        if (!isLoaded) return; // Don't save on initial load

        const saveTheme = async () => {
            try {
                await AsyncStorage.setItem(THEME_STORAGE_KEY, currentPalette);
            } catch (error) {
                console.error('Failed to save theme to storage:', error);
            }
        };

        saveTheme();
    }, [currentPalette, isLoaded]);

    // Save theme mode to AsyncStorage whenever it changes
    useEffect(() => {
        if (!isLoaded) return; // Don't save on initial load

        const saveThemeMode = async () => {
            try {
                await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
            } catch (error) {
                console.error('Failed to save theme mode to storage:', error);
            }
        };

        saveThemeMode();
    }, [themeMode, isLoaded]);

    // Effect to update global theme when state changes
    useEffect(() => {
        try {
            theme.updateTheme(currentPalette, activeMode);
            // Increment version to force re-renders in components using theme.colors
            setThemeVersion(v => v + 1);
        } catch (error) {
            console.error("Failed to update theme:", error);
            // Fallback to safe default if something goes wrong
            try {
                theme.updateTheme('sapphire', 'dark');
                setThemeVersion(v => v + 1);
            } catch (e) {
                console.error("Critical theme failure:", e);
            }
        }
    }, [currentPalette, activeMode]);

    return (
        <ThemeContext.Provider value={{
            currentPalette,
            themeMode,
            isDark: activeMode === 'dark',
            themeVersion,
            setPalette: setCurrentPalette,
            setThemeMode: setThemeMode
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
