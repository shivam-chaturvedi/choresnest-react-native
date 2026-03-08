// Custom Brand Palette provided by user
// Theme Palettes
export const palettes = {
  sapphire: {
    name: "Sapphire Veil",
    colors: ["#d6e5f6ff", "#719dcdff", "#356aaaff", "#092342ff"], // Light -> Dark
    palette: {
      light: "#c4dbf1ff",
      mediumLight: "#0c4684ff",
      mediumDark: "#265084ff",
      dark: "#07182dff",
    }
  },
  amber: {
    name: "Amber Mirage",
    colors: ["#f7e8caff", "#e2b566ff", "#e8aa3fff", "#684307ff"],
    palette: {
      light: "#FFF5E1",
      mediumLight: "#EBC176",
      mediumDark: "#C48B28",
      dark: "#5A3C0B",
    }
  },
  obsidian: {
    name: "Obsidian Rose",
    colors: ["#F7E8EC", "#C57C8A", "#732C3F", "#1A0B12"],
    palette: {
      light: "#F7E8EC",
      mediumLight: "#C57C8A",
      mediumDark: "#732C3F",
      dark: "#1A0B12",
    }
  }
};

type PaletteKey = keyof typeof palettes;
export type AppearanceMode = 'light' | 'cream' | 'midnight';

// Helper to generate full theme colors from a palette
export const createThemeColors = (paletteKey: PaletteKey, mode: AppearanceMode) => {
  const safePaletteKey = palettes[paletteKey] ? paletteKey : 'sapphire';
  const p = palettes[safePaletteKey].palette;
  const isMidnight = mode === 'midnight';

  const backgroundPalette: Record<AppearanceMode, string> = {
    light: "#FFFFFF",
    cream: "#efede4ff",
    midnight: "#03040A",
  };

  const cardPalette: Record<AppearanceMode, string> = {
    light: "#FFFFFF",
    cream: "#f6f3edff",
    midnight: "#262737ff",
  };

  const borderPalette: Record<AppearanceMode, string> = {
    light: "#E2E8F0",
    cream: "#E6D7C7",
    midnight: "#363640ff",
  };

  const shadowPalette: Record<AppearanceMode, string> = {
    light: "#E2E8F0",
    cream: "#C8A97F",
    midnight: "#171616ff",
  };

  return {
    background: backgroundPalette[mode],
    foreground: isMidnight ? "#F9FAFB" : p.dark,

    // Primary: Keep brand identity
    primary: p.mediumDark,
    primaryForeground: "#FFFFFF",
    primaryLight: p.mediumLight,

    secondary: p.mediumLight,
    secondaryForeground: p.dark,
    accent: p.mediumLight,
    accentForeground: p.dark,
    muted: isMidnight ? "#31445eff" : p.light,
    mutedForeground: isMidnight ? "#CBD5F5" : "#64748B",

    card: cardPalette[mode],

    border: borderPalette[mode],

    success: "#22C55E",
    successLight: "#DCFCE7",
    successDark: "#15803D",
    info: p.mediumDark,
    infoLight: p.light,
    infoDark: p.mediumDark,
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    warningDark: "#B45309",
    danger: "#EF4444",
    dangerLight: "#FEE2E2",
    dangerDark: "#B91C1C",
    googleBlue: "#4285F4",
    shadow: shadowPalette[mode],
  };
};

// Initial default
const defaultColors = createThemeColors('sapphire', 'cream');

// Legacy support
// Legacy support
export const lightColors = createThemeColors('sapphire', 'light');
export const darkColors = createThemeColors('sapphire', 'dark');

export const theme = {
  colors: { ...defaultColors }, // Mutable object
  // Helper to update theme in-place
  updateTheme: (paletteKey: PaletteKey, mode: AppearanceMode) => {
    const newColors = createThemeColors(paletteKey, mode);
    Object.assign(theme.colors, newColors);
    theme.shadows.card.shadowColor = newColors.shadow;
  },
  palettes,
  lightColors, // For legacy/reference
  darkColors,  // For legacy/reference
  palette: {
    ...palettes.sapphire.palette,
    slate: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A",
    },
    blue: {
      50: "#EFF6FF",
      100: "#acc8ecff",
      200: "#a1c3edff",
      500: "#2f75e6ff",
      600: "#2563EB",
      800: "#1E40AF",
      900: "#1E3A8A",
    },
    emerald: {
      50: "#ECFDF5",
      100: "#DCFCE7",
      500: "#10B981",
      600: "#059669",
    },
    amber: {
      100: "#FEF3C7",
      500: "#F59E0B",
      800: "#92400E",
    },
    rose: {
      100: "#FFE4E6",
      500: "#F43F5E",
    }
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
  },
  shadows: {
    card: {
      shadowColor: "#E7F0FA",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    }
  },
  // Radius will be updated dynamically
  radius: {
    xs: 2,
    sm: 2,
    md: 4,
    lg: 4,
    xl: 6,
    xxl: 8,
    card: 4,
    button: 4,
    full: 12,
  }
};

export const radii = {
  rounded: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    card: 16,
    button: 16,
    full: 9999,
  },
  squared: {
    xs: 2,
    sm: 2,
    md: 4,
    lg: 4,
    xl: 6,
    xxl: 8,
    card: 4,
    button: 4,
    full: 12, // Slightly rounded for squared mode FABs
  }
};
