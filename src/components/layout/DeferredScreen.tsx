import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppLayout } from "./AppLayout";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { theme } from "../../theme";
import { useDeferredRender } from "../../hooks/useDeferredRender";

export type DeferredLayoutOverrides = {
  showNav?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
  disableScroll?: boolean;
  style?: object;
};

export type DeferredScreenOptions = {
  /** Title displayed inside the placeholder before the real screen mounts */
  title?: string;
  /** Optional subtitle to reassure the user data is still loading */
  subtitle?: string;
  /** Extra delay after interactions before showing content */
  delay?: number;
  /** Props forwarded to the placeholder's layout container */
  layoutProps?: DeferredLayoutOverrides;
};

export const withDeferredScreen = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: DeferredScreenOptions = {}
): React.FC<P> => {
  const { title, subtitle, delay = 0, layoutProps } = options;

  const DeferredComponent: React.FC<P> = (props) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const ready = useDeferredRender(delay);

    if (!ready) {
      return (
        <AppLayout {...layoutProps}>
          <View style={[styles.container, { backgroundColor: colors.background }]}> 
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.card,
                  shadowColor: colors.foreground,
                },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.title, { color: colors.foreground }]}>{title ?? "Loading..."}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
              ) : null}
            </View>
          </View>
        </AppLayout>
      );
    }

    return <WrappedComponent {...props} />;
  };

  DeferredComponent.displayName = `Deferred(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;
  return DeferredComponent;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    elevation: 4,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: theme.spacing.md,
  },
  subtitle: {
    fontSize: 14,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
});
