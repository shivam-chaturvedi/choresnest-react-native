import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { AppIcon, AppIconName } from "../ui/AppIcon";

export type BottomNavRoute =
  | "home"
  | "calendar"
  | "tasks"
  | "lists"
  | "more";

const navItems: { label: string; route: BottomNavRoute; iconName: AppIconName }[] = [
  { label: "Home", route: "home", iconName: "home" },
  { label: "Calendar", route: "calendar", iconName: "calendar" },
  { label: "Tasks", route: "tasks", iconName: "checkSquare" },
  { label: "Lists", route: "lists", iconName: "shoppingCart" },
  { label: "More", route: "more", iconName: "more" },
];

interface BottomNavigationProps {
  activeRoute?: BottomNavRoute;
  onNavigate?: (route: BottomNavRoute) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeRoute,
  onNavigate,
}) => {
  return (
    <View style={styles.navContainer}>
      {navItems.map((item) => {
        const isActive = activeRoute === item.route;
        return (
          <Pressable
            key={item.route}
            onPress={() => onNavigate?.(item.route)}
            style={[styles.navItem, isActive && styles.navItemActive]}
          >
            <AppIcon
              name={item.iconName}
              size={18}
              color={isActive ? theme.colors.primary : theme.colors.mutedForeground}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#f4f7fc",
    borderTopWidth: 1,
    borderColor: "#dfe9f5",
    paddingVertical: theme.spacing.sm,
    shadowColor: "#0e1a3c",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  navItem: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 16,
  },
  navItemActive: {
    backgroundColor: theme.colors.card,
    borderColor: "#dfe9f5",
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
