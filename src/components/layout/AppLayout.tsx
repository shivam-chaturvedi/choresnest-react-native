import React, { useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { theme } from "../../theme";
import { BottomNavigation, BottomNavRoute } from "./BottomNavigation";
import { AppIcon } from "../ui/AppIcon";
import { QuickAddModal } from "../modals/QuickAddModal";
import { AddEventModal } from "../modals/AddEventModal";
import { AddTaskModal } from "../modals/AddTaskModal";
import { useTheme, useThemeRadius } from "../../contexts/ThemeContext";

interface AppLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
  style?: object;
  navActiveRoute?: BottomNavRoute;
  navOnNavigate?: (route: BottomNavRoute) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showNav = false,
  showAddButton = true,
  onAddPress,
  style = {},
  navActiveRoute,
  navOnNavigate,
}) => {
  type MainTabsParamList = {
    MainTabs: { screen?: BottomNavRoute };
  };

  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();
  const { themeVersion } = useTheme(); // Force re-render on theme change
  const radius = useThemeRadius();

  const handleNavigate = useCallback(
    (route: BottomNavRoute) => {
      navigation.navigate("MainTabs", { screen: route });
    },
    [navigation]
  );

  const [showQuickAdd, setShowQuickAdd] = React.useState(false);
  const [showAddEvent, setShowAddEvent] = React.useState(false);
  const [showAddTask, setShowAddTask] = React.useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
      <View style={styles.content}>{children}</View>
      {showNav && (
        <BottomNavigation
          activeRoute={navActiveRoute}
          onNavigate={navOnNavigate ?? handleNavigate}
        />
      )}
      {showAddButton && (
        <Pressable
          key={`fab-${themeVersion}`}
          style={[styles.addButton, { backgroundColor: theme.colors.primary, borderRadius: radius.full }]}
          onPress={() => {
            if (onAddPress) {
              onAddPress();
            } else {
              setShowQuickAdd(true);
            }
          }}
        >
          <AppIcon name="plus" size={34} color={theme.colors.primaryForeground} />
        </Pressable>
      )}

      <QuickAddModal
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAddEvent={() => setShowAddEvent(true)}
        onAddTask={() => setShowAddTask(true)}
      />

      <AddEventModal open={showAddEvent} onOpenChange={setShowAddEvent} />
      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    position: "relative",
  },
  content: {
    flex: 1,
  },
  addButton: {
    position: "absolute",
    right: 24,
    bottom: 20,
    zIndex: 999,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
});
