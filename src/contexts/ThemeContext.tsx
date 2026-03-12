import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { theme, palettes, AppearanceMode } from '../theme';

// Add ShapeMode type
export type ShapeMode = 'rounded' | 'squared';

type ThemeKey = keyof typeof palettes;
const DEFAULT_PALETTE: ThemeKey = 'sapphire';
const DEFAULT_APPEARANCE: AppearanceMode = 'cream';

const THEME_STORAGE_KEY = '@app_theme_palette';
const THEME_SHAPE_STORAGE_KEY = '@app_theme_shape';
const THEME_MODE_STORAGE_KEY = '@app_theme_mode';

// Update context interface
interface ThemeContextType {
    currentPalette: ThemeKey;
    shapeMode: ShapeMode;
    isDark: boolean;
    appearanceMode: AppearanceMode;
    themeVersion: number;
    theme: typeof theme;
    setPalette: (key: ThemeKey) => void;
    setShapeMode: (mode: ShapeMode) => void;
    toggleThemeMode: () => void;
    setThemeMode: (isDark: boolean) => void;
    setAppearanceMode: (mode: AppearanceMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    currentPalette: DEFAULT_PALETTE,
    shapeMode: 'squared',
    isDark: false,
    appearanceMode: 'cream',
    themeVersion: 0,
    theme,
    setPalette: () => { },
    setShapeMode: () => { },
    toggleThemeMode: () => { },
    setThemeMode: () => { },
    setAppearanceMode: () => { },
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
    const [currentPalette, setCurrentPalette] = useState<ThemeKey>(DEFAULT_PALETTE);
    const [shapeMode, setShapeMode] = useState<ShapeMode>('squared');
    const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(DEFAULT_APPEARANCE);
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
                } else {
                    setCurrentPalette(DEFAULT_PALETTE);
                    AsyncStorage.setItem(THEME_STORAGE_KEY, DEFAULT_PALETTE).catch(console.error);
                }

                if (savedShape && (savedShape === 'rounded' || savedShape === 'squared')) {
                    setShapeMode(savedShape as ShapeMode);
                } else {
                    // Default to 'rounded' as per new design requirement
                    setShapeMode('rounded');
                    AsyncStorage.setItem(THEME_SHAPE_STORAGE_KEY, 'rounded').catch(console.error);
                }

                if (savedMode && ['light', 'cream', 'midnight'].includes(savedMode)) {
                    setAppearanceMode(savedMode as AppearanceMode);
                } else {
                    // Default to Cream as per prior UX
                    setAppearanceMode(DEFAULT_APPEARANCE);
                    AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, DEFAULT_APPEARANCE).catch(console.error);
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
            AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, appearanceMode).catch(console.error);
        } catch (error) {
            console.error("Error saving theme mode:", error);
        }
    }, [appearanceMode, isLoaded]);

    // Update global theme object and bump version
    useEffect(() => {
        try {
            theme.updateTheme(currentPalette, appearanceMode);

            const { radii } = require('../theme');
            Object.assign(theme.radius, radii[shapeMode]);

        setThemeVersion(v => v + 1);
        } catch (error) {
            console.error("Failed to update theme:", error);
            try {
                theme.updateTheme('sapphire', 'light');
                setThemeVersion(v => v + 1);
            } catch (e) {
                console.error("Critical theme failure:", e);
            }
        }
    }, [currentPalette, shapeMode, appearanceMode]);

    const isDarkMode = appearanceMode !== 'light';
    const toggleThemeMode = () => setAppearanceMode(prev => (prev === 'light' ? 'cream' : 'light'));
    const setThemeMode = (isDark: boolean) => setAppearanceMode(isDark ? 'cream' : 'light');

    return (
        <ThemeContext.Provider value={{
            currentPalette,
            shapeMode,
            isDark: isDarkMode,
            appearanceMode,
            themeVersion,
            theme,
            setPalette: setCurrentPalette,
            setShapeMode: setShapeMode,
            toggleThemeMode,
            setThemeMode,
            setAppearanceMode,
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
