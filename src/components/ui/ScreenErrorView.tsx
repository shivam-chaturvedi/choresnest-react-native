import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { AppIcon } from "./AppIcon";

interface ScreenErrorViewProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  actionLabel?: string;
}

export const ScreenErrorView: React.FC<ScreenErrorViewProps> = ({
  message,
  title = "Something went wrong",
  onRetry,
  actionLabel = "Try again",
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
      <AppIcon name="alertCircle" size={32} color={colors.danger} style={styles.icon} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: pressed ? `${colors.primary}ee` : colors.primary,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 32,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  icon: {
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
