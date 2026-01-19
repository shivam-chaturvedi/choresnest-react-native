import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { theme } from "../../theme";
import { useFamily } from "../../contexts/FamilyContext";
import { AppIcon } from "../ui/AppIcon";

export const FamilyDashboard: React.FC = () => {
    const { events, groceryList, familyName, tasks } = useFamily();
    // Assuming we have mealPlan context mapped similarly or we can mock for now as we port
    const totalEvents = events.length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const totalMealsPlanned = 0; // Set to 0 until MealPlanContext is fully integrated here
    const pendingGroceries = groceryList.filter(i => !i.completed).length;

    return (
        <View style={styles.container}>
            {/* Family Activity Summary */}
            <View style={[styles.card, styles.activityCard]}>
                <View style={styles.headerRow}>
                    <View style={styles.iconBox}>
                        <AppIcon name="trendingUp" size={24} color={theme.colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.activityTitle}>{familyName} Activity</Text>
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
});
