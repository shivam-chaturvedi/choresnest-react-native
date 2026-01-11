import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppLayout } from "../components/layout/AppLayout";
import { useNavigation } from "@react-navigation/native";
import { useFamily } from "../contexts/FamilyContext";
import { MealType, useMealPlan } from "../contexts/MealPlanContext";
import { theme } from "../theme";
import { AddEventModal } from "../components/modals/AddEventModal";
import { AddMemberModal } from "../components/modals/AddMemberModal";
import { AddTaskModal } from "../components/modals/AddTaskModal";
import { AddItemModal } from "../components/modals/AddItemModal";
import { FamilyOnboarding } from "../components/family/FamilyOnboarding";
import { FamilyDashboard } from "../components/dashboard/FamilyDashboard";
import { NotificationPanel } from "../components/notifications/NotificationPanel";
import { GettingStartedTutorial } from "../components/tutorial/GettingStartedTutorial";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon, AppIconName } from "../components/ui/AppIcon";

const STORAGE_TUTORIAL_KEY = "@familychore:hasSeenTutorial";
const palette = theme.palette;
const CARD_RADIUS = 16;
const SMALL_RADIUS = 12;

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "🥞" },
  { key: "lunch", label: "Lunch", icon: "🍛" },
  { key: "dinner", label: "Dinner", icon: "🍝" },
];

const alerts: {
  id: string;
  title: string;
  detail: string;
  tone: string;
  textColor: string;
  icon: AppIconName;
}[] = [
    {
      id: "1",
      title: "Grocery Running Low",
      detail: "Milk, Eggs, Bread needed",
      tone: "#FEF3C7", // amber-100
      textColor: "#92400E", // amber-800
      icon: "shoppingCart",
    },
    {
      id: "2",
      title: "LPG Refill Due",
      detail: "Book cylinder before Jan 15",
      tone: "#FEF9C3", // yellow-100
      textColor: "#854D0E", // yellow-800
      icon: "bell",
    },
    {
      id: "3",
      title: "Warranty Expiring",
      detail: "TV warranty expires in 30 days",
      tone: "#E0F2FE", // sky-100
      textColor: "#075985", // sky-800
      icon: "alert",
    },
  ];

