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

import { PanGestureHandler, State, PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";
import { useSidebar } from "../../contexts/SidebarContext";
import { Dimensions } from "react-native";

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
  const { openSidebar } = useSidebar();

  const handleNavigate = useCallback(
    (route: BottomNavRoute) => {
      navigation.navigate("MainTabs", { screen: route });
    },
    [navigation]
  );

  const [showQuickAdd, setShowQuickAdd] = React.useState(false);
  const [showAddEvent, setShowAddEvent] = React.useState(false);
  const [showAddTask, setShowAddTask] = React.useState(false);

  const onGestureEvent = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const { x, translationX } = event.nativeEvent;
      // Detect swipe from left edge (moving Right to open)
      // Increased edge zone to 60px for easier activation
      if (x < 60 && translationX > 20) {
        openSidebar();
      }
    }
  };

  return (
    <PanGestureHandler
      onHandlerStateChange={onGestureEvent}
      // activeOffsetX: [-left_fail, +right_activate]
      // We want to activate only on Right swipe (positive). 
      // We set left threshold extremely low (-500) effectively ignoring left swipes
      // We set right threshold to 10px for quick activation
      activeOffsetX={[-500, 20]}
      activeOffsetY={[-10, 10]}
      failOffsetY={[-10, 10]}
    >
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
    </PanGestureHandler>
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
    zIndex: 9999, // Super high z-index
    elevation: 20, // High elevation for Android
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
});
