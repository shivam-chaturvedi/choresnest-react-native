import "react-native-gesture-handler";
import notifee, { EventType } from "@notifee/react-native";
import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "./src/theme";
import { FamilyProvider } from "./src/contexts/FamilyContext";
import { FinanceProvider } from "./src/contexts/FinanceContext";
import { MealPlanProvider } from "./src/contexts/MealPlanContext";
import { SidebarProvider } from "./src/contexts/SidebarContext";
import { RecipeProvider } from "./src/contexts/RecipeContext";
import { ToastProvider, useToast } from "./src/components/ui/Toast";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { AuthProvider } from "./src/contexts/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { databaseService } from "./src/services/DBService";
import { getDatabase } from "./src/database";
import Event from "./src/database/models/Event";
import Task from "./src/database/models/Task";
import {
  NotificationCategory,
  NotificationScheduler,
  RepeatMeta,
  RepeatType,
} from "./src/services/NotificationScheduler";
import { CountryProvider } from "./src/contexts/CountryContext";
import { appLockManager } from "./src/services/AppLockManager";
import { SyncIndicator } from "./src/components/SyncIndicator";
import { SyncService } from "./src/services/SyncService";
import NetInfo from "@react-native-community/netinfo";
import { PermissionPromptRenderer } from "./src/components/ui/PermissionPrompt";

const App = () => {
  useEffect(() => {
    const initDB = async () => {
      try {
        await databaseService.init();
        await NotificationScheduler.initialize();
        await NotificationScheduler.rescheduleAllMissing();
      } catch (e) {
        console.error("Failed to init DB/Notifications on launch", e);
      }
    };
    initDB();
  }, []);

  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type !== EventType.DELIVERED && type !== EventType.PRESS) {
        return;
      }

      const notification = detail.notification;
      const payload = notification?.data as Record<string, any> | undefined;
      if (!payload?.__repeatType || !payload.__category) {
        return;
      }

      const repeatType = payload.__repeatType as RepeatType;
      if (repeatType === "daily" || repeatType === "weekly") {
        return;
      }

      const repeatMeta = payload.__repeatMeta as RepeatMeta | undefined;
      let nextTrigger: Date | null = null;

      if (repeatType === "custom") {
        nextTrigger = NotificationScheduler.getNextCustomDate(repeatMeta?.dates);
      } else {
        const lastTriggerValue = payload.__lastTrigger;
        if (lastTriggerValue) {
          const lastTrigger = new Date(lastTriggerValue);
          if (!Number.isNaN(lastTrigger.getTime())) {
            nextTrigger = NotificationScheduler.computeNextDate(lastTrigger, repeatType, repeatMeta);
          }
        }
      }

      if (!nextTrigger) {
        return;
      }

      const category = payload.__category as NotificationCategory;
      if (!category) {
        return;
      }

      try {
        const newNotificationId = await NotificationScheduler.scheduleNotification(
          category,
          {
            title: notification?.title ?? "",
            body: notification?.body ?? "",
            data: { ...payload },
          },
          nextTrigger,
          {
            repeatType,
            repeatMeta,
          }
        );

        if (!newNotificationId) {
          return;
        }

        if (category === "events" && payload.eventId) {
          const db = getDatabase();
          await db.write(async () => {
            const record = await db.get<Event>("events").find(payload.eventId);
            await record.update(e => {
              e.notificationId = newNotificationId;
            });
          });
        } else if (category === "tasks" && payload.taskId) {
          const db = getDatabase();
          await db.write(async () => {
            const record = await db.get<Task>("tasks").find(payload.taskId);
            await record.update(t => {
              t.notificationId = newNotificationId;
            });
          });
        }
      } catch (error) {
        console.warn("Failed to reschedule manual repeat notification", error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Note: Sync setup is handled in AppNavigatorInner where we have access to auth context
  // This ensures sync only runs when user is authenticated

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CountryProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <ToastProvider>
              <AuthWrapper>
                <FamilyProvider>
                  <FinanceProvider>
                    <RecipeProvider>
                      <MealPlanProvider>
                        <SidebarProvider>
                          <StatusBar
                            barStyle="dark-content"
                            backgroundColor={theme.colors.background}
                            animated
                          />
                          <SafeAreaView style={styles.appWrapper} edges={["top", "bottom", "left", "right"]}>
                            <ErrorBoundary>
                              <AppNavigator />
                            </ErrorBoundary>
                          </SafeAreaView>
                        </SidebarProvider>
                      </MealPlanProvider>
                    </RecipeProvider>
                  </FinanceProvider>
                </FamilyProvider>
              </AuthWrapper>
            </ToastProvider>
          </ThemeProvider>
        </SafeAreaProvider>
        </CountryProvider>
        <PermissionPromptRenderer />
    </GestureHandlerRootView>
  );
};

const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const handleAuthError = (title: string, message: string) => {
    showToast({
      type: 'error',
      title,
      description: message,
      duration: 4000,
    });
  };

  return <AuthProvider onError={handleAuthError}>{children}</AuthProvider>;
};

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default App;
