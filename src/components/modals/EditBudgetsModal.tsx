import React, { useMemo, useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { X, Save, Edit2, Palette } from "lucide-react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useFinance, Budget } from "../../contexts/FinanceContext";
import { useToast } from "../ui/Toast";
import { IconGlyph } from "../ui/IconGlyph";
import { useCountry } from "../../contexts/CountryContext";
import { CategoryColorPicker } from "../budgets/CategoryColorPicker";
import { CategoryColorService } from "../../services/CategoryColorService";
import { CATEGORY_COLOR_FALLBACK } from "../../constants/categoryColors";

interface EditBudgetsModalProps {
    visible: boolean;
    onClose: () => void;
}

export const EditBudgetsModal: React.FC<EditBudgetsModalProps> = ({
    visible,
    onClose,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const { budgets, updateBudget, categoryIcons, categoryColors, setCategoryColor } = useFinance();
    const { showToast } = useToast();
    const { formatCurrency } = useCountry();



    // State for editing existing budgets (key: category, value: temp amount)
    const [editingState, setEditingState] = useState<Record<string, string>>({});
    const [colorPickerTarget, setColorPickerTarget] = useState<string | null>(null);

    const handleStartEdit = (category: string, amount: number) => {
        setEditingState(prev => ({ ...prev, [category]: amount.toString() }));
    };

    const handleSaveEdit = (category: string) => {
        const amountStr = editingState[category];
        if (!amountStr) return;

        const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
        if (!isNaN(amount)) {
            updateBudget(category, amount);
            setEditingState(prev => {
                const next = { ...prev };
                delete next[category];
                return next;
            });
            showToast({ title: "Budget Updated", description: `Updated ${category} budget to ${formatCurrency(amount)}`, type: "success" });
        }
    };

    const handleCancelEdit = (category: string) => {
        setEditingState(prev => {
            const next = { ...prev };
            delete next[category];
            return next;
        });
    };

    const openColorPicker = (category: string) => {
        setColorPickerTarget(category);
    };

    const closeColorPicker = () => {
        setColorPickerTarget(null);
    };

    const disabledColorsForPicker = useMemo(() => {
        if (!colorPickerTarget) {
            return new Set<string>();
        }
        const targetKey = CategoryColorService.normalizeCategoryKey(colorPickerTarget);
        const usedColors = new Set<string>();
        Object.entries(categoryColors).forEach(([key, color]) => {
            if (key !== targetKey) {
                usedColors.add(color);
            }
        });
        return usedColors;
    }, [categoryColors, colorPickerTarget]);

    const handleColorSelect = (colorHex: string) => {
        if (!colorPickerTarget) {
            return;
        }
        void setCategoryColor(colorPickerTarget, colorHex);
        closeColorPicker();
    };

    const pickerValue = colorPickerTarget
        ? categoryColors[CategoryColorService.normalizeCategoryKey(colorPickerTarget)] ?? CATEGORY_COLOR_FALLBACK
        : CATEGORY_COLOR_FALLBACK;


    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalContainer}
            >
                <Pressable style={styles.overlay} onPress={onClose} />

                <View style={[styles.contentContainer, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Manage Budgets</Text>
                        <Pressable onPress={onClose} hitSlop={8}>
                            <X size={24} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>


                        <View style={styles.listContainer}>
                            {Object.entries(budgets).map(([category, amount]) => {
                        const isEditing = editingState.hasOwnProperty(category);
                        const icon = categoryIcons[category] || 'dots-horizontal';
                        const displayName = category.charAt(0).toUpperCase() + category.slice(1);
                        const normalizedKey = CategoryColorService.normalizeCategoryKey(category);
                        const displayColor = categoryColors[normalizedKey] ?? CATEGORY_COLOR_FALLBACK;

                        return (
                            <View key={category} style={[styles.budgetItem, { borderBottomColor: colors.border }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View
                                        style={[
                                            styles.colorSwatch,
                                            { backgroundColor: displayColor, borderColor: colors.border, marginRight: 8 },
                                        ]}
                                    />
                                    <IconGlyph icon={icon} size={20} color={colors.primary} style={{ marginRight: 12 }} />
                                    <Pressable
                                        onPress={() => openColorPicker(category)}
                                        style={[styles.colorButton, { borderColor: colors.border, marginRight: 12 }]}
                                        hitSlop={6}
                                    >
                                        <Palette size={14} color={colors.foreground} />
                                    </Pressable>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.catName, { color: colors.foreground }]}>{displayName}</Text>
                                        {!isEditing && (
                                            <Text style={[styles.amountText, { color: colors.mutedForeground }]}>
                                                {formatCurrency(amount)}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {isEditing ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <TextInput
                                                    style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, borderRadius: radius.sm }]}
                                                    value={editingState[category]}
                                                    onChangeText={(text) => setEditingState(prev => ({ ...prev, [category]: text }))}
                                                    keyboardType="numeric"
                                                    autoFocus
                                                />
                                                <Pressable onPress={() => handleSaveEdit(category)} hitSlop={8}>
                                                    <Save size={20} color={colors.success} />
                                                </Pressable>
                                                <Pressable onPress={() => handleCancelEdit(category)} hitSlop={8}>
                                                    <X size={20} color={colors.danger} />
                                                </Pressable>
                                            </View>
                                        ) : (
                                            <Pressable
                                                onPress={() => handleStartEdit(category, amount)}
                                                style={[styles.editBtn, { backgroundColor: colors.muted, borderRadius: radius.sm }]}
                                            >
                                                <Edit2 size={16} color={colors.foreground} />
                                            </Pressable>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                    <CategoryColorPicker
                        visible={Boolean(colorPickerTarget)}
                        value={pickerValue}
                        onSelect={handleColorSelect}
                        onClose={closeColorPicker}
                        disabledColors={disabledColorsForPicker}
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    contentContainer: {
        maxHeight: '80%',
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
    },
    scrollContent: {
        maxHeight: 500,
    },

    listContainer: {
        gap: 0,
    },
    budgetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    colorSwatch: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    colorButton: {
        padding: 6,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catName: {
        fontSize: 16,
        fontWeight: '500',
    },
    amountText: {
        fontSize: 14,
    },
    editBtn: {
        padding: 8,
    },
    editInput: {
        width: 80,
        borderWidth: 1,
        padding: 4,
        textAlign: 'right',
    },
});
