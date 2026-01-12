import React from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
} from "react-native";
import { AppIcon } from "../ui";
import { theme } from "../../theme";

interface WeeklyGroceryListModalProps {
    visible: boolean;
    onClose: () => void;
    items: any[]; // Using any[] for now, but should match the structure from generateGroceryList
}

export const WeeklyGroceryListModal: React.FC<WeeklyGroceryListModalProps> = ({
    visible,
    onClose,
    items,
}) => {
    // Calculate total recipes count if needed, or if items have a source count
    const distinctMealsCount = new Set(
        items.flatMap((item: any) => item.fromRecipes || [])
    ).size;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <AppIcon name="shoppingCart" size={20} color={theme.colors.foreground} />
                            <Text style={styles.title}>Weekly Grocery List</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <AppIcon name="x" size={20} color={theme.colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>

                    {/* Summary Banner */}
                    <View style={styles.summaryBanner}>
                        <Text style={styles.summaryText}>
                            📝 {items.length} items from {distinctMealsCount || 'your'} meals
                        </Text>
                    </View>

                    {/* List */}
                    <ScrollView contentContainerStyle={styles.listContent}>
                        {items.map((item: any, index: number) => (
                            <View key={index} style={styles.itemRow}>
                                {/* Checkbox */}
                                <View style={styles.checkbox}>
                                    {/* Empty circle for now, or check if completed */}
                                </View>

                                {/* Details */}
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemMeta}>
                                        {item.amount || item.quantity} {item.unit} • from {item.recipeCount || (item.fromRecipes?.length || 1)} recipe(s)
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {items.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No items in your grocery list yet.</Text>
                                <Text style={styles.emptySubtext}>Add meals to your plan to generate a list.</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "90%",
        height: "80%",
        backgroundColor: theme.colors.background,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: theme.colors.foreground,
    },
    closeButton: {
        padding: 4,
    },
    summaryBanner: {
        backgroundColor: "#EFF6FF", // Light blue background
        paddingVertical: 12,
        paddingHorizontal: 16,
        margin: 16,
        borderRadius: 12,
    },
    summaryText: {
        color: "#1E40AF", // Darker blue text
        fontSize: 14,
        fontWeight: "600",
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 12,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6", // Light gray/blueish card
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.mutedForeground,
        backgroundColor: 'transparent',
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.foreground,
        marginBottom: 2,
    },
    itemMeta: {
        fontSize: 13,
        color: theme.colors.mutedForeground,
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.foreground,
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.colors.mutedForeground,
    }
});
