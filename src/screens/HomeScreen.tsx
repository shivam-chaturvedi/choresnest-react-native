import React, { useEffect, useState, useMemo, useRef } from "react";
import { setupNotifications } from "../utils/notifications";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppLayout } from "../components/layout";
import { useNavigation } from "@react-navigation/native";
import { useFamily, CalendarEvent, Task } from "../contexts/FamilyContext";
import { MealType, useMealPlan } from "../contexts/MealPlanContext";
import { theme } from "../theme";
import { useThemeColors } from "../contexts/ThemeContext";
import { useCountry } from "../contexts/CountryContext";
import { AddEventModal } from "../components/modals/AddEventModal";
import { AddTaskModal } from "../components/modals/AddTaskModal";
import { AddShoppingItemModal } from "../components/modals/AddShoppingItemModal";
import { AddMemberModal } from "../components/modals/AddMemberModal";
import { FamilyOnboarding } from "../components/family/FamilyOnboarding";
import { NotificationPanel } from "../components/notifications/NotificationPanel";
import { AppNotification, NotificationCenter, NotificationRoute } from "../services/NotificationCenter";
import { useAuth } from "../contexts/AuthContext";
import { GettingStartedTutorial } from "../components/tutorial/GettingStartedTutorial";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon, AppIconName } from "../components/ui/AppIcon";
import { MemberIcon } from "../components/ui/MemberIcon";
import { PROFILE_COLORS } from "../constants/profileColors";
import { parseDateTimeInZone, safeTimeZone } from "../utils/SafeDateUtils";
import { getEventsForDate } from "../utils/EventUtils";
import Config from "react-native-config";
import { SyncService } from "../services/SyncService";
import { supabase } from "../config/supabase";

const ENABLE_RECIPE_AND_MEALS = Config.ENABLE_RECIPE_AND_MEALS !== 'false';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};


const STORAGE_TUTORIAL_KEY = "@familychore:firstSignUp";

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "🥞" },
  { key: "lunch", label: "Lunch", icon: "🍛" },
  { key: "dinner", label: "Dinner", icon: "🍝" },
];

// Alerts will be generated inside component to use dynamic colors

