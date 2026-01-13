import React, { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Platform,
} from "react-native";
import { useThemeColors } from "../../contexts/ThemeContext";
import { AppIcon } from "../ui/AppIcon";

interface AddItemModalProps {
    open: boolean;
    onClose: () => void;
    onSave?: (item: ItemData) => void;
}

interface ItemData {
    name: string;
    category: string;
    quantity: number;
}

const categories = [
    { icon: "🥬", label: "Vegetables" },
    { icon: "🍎", label: "Fruits" },
    { icon: "🥛", label: "Dairy" },
    { icon: "🍖", label: "Meat" },
    { icon: "🍞", label: "Bakery" },
    { icon: "🥤", label: "Beverages" },
    { icon: "🧹", label: "Household" },
    { icon: "📦", label: "Other" },
];

export const AddItemModal: React.FC<AddItemModalProps> = ({ open, onClose, onSave }) => {
    const colors = useThemeColors();
    const [formData, setFormData] = useState<ItemData>({
        name: "",
        category: "Vegetables",
        quantity: 1,
    });

    const handleSave = () => {
        if (formData.name.trim()) {
            onSave?.(formData);
            setFormData({
                name: "",
                category: "Vegetables",
                quantity: 1,
            });
            onClose();
        }
    };

    return (
        <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.card,
                            ...Platform.select({
                                ios: { shadowColor: colors.shadow },
                                android: { elevation: 5 }
                            })
                        }
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppIcon name="shoppingCart" size={20} color={colors.warning} style={{ marginRight: 8 }} />
                            <Text style={[styles.title, { color: colors.foreground }]}>Add Shopping Item</Text>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Item Name */}
                        <Text style={[styles.label, { color: colors.foreground }]}>Item Name</Text>
                        <TextInput
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="Enter item name"
                            placeholderTextColor={colors.mutedForeground}
                            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
                        />

                        {/* Category Selection */}
                        <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
                        <View style={styles.categoryGrid}>
                            {categories.map((cat) => (
                                <Pressable
                                    key={cat.label}
                                    onPress={() => setFormData({ ...formData, category: cat.label })}
                                    style={[
                                        styles.categoryButton,
                                        { backgroundColor: colors.muted },
                                        formData.category === cat.label && { backgroundColor: colors.warning, transform: [{ scale: 1.05 }] },
                                    ]}
                                >
                                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                    <Text style={[
                                        styles.categoryLabel,
                                        { color: formData.category === cat.label ? colors.primaryForeground : colors.foreground }
                                    ]}>{cat.label}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Quantity */}
                        <Text style={[styles.label, { color: colors.foreground }]}>Quantity</Text>
                        <View style={styles.quantityRow}>
                            <Pressable
                                style={[styles.quantityButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                                onPress={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                            >
                                <Text style={[styles.quantityButtonText, { color: colors.foreground }]}>−</Text>
                            </Pressable>

                            <Text style={[styles.quantityValue, { color: colors.foreground }]}>{formData.quantity}</Text>

                            <Pressable
                                style={[styles.quantityButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                                onPress={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                            >
                                <Text style={[styles.quantityButtonText, { color: colors.foreground }]}>+</Text>
                            </Pressable>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable
                            style={[styles.cancelButton, { borderColor: colors.border }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.saveButton, { backgroundColor: colors.warning }]}
                            onPress={handleSave}
                        >
                            <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Add Item</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "center",
        padding: 16,
    },
    container: {
        borderRadius: 24,
        padding: 24,
        maxHeight: "85%",
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
            },
        }),
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "space-between",
    },
    categoryButton: {
        width: "23%", // approx 4 columns
        aspectRatio: 1,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        padding: 4,
    },
    categoryIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    categoryLabel: {
        fontSize: 10,
        fontWeight: "600",
        textAlign: "center",
    },
    quantityRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    quantityButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    quantityButtonText: {
        fontSize: 24,
        fontWeight: "600",
    },
    quantityValue: {
        fontSize: 24,
        fontWeight: "700",
        minWidth: 40,
        textAlign: "center",
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
    },
    cancelButtonText: {
        fontWeight: "600",
    },
    saveButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    saveButtonText: {
        fontWeight: "600",
    },
});
