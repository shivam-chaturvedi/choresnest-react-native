import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { theme, palettes } from '../theme';

// Add ShapeMode type
export type ShapeMode = 'rounded' | 'squared';

type ThemeKey = keyof typeof palettes;

const THEME_STORAGE_KEY = '@app_theme_palette';
const THEME_SHAPE_STORAGE_KEY = '@app_theme_shape';
const THEME_MODE_STORAGE_KEY = '@app_theme_mode';

// Update context interface
interface ThemeContextType {
    currentPalette: ThemeKey;
    shapeMode: ShapeMode;
    isDark: boolean;
    themeVersion: number;
    setPalette: (key: ThemeKey) => void;
    setShapeMode: (mode: ShapeMode) => void;
    toggleThemeMode: () => void;
    setThemeMode: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    currentPalette: 'sapphire',
    shapeMode: 'squared',
    isDark: false,
    themeVersion: 0,
    setPalette: () => { },
    setShapeMode: () => { },
    toggleThemeMode: () => { },
    setThemeMode: () => { },
});

export const useTheme = () => useContext(ThemeContext);

export const useThemeColors = () => {
    const { themeVersion } = useTheme();
    return theme.colors;
};

// New hook for radius
export const useThemeRadius = () => {
    const { themeVersion } = useTheme();
    return theme.radius;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [currentPalette, setCurrentPalette] = useState<ThemeKey>('sapphire');
    const [shapeMode, setShapeMode] = useState<ShapeMode>('squared');
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const [themeVersion, setThemeVersion] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load theme
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const [savedPalette, savedShape, savedMode] = await Promise.all([
                    AsyncStorage.getItem(THEME_STORAGE_KEY),
                    AsyncStorage.getItem(THEME_SHAPE_STORAGE_KEY),
                    AsyncStorage.getItem(THEME_MODE_STORAGE_KEY)
                ]);

                if (savedPalette && savedPalette in palettes) {
                    setCurrentPalette(savedPalette as ThemeKey);
                }

                if (savedShape && (savedShape === 'rounded' || savedShape === 'squared')) {
                    setShapeMode(savedShape as ShapeMode);
                } else {
                    // Default to 'rounded' as per new design requirement
                    setShapeMode('rounded');
                    AsyncStorage.setItem(THEME_SHAPE_STORAGE_KEY, 'rounded').catch(console.error);
                }

                if (savedMode !== null) {
                    setIsDarkMode(savedMode === 'dark');
                } else {
                    // Default to system, or light if system is unavailable
                    // Default to Cream (isDark=true in current implementation) as per user request
                    setIsDarkMode(true);
                }
            } catch (error) {
                console.error('Failed to load theme from storage:', error);
            } finally {
                setIsLoaded(true);
            }
        };

        loadTheme();
    }, []);

    // Save palette
    useEffect(() => {
        if (!isLoaded) return;
        try {
            AsyncStorage.setItem(THEME_STORAGE_KEY, currentPalette).catch(console.error);
        } catch (error) {
            console.error("Error saving palette:", error);
        }
    }, [currentPalette, isLoaded]);

    // Save shape
    useEffect(() => {
        if (!isLoaded) return;
        try {
            AsyncStorage.setItem(THEME_SHAPE_STORAGE_KEY, shapeMode).catch(console.error);
        } catch (error) {
            console.error("Error saving shape:", error);
        }
    }, [shapeMode, isLoaded]);

    // Save mode
    useEffect(() => {
        if (!isLoaded) return;
        try {
            AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, isDarkMode ? 'dark' : 'light').catch(console.error);
        } catch (error) {
            console.error("Error saving theme mode:", error);
        }
    }, [isDarkMode, isLoaded]);

    // Update global theme object and bump version
    useEffect(() => {
        try {
            const mode = isDarkMode ? 'dark' : 'light';
            theme.updateTheme(currentPalette, mode);

            // Update radius in mutable theme object
            // Use type assertion or update theme.ts to export radii
            const { radii } = require('../theme');
            Object.assign(theme.radius, radii[shapeMode]);

            setThemeVersion(v => v + 1);
        } catch (error) {
            console.error("Failed to update theme:", error);
            // Fallback
            try {
                theme.updateTheme('sapphire', 'light');
                setThemeVersion(v => v + 1);
            } catch (e) {
                console.error("Critical theme failure:", e);
            }
        }
    }, [currentPalette, shapeMode, isDarkMode]);

    const toggleThemeMode = () => setIsDarkMode(prev => !prev);
    const setThemeMode = (isDark: boolean) => setIsDarkMode(isDark);

    return (
        <ThemeContext.Provider value={{
            currentPalette,
            shapeMode,
            isDark: isDarkMode,
            themeVersion,
            setPalette: setCurrentPalette,
            setShapeMode: setShapeMode,
            toggleThemeMode,
            setThemeMode,
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
