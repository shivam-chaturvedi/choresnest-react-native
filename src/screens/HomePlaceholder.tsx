import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { AppLayout } from "../components/layout";
import { theme } from "../theme";
import { useSidebar } from "../contexts/SidebarContext";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";

interface HomePlaceholderProps {
  onReset: () => void;
}

export const HomePlaceholder: React.FC<HomePlaceholderProps> = ({ onReset }) => {
  const { openSidebar } = useSidebar();
  const colors = useThemeColors();
  const radius = useThemeRadius();

  return (
    <AppLayout>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Chores Nest</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          This placeholder sits inside the shared layout components (AppLayout,
          BottomNavigation, AppSidebar). You can extend the remaining screens
          using the same building blocks.
        </Text>
        <Pressable style={[styles.actionButton, { backgroundColor: colors.primary, borderRadius: radius.lg }]} onPress={openSidebar}>
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Open Menu</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: colors.primary, borderRadius: radius.lg }]} onPress={onReset}>
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Revisit Onboarding</Text>
        </Pressable>
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    width: "100%",
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  actionText: {
    fontWeight: "600",
  },
});
