import { AppIconName } from "../components/ui/AppIcon";

export interface NotificationRoute {
  tab: "home" | "calendar" | "lists" | "more";
  screen?: string;
  params?: Record<string, any>;
}

export interface AppNotification {
  id: string;
  title: string;
  detail: string;
  tone?: string;
  textColor?: string;
  icon?: AppIconName;
  time?: string;
  read?: boolean;
  route?: NotificationRoute;
}

type Subscriber = (notifications: AppNotification[]) => void;

const subscribers = new Set<Subscriber>();
let notifications: AppNotification[] = [];

const pushUpdate = () => {
  const snapshot = [...notifications];
  subscribers.forEach((subscriber) => subscriber(snapshot));
};

const formatTimeLabel = () => {
  const now = new Date();
  return now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const NotificationCenter = {
  subscribe: (subscriber: Subscriber) => {
    subscribers.add(subscriber);
    subscriber([...notifications]);
    return () => {
      subscribers.delete(subscriber);
    };
  },

  addNotification: (payload: Omit<AppNotification, "id" | "time" | "read"> & { time?: string }) => {
    const notification: AppNotification = {
      id: payload.id ?? generateId(),
      title: payload.title,
      detail: payload.detail,
      icon: payload.icon,
      tone: payload.tone,
      textColor: payload.textColor,
      time: payload.time ?? formatTimeLabel(),
      route: payload.route,
      read: false,
    };
    notifications = [notification, ...notifications];
    pushUpdate();
    return notification.id;
  },

  getNotifications: () => [...notifications],

  clearNotifications: () => {
    notifications = [];
    pushUpdate();
  },

  markAllRead: () => {
    notifications = notifications.map((notification) => ({ ...notification, read: true }));
    pushUpdate();
  },

  markRead: (id: string) => {
    let changed = false;
    notifications = notifications.map((notification) => {
      if (notification.id === id && !notification.read) {
        changed = true;
        return { ...notification, read: true };
      }
      return notification;
    });
    if (changed) {
      pushUpdate();
    }
  },
};
