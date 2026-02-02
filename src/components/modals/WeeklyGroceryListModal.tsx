import React, { useState } from "react";
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
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";

interface WeeklyGroceryListModalProps {
    visible: boolean;
    onClose: () => void;
    items: any[];
    onAddToGroceryList?: (items: any[]) => void;
}

export const WeeklyGroceryListModal: React.FC<WeeklyGroceryListModalProps> = ({
    visible,
    onClose,
    items,
    onAddToGroceryList,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    const toggleItem = (index: number) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleAddToGroceryList = () => {
        const selected = items.filter((_, index) => selectedItems.has(index));
        onAddToGroceryList?.(selected);
        setSelectedItems(new Set());
        onClose();
    };

    // Calculate total recipes count if needed, or if items have a source count
    const distinctMealsCount = new Set(
        items.flatMap((item: any) => item.fromRecipes || [])
    ).size;

    const toggleAll = () => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            const allIndices = new Set(items.map((_, index) => index));
            setSelectedItems(allIndices);
        }
    };

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
                            <Text style={[styles.title, { color: colors.foreground }]}>List for Weekly Meal Plan</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <AppIcon name="x" size={20} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>

                    {/* Summary Banner */}
                    <View style={[
                        styles.summaryBanner,
                        { backgroundColor: colors.info + '20', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
                    ]}>
                        <Text style={[
                            styles.summaryText,
                            { color: colors.info }
                        ]}>
                            📝 {items.length} items
                        </Text>
                        <TouchableOpacity onPress={toggleAll} style={{ padding: 4 }}>
                            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>
                                {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Add to Grocery List Button */}
                    {selectedItems.size > 0 && (
                        <View style={[styles.addButtonContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                            <Pressable
                                style={[styles.addButton, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
                                onPress={handleAddToGroceryList}
                            >
                                <AppIcon name="plus" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.addButtonText}>Add {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} to Grocery List</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* List */}
                    <ScrollView contentContainerStyle={styles.listContent}>
                        {items.map((item: any, index: number) => {
                            const isSelected = selectedItems.has(index);
                            return (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.itemRow,
                                        { backgroundColor: colors.muted, borderRadius: radius.md },
                                        isSelected && { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary }
                                    ]}
                                    onPress={() => toggleItem(index)}
                                >
                                    {/* Checkbox */}
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: isSelected ? colors.primary : colors.mutedForeground, borderRadius: radius.sm },
                                        isSelected && { backgroundColor: colors.primary }
                                    ]}>
                                        {isSelected && <AppIcon name="check" size={14} color="#fff" />}
                                    </View>

                                    {/* Details */}
                                    <View style={styles.itemDetails}>
                                        <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                                        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                                            {item.quantity} {item.unit} • from {item.fromRecipes?.length || 1} recipe(s)
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        })}
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
        borderWidth: 2,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonContainer: {
        padding: 16,
        borderBottomWidth: 1,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
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
