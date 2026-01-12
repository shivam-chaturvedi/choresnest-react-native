import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import { theme } from "../theme";

import AsyncStorage from "@react-native-async-storage/async-storage";

interface SplashScreenProps {
  onContinue: (destination: "Onboarding" | "Auth") => void;
  isLoading?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onContinue }) => {
  const radius = theme.radius;

  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem("HAS_SEEN_ONBOARDING");
        // Efficient checking - practically instant, just await storage
        // A tiny delay (e.g. 500ms) can be kept for smooth transition if needed, 
        // but user requested "super fast". removing artificial delay.
        // await new Promise((resolve) => setTimeout(() => resolve(null), 2000)); 


        if (hasSeen === "true") {
          onContinue("Auth");
        } else {
          onContinue("Onboarding");
        }
      } catch (e) {
        // Fallback
        setTimeout(() => onContinue("Onboarding"), 2000);
      }
    };

    checkFirstTime();
  }, [onContinue]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
        <View style={[styles.logoWrapper, { backgroundColor: theme.colors.card, borderRadius: radius.xxl }]}>
          <Text style={styles.logoIcon}>🏠</Text>
          <View style={[styles.badgeContainer, { backgroundColor: theme.colors.success, borderRadius: radius.full }]}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        </View>
        <Text style={[styles.title, { color: theme.colors.primaryForeground }]}>Family Chores</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primaryForeground + 'B3' }]}>One app for your entire family</Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.colors.primaryForeground + '33', borderRadius: radius.full }]}
          // Optional manual override if needed, though usually Splash is auto
          onPress={() => { }}
        >
          <Text style={[styles.buttonText, { color: theme.colors.primaryForeground }]}>Loading...</Text>
        </Pressable>
        <View style={styles.dotRow}>
          <View style={[styles.dot, styles.dotActive, { backgroundColor: theme.colors.primaryForeground, borderRadius: radius.xs }]} />
          <View style={[styles.dot, { backgroundColor: theme.colors.primaryForeground + '40', borderRadius: radius.xs }]} />
          <View style={[styles.dot, { backgroundColor: theme.colors.primaryForeground + '40', borderRadius: radius.xs }]} />
        </View>
      </View>
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
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  logoWrapper: {
    width: 96,
    height: 96,
    // borderRadius moved
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
    position: "relative",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    // borderRadius moved
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  title: {
    marginTop: theme.spacing.sm,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    // borderRadius moved
    marginBottom: theme.spacing.lg,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  dotRow: {
    flexDirection: "row",
    marginTop: theme.spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    // borderRadius moved
    marginHorizontal: 4,
  },
  dotActive: {
    // Style applied via inline background color
  },
});
