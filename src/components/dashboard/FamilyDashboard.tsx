import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { useFamily } from "../../contexts/FamilyContext";
import { useMealPlan } from "../../contexts/MealPlanContext";
import { AppIcon } from "../ui/AppIcon";
import { useAuth } from "../../contexts/AuthContext";

interface FamilyDashboardProps {
    activeMemberId?: string;
}

export const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ activeMemberId }) => {
    // Safely get context data with fallbacks
    const { isGuest } = useAuth();
    let events: any[] = [];
    let groceryList: any[] = [];
    let familyName = "Family";
    let tasks: any[] = [];
    let plannedMeals: any[] = [];

    try {
        const familyContext = useFamily();
        events = Array.isArray(familyContext?.events) ? familyContext.events : [];
        groceryList = Array.isArray(familyContext?.groceryList) ? familyContext.groceryList : [];
        familyName = familyContext?.familyName || "Family";
        tasks = Array.isArray(familyContext?.tasks) ? familyContext.tasks : [];
    } catch (error) {
        console.error("FamilyDashboard: Error loading family context", error);
    }

    try {
        const mealContext = useMealPlan();
        plannedMeals = Array.isArray(mealContext?.plannedMeals) ? mealContext.plannedMeals : [];
    } catch (error) {
        console.error("FamilyDashboard: Error loading meal plan context", error);
    }

    // Safely filter data by active member with error handling
    let filteredEvents: any[] = [];
    let filteredTasks: any[] = [];
    let totalEvents = 0;
    let pendingTasks = 0;
    let totalMealsPlanned = 0;
    let pendingGroceries = 0;

    try {
        filteredEvents = activeMemberId
            ? events.filter((e: any) => {
                try {
                    return e?.memberId === activeMemberId;
                } catch {
                    return false;
                }
            })
            : events;

        totalEvents = filteredEvents.length || 0;
    } catch (error) {
        console.error("FamilyDashboard: Error filtering events", error);
        filteredEvents = [];
        totalEvents = 0;
    }

    try {
        filteredTasks = activeMemberId
            ? tasks.filter((t: any) => {
                try {
                    const isAssigned = t?.assignee === activeMemberId;
                    const isPending = t?.status === 'pending';
                    return isAssigned && isPending;
                } catch {
                    return false;
                }
            })
            : tasks.filter((t: any) => {
                try {
                    return t?.status === 'pending';
                } catch {
                    return false;
                }
            });

        pendingTasks = filteredTasks.length || 0;
    } catch (error) {
        console.error("FamilyDashboard: Error filtering tasks", error);
        filteredTasks = [];
        pendingTasks = 0;
    }

    try {
        totalMealsPlanned = plannedMeals.length || 0;
    } catch (error) {
        console.error("FamilyDashboard: Error counting meals", error);
        totalMealsPlanned = 0;
    }

    try {
        pendingGroceries = groceryList.filter((i: any) => {
            try {
                return !i?.completed;
            } catch {
                return false;
            }
        }).length || 0;
    } catch (error) {
        console.error("FamilyDashboard: Error filtering groceries", error);
        pendingGroceries = 0;
    }

    return (
        <View style={styles.container}>
            {isGuest && (
                <View style={styles.guestNotice}>
                    <AppIcon name="alertCircle" size={20} color="#856404" />
                    <Text style={styles.guestNoticeText}>
                        Guest Mode Active: Your data is stored locally on this device and is not backed up to the cloud.
                    </Text>
                </View>
            )}

            {/* Family Activity Summary */}
            <View style={[styles.card, styles.activityCard]}>
                <View style={styles.headerRow}>
                    <View style={styles.iconBox}>
                        <AppIcon name="trendingUp" size={24} color={theme.colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.activityTitle}>
                            {activeMemberId ? "My Activity" : `${familyName} Activity`}
                        </Text>
                        <Text style={styles.activitySubtitle}>Weekly summary</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <AppIcon name="calendar" size={16} color="rgba(255,255,255,0.7)" style={{ marginBottom: 4 }} />
                        <Text style={styles.statValue}>{totalEvents}</Text>
                        <Text style={styles.statLabel}>Events</Text>
                    </View>
                    <View style={styles.statItem}>
                        <AppIcon name="checkSquare" size={16} color="rgba(255,255,255,0.7)" style={{ marginBottom: 4 }} />
                        <Text style={styles.statValue}>{pendingTasks}</Text>
                        <Text style={styles.statLabel}>Tasks</Text>
                    </View>
                    <View style={styles.statItem}>
                        <AppIcon name="utensils" size={16} color="rgba(255,255,255,0.7)" style={{ marginBottom: 4 }} />
                        <Text style={styles.statValue}>{totalMealsPlanned}</Text>
                        <Text style={styles.statLabel}>Meals</Text>
                    </View>
                    <View style={styles.statItem}>
                        <AppIcon name="shoppingCart" size={16} color="rgba(255,255,255,0.7)" style={{ marginBottom: 4 }} />
                        <Text style={styles.statValue}>{pendingGroceries}</Text>
                        <Text style={styles.statLabel}>To Buy</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.lg,
    },
    card: {
        borderRadius: 20,
        padding: theme.spacing.lg,
        ...theme.shadows.card,
    },
    activityCard: {
        backgroundColor: theme.colors.primary,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: "#fff",
    },
    activitySubtitle: {
        color: "rgba(255,255,255,0.8)",
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    statItem: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: "#fff",
    },
    statLabel: {
        fontSize: 12,
        color: "rgba(255,255,255,0.7)",
    },
    guestNotice: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeeba',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    guestNoticeText: {
        flex: 1,
        color: '#856404',
        fontSize: 14,
        lineHeight: 20,
    },
});
