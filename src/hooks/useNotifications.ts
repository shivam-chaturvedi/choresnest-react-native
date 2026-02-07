import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useToast } from "../components/ui/Toast";

type NotificationPermissionState = "default" | "granted" | "denied";

// Type-safe access to web Notification API (only available on web platform)
const getWebNotificationAPI = (): {
  permission: NotificationPermissionState;
  requestPermission(): Promise<NotificationPermissionState>;
  new (title: string, options?: { body: string }): any;
} | null => {
  if (Platform.OS !== "web") return null;
  // @ts-ignore - window is only available on web, TypeScript doesn't know this
  if (typeof window !== "undefined" && window.Notification) {
    // @ts-ignore - Notification API exists on web
    return window.Notification;
  }
  return null;
};

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  type: "event" | "meal-prep";
}

export const useNotifications = () => {
  const toast = useToast();
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);

  useEffect(() => {
    // In React Native, we don't use the web Notification API
    // Notifications are handled by @notifee/react-native
    // For web compatibility check, use Platform check
    const WebNotification = getWebNotificationAPI();
    if (WebNotification) {
      setPermission(WebNotification.permission);
    } else {
      // React Native - assume granted since we use Notifee
      setPermission("granted");
    }
  }, []);

  const showNotification = useCallback(
    (title: string, body: string) => {
      // Web platform check
      const WebNotification = getWebNotificationAPI();
      if (WebNotification && permission === "granted") {
        try {
          new WebNotification(title, { body });
          return;
        } catch (error) {
          console.warn("Notification failed", error);
        }
      }

      // Fallback to toast for React Native or when web notifications aren't available
      toast.showToast({
        id: Date.now().toString(),
        title,
        description: body,
        type: "default",
      });
    },
    [permission, toast]
  );

  const requestPermission = useCallback(async () => {
    // Web platform check
    const WebNotification = getWebNotificationAPI();
    if (WebNotification) {
      try {
        const result = await WebNotification.requestPermission();
        setPermission(result);
        if (result === "granted") {
          toast.showToast({
            title: "Notifications enabled",
            description: "You will receive reminders for events and meal prep.",
            id: Date.now().toString(),
          });
          return true;
        } else {
          toast.showToast({
            title: "Notifications blocked",
            description: "Please enable notifications in your device settings.",
            id: Date.now().toString(),
          });
          return false;
        }
      } catch (error) {
        console.error("Failed to request permission", error);
        return false;
      }
    }

    // React Native - notifications are handled by @notifee/react-native
    // Permission is requested through the native notification system
    setPermission("granted");
    return true;
  }, [toast]);

  const scheduleNotification = useCallback(
    (notification: Omit<ScheduledNotification, "id">) => {
      const id = Date.now().toString();
      const newNotification: ScheduledNotification = { ...notification, id };

      setScheduledNotifications((prev) => [...prev, newNotification]);

      const delay = notification.scheduledTime.getTime() - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          showNotification(notification.title, notification.body);
          setScheduledNotifications((prev) => prev.filter((item) => item.id !== id));
        }, delay);
      }

      return id;
    },
    [showNotification]
  );

  const cancelNotification = useCallback((id: string) => {
    setScheduledNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const cancelAllNotifications = useCallback(() => {
    setScheduledNotifications([]);
  }, []);

  const scheduleEventReminder = useCallback(
    (title: string, eventTime: Date, reminderMinutes = 30) => {
      const reminderTime = new Date(eventTime.getTime() - reminderMinutes * 60 * 1000);
      return scheduleNotification({
        title: `Reminder: ${title}`,
        body: `Starting in ${reminderMinutes} minutes`,
        scheduledTime: reminderTime,
        type: "event",
      });
    },
    [scheduleNotification]
  );

  const scheduleMealPrepReminder = useCallback(
    (mealName: string, mealTime: Date, prepMinutes = 60) => {
      const reminderTime = new Date(mealTime.getTime() - prepMinutes * 60 * 1000);
      return scheduleNotification({
        title: `Time to prepare: ${mealName}`,
        body: `Start prepping now for ${mealTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        scheduledTime: reminderTime,
        type: "meal-prep",
      });
    },
    [scheduleNotification]
  );

  return {
    permission,
    requestPermission,
    scheduleNotification,
    scheduleEventReminder,
    scheduleMealPrepReminder,
    cancelNotification,
    cancelAllNotifications,
    scheduledNotifications,
  };
};
