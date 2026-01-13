import React from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Pressable,
} from "react-native";
import { AppIcon } from "../ui";
import { useThemeColors } from "../../contexts/ThemeContext";

interface WeeklyGroceryListModalProps {
    visible: boolean;
    onClose: () => void;
    items: any[];
}

export const WeeklyGroceryListModal: React.FC<WeeklyGroceryListModalProps> = ({
    visible,
    onClose,
    items,
}) => {
    const colors = useThemeColors();

    // Calculate total recipes count if needed, or if items have a source count
    const distinctMealsCount = new Set(
        items.flatMap((item: any) => item.fromRecipes || [])
    ).size;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable
                    style={[
                        styles.modalContainer,
                        {
                            backgroundColor: colors.background,
                            shadowColor: colors.shadow,
                        }
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <AppIcon name="shoppingCart" size={20} color={colors.foreground} />
                            <Text style={[styles.title, { color: colors.foreground }]}>Weekly Grocery List</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <AppIcon name="x" size={20} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>

                    {/* Summary Banner */}
                    <View style={[
                        styles.summaryBanner,
                        { backgroundColor: colors.info + '20' } // Light blueish using info color opacity
                    ]}>
                        <Text style={[
                            styles.summaryText,
                            { color: colors.info }
                        ]}>
                            📝 {items.length} items from {distinctMealsCount || 'your'} meals
                        </Text>
                    </View>

                    {/* List */}
                    <ScrollView contentContainerStyle={styles.listContent}>
                        {items.map((item: any, index: number) => (
                            <View
                                key={index}
                                style={[
                                    styles.itemRow,
                                    { backgroundColor: colors.muted }
                                ]}
                            >
                                {/* Checkbox */}
                                <View style={[
                                    styles.checkbox,
                                    { borderColor: colors.mutedForeground }
                                ]}>
                                    {/* Empty circle for now */}
                                </View>

                                {/* Details */}
                                <View style={styles.itemDetails}>
                                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                                    <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                                        {item.amount || item.quantity} {item.unit} • from {item.recipeCount || (item.fromRecipes?.length || 1)} recipe(s)
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {items.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: colors.foreground }]}>No items in your grocery list yet.</Text>
                                <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>Add meals to your plan to generate a list.</Text>
                            </View>
                        )}
                    </ScrollView>
                </Pressable>
            </Pressable>
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
        borderRadius: 16,
        overflow: "hidden",
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
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
    },
    closeButton: {
        padding: 4,
    },
    summaryBanner: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        margin: 16,
        borderRadius: 12,
    },
    summaryText: {
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
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        backgroundColor: 'transparent',
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 2,
    },
    itemMeta: {
        fontSize: 13,
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
    }
});
