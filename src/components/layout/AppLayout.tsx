import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { theme } from "../../theme";
import { BottomNavigation, BottomNavRoute } from "./BottomNavigation";
import { AppIcon } from "../ui/AppIcon";
import { QuickAddModal } from "../modals/QuickAddModal";
import { AddEventModal } from "../modals/AddEventModal";
import { AddTaskModal } from "../modals/AddTaskModal";
import { useTheme, useThemeRadius } from "../../contexts/ThemeContext";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { PanGestureHandler, State, PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";
import { useSidebar } from "../../contexts/SidebarContext";

type AppLayoutProps = {
  children: React.ReactNode;
  showNav?: boolean;
  showAddButton?: boolean;
  onAddPress?: () => void;
  style?: object;
  navActiveRoute?: BottomNavRoute;
  navOnNavigate?: (route: BottomNavRoute) => void;
  enablePullToRefresh?: boolean;
  disableScroll?: boolean;
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showNav = false,
  showAddButton = true,
  onAddPress,
  style = {},
  navActiveRoute,
  navOnNavigate,
  enablePullToRefresh = true,
  disableScroll = false,
}) => {
  const navigation = useNavigation<NavigationProp<{ MainTabs: { screen?: BottomNavRoute } }>>();
  const { themeVersion } = useTheme();
  const radius = useThemeRadius();
  const { openSidebar } = useSidebar();
  const { isSyncing, refreshing, refreshNow } = useSyncStatus();

  const handleNavigate = useCallback(
    (route: BottomNavRoute) => {
      navigation.navigate("MainTabs", { screen: route });
    },
    [navigation]
  );

  const onGestureEvent = useCallback((event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state !== State.ACTIVE) return;
    const { x, translationX } = event.nativeEvent;
    if (x < 60 && translationX > 20) {
      openSidebar();
    }
  }, [openSidebar]);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const refreshControl = enablePullToRefresh && !isSyncing ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refreshNow}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
    />
  ) : undefined;

  return (
    <PanGestureHandler
      onHandlerStateChange={onGestureEvent}
      activeOffsetX={[-500, 20]}
      activeOffsetY={[-10, 10]}
      failOffsetY={[-10, 10]}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
        {disableScroll ? (
          <View style={[styles.scrollView, styles.content]}>{children}</View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {children}
          </ScrollView>
        )}
        <QuickAddModal
          open={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          onAddEvent={() => setShowAddEvent(true)}
          onAddTask={() => setShowAddTask(true)}
        />
        <AddEventModal open={showAddEvent} onOpenChange={setShowAddEvent} />
        <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
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
      </View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  addButton: {
    position: "absolute",
    right: 24,
    bottom: 20,
    zIndex: 9999,
    elevation: 20,
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
