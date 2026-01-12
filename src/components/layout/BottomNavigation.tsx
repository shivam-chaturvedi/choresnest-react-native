import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { AppIcon, AppIconName } from "../ui/AppIcon";
import { useTheme } from "../../contexts/ThemeContext";

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
  const { isDark, themeVersion } = useTheme(); // Force re-render on theme change

  return (
    <View style={[styles.navContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {navItems.map((item) => {
        const isActive = activeRoute === item.route;

        // Active color: Pure white for active tabs
        const activeColor = "#FFFFFF";
        // Inactive color: using mutedForeground from theme
        const inactiveColor = theme.colors.mutedForeground;

        return (
          <Pressable
            key={item.route}
            onPress={() => onNavigate?.(item.route)}
            style={[
              styles.navItem,
              isActive && { backgroundColor: isDark ? theme.colors.primary : theme.colors.primaryLight }
            ]}
          >
            <AppIcon
              name={item.iconName}
              size={isActive ? 20 : 18}
              color={isActive ? activeColor : inactiveColor}
            />
            <Text style={[
              styles.label,
              isActive && styles.labelActive,
              { color: isActive ? activeColor : inactiveColor }
            ]}>
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
    borderTopWidth: 1,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
    paddingBottom: 24, // Safety padding for bottom
  },
  navItem: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  navItemActive: {
    // backgroundColor handled dynamically
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: "800",
  },
});