export const HomeScreen: React.FC = () => {
  const colors = useThemeColors();
  const radius = theme.radius; // Dynamic radius
  const { members, activeMember, events, groceryList, setActiveMember, addGroceryItem, tasks, globalVault, memberVaults, familyName, profileId } = useFamily();
  const { isGuest, logout } = useAuth();
  const { getMealsForDay, getRecipeById } = useMealPlan();
  const navigation = useNavigation<any>();
  const { openSidebar } = useSidebar();
  const { currentCountry, formatDateTime } = useCountry();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Modals
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null); // FamilyMember
  const [showFamilyOnboarding, setShowFamilyOnboarding] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await SyncService.sync(false, { mode: 'manual' });
    } catch (e) {
      console.warn('HomeScreen: Pull-to-refresh sync failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const navTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const NAV_MARK_DELAY = 3000;

  // Tutorial logic
  // Key: '@familychore:firstSignUp'
  // Values: 
  //   null -> First time app open (Show Tutorial)
  //   'false' -> Already seen (Don't show)
  //   'true' -> (Legacy/Unused but treated as unset if we wanted, but we will treating null as unset)

  const handleAddItem = (item: { name: string; quantity: number; unit: string; category: string }) => {
    try {
      addGroceryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        addedBy: activeMember?.id || "1",
        completed: false,
      });
      // Optional: Show success feedback?
    } catch (error) {
      console.error("Error adding grocery item:", error);
    }
  };



  useEffect(() => {
    const checkTutorial = async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_TUTORIAL_KEY);
        // Show if value is NULL. meaning it has never been set.
        if (value === null) {
          setShowTutorial(true);
        }
      } catch (error) {
        console.error("Failed to check tutorial status:", error);
      }
    };
    checkTutorial();

    // Setup Notifications
    const initNotifications = async () => {
      try {
        await setupNotifications();
        // Immediate notification removed as per user request to stop spam
        // await displayImmediateNotification("Welcome Back! 👋", "Notifications are working correctly. Daily reminder set for 10 PM.");

      } catch (e) {
        console.error("Notification setup failed", e);
      }
    };
    initNotifications();

  }, []);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    let isMounted = true;
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("profile_id", profileId)
          .order("updated_at", { ascending: false });

        if (!isMounted) {
          return;
        }

        if (error) {
          console.error(`[HomeScreen] Supabase events fetch failed for profile ${profileId}:`, error);
          return;
        }

        console.log(`[HomeScreen] Supabase events for profile ${profileId}:`, data);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error(`[HomeScreen] Unexpected error fetching supabase events for profile ${profileId}:`, error);
      }
    };

    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  useEffect(() => {
    return () => {
      navTimers.current.forEach((timer) => clearTimeout(timer));
      navTimers.current = [];
    };
  }, []);

  const handleTutorialClose = async () => {
    try {
      // When closed, we mark it as seen ('false').
      await AsyncStorage.setItem(STORAGE_TUTORIAL_KEY, "false");
      setShowTutorial(false);
    } catch (error) {
      console.error("Error closing tutorial:", error);
      setShowTutorial(false); // Still close it
    }
  };

  // Dynamic Alerts derived from real data
  const [notificationAlerts, setNotificationAlerts] = useState<AppNotification[]>([]);
  const [manualNotifications, setManualNotifications] = useState<AppNotification[]>(NotificationCenter.getNotifications());

  useEffect(() => {
    const unsubscribe = NotificationCenter.subscribe((items) => {
      setManualNotifications(items);
    });
    return unsubscribe;
  }, []);

  const todaysDateLabel = useMemo(() => new Date().toISOString().split("T")[0], []);
  const timeZone = useMemo(() => safeTimeZone(currentCountry?.timeZone), [currentCountry?.timeZone]);
  const todaysEvents = useMemo(() => {
    return getEventsForDate(new Date(), events as any[], [], timeZone) as CalendarEvent[];
  }, [events, timeZone]);
  const parseEventDateTime = (event: any): { dateTime: Date | null; isAllDay: boolean } => {
    const isAllDay = !event?.time || event.time === "All Day";
    const dateTime = parseDateTimeInZone(event?.date, currentCountry.timeZone, event?.time);
    return { dateTime, isAllDay };
  };

  const parseTimeToMinutes = (time?: string | null): number | null => {
    if (!time) return null;
    const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] ?? "0", 10);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return (hours * 60) + minutes;
  };

  type ScheduleItem = {
    id: string;
    type: "event" | "task";
    title: string;
    timeLabel: string;
    minutes: number | null;
    icon?: string;
    source: CalendarEvent | Task;
  };

  const SCHEDULE_ITEM_HEIGHT = 80;

  const todaysScheduleItems = useMemo<ScheduleItem[]>(() => {
    const scheduleItems: ScheduleItem[] = [];

    todaysEvents.forEach((event: CalendarEvent) => {
      const minutes = parseTimeToMinutes(event.time);
      scheduleItems.push({
        id: event.id,
        type: "event",
        title: event.title || "Untitled Event",
        timeLabel: event.time || "All Day",
        minutes,
        icon: event.icon,
        source: event,
      });
    });

    tasks
      .filter((task: Task) => task.date === todaysDateLabel)
      .forEach((task: Task) => {
        const dueLabel = task.due || "All Day";
        const minutes = parseTimeToMinutes(dueLabel);
        scheduleItems.push({
          id: task.id,
          type: "task",
          title: task.name,
          timeLabel: dueLabel,
          minutes,
          icon: task.icon,
          source: task,
        });
      });

    return scheduleItems.sort((a, b) => {
      const aValue = a.minutes !== null ? a.minutes : -1;
      const bValue = b.minutes !== null ? b.minutes : -1;
      return aValue - bValue;
    });
  }, [tasks, todaysDateLabel, todaysEvents]);

  useEffect(() => {
    const previousRead = new Map(notificationAlerts.map(alert => [alert.id, alert.read]));
    const newAlerts: AppNotification[] = [];
    const todayStr = todaysDateLabel;

    // 1. Events Today
    todaysEvents.forEach((e: any) => {
      const prevRead = previousRead.get(`evt-${e.id}`);
      newAlerts.push({
        id: `evt-${e.id}`,
        title: "Event Today",
        detail: `${e.title} at ${e.time}`,
        tone: colors.primary + '20',
        textColor: colors.primary,
        icon: "calendar",
        time: "Today",
        read: prevRead ?? false,
        route: { tab: "calendar" },
      });
    });

    // 2. Pending Tasks (High Priority)
    const highPriorityTasks = tasks.filter((t: any) => t.priority === 'high' && t.status === 'pending');
    highPriorityTasks.forEach((t: any) => {
      const prevRead = previousRead.get(`task-${t.id}`);
      newAlerts.push({
        id: `task-${t.id}`,
        title: "High Priority Task",
        detail: t.name,
        tone: colors.danger + '20',
        textColor: colors.danger,
        icon: "checkSquare",
        time: t.due, // "Today" or ISO date
        read: prevRead ?? false,
        route: { tab: "more", screen: "Tasks" },
      })
    });

    // 3. Pending Grocery Items
    const pendingItems = groceryList.filter((i: any) => !i.completed);
    if (pendingItems.length > 0) {
      const prevRead = previousRead.get("grocery-pending");
      newAlerts.push({
        id: "grocery-pending",
        title: "Grocery Needed",
        detail: `${pendingItems.length} items to buy`,
        tone: colors.warning + '20',
        textColor: colors.warning,
        icon: "shoppingCart",
        time: "Now",
        read: prevRead ?? false,
        route: { tab: "lists" },
      });
    }

    setNotificationAlerts(newAlerts);
  }, [todaysEvents, groceryList, tasks, colors]);

  const alerts = [...manualNotifications, ...notificationAlerts];
  const visibleAlerts = useMemo(() => alerts.filter((alert) => !alert.read), [alerts]);

  const markDynamicAlertRead = (id: string) => {
    setNotificationAlerts(prev =>
      prev.map((alert) => (alert.id === id ? { ...alert, read: true } : alert))
    );
  };

  const navigateForNotification = (route?: NotificationRoute) => {
    if (!route) return;
    const { tab, screen, params } = route;
    navigation.navigate("MainTabs", {
      screen: tab,
      params: screen ? { screen, params } : params,
    } as any);
  };

  const finalizeNotification = (notification: AppNotification, isManual: boolean) => {
    if (!isManual) {
      setNotificationAlerts((prev) => prev.filter((item) => item.id !== notification.id));
    }
  };

  const scheduleNotificationFinalization = (notification: AppNotification, isManual: boolean) => {
    const timer = setTimeout(() => {
      finalizeNotification(notification, isManual);
      navTimers.current = navTimers.current.filter((t) => t !== timer);
    }, NAV_MARK_DELAY);
    navTimers.current.push(timer);
  };

  const markReadImmediate = (notification: AppNotification, isManual: boolean) => {
    if (isManual) {
      NotificationCenter.markRead(notification.id);
    } else {
      markDynamicAlertRead(notification.id);
    }
  };

  const handleNotificationPress = (notification: AppNotification) => {
    const isManual = manualNotifications.some((n) => n.id === notification.id);
    markReadImmediate(notification, isManual);
    if (notification.route) {
      navigateForNotification(notification.route);
    }
    scheduleNotificationFinalization(notification, isManual);
    setShowNotifications(false);
  };

  const handleAlertPress = (alert: AppNotification) => {
    handleNotificationPress(alert);
  };

  const formatDateTimeValue = (date?: string, time?: string) => {
    if (!date && !time) return null;
    return [date, time].filter(Boolean).join(" · ");
  };

  const renderDetailRow = (label: string, value?: string | number | null) => (
    <View style={[styles.detailRow, { borderColor: colors.border, backgroundColor: colors.card + "10", borderRadius: radius.md }]}>
      <Text style={[styles.detailLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.primary }]} numberOfLines={2}>
        {value ? value : "No Info Available"}
      </Text>
    </View>
  );

  const renderPairRow = (
    leftLabel: string,
    leftValue?: string | number | null,
    rightLabel?: string,
    rightValue?: string | number | null
  ) => (
    <View style={styles.detailPairRow}>
      <View style={[styles.detailRowHalf, { borderColor: colors.border, backgroundColor: colors.card + "05", borderRadius: radius.md }]}>
        <Text style={[styles.detailLabel, { color: colors.foreground }]}>{leftLabel}</Text>
        <Text style={[styles.detailValue, { color: colors.primary }]} numberOfLines={2}>
          {leftValue ? leftValue : "No Info Available"}
        </Text>
      </View>
      {rightLabel && (
        <View style={[styles.detailRowHalf, { borderColor: colors.border, backgroundColor: colors.card + "05", borderRadius: radius.md }]}>
          <Text style={[styles.detailLabel, { color: colors.foreground }]}>{rightLabel}</Text>
          <Text style={[styles.detailValue, { color: colors.primary }]} numberOfLines={2}>
            {rightValue ? rightValue : "No Info Available"}
          </Text>
        </View>
      )}
    </View>
  );

  const closeEventDetail = () => setSelectedEvent(null);

  const handleClearAllNotifications = () => {
    setNotificationAlerts([]);
    NotificationCenter.clearNotifications();
    setShowNotifications(false);
  };

  const handleMarkAllAsRead = () => {
    setNotificationAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
    NotificationCenter.markAllRead();
  };

  const quickActions: { label: string; iconName: AppIconName; action: () => void; color: string; bg: string }[] = [
    { label: "Event", iconName: "calendar", action: () => setShowAddEvent(true), color: colors.info, bg: colors.info + '25' },
    { label: "Task", iconName: "checkSquare", action: () => setShowAddTask(true), color: colors.success, bg: colors.success + '25' },
    { label: "Item", iconName: "shoppingCart", action: () => setShowAddItem(true), color: colors.warning, bg: colors.warning + '25' },
    ...(ENABLE_RECIPE_AND_MEALS ? [
      { label: "Recipe", iconName: "utensils" as AppIconName, action: () => (navigation as any).navigate("home", { screen: "Recipes" }), color: colors.primary, bg: colors.muted }
    ] : [
      { label: "Vault", iconName: "lock" as AppIconName, action: () => (navigation as any).navigate("home", { screen: "Vault" }), color: colors.primary, bg: colors.muted }
    ])
  ];

  const todayKey = new Date().toISOString().split("T")[0];
  const todayMeals = getMealsForDay(todayKey) || [];
  const pendingGroceries = (groceryList || []).filter((item: any) => !item.completed).length;

  // Calculate actual vault document count dynamically
  const documentsCount = useMemo(() => {
    const globalCount = (globalVault || []).length;
    const memberCount = Object.values(memberVaults || {}).reduce((total: number, docs: any) => total + docs.length, 0);
    return globalCount + memberCount;
  }, [globalVault, memberVaults]);

  const mealSummary = MEAL_TYPES.map((mealType) => {
    try {
      const plannedMeal = (todayMeals || []).find((meal) => meal.mealType === mealType.key);
      const recipe = plannedMeal ? getRecipeById(plannedMeal.recipeId) : undefined;

      return {
        label: mealType.label,
        detail: recipe ? recipe.name : "Plan a meal",
        icon: mealType.icon,
        hasMeal: !!plannedMeal,
      };
    } catch (error) {
      console.error("Error in mealSummary map:", error);
      return {
        label: mealType.label,
        detail: "Plan a meal",
        icon: mealType.icon,
        hasMeal: false,
      };
    }
  });

  const glanceMetrics = [
    { label: "Events", value: todaysEvents.length },
    { label: "Tasks", value: (tasks || []).filter((t: any) => t.status === 'pending').length },
    { label: "Shopping", value: (groceryList || []).filter((item: any) => !item.completed).length },
  ];

  return (
    <>
      <AppLayout>
        <ScrollView
          contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Header */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={openSidebar} style={[styles.menuButton, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.sm }]}>
              <AppIcon name="menu" size={24} color={colors.foreground} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <View style={styles.topActions}>
              <Pressable onPress={() => setShowSearch(true)} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.sm }]}>
                <AppIcon name="search" size={24} color={colors.foreground} />
              </Pressable>
              <Pressable onPress={() => setShowNotifications(true)} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.sm }]}>
                <AppIcon name="bell" size={24} color={colors.foreground} />
                {visibleAlerts.length > 0 && <View style={[styles.notificationDot, { backgroundColor: colors.danger }]} />}
              </Pressable>
            </View>
          </View>

          <View style={{ marginBottom: 24, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 14, color: colors.mutedForeground, fontWeight: "500" }}>
              {formatDateTime(new Date(), { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground, marginTop: 4 }}>
              {(() => {
                const hour = new Date().getHours();
                if (hour < 5) return "Good Night";
                if (hour < 12) return "Good Morning";
                if (hour < 17) return "Good Afternoon";
                if (hour < 21) return "Good Evening";
                return "Good Night";
              })()}, {activeMember?.name || "Me"} 👋
            </Text>
          </View>

          {/* Family Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground, borderRadius: radius.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="users" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>{familyName}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={() => setShowFamilyOnboarding(true)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                  <AppIcon name="user" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>Setup</Text>
                </Pressable>
              </View>
            </View>
            <View style={[styles.profileInfoBox, { borderRadius: radius.sm, backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.profileInfoText, { color: colors.mutedForeground }]}>
                Profiles keep each member's tasks and reminders separate. Tap any avatar to switch to their view or hit the + button to invite someone new so the whole family stays tracked together.
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 12, marginLeft: 4, fontStyle: 'italic' }}>
              Long press profile to edit
            </Text>
            <View style={styles.membersRow}>
              {(members || []).map((member: any) => {
                const profileColor = PROFILE_COLORS.find((c: any) => c.value === member.color)?.hex || colors.primary;
                return (
                  <Pressable
                    key={member?.id || Math.random().toString()}
                    onPress={() => {
                      console.log('=== Profile Pressed ===');
                      console.log('Member:', member.name, 'ID:', member.id, 'isActive:', member.isActive);
                      try {
                        if (member && member.id) {
                          console.log('Calling setActiveMember with ID:', member.id);
                          setActiveMember(member);
                        } else {
                          console.error('Invalid member object:', member);
                        }
                      } catch (e) {
                        console.error("Error switching member:", e);
                      }
                    }}
                    delayLongPress={500}
                    onLongPress={() => {
                      console.log('=== Profile Long Pressed ===');
                      ReactNativeHapticFeedback.trigger("impactHeavy", hapticOptions);
                      setEditingMember(member);
                      setShowMemberModal(true);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={[styles.memberCard]}
                  >
                    <View style={[styles.memberIconWrapper, {
                      borderColor: member?.isActive ? profileColor : colors.border,
                      backgroundColor: member?.isActive ? profileColor : colors.card,
                      borderRadius: radius.card,
                      borderWidth: 2,
                    }]}>
                      <MemberIcon symbol={member?.symbol} size={28} color={member?.isActive ? "#fff" : colors.foreground} />
                      {member?.isActive && <View style={[styles.activeDot, { backgroundColor: colors.success, borderColor: colors.card }]} />}
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: member?.isActive ? profileColor : colors.mutedForeground }}>
                      {member?.name || "Member"}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Add Member Button */}
              <Pressable
                style={[styles.memberCard]}
                onPress={() => setShowMemberModal(true)}
              >
                <View style={[styles.memberIconWrapper, {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  borderRadius: radius.card,
                  borderWidth: 2,
                  borderStyle: 'dashed'
                }]}>
                  <AppIcon name="plus" size={24} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.mutedForeground }}>
                  Add
                </Text>
              </Pressable>
            </View>

          </View>

          {/* Today at a Glance - Primary Card */}
          <View style={[styles.card, { backgroundColor: colors.primary, borderWidth: 0, shadowColor: colors.primary, borderRadius: radius.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="sparkles" size={20} color={colors.primaryForeground} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primaryForeground }}>Today at a Glance</Text>
              </View>
            </View>
            <View style={styles.glanceStats}>
              {glanceMetrics.map((metric, index) => (
                <View
                  key={metric.label}
                  style={[
                    styles.glanceStat,
                    {
                      backgroundColor: colors.primaryForeground + '26',
                      borderRadius: radius.md
                    },
                    index < glanceMetrics.length - 1 && styles.glanceStatSpacing,
                  ]}
                >
                  <Text style={[styles.glanceStatValue, { color: colors.primaryForeground }]}>{metric.value}</Text>
                  <Text style={[styles.glanceStatLabel, { color: colors.primaryForeground + 'CC' }]} numberOfLines={1} adjustsFontSizeToFit>{metric.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ marginTop: 8, marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              {quickActions.map((action) => (
                <Pressable key={action.label} style={[styles.quickActionItem, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]} onPress={action.action}>
                  <View style={[styles.quickActionIcon, { backgroundColor: action.bg, borderRadius: radius.sm }]}>
                    <AppIcon name={action.iconName} size={24} color={action.color} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: colors.foreground, textAlign: "center" }}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Today's Schedule */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground, borderRadius: radius.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="calendar" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Today's Schedule</Text>
              </View>
              <Pressable onPress={() => (navigation as any).navigate('MainTabs', { screen: 'calendar' })}>
                <Text style={[styles.linkText, { color: colors.primary }]}>View All ›</Text>
              </Pressable>
            </View>
            {todaysScheduleItems.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, fontStyle: 'italic', marginVertical: 8 }}>Nothing on the calendar for today</Text>
            ) : (
              <ScrollView
                style={{ maxHeight: SCHEDULE_ITEM_HEIGHT * 3.5 }}
                contentContainerStyle={{ paddingBottom: 4 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                scrollEnabled={true}
              >
                {todaysScheduleItems.map((item) => (
                  <Pressable
                    key={`${item.type}-${item.id}`}
                    style={({ pressed }) => [
                      styles.scheduleRow,
                      {
                        backgroundColor: colors.muted,
                        borderRadius: radius.md,
                        opacity: pressed ? 0.85 : 1,
                        marginBottom: 6,
                      },
                    ]}
                    onPress={() => {
                      if (item.type === "event") {
                        // Only show info modal, not edit form (edit form only in calendar screen)
                        setSelectedEvent(item.source as CalendarEvent);
                      } else {
                        (navigation as any).navigate("MainTabs", { screen: "more", params: { screen: "Tasks" } });
                      }
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.scheduleIconBox, { backgroundColor: colors.card, borderRadius: radius.xs }]}>
                        <MemberIcon symbol={item.icon || (item.type === "task" ? "format-list-checks" : "calendar")} size={24} color={colors.foreground} />
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>{item.title}</Text>
                        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
                          <AppIcon name="clock" size={12} color={colors.mutedForeground} /> {item.timeLabel}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.scheduleAvatar, { backgroundColor: colors.primary, borderRadius: radius.xs }]}>
                      <AppIcon name={item.type === "task" ? "checkSquare" : "user"} size={14} color={colors.primaryForeground} />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Meals Today */}
          {ENABLE_RECIPE_AND_MEALS && (
            <View style={[styles.card, styles.cardSpacing, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground, borderRadius: radius.card }]}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="utensils" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Meals Today</Text>
                </View>
                <Pressable onPress={() => (navigation as any).navigate("MealPlan")}>
                  <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14 }}>Meal Plan ›</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {mealSummary.map((meal) => (
                    <Pressable
                      key={meal.label}
                      onPress={() => (navigation as any).navigate("MealPlan")}
                      style={[styles.mealItem, { backgroundColor: meal.hasMeal ? colors.success + '20' : colors.muted, borderRadius: radius.md }]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 20 }}>{meal.icon}</Text>
                        {meal.hasMeal && <AppIcon name="check" size={14} color={colors.success} />}
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: "auto" }}>{meal.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }} numberOfLines={2}>{meal.detail}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Alerts */}
          <View style={{ marginBottom: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <AppIcon name="alert" size={18} color={colors.warning} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Alerts & Reminders</Text>
              </View>
              <Pressable onPress={() => setShowNotifications(true)}>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>Show all</Text>
              </Pressable>
            </View>

            {/* Persistent Guest Mode Alert */}
            {isGuest && (
              <Pressable
                style={[
                  styles.alertRow,
                  {
                    backgroundColor: '#fff3cd',
                    borderColor: '#ffeeba',
                    borderRadius: radius.md,
                    marginBottom: 8,
                  },
                ]}
                onPress={() => {
                  Alert.alert(
                    "Guest Mode",
                    "You are currently using the app as a guest. All data is stored locally on this device. Create an account to backup your data.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Login / Sign Up",
                        onPress: async () => {
                          try {
                            await logout();
                          } catch (error) {
                            console.error("Error logging out from guest mode:", error);
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <View style={[styles.alertIconBox, { backgroundColor: 'transparent' }]}>
                  <AppIcon name="alertCircle" size={20} color="#856404" />
                </View>
                <View style={styles.alertText}>
                  <Text style={{ fontWeight: "600", fontSize: 15, color: "#856404" }}>Guest Mode Active</Text>
                  <Text style={{ marginTop: 2, fontSize: 13, color: "#856404" }}>Data is local only (not backed up)</Text>
                </View>
                <AppIcon name="chevronRight" size={16} color="#856404" />
              </Pressable>
            )}

            {visibleAlerts.slice(0, 3).map((alert) => (
              <Pressable
                key={alert.id}
                style={({ pressed }) => [
                  styles.alertRow,
                  {
                    backgroundColor: alert.tone,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => handleAlertPress(alert)}
              >
                <View style={[styles.alertIconBox]}>
                  <AppIcon name={alert.icon} size={20} color={alert.textColor} />
                </View>
                <View style={styles.alertText}>
                  <Text style={{ fontWeight: "600", fontSize: 15, color: alert.textColor }}>{alert.title}</Text>
                  <Text style={{ marginTop: 2, fontSize: 13, color: alert.textColor }}>{alert.detail}</Text>
                </View>
                <AppIcon name="chevronRight" size={16} color={alert.textColor} />
              </Pressable>
            ))}
            {visibleAlerts.length > 3 && (
              <Pressable
                style={{ alignSelf: "flex-start", marginTop: 8 }}
                onPress={() => setShowNotifications(true)}
              >
                <Text style={{ fontSize: 14, color: colors.primary }}>Show all alerts</Text>
              </Pressable>
            )}
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <Pressable
              style={[styles.statCard, { marginRight: 12, backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground, borderRadius: radius.card }]}
              onPress={() => (navigation as any).navigate("MainTabs", { screen: "lists" })}
            >
              <View style={[styles.statIconCircle, { backgroundColor: colors.info + '25' }]}>
                <AppIcon name="shoppingCart" size={20} color={colors.info} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Grocery</Text>
              <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground, marginVertical: 4 }}>{pendingGroceries}</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>items pending</Text>
            </Pressable>
            <Pressable
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground, borderRadius: radius.card }]}
              onPress={() => (navigation as any).navigate("Vault")}
            >
              <View style={[styles.statIconCircle, { backgroundColor: colors.primary + '25' }]}>
                <AppIcon name="shield" size={20} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Vault</Text>
              <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground, marginVertical: 4 }}>{documentsCount}</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>documents</Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppLayout >

      {selectedEvent && (
        <Modal visible transparent animationType="slide" onRequestClose={closeEventDetail}>
          <Pressable style={styles.detailOverlay} onPress={closeEventDetail}>
            <Pressable
              style={[
                styles.detailModal,
                {
                  backgroundColor: colors.background,
                  borderRadius: radius.card,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
              onPress={() => { }}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.detailModalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}>
                  <View style={[styles.detailIconBox, { backgroundColor: colors.primary + "15" }]}>
                    <Text style={[styles.detailIcon, { color: colors.primary }]}>{selectedEvent.icon || "📅"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailHeaderTitle, { color: colors.foreground }]}>
                      {selectedEvent.title || "Untitled Event"}
                    </Text>
                    <Text style={[styles.detailHeaderSubtitle, { color: colors.mutedForeground }]}>
                      {formatDateTimeValue(selectedEvent.dateString || selectedEvent.date, selectedEvent.time) || "No Info Available"}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={closeEventDetail} style={styles.detailCloseButton}>
                  <AppIcon name="x" size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.detailContent}>
                {renderDetailRow("Description", selectedEvent.description)}
                {renderPairRow(
                  "Schedule Start",
                  formatDateTimeValue(selectedEvent.dateString || selectedEvent.date, selectedEvent.time),
                  "Schedule End",
                  formatDateTimeValue(selectedEvent.endDate, selectedEvent.endTime)
                )}
                {renderPairRow(
                  "Repeat",
                  selectedEvent.isRecurring ? (selectedEvent.recurrenceRule || "Recurring schedule") : null,
                  "Reminder",
                  selectedEvent.reminderOffsetMinutes !== undefined && selectedEvent.reminderOffsetMinutes !== null
                    ? `${selectedEvent.reminderOffsetMinutes} minute${selectedEvent.reminderOffsetMinutes === 1 ? "" : "s"} before`
                    : null
                )}
                {renderPairRow(
                  "Location",
                  selectedEvent.location,
                  "Assigned to",
                  (() => {
                    if (!selectedEvent.memberId) return null;
                    const member = members.find((m: any) => m.id === selectedEvent.memberId);
                    return member?.name ?? null;
                  })()
                )}
                {renderDetailRow("Notes", selectedEvent.notes)}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )
      }

      <NotificationPanel
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={alerts}
        onClearAll={handleClearAllNotifications}
        onMarkAllRead={handleMarkAllAsRead}
        onNotificationPress={handleNotificationPress}
      />
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      <GettingStartedTutorial open={showTutorial} onClose={handleTutorialClose} />

      <AddEventModal open={showAddEvent} onOpenChange={setShowAddEvent} />
      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
      <AddShoppingItemModal
        visible={showAddItem}
        onClose={() => setShowAddItem(false)}
        onAdd={handleAddItem}
      />
      <AddMemberModal
        open={showMemberModal}
        onClose={() => {
          setShowMemberModal(false);
          setEditingMember(null);
        }}
        memberToEdit={editingMember}
      />
      <FamilyOnboarding open={showFamilyOnboarding} onClose={() => setShowFamilyOnboarding(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  card: {
    padding: theme.spacing.lg,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  profileInfoBox: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  profileInfoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  cardSpacing: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  membersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  memberCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    width: "22%",
    marginBottom: 8,
  },
  memberIconWrapper: {
    width: 56,
    height: 56,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  glanceStats: {
    flexDirection: "row",
    gap: 12,
  },
  glanceStat: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  glanceStatSpacing: {
    marginRight: 0,
  },
  glanceStatValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  glanceStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  quickActionItem: {
    flex: 1,
    aspectRatio: 0.9,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  linkText: {
    fontWeight: "600",
    fontSize: 14,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
  },
  scheduleIconBox: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleAvatar: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mealItem: {
    width: 140,
    height: 120,
    padding: 12,
    justifyContent: "space-between",
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  alertIconBox: {
    marginRight: 12,
  },
  alertText: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: "space-between",
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: "center",
    marginBottom: 12,
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 16,
    zIndex: 2,
  },
  detailModal: {
    width: "100%",
    maxHeight: "70%",
    overflow: "hidden",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  detailModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  detailIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailIcon: {
    fontSize: 24,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  detailHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  detailCloseButton: {
    padding: 8,
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  detailRow: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: "600",
    textAlign: "center",
  },
  detailPairRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  detailRowHalf: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },
});

export default HomeScreen;
