import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, palettes } from '../theme';

// Add ShapeMode type
export type ShapeMode = 'rounded' | 'squared';

type ThemeKey = keyof typeof palettes;
export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = '@app_theme_palette';
const THEME_MODE_STORAGE_KEY = '@app_theme_mode';
const THEME_SHAPE_STORAGE_KEY = '@app_theme_shape';

// Update context interface
interface ThemeContextType {
    currentPalette: ThemeKey;
    themeMode: ThemeMode;
    shapeMode: ShapeMode;
    isDark: boolean;
    themeVersion: number;
    setPalette: (key: ThemeKey) => void;
    setThemeMode: (mode: ThemeMode) => void;
    setShapeMode: (mode: ShapeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    currentPalette: 'sapphire',
    themeMode: 'system',
    shapeMode: 'rounded',
    isDark: true,
    themeVersion: 0,
    setPalette: () => { },
    setThemeMode: () => { },
    setShapeMode: () => { },
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
    const systemScheme = useColorScheme();
    const [currentPalette, setCurrentPalette] = useState<ThemeKey>('sapphire');
    const [themeMode, setThemeMode] = useState<ThemeMode>('system');
    const [shapeMode, setShapeMode] = useState<ShapeMode>('rounded');
    const [themeVersion, setThemeVersion] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    // Derive actual mode
    const activeMode: 'light' | 'dark' = themeMode === 'system'
        ? ((systemScheme === 'light' || systemScheme === 'dark') ? systemScheme : 'dark')
        : themeMode;

    // Load theme
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const [savedPalette, savedMode, savedShape] = await Promise.all([
                    AsyncStorage.getItem(THEME_STORAGE_KEY),
                    AsyncStorage.getItem(THEME_MODE_STORAGE_KEY),
                    AsyncStorage.getItem(THEME_SHAPE_STORAGE_KEY)
                ]);

                if (savedPalette && savedPalette in palettes) {
                    setCurrentPalette(savedPalette as ThemeKey);
                }

                if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
                    setThemeMode(savedMode as ThemeMode);
                }

                if (savedShape && (savedShape === 'rounded' || savedShape === 'squared')) {
                    setShapeMode(savedShape as ShapeMode);
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
        AsyncStorage.setItem(THEME_STORAGE_KEY, currentPalette).catch(console.error);
    }, [currentPalette, isLoaded]);

    // Save mode
    useEffect(() => {
        if (!isLoaded) return;
        AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode).catch(console.error);
    }, [themeMode, isLoaded]);

    // Save shape
    useEffect(() => {
        if (!isLoaded) return;
        AsyncStorage.setItem(THEME_SHAPE_STORAGE_KEY, shapeMode).catch(console.error);
    }, [shapeMode, isLoaded]);

    // Update global theme object and bump version
    useEffect(() => {
        try {
            theme.updateTheme(currentPalette, activeMode);

            // Update radius in mutable theme object
            // Use type assertion or update theme.ts to export radii
            const { radii } = require('../theme');
            Object.assign(theme.radius, radii[shapeMode]);

            setThemeVersion(v => v + 1);
        } catch (error) {
            console.error("Failed to update theme:", error);
            // Fallback
            try {
                theme.updateTheme('sapphire', 'dark');
                setThemeVersion(v => v + 1);
            } catch (e) {
                console.error("Critical theme failure:", e);
            }
        }
    }, [currentPalette, activeMode, shapeMode]);

    return (
        <ThemeContext.Provider value={{
            currentPalette,
            themeMode,
            shapeMode,
            isDark: activeMode === 'dark',
            themeVersion,
            setPalette: setCurrentPalette,
            setThemeMode: setThemeMode,
            setShapeMode: setShapeMode
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
