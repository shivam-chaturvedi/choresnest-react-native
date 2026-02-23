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
    Animated,
    ActivityIndicator,
} from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { RecipeImage } from "../recipes/RecipeImage";
import { useThemeColors } from "../../contexts/ThemeContext";
import { Recipe } from "../../types/recipes";
import { ToastItem, ActiveToast } from "../ui/Toast";
import UploadStatusIndicator from "../ui/UploadStatusIndicator";
import NetInfo from "@react-native-community/netinfo";
import { DocumentUploadScheduler } from "../../services/sync/DocumentUploadScheduler";
import { getRecipeType } from "../../utils/recipeUtils";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface RecipeDetailModalProps {
    recipe: Recipe | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddToGroceryList?: (recipe: Recipe) => Promise<boolean>;
    onBookmark?: (recipe: Recipe) => boolean;
    onEdit?: (recipe: Recipe) => void;
    onDelete?: (recipe: Recipe) => void;
}



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
    const [isConnected, setIsConnected] = React.useState(true);
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [localToast, setLocalToast] = React.useState<ActiveToast | null>(null);
    React.useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
            setIsConnected(connected);
        });
        return () => unsubscribe();
    }, []);
    if (!recipe) return null;
    const showSyncButton = ['pending_upload', 'failed'].includes(recipe.uploadStatus ?? '') && isConnected;
    const handleSyncNow = async () => {
        if (isSyncing) {
            return;
        }
        setIsSyncing(true);
        try {
            await DocumentUploadScheduler.requestRecipeUploadNow();
        } catch (error) {
            console.error('RecipeDetailModal: failed to trigger recipe upload', error);
        } finally {
            setIsSyncing(false);
        }
    };


    const recipeType = getRecipeType(recipe);
    const isAudioRecipe = recipeType === 'audio';
    const instructions = recipe.instructions || [];

    const showNativeToast = (message: string) => {
        if (Platform.OS === "android") {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            Alert.alert(message);
        }
    };

    const showLocalToast = (title: string, type: 'success' | 'warning' | 'error' = 'success') => {
        setLocalToast({
            id: Date.now().toString(),
            title,
            type,
            duration: 3000,
            anim: new Animated.Value(0),
        });
        setTimeout(() => setLocalToast(null), 3000);
    };

    const handleAddToGrocery = async () => {
        if (!onAddToGroceryList) return;
        try {
            const success = await onAddToGroceryList(recipe);
            if (success) {
                showLocalToast("Added to Grocery List", "success");
            } else {
                // If false is returned, assume failure logic handled or show default error
                // But parents might catch error. If we get here with false, maybe silent or warning.
                // showLocalToast("Could not add items", "error"); 
                // Let's assume parent handles errors. We only toast on explicit success.
            }
        } catch (error) {
            console.error(error);
            showLocalToast("Failed to add items", "error");
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
                    {(() => {
                        const heroImage =
                            recipeType === 'image'
                                ? typeof recipe.image === 'string' && recipe.image.trim()
                                    ? recipe.image
                                    : undefined
                                : recipeType === 'audio'
                                    ? 'AUDIO_ICON'
                                    : recipeType === 'url'
                                        ? 'LINK_ICON'
                                        : undefined;

                        if (!heroImage) return null;

                        const hasUriScheme =
                            typeof heroImage === 'string' &&
                            (heroImage.startsWith('http') ||
                                heroImage.startsWith('file:') ||
                                heroImage.startsWith('content:'));
                        return (
                            <RecipeImage
                                image={heroImage}
                                size={80}
                                emojiSize={100}
                                iconSize={100}
                                style={hasUriScheme ? StyleSheet.absoluteFill : undefined}
                            />
                        );
                    })()}
                    <UploadStatusIndicator uploadStatus={recipe.uploadStatus} />
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
                    <Pressable
                        style={styles.closeButton}
                        onPress={() => onOpenChange(false)}
                        hitSlop={10}
                    >
                        <AppIcon name="x" size={20} color="#fff" />
                    </Pressable>
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
                                {!isAudioRecipe && (
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

                            {recipe.description ? (
                                <Text style={[styles.description, { color: colors.foreground }]}>
                                    {recipe.description}
                                </Text>
                            ) : null}

                            <View style={styles.tagsRow}>
                                {recipe.tags.map((tag) => (
                                    <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                                        <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                            {showSyncButton && (
                                <Pressable
                                    style={[styles.syncNowButton, { borderColor: colors.border }]}
                                    onPress={handleSyncNow}
                                    disabled={isSyncing}
                                >
                                    {isSyncing ? (
                                        <ActivityIndicator size="small" color={colors.foreground} />
                                    ) : (
                                        <Text style={[styles.syncNowText, { color: colors.primary }]}>Sync Now</Text>
                                    )}
                                </Pressable>
                            )}
                        </View>



                        {/* Nutrition Cards - Only show if data exists */}
                        {recipe.nutrition && (recipe.nutrition.kcal !== '-' || recipe.nutrition.protein !== '-') && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <AppIcon name="zap" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nutrition (per serving)</Text>
                                </View>

                                <View style={styles.nutritionGrid}>
                                    <View style={[styles.nutritionCard, { backgroundColor: `${colors.warning}20` }]}>
                                        <AppIcon name="zap" size={20} color={colors.warning} style={{ marginBottom: 4 }} />
                                        <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{recipe.nutrition.kcal}</Text>
                                        <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>kcal</Text>
                                    </View>
                                    <View style={[styles.nutritionCard, { backgroundColor: `${colors.danger}20` }]}>
                                        <AppIcon name="biceps" size={20} color={colors.danger} style={{ marginBottom: 4 }} />
                                        <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{recipe.nutrition.protein}</Text>
                                        <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>Protein</Text>
                                    </View>
                                    <View style={[styles.nutritionCard, { backgroundColor: `${colors.info}20` }]}>
                                        <AppIcon name="leaf" size={20} color={colors.info} style={{ marginBottom: 4 }} />
                                        <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{recipe.nutrition.carbs}</Text>
                                        <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>Carbs</Text>
                                    </View>
                                    <View style={[styles.nutritionCard, { backgroundColor: `${colors.primary}20` }]}>
                                        <MaterialCommunityIcons name="avocado" size={24} color={colors.primary} style={{ marginBottom: 4 }} />
                                        <Text style={[styles.nutritionValue, { color: colors.foreground }]}>{recipe.nutrition.fats}</Text>
                                        <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>Fat</Text>
                                    </View>
                                </View>
                            </View>
                        )}


                        {/* Ingredients */}
                        {(recipe.ingredients && recipe.ingredients.length > 0) ? (
                            <View style={[styles.section, styles.cardSoft, { backgroundColor: colors.muted }]}>
                                <View style={styles.ingredientsHeader}>
                                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Ingredients</Text>
                                    <Pressable
                                        style={[
                                            styles.addOutlineButton,
                                            { backgroundColor: colors.card, borderColor: colors.border }
                                        ]}
                                        onPress={handleAddToGrocery}
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
                        ) : (
                            <View style={[styles.section, styles.cardSoft, { backgroundColor: colors.muted }]}>
                                <Text style={{ color: colors.mutedForeground, fontStyle: 'italic' }}>No ingredients listed.</Text>
                            </View>
                        )}

                        {/* Cooking Instructions */}
                        <View style={[styles.section, styles.cardSoft, { backgroundColor: colors.muted }]}>
                            <View style={styles.sectionHeader}>
                                <AppIcon name="chefHat" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Cooking Instructions</Text>
                            </View>

                            {instructions.length > 0 ? (
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
                            ) : (
                                <Text style={{ color: colors.mutedForeground, fontStyle: 'italic', marginTop: 8 }}>
                                    No instructions added yet.
                                </Text>
                            )}
                        </View>

                        {/* Footer Action */}
                        <Pressable
                            style={[styles.mainActionButton, { backgroundColor: colors.primary }]}
                            onPress={handleAddToGrocery}
                        >
                            <AppIcon name="shoppingCart" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.mainActionText}>Add All to Grocery List</Text>
                        </Pressable>

                    </ScrollView>
                </View>

                {/* Local Toast Overlay */}
                {
                    localToast && (
                        <View style={styles.toastOverlay} pointerEvents="box-none">
                            <ToastItem toast={localToast} onDismiss={() => setLocalToast(null)} />
                        </View>
                    )
                }
            </View >
        </Modal >
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
        position: "relative",
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
    syncNowButton: {
        marginTop: 12,
        alignSelf: 'flex-end',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderRadius: 16,
    },
    syncNowText: {
        fontSize: 12,
        fontWeight: '600',
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
    toastOverlay: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },
});