export const HomeScreen: React.FC = () => {
  const { members, activeMember, events, groceryList, setActiveMember } = useFamily();
  const { getMealsForDay, getRecipeById } = useMealPlan();
  const navigation = useNavigation();
  const { openSidebar } = useSidebar();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Modals
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showFamilyOnboarding, setShowFamilyOnboarding] = useState(false);

  // Dashboard Toggle
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_TUTORIAL_KEY).then((value) => {
      if (!value) {
        setShowTutorial(true);
      }
    });
  }, []);

  const handleTutorialClose = async () => {
    await AsyncStorage.setItem(STORAGE_TUTORIAL_KEY, "true");
    setShowTutorial(false);
  };

  const quickActions: { label: string; iconName: AppIconName; action: () => void; color: string; bg: string }[] = [
    { label: "Event", iconName: "calendar", action: () => setShowAddEvent(true), color: "#2563EB", bg: "#EFF6FF" },
    { label: "Task", iconName: "checkSquare", action: () => setShowAddTask(true), color: "#16A34A", bg: "#DCFCE7" },
    { label: "Item", iconName: "shoppingCart", action: () => setShowAddItem(true), color: "#EA580C", bg: "#FFEDD5" },
    // { label: "Recipe", iconName: "utensils", action: () => { }, color: "#4F46E5", bg: "#E0E7FF" },
    { label: "Recipe", iconName: "utensils", action: () => navigation.navigate("Recipes" as never), color: theme.colors.primary, bg: theme.colors.muted },
  ];

  const todayKey = new Date().toISOString().split("T")[0];
  const todayMeals = getMealsForDay(todayKey);
  const pendingGroceries = groceryList.filter((item) => !item.completed).length;
  const documentsCount = Math.max(28, groceryList.length * 6 + 18); // Mock dynamic count

  const mealSummary = MEAL_TYPES.map((mealType) => {
    const plannedMeal = todayMeals.find((meal) => meal.mealType === mealType.key);
    const recipe = plannedMeal ? getRecipeById(plannedMeal.recipeId) : undefined;

    return {
      label: mealType.label,
      detail: recipe ? recipe.name : "Plan a meal",
      icon: mealType.icon,
      hasMeal: !!plannedMeal,
    };
  });

  const glanceMetrics = [
    { label: "Events", value: events.length },
    { label: "Tasks", value: groceryList.length }, // Placeholder
    { label: "Reminders", value: todayMeals.length },
  ];

  return (
    <>
      <AppLayout>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
              <AppIcon name="menu" size={24} color={theme.colors.foreground} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <View style={styles.topActions}>
              <Pressable onPress={() => setShowSearch(true)} style={styles.iconButton}>
                <AppIcon name="search" size={24} color={theme.colors.foreground} />
              </Pressable>
              <Pressable onPress={() => setShowNotifications(true)} style={styles.iconButton}>
                <AppIcon name="bell" size={24} color={theme.colors.foreground} />
                {alerts.length > 0 && <View style={styles.notificationDot} />}
              </Pressable>
            </View>
          </View>

          <View style={{ marginBottom: 24, paddingHorizontal: 4 }}>
            <Text style={styles.dateLabel}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <Text style={styles.greeting}>
              Good {new Date().getHours() < 12 ? "Morning" : "Afternoon"}, {activeMember?.name || "Me"} 👋
            </Text>
          </View>

          {/* Family Card */}
          <View style={[styles.card, styles.profileCard]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="users" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Family Chores</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={() => setShowFamilyOnboarding(true)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                  <AppIcon name="user" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Setup</Text>
                </Pressable>
                <Pressable onPress={() => setShowAddMember(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.mutedForeground, fontWeight: "500" }}>+ Add</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.membersRow}>
              {members.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() => setActiveMember(member)}
                  style={[styles.memberCard, member.isActive && styles.activeMemberCard]}
                >
                  <View style={[styles.memberIconWrapper, member.isActive && { backgroundColor: theme.colors.primary }]}>
                    <Text style={{ fontSize: 24 }}>{member.symbol}</Text>
                    {member.isActive && <View style={styles.activeDot} />}
                  </View>
                  <Text style={[styles.memberName, member.isActive && styles.activeMemberName]}>
                    {member.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Today at a Glance - Blue Card */}
          <View style={[styles.card, styles.glanceCard]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.cardTitle, { color: "#fff" }]}>Today at a Glance</Text>
              </View>
              <Pressable onPress={() => setShowDashboard(!showDashboard)}>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "500" }}>
                  {showDashboard ? "Hide" : "View"} Dashboard
                </Text>
              </Pressable>
            </View>
            <View style={styles.glanceStats}>
              {glanceMetrics.map((metric, index) => (
                <View
                  key={metric.label}
                  style={[
                    styles.glanceStat,
                    index < glanceMetrics.length - 1 && styles.glanceStatSpacing,
                  ]}
                >
                  <Text style={styles.glanceStatValue}>{metric.value}</Text>
                  <Text style={styles.glanceStatLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {showDashboard && <FamilyDashboard />}

          {/* Quick Actions */}
          <View style={{ marginTop: 8, marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              {quickActions.map((action) => (
                <Pressable key={action.label} style={styles.quickActionItem} onPress={action.action}>
                  <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                    <AppIcon name={action.iconName} size={24} color={action.color} />
                  </View>
                  <Text style={styles.quickActionText}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Today's Schedule */}
          <View style={[styles.card, styles.scheduleCard]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="calendar" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Today's Schedule</Text>
              </View>
              <Pressable>
                <Text style={styles.linkText}>View All ›</Text>
              </Pressable>
            </View>
            {events.length === 0 ? (
              <Text style={{ color: theme.colors.mutedForeground, fontStyle: 'italic', marginVertical: 8 }}>No events for today</Text>
            ) : (
              events.slice(0, 3).map((event) => (
                <View key={event.id} style={styles.scheduleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.scheduleIconBox, { backgroundColor: theme.colors.muted }]}>
                      <Text style={{ fontSize: 18 }}>{event.icon}</Text>
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.scheduleTitle}>{event.title}</Text>
                      <Text style={styles.scheduleTime}>
                        <AppIcon name="clock" size={12} color={theme.colors.mutedForeground} /> {event.time}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scheduleAvatar}>
                    <AppIcon name="user" size={14} color="#fff" />
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Meals Today */}
          <View style={[styles.card, styles.cardSpacing]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="utensils" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Meals Today</Text>
              </View>
              <Text style={styles.linkText}>Meal Plan ›</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {mealSummary.map((meal) => (
                  <View
                    key={meal.label}
                    style={[styles.mealItem, { backgroundColor: meal.hasMeal ? "#ECFDF5" : "#F8FAFC" }]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 20 }}>{meal.icon}</Text>
                      {meal.hasMeal && <AppIcon name="check" size={14} color="#059669" />}
                    </View>
                    <Text style={styles.mealTitle}>{meal.label}</Text>
                    <Text style={styles.mealSubtitle} numberOfLines={2}>{meal.detail}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Alerts */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <AppIcon name="alert" size={18} color={theme.colors.warning || "#F59E0B"} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Alerts & Reminders</Text>
            </View>
            {alerts.map((alert) => (
              <View key={alert.id} style={[styles.alertRow, { backgroundColor: alert.tone }]}>
                <View style={[styles.alertIconBox]}>
                  <AppIcon name={alert.icon} size={20} color={alert.textColor} />
                </View>
                <View style={styles.alertText}>
                  <Text style={[styles.alertTitle, { color: alert.textColor }]}>{alert.title}</Text>
                  <Text style={[styles.alertDetail, { color: alert.textColor }]}>{alert.detail}</Text>
                </View>
                <AppIcon name="chevronRight" size={16} color={alert.textColor} />
              </View>
            ))}
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { marginRight: 12 }]}>
              <View style={[styles.statIconCircle, { backgroundColor: "#E0F2FE" }]}>
                <AppIcon name="shoppingCart" size={20} color="#0284C7" />
              </View>
              <Text style={styles.statTitle}>Grocery</Text>
              <Text style={styles.statValueLarge}>{pendingGroceries}</Text>
              <Text style={styles.statMeta}>items pending</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: "#DBEAFE" }]}>
                <AppIcon name="shield" size={20} color="#2563EB" />
              </View>
              <Text style={styles.statTitle}>Vault</Text>
              <Text style={styles.statValueLarge}>{documentsCount}</Text>
              <Text style={styles.statMeta}>documents</Text>
            </View>
          </View>
        </ScrollView>
      </AppLayout>

      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} notifications={alerts} />
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      <GettingStartedTutorial open={showTutorial} onClose={handleTutorialClose} />

      <AddEventModal open={showAddEvent} onOpenChange={setShowAddEvent} />
      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} />
      <AddItemModal open={showAddItem} onClose={() => setShowAddItem(false)} />
      <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} />
      <FamilyOnboarding open={showFamilyOnboarding} onClose={() => setShowFamilyOnboarding(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
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
    backgroundColor: theme.colors.danger || "#EF4444",
  },
  dateLabel: {
    fontSize: 14,
    color: theme.colors.mutedForeground,
    fontWeight: "500",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.foreground,
    marginTop: 4,
  },
  card: {
    borderRadius: CARD_RADIUS,
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  cardSpacing: {
    marginBottom: 24,
  },
  profileCard: {
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  membersRow: {
    flexDirection: "row",
    gap: 12,
  },
  memberCard: {
    alignItems: "center",
    justifyContent: "center",
  },
  memberIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
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
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  activeMemberCard: {
    // Optional: styled active state
  },
  activeMemberName: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  memberName: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.mutedForeground,
  },
  glanceCard: {
    backgroundColor: theme.colors.primary,
    borderWidth: 0,
  },
  glanceStats: {
    flexDirection: "row",
    gap: 12,
  },
  glanceStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: SMALL_RADIUS,
    padding: 16,
    alignItems: "center",
  },
  glanceStatSpacing: {
    marginRight: 0,
  },
  glanceStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  glanceStatLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  quickActionItem: {
    flex: 1,
    aspectRatio: 0.9,
    backgroundColor: theme.colors.card,
    borderRadius: SMALL_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.foreground,
    textAlign: "center",
  },
  scheduleCard: {
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.muted,
    borderRadius: SMALL_RADIUS,
    padding: 12,
    marginBottom: 8,
  },
  scheduleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#fff",
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  scheduleTime: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
  scheduleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  mealItem: {
    width: 140,
    height: 120,
    borderRadius: SMALL_RADIUS,
    padding: 12,
    justifyContent: "space-between",
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.foreground,
    marginTop: "auto",
  },
  mealSubtitle: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: SMALL_RADIUS,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  alertIconBox: {
    marginRight: 12,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontWeight: "600",
    fontSize: 15,
  },
  alertDetail: {
    marginTop: 2,
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: "row",
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: CARD_RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  statTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  statValueLarge: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.foreground,
    marginVertical: 4,
  },
  statMeta: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
});

export default HomeScreen;
