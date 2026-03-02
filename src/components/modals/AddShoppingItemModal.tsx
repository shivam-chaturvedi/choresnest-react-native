import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { AppIcon } from "../ui/AppIcon";
import { CategoryIcon } from "../ui/CategoryIcon";
import { shoppingCategories } from "../../constants/shoppingCategories";

interface AddShoppingItemModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (item: {
        name: string;
        quantity: number;
        unit: string;
        category: string;
    }) => void;
    preSelectedCategory?: string;
}

const UNITS = [
    "pcs",
    "kg",
    "g",
    "L",
    "ml",
    "pack",
    "box",
    "bag",
    "can",
    "oz",
    "lb",
];

export const AddShoppingItemModal: React.FC<AddShoppingItemModalProps> = ({
    visible,
    onClose,
    onAdd,
    preSelectedCategory,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [name, setName] = useState("");
    const [category, setCategory] = useState(preSelectedCategory || shoppingCategories[0]?.id || "");
    const [quantity, setQuantity] = useState(1);
    const [quantityInput, setQuantityInput] = useState("1");
    const [unit, setUnit] = useState("pcs");
    const [showUnitPicker, setShowUnitPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            setName("");
            setCategory(preSelectedCategory || shoppingCategories[0]?.id || "");
            setQuantity(1);
            setQuantityInput("1");
            setUnit("pcs");
            setShowUnitPicker(false);
        }
    }, [visible, preSelectedCategory]);

    const handleAdd = () => {
        if (!name.trim()) return;
        onAdd({
            name: name.trim(),
            quantity,
            unit,
            category: category || shoppingCategories[0]?.id,
        });
        onClose();
    };

    const formatQuantityValue = (value: number) => {
        const normalized = Number.isInteger(value)
            ? value.toString()
            : value.toFixed(2).replace(/\.?0+$/, "");
        return normalized;
    };

    const handleQuantityChange = (delta: number) => {
        setQuantity((prev) => {
            const next = Math.max(0.1, prev + delta);
            const normalized = parseFloat(next.toFixed(2));
            const formatted = formatQuantityValue(normalized);
            setQuantityInput(formatted);
            return normalized;
        });
    };

    const handleQuantityInputChange = (value: string) => {
        const sanitized = value.replace(/[^0-9.,]/g, "");
        setQuantityInput(sanitized);
        const parsed = parseFloat(sanitized.replace(",", "."));
        if (!Number.isNaN(parsed) && parsed > 0) {
            setQuantity(parsed);
        }
    };

    const handleQuantityInputBlur = () => {
        const parsed = parseFloat(quantityInput.replace(",", "."));
        if (Number.isNaN(parsed) || parsed <= 0) {
            setQuantityInput(formatQuantityValue(quantity));
            return;
        }
        const normalized = parseFloat(parsed.toFixed(2));
        setQuantity(normalized);
        setQuantityInput(formatQuantityValue(normalized));
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.overlay}
            >
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor: colors.card,
                            borderRadius: radius.card,
                            shadowColor: colors.shadow,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20', borderRadius: radius.full }]}>
                            <AppIcon name="shoppingCart" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.foreground }]}>
                            Add Shopping Item
                        </Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <AppIcon name="x" size={20} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                        {/* Item Name */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.foreground }]}>
                                Item Name
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: colors.muted,
                                        color: colors.foreground,
                                        borderRadius: radius.md,
                                        borderColor: colors.border,
                                    },
                                ]}
                                placeholder="e.g. Milk, Eggs, Rice..."
                                placeholderTextColor={colors.mutedForeground}
                                value={name}
                                onChangeText={setName}
                                autoFocus={false}
                            />
                        </View>

                        {/* Category */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.foreground }]}>
                                Category
                            </Text>
                            <View style={styles.categoryGrid}>
                                {shoppingCategories.map((cat) => (
                                    <Pressable
                                        key={cat.id}
                                        style={[
                                            styles.categoryItem,
                                            {
                                                backgroundColor:
                                                    category === cat.id ? colors.primary : colors.muted,
                                                borderRadius: radius.md,
                                            },
                                        ]}
                                        onPress={() => setCategory(cat.id)}
                                    >
                                        <CategoryIcon
                                            icon={cat.icon || "tag"}
                                            library={cat.library}
                                            size={18}
                                            color={category === cat.id ? colors.primaryForeground : colors.foreground}
                                            style={{ marginBottom: 2 }}
                                        />
                                        <Text
                                            style={[
                                                styles.categoryName,
                                                {
                                                    color:
                                                        category === cat.id
                                                            ? colors.primaryForeground
                                                            : colors.foreground,
                                                },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {cat.name}
                                        </Text>
                                    </Pressable>
                                ))}
                                {shoppingCategories.length === 0 && (
                                    <Text style={[styles.categoryPlaceholder, { color: colors.mutedForeground }]}>
                                        No categories available yet.
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.row}>
                            {/* Quantity */}
                            <View style={[styles.section, { flex: 1, marginRight: 12 }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>
                                    Quantity
                                </Text>
                                <View
                                    style={[
                                        styles.quantityControl,
                                        {
                                            backgroundColor: colors.muted,
                                            borderRadius: radius.md,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                >
                                    <Pressable
                                        style={[styles.qtyBtn, { borderRightColor: colors.border }]}
                                        onPress={() => handleQuantityChange(-1)}
                                    >
                                        <AppIcon name="minus" size={16} color={colors.foreground} />
                                    </Pressable>
                                    <TextInput
                                        style={[styles.qtyValue, { color: colors.foreground }]}
                                        value={quantityInput}
                                        onChangeText={handleQuantityInputChange}
                                        onBlur={handleQuantityInputBlur}
                                        keyboardType="decimal-pad"
                                        returnKeyType="done"
                                        selectTextOnFocus
                                        underlineColorAndroid="transparent"
                                    />
                                    <Pressable
                                        style={[styles.qtyBtn, { borderLeftColor: colors.border }]}
                                        onPress={() => handleQuantityChange(1)}
                                    >
                                        <AppIcon name="plus" size={16} color={colors.foreground} />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Unit */}
                            <View style={[styles.section, { flex: 1 }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>
                                    Unit
                                </Text>
                                <Pressable
                                    style={[
                                        styles.unitSelector,
                                        {
                                            backgroundColor: colors.muted,
                                            borderRadius: radius.md,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                    onPress={() => setShowUnitPicker(!showUnitPicker)}
                                >
                                    <Text style={[styles.unitText, { color: colors.foreground }]}>
                                        {unit}
                                    </Text>
                                    <AppIcon name={showUnitPicker ? "chevronUp" : "chevronDown"} size={16} color={colors.mutedForeground} />
                                </Pressable>
                            </View>
                        </View>



                        {/* Unit Picker Modal */}
                        <Modal
                            visible={showUnitPicker}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setShowUnitPicker(false)}
                        >
                            <Pressable
                                style={styles.pickerOverlay}
                                onPress={() => setShowUnitPicker(false)}
                            >
                                <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderRadius: radius.lg, shadowColor: colors.shadow }]}>
                                    <View style={styles.pickerHeader}>
                                        <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select Unit</Text>
                                        <Pressable onPress={() => setShowUnitPicker(false)} style={styles.pickerClose}>
                                            <AppIcon name="x" size={20} color={colors.mutedForeground} />
                                        </Pressable>
                                    </View>
                                    <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                                        {UNITS.map((u) => (
                                            <Pressable
                                                key={u}
                                                style={[
                                                    styles.pickerOption,
                                                    { backgroundColor: unit === u ? colors.primary + '10' : 'transparent', borderBottomColor: colors.border }
                                                ]}
                                                onPress={() => {
                                                    setUnit(u);
                                                    setShowUnitPicker(false);
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.pickerOptionText,
                                                        { color: unit === u ? colors.primary : colors.foreground, fontWeight: unit === u ? '700' : '400' }
                                                    ]}
                                                >
                                                    {u}
                                                </Text>
                                                {unit === u && <AppIcon name="check" size={18} color={colors.primary} />}
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            </Pressable>
                        </Modal>

                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <Pressable
                            style={[
                                styles.cancelButton,
                                {
                                    borderRadius: radius.lg,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                },
                            ]}
                            onPress={onClose}
                        >
                            <Text style={[styles.cancelText, { color: colors.foreground }]}>
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.addButton,
                                {
                                    backgroundColor: name.trim() ? colors.primary : colors.muted,
                                    borderRadius: radius.lg,
                                    opacity: name.trim() ? 1 : 0.7,
                                },
                            ]}
                            onPress={handleAdd}
                            disabled={!name.trim()}
                        >
                            <Text
                                style={[
                                    styles.addText,
                                    {
                                        color: name.trim()
                                            ? colors.primaryForeground
                                            : colors.mutedForeground,
                                    },
                                ]}
                            >
                                Add Item
                            </Text>
                        </Pressable>
                    </View>
                </View >
            </KeyboardAvoidingView >
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        maxHeight: "85%",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 5,
        overflow: 'hidden',
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        paddingBottom: 10,
    },
    iconContainer: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        flex: 1,
    },
    closeButton: {
        padding: 8,
    },
    content: {
        padding: 20,
        paddingTop: 10,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        marginLeft: 2,
    },
    input: {
        height: 50,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "space-between",
    },
    categoryItem: {
        width: "16%",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        flexGrow: 0,
        borderRadius: 0,
        backgroundColor: "rgba(226, 232, 240, 0.3)",
    },
    categoryIcon: {
        fontSize: 14,
        marginBottom: 2,
    },
    categoryName: {
        fontSize: 8,
        fontWeight: "600",
        textAlign: "center",
    },
    categoryPlaceholder: {
        fontSize: 12,
        textAlign: "center",
        marginTop: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    quantityControl: {
        flexDirection: "row",
        alignItems: "center",
        height: 50,
        borderWidth: 1,
    },
    qtyBtn: {
        width: 40,
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 0,
    },
    qtyValue: {
        flex: 1,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
        textAlignVertical: "center",
        paddingVertical: 0,
    },
    unitSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    unitText: {
        fontSize: 16,
        fontWeight: '600',
    },
    unitList: {
        marginTop: -16,
        marginBottom: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    unitOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    unitOptionText: {
        fontSize: 14,
    },
    footer: {
        flexDirection: "row",
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    cancelText: {
        fontWeight: "700",
        fontSize: 16,
    },
    addButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    addText: {
        fontWeight: "700",
        fontSize: 16,
    },
    // Picker Modal Styles
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    pickerContainer: {
        width: "100%",
        maxWidth: 340,
        maxHeight: "80%",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
    },
    pickerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    pickerClose: {
        padding: 4,
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    pickerOptionText: {
        fontSize: 16,
    },
});
