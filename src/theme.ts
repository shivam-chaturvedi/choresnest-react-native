// Custom Brand Palette provided by user
// Theme Palettes
export const palettes = {
  sapphire: {
    name: "Sapphire Veil",
    colors: ["#E7F0FA", "#7BA4D0", "#2E5E99", "#0D2440"], // Light -> Dark
    palette: {
      light: "#E7F0FA",
      mediumLight: "#7BA4D0",
      mediumDark: "#2E5E99",
      dark: "#0D2440",
    }
  },
  amber: {
    name: "Amber Mirage",
    colors: ["#FFF5E1", "#EBC176", "#C48B28", "#5A3C0B"],
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

// Helper to generate full theme colors from a palette
const createThemeColors = (paletteKey: PaletteKey, mode: 'light' | 'dark') => {
  const safePaletteKey = palettes[paletteKey] ? paletteKey : 'sapphire';
  const p = palettes[safePaletteKey].palette;
  const isDark = mode === 'dark';

  return {
    // Mode-dependent assignments
    background: isDark ? p.dark : "#FFFFFF", // Strict White for Light Mode
    foreground: isDark ? p.light : p.dark,

    // Primary usually keeps its brand identity, but might need adjustment for contrast
    primary: p.mediumDark,
    primaryForeground: "#FFFFFF",
    primaryLight: p.mediumLight,

    secondary: p.mediumLight,
    secondaryForeground: p.dark,
    accent: p.mediumLight,
    accentForeground: p.dark,
    muted: isDark ? p.mediumDark : p.light, // Use tinted light color for muted areas in light mode
    mutedForeground: isDark ? p.mediumLight : "#64748B",

    // Card background
    card: isDark ? p.dark : "#FFFFFF",

    border: isDark ? p.mediumDark : "#E2E8F0",

    success: "#22C55E",
    successLight: "#064E3B",
    successDark: "#A7F3D0",
    info: p.mediumDark,
    infoLight: p.dark,
    infoDark: p.mediumLight,
    warning: "#F59E0B",
    warningLight: "#78350F",
    warningDark: "#FDE68A",
    danger: "#EF4444",
    dangerLight: "#7F1D1D",
    dangerDark: "#FECACA",
    googleBlue: "#4285F4",
  };
};

// Initial default
const defaultColors = createThemeColors('sapphire', 'dark');

// Legacy support
// Legacy support
export const lightColors = createThemeColors('sapphire', 'light');
export const darkColors = createThemeColors('sapphire', 'dark');

export const theme = {
  colors: { ...defaultColors }, // Mutable object
  // Helper to update theme in-place
  updateTheme: (paletteKey: PaletteKey, mode: 'light' | 'dark') => {
    const newColors = createThemeColors(paletteKey, mode);
    Object.assign(theme.colors, newColors);
    theme.shadows.card.shadowColor = mode === 'dark' ? newColors.foreground : "#000000";
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
      100: "#DBEAFE",
      200: "#BFDBFE",
      500: "#3B82F6",
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
  }
};
