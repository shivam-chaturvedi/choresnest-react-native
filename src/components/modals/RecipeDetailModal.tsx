import React from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Platform,
    ToastAndroid,
    Alert,
} from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { RecipeImage } from "../recipes/RecipeImage";
import { useThemeColors } from "../../contexts/ThemeContext";
import { Recipe } from "../../types/recipes";

interface RecipeDetailModalProps {
    recipe: Recipe | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddToGroceryList?: (recipe: Recipe) => void;
    onBookmark?: (recipe: Recipe) => void;
    onEdit?: (recipe: Recipe) => void;
    onDelete?: (recipe: Recipe) => void;
}

// Mock nutrition data
const getNutritionData = (recipe: Recipe) => ({
    calories: Math.round(recipe.servings * 150 + recipe.ingredients.length * 25),
    protein: Math.round(recipe.ingredients.length * 3.5),
    carbs: Math.round(recipe.servings * 20 + recipe.ingredients.length * 5),
    fat: Math.round(recipe.servings * 8 + recipe.ingredients.length * 2),
});

// Mock dynamic instructions
const getInstructions = (recipe: Recipe): string[] => {
    const baseSteps = [
        `Gather all ${recipe.ingredients.length} ingredients and prep your workspace.`,
        "Wash and prepare all vegetables if applicable.",
    ];

    if (recipe.tags.includes("Vegetarian")) {
        baseSteps.push("Heat oil in a large pan over medium heat.");
        baseSteps.push("Add aromatics like onion, garlic, and ginger. Sauté until fragrant.");
        baseSteps.push("Add the main vegetables and cook until tender.");
        baseSteps.push("Season with spices and salt to taste.");
        baseSteps.push("Garnish with fresh herbs before serving.");
    } else if (recipe.tags.includes("High Protein")) {
        baseSteps.push("Marinate the protein with spices for 15 minutes.");
        baseSteps.push("Heat a pan or grill over medium-high heat.");
        baseSteps.push("Cook the protein until golden and cooked through.");
        baseSteps.push("Let rest for 5 minutes before slicing.");
        baseSteps.push("Serve with sides and garnish.");
    } else {
        baseSteps.push("Prepare the base sauce or marinade.");
        baseSteps.push("Cook main ingredients according to recipe requirements.");
        baseSteps.push("Combine all elements and simmer if needed.");
        baseSteps.push("Taste and adjust seasoning.");
        baseSteps.push("Plate beautifully and serve warm.");
    }

    return baseSteps;
};

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
    recipe,
    open,
    onOpenChange,
    onAddToGroceryList,
    onBookmark,
    onEdit,
    onDelete,
}) => {
    const colors = useThemeColors();

    if (!recipe) return null;

    const nutrition = getNutritionData(recipe);
    const instructions = getInstructions(recipe);

    const showNativeToast = (message: string) => {
        if (Platform.OS === "android") {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            Alert.alert(message);
        }
    };

    return (
        <Modal
            visible={open}
            animationType="slide"
            transparent={true}
            onRequestClose={() => onOpenChange(false)}
        >
            <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
                {/* Header Background */}
                <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
                    <RecipeImage
                        image={recipe.image}
                        size={80}
                        emojiSize={100}
                        iconSize={100}
                        style={recipe.image.startsWith('http') || recipe.image.startsWith('file:') || recipe.image.startsWith('content:') ? StyleSheet.absoluteFill : undefined}
                    />
                    <Pressable
                        style={styles.closeButton}
                        onPress={() => onOpenChange(false)}
                        hitSlop={10}
                    >
                        <AppIcon name="x" size={20} color="#fff" />
                    </Pressable>
                    <View style={styles.headerActions}>
                        <Pressable
                            style={[styles.smallButton, { borderColor: "#ffffff55" }]}
                            onPress={() => onEdit?.(recipe)}
                        >
                            <AppIcon name="edit" size={18} color="#fff" />
                        </Pressable>
                        <Pressable
                            style={[styles.smallButton, styles.deleteButton]}
                            onPress={() => onDelete?.(recipe)}
                        >
                            <AppIcon name="trash" size={18} color="#fff" />
                        </Pressable>
                        <Pressable
                            style={styles.bookmarkButton}
                            onPress={() => {
                                const nextSaved = onBookmark?.(recipe);
                                if (typeof nextSaved === "boolean") {
                                    showNativeToast(nextSaved ? "Bookmark added" : "Bookmark removed");
                                }
                            }}
                        >
                            <AppIcon
                                name="bookmark"
                                size={20}
                                color="#fff"
                                style={recipe.saved ? { opacity: 1 } : { opacity: 0.7 }}
                            />
                        </Pressable>
                    </View>
                </View>

                {/* Content Sheet */}
                <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Title & Tags */}
                        <View style={styles.titleSection}>
                            <Text style={[styles.title, { color: colors.foreground }]}>{recipe.name}</Text>

                            <View style={styles.metaRow}>
                                {recipe.time ? (
                                    <View style={styles.metaItem}>
                                        <AppIcon name="clock" size={14} color={colors.mutedForeground} />
                                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.time}</Text>
                                    </View>
                                ) : null}
                                {recipe.image !== "AUDIO_ICON" && recipe.image !== "mic" && (
                                    <>
                                        <View style={styles.metaItem}>
                                            <AppIcon name="users" size={14} color={colors.mutedForeground} />
                                            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.servings} servings</Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <AppIcon name="chefHat" size={14} color={colors.mutedForeground} />
                                            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.ingredients.length} items</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            <View style={styles.tagsRow}>
                                {recipe.tags.map((tag) => (
                                    <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                                        <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {recipe.image !== "AUDIO_ICON" && recipe.image !== "mic" && (
                            <>
                                {/* Nutrition Cards */}
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <AppIcon name="zap" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nutrition (per serving)</Text>
                                    </View>

                                    <View style={styles.nutritionGrid}>
                                        <View style={[styles.nutritionCard, { backgroundColor: `${colors.warning}20` }]}>
                                            <AppIcon name="zap" size={20} color={colors.warning} style={{ marginBottom: 4 }} />
                                            <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{nutrition.calories}</Text>
                                            <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>kcal</Text>
                                        </View>
                                        <View style={[styles.nutritionCard, { backgroundColor: `${colors.danger}20` }]}>
                                            <AppIcon name="biceps" size={20} color={colors.danger} style={{ marginBottom: 4 }} />
                                            <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{nutrition.protein}g</Text>
                                            <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>Protein</Text>
                                        </View>
                                        <View style={[styles.nutritionCard, { backgroundColor: `${colors.info}20` }]}>
                                            <AppIcon name="leaf" size={20} color={colors.info} style={{ marginBottom: 4 }} />
                                            <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{nutrition.carbs}g</Text>
                                            <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>Carbs</Text>
                                        </View>
                                        <View style={[styles.nutritionCard, { backgroundColor: `${colors.primary}20` }]}>
                                            <Text style={{ fontSize: 20, marginBottom: 4 }}>🥑</Text>
                                            <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{nutrition.fat}g</Text>
                                            <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>Fat</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Ingredients */}
                                <View style={[styles.section, styles.cardSoft, { backgroundColor: colors.muted }]}>
                                    <View style={styles.ingredientsHeader}>
                                        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Ingredients</Text>
                                        <Pressable
                                            style={[
                                                styles.addOutlineButton,
                                                { backgroundColor: colors.card, borderColor: colors.border }
                                            ]}
                                            onPress={() => onAddToGroceryList?.(recipe)}
                                        >
                                            <AppIcon name="shoppingCart" size={14} color={colors.foreground} style={{ marginRight: 6 }} />
                                            <Text style={[styles.addOutlineText, { color: colors.foreground }]}>Add to List</Text>
                                        </Pressable>
                                    </View>

                                    <View style={styles.ingredientsList}>
                                        {recipe.ingredients.map((ingredient, i) => (
                                            <View key={i} style={styles.ingredientRow}>
                                                <View style={[styles.numberCircle, { backgroundColor: `${colors.primary}20` }]}>
                                                    <Text style={[styles.numberText, { color: colors.primary }]}>{i + 1}</Text>
                                                </View>
                                                <Text style={[styles.ingredientName, { color: colors.foreground }]}>{ingredient.name}</Text>
                                                <Text style={[styles.ingredientQty, { color: colors.mutedForeground }]}>
                                                    {ingredient.quantity} {ingredient.unit}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Cooking Instructions */}
                                <View style={[styles.section, styles.cardSoft, { backgroundColor: colors.muted }]}>
                                    <View style={styles.sectionHeader}>
                                        <AppIcon name="chefHat" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                                        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Cooking Instructions</Text>
                                    </View>

                                    <View style={styles.stepsList}>
                                        {instructions.map((step, i) => (
                                            <View key={i} style={styles.stepRow}>
                                                <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
                                                    <Text style={styles.stepNumber}>{i + 1}</Text>
                                                </View>
                                                <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Footer Action */}
                        <Pressable
                            style={[styles.mainActionButton, { backgroundColor: colors.primary }]}
                            onPress={() => onAddToGroceryList?.(recipe)}
                        >
                            <AppIcon name="shoppingCart" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.mainActionText}>Add All to Grocery List</Text>
                        </Pressable>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
    },
    headerBackground: {
        height: 200,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        position: "absolute",
        top: 50,
        right: 80,
        gap: 8,
    },
    heroEmoji: {
        fontSize: 80,
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    bookmarkButton: {
        position: "absolute",
        top: 50,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    smallButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.6)",
        alignItems: "center",
        justifyContent: "center",
    },
    deleteButton: {
        borderColor: "transparent",
        backgroundColor: "rgba(244,63,94,0.3)",
    },
    sheetContainer: {
        flex: 1,
        marginTop: -24,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: "hidden",
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    titleSection: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 12,
    },
    metaRow: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        fontSize: 14,
    },
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
    },
    tagText: {
        fontWeight: "600",
        fontSize: 12,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    cardSoft: {
        borderRadius: 20,
        padding: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    nutritionGrid: {
        flexDirection: "row",
        gap: 8,
    },
    nutritionCard: {
        flex: 1,
        borderRadius: 16,
        padding: 12,
        alignItems: "center",
    },
    nutritionValue: {
        fontSize: 16,
        fontWeight: "700",
    },
    nutritionLabel: {
        fontSize: 12,
    },
    ingredientsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    addOutlineButton: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addOutlineText: {
        fontSize: 12,
        fontWeight: "600",
    },
    ingredientsList: {
        gap: 12,
    },
    ingredientRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    numberCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    numberText: {
        fontSize: 12,
        fontWeight: "700",
    },
    ingredientName: {
        flex: 1,
        fontSize: 15,
    },
    ingredientQty: {
        fontSize: 14,
        fontWeight: "500",
    },
    stepsList: {
        gap: 16,
        marginTop: 12,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        marginTop: 2,
    },
    stepNumber: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
    stepText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
    },
    mainActionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: 48,
        borderRadius: 16,
        marginTop: 8,
    },
    mainActionText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
});
