import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import { theme } from "../theme";

interface SplashScreenProps {
  onContinue: () => void;
  isLoading?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onContinue }) => {
  useEffect(() => {
    const timer = setTimeout(onContinue, 2000);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
        <View style={[styles.logoWrapper, { backgroundColor: theme.colors.card }]}>
          <Text style={styles.logoIcon}>🏠</Text>
          <View style={[styles.badgeContainer, { backgroundColor: theme.colors.success }]}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        </View>
        <Text style={[styles.title, { color: theme.colors.primaryForeground }]}>Family Chores</Text>
        <Text style={[styles.subtitle, { color: theme.colors.primaryForeground + 'B3' }]}>One app for your entire family</Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryForeground + '33' }]} onPress={onContinue}>
          <Text style={[styles.buttonText, { color: theme.colors.primaryForeground }]}>Family Calendar</Text>
        </Pressable>
        <View style={styles.dotRow}>
          <View style={[styles.dot, styles.dotActive, { backgroundColor: theme.colors.primaryForeground }]} />
          <View style={[styles.dot, { backgroundColor: theme.colors.primaryForeground + '40' }]} />
          <View style={[styles.dot, { backgroundColor: theme.colors.primaryForeground + '40' }]} />
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
    borderRadius: 28,
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
    borderRadius: 14,
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
    borderRadius: 999,
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
    borderRadius: 5,
    marginHorizontal: 4,
  },
  dotActive: {
    // Style applied via inline background color
  },
});
