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

const PROFILE_PREFIX = "profile:";
const DEFAULT_PROFILE_KEY = `${PROFILE_PREFIX}__default__`;

const notificationsByProfile = new Map<string, AppNotification[]>();
const subscribersByProfile = new Map<string, Set<Subscriber>>();

let activeProfileId: string | null = null;
let activeProfileKey = DEFAULT_PROFILE_KEY;

const ensureProfileEntry = (key: string) => {
  if (!notificationsByProfile.has(key)) {
    notificationsByProfile.set(key, []);
  }
  if (!subscribersByProfile.has(key)) {
    subscribersByProfile.set(key, new Set());
  }
};

ensureProfileEntry(activeProfileKey);

const formatTimeLabel = () => {
  const now = new Date();
  return now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getProfileKey = (profileId?: string | null) => {
  if (profileId === undefined || profileId === null) {
    return activeProfileKey;
  }
  return `${PROFILE_PREFIX}${profileId}`;
};

const pushUpdate = (key: string) => {
  const snapshot = [...(notificationsByProfile.get(key) ?? [])];
  const subscribers = subscribersByProfile.get(key);
  if (!subscribers) {
    return;
  }
  subscribers.forEach((subscriber) => subscriber(snapshot));
};

export const NotificationCenter = {
  subscribe: (subscriber: Subscriber, profileId?: string | null) => {
    const key = getProfileKey(profileId);
    ensureProfileEntry(key);
    const subscribers = subscribersByProfile.get(key)!;
    subscribers.add(subscriber);
    subscriber([...notificationsByProfile.get(key)!]);
    return () => {
      subscribers.delete(subscriber);
    };
  },

  addNotification: (
    payload: Omit<AppNotification, "id" | "time" | "read"> & { time?: string },
    profileId?: string | null,
  ) => {
    const key = getProfileKey(profileId);
    ensureProfileEntry(key);
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
    const existing = notificationsByProfile.get(key) ?? [];
    notificationsByProfile.set(key, [notification, ...existing]);
    pushUpdate(key);
    return notification.id;
  },

  getNotifications: (profileId?: string | null) => {
    const key = getProfileKey(profileId);
    return [...(notificationsByProfile.get(key) ?? [])];
  },

  clearNotifications: (profileId?: string | null) => {
    const key = getProfileKey(profileId);
    notificationsByProfile.set(key, []);
    pushUpdate(key);
  },

  markAllRead: (profileId?: string | null) => {
    const key = getProfileKey(profileId);
    ensureProfileEntry(key);
    const updated = (notificationsByProfile.get(key) ?? []).map((notification) => ({
      ...notification,
      read: true,
    }));
    notificationsByProfile.set(key, updated);
    pushUpdate(key);
  },

  markRead: (id: string, profileId?: string | null) => {
    const key = getProfileKey(profileId);
    const entries = notificationsByProfile.get(key);
    if (!entries) {
      return;
    }
    let changed = false;
    const updated = entries.map((notification) => {
      if (notification.id === id && !notification.read) {
        changed = true;
        return { ...notification, read: true };
      }
      return notification;
    });
    if (changed) {
      notificationsByProfile.set(key, updated);
      pushUpdate(key);
    }
  },

  setActiveProfileId: (profileId: string | null) => {
    activeProfileId = profileId;
    activeProfileKey =
      profileId && profileId.length > 0 ? `${PROFILE_PREFIX}${profileId}` : DEFAULT_PROFILE_KEY;
    ensureProfileEntry(activeProfileKey);
    pushUpdate(activeProfileKey);
  },

  getActiveProfileId: () => activeProfileId,
};
