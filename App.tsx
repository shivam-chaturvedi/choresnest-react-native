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
import { ToastProvider } from "./src/components/ui/Toast";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { databaseService } from "./src/services/DBService";
import { database } from "./src/database";
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
          await database.write(async () => {
            const record = await database.get<Event>("events").find(payload.eventId);
            await record.update(e => {
              e.notificationId = newNotificationId;
            });
          });
        } else if (category === "tasks" && payload.taskId) {
          await database.write(async () => {
            const record = await database.get<Task>("tasks").find(payload.taskId);
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

  const [shouldRequireStartupAuth] = useState(false);

  useEffect(() => {
    appLockManager.requestFreshAuth();
  }, []);

  // Note: Sync setup is handled in AppNavigatorInner where we have access to auth context
  // This ensures sync only runs when user is authenticated

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CountryProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <FamilyProvider>
              <FinanceProvider>
                <RecipeProvider>
                  <MealPlanProvider>
                    <SidebarProvider>
                      <ToastProvider>
                        <StatusBar
                          barStyle="dark-content"
                          backgroundColor={theme.colors.background}
                          animated
                        />
                        <SafeAreaView style={styles.appWrapper} edges={["top", "bottom", "left", "right"]}>
                          <ErrorBoundary>
                            <AppNavigator shouldRequireAuthOnStartup={shouldRequireStartupAuth} />
                          </ErrorBoundary>
                        </SafeAreaView>
                      </ToastProvider>
                    </SidebarProvider>
                  </MealPlanProvider>
                </RecipeProvider>
              </FinanceProvider>
            </FamilyProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </CountryProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default App;
