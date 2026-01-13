import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, StatusBar } from "react-native";
import { theme, createThemeColors, palettes, radii } from "../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SplashScreenProps {
  onContinue: (destination: "Onboarding" | "Auth") => void;
  isLoading?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onContinue }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [splashColors, setSplashColors] = useState(theme.colors);
  const [splashRadius, setSplashRadius] = useState(theme.radius);

  useEffect(() => {
    const initSplash = async () => {
      // 1. Load saved theme preferences in parallel to avoid flash
      // Default to what we have, but try to fetch latest
      try {
        const [savedPalette, savedShape, savedMode, hasSeen] = await Promise.all([
          AsyncStorage.getItem('@app_theme_palette'),
          AsyncStorage.getItem('@app_theme_shape'),
          AsyncStorage.getItem('@app_theme_mode'),
          AsyncStorage.getItem("HAS_SEEN_ONBOARDING")
        ]);

        // Resolve Config
        const palette = (savedPalette && savedPalette in palettes) ? savedPalette : 'sapphire';
        const mode = savedMode === 'dark' ? 'dark' : 'light'; // Default light
        const shape = (savedShape === 'squared') ? 'squared' : 'rounded';

        // Generate Colors
        const colors = createThemeColors(palette as any, mode);
        const radius = radii[shape];

        setSplashColors(colors);
        setSplashRadius(radius);

        // 2. Animate In (Fade + Scale)
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          })
        ]).start();

        // 3. Wait for minimum duration (500ms requested)
        await new Promise(resolve => setTimeout(resolve, 800)); // slightly more than 500 for animation to finish nicely

        // 4. Navigate
        if (hasSeen === "true") {
          onContinue("Auth");
        } else {
          onContinue("Onboarding");
        }

      } catch (error) {
        console.error("Splash error:", error);
        // Fallback
        onContinue("Onboarding");
      }
    };

    initSplash();
  }, [onContinue, fadeAnim, scaleAnim]);

  return (
    <View style={[styles.container, { backgroundColor: splashColors.background }]}>
      <StatusBar
        barStyle={splashColors.background === '#FFFFFF' ? "dark-content" : "light-content"}
        backgroundColor={splashColors.background}
      />

      <Animated.View
        style={[
          styles.hero,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={[styles.logoWrapper, { backgroundColor: splashColors.card, borderRadius: splashRadius.xxl }]}>
          <Text style={styles.logoIcon}>🏠</Text>
          <View style={[styles.badgeContainer, { backgroundColor: splashColors.success, borderRadius: splashRadius.full }]}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: splashColors.primary }]}>Family Chores</Text>
        <Text style={[styles.subtitle, { color: splashColors.mutedForeground }]}>One app for your entire family</Text>

        <View style={styles.dotRow}>
          <View style={[styles.dot, { backgroundColor: splashColors.primary, borderRadius: splashRadius.xs }]} />
          <View style={[styles.dot, { backgroundColor: splashColors.primary + '40', borderRadius: splashRadius.xs }]} />
          <View style={[styles.dot, { backgroundColor: splashColors.primary + '40', borderRadius: splashRadius.xs }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logoWrapper: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 40,
  },
  badgeContainer: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    marginTop: 10,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  dotRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  dot: {
    width: 10,
    height: 10,
    marginHorizontal: 4,
  },
});
