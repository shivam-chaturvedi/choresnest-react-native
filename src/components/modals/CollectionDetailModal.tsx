import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Pressable,
} from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useRecipes } from "../../contexts/RecipeContext";
import { Recipe } from "../../data/recipes";

interface Collection {
    id: number;
    name: string;
    description?: string;
    count: number;
    color: string;
    recipeIds?: number[];
}

interface CollectionDetailModalProps {
    open: boolean;
    onClose: () => void;
    collection: Collection | null;
}

export const CollectionDetailModal: React.FC<CollectionDetailModalProps> = ({ open, onClose, collection }) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const { recipes, updateCollection } = useRecipes();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);

    useEffect(() => {
        if (collection) {
            setName(collection.name);
            setDescription(collection.description || "");
            // In a real app, we'd probably want to make sure we have the latest recipeIds from context if it changes,
            // but for now local copy is fine or initial load.
            // Wait, collection prop might not automatically update if it's passed from parent state unless parent updates it.
            // Better to find the collection from context if we want live updates, but prop is okay for now.
            setSelectedRecipes(collection.recipeIds || []);
        }
        setIsEditing(false);
    }, [collection, open]); // Reset when opening different collection

    const handleSave = () => {
        if (!collection) return;
        updateCollection(collection.id, {
            name,
            description,
            recipeIds: selectedRecipes
        });
        setIsEditing(false);
    };

    const toggleRecipe = (id: number) => {
        if (selectedRecipes.includes(id)) {
            setSelectedRecipes(selectedRecipes.filter(rid => rid !== id));
        } else {
            setSelectedRecipes([...selectedRecipes, id]);
        }
    };

    if (!collection) return null;

    // Filter recipes that are in the collection for View Mode
    const collectionRecipes = recipes.filter(r => selectedRecipes.includes(r.id));

    // For Edit Mode, we show all recipes so user can add/remove
    // Or we can show a list of "In Collection" and "Add More"
    // Let's stick to the list with checks approach used in CreateCollection for consistency.

    return (
        <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable
                    style={[styles.container, { backgroundColor: colors.background, borderRadius: radius.card }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.title, { color: colors.foreground }]}>
                                {isEditing ? "Edit Collection" : "Collection Details"}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            {!isEditing ? (
                                <TouchableOpacity onPress={() => setIsEditing(true)}>
                                    <AppIcon name="edit" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={handleSave}>
                                    <AppIcon name="check" size={20} color={colors.success} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose}>
                                <AppIcon name="x" size={20} color={colors.mutedForeground} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Name */}
                        {isEditing ? (
                            <>
                                <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.foreground,
                                            borderRadius: radius.md
                                        }
                                    ]}
                                    value={name}
                                    onChangeText={setName}
                                />
                                <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            color: colors.foreground,
                                            borderRadius: radius.md,
                                            height: 80,
                                            textAlignVertical: 'top'
                                        }
                                    ]}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                />
                            </>
                        ) : (
                            <>
                                <View style={[styles.viewHeader, { backgroundColor: collection.color }]}>
                                    <Text style={[styles.viewTitle, { color: colors.foreground }]}>{name}</Text>
                                    {description ? <Text style={[styles.viewDesc, { color: colors.mutedForeground }]}>{description}</Text> : null}
                                </View>
                            </>
                        )}

                        {/* Recipes List */}
                        <Text style={[styles.label, { color: colors.foreground }]}>
                            {isEditing ? "Manage Recipes" : `Recipes (${collectionRecipes.length})`}
                        </Text>

                        <View style={styles.recipeList}>
                            {(isEditing ? recipes : collectionRecipes).map(recipe => {
                                const isSelected = selectedRecipes.includes(recipe.id);
                                if (!isEditing && !isSelected) return null; // In view mode only show selected

                                return (
                                    <Pressable
                                        key={recipe.id}
                                        style={[
                                            styles.recipeRow,
                                            {
                                                backgroundColor: colors.card,
                                                borderColor: colors.border,
                                                borderRadius: radius.md
                                            },
                                            isEditing && isSelected && {
                                                borderColor: colors.primary,
                                                backgroundColor: colors.primary + '10'
                                            }
                                        ]}
                                        onPress={() => isEditing && toggleRecipe(recipe.id)}
                                    >
                                        <Text style={{ fontSize: 24, marginRight: 12 }}>{recipe.image}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
                                            <Text style={[styles.recipeMeta, { color: colors.mutedForeground }]}>{recipe.time} • {recipe.ingredients.length} items</Text>
                                        </View>
                                        {isEditing && isSelected && <AppIcon name="check" size={20} color={colors.primary} />}
                                    </Pressable>
                                );
                            })}
                            {!isEditing && collectionRecipes.length === 0 && (
                                <Text style={{ color: colors.mutedForeground, fontStyle: 'italic' }}>No recipes in this collection yet.</Text>
                            )}
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '90%',
        maxHeight: '90%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
    },
    recipeList: {
        gap: 8,
        marginTop: 8,
        paddingBottom: 20,
    },
    recipeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
    },
    recipeName: {
        fontSize: 15,
        fontWeight: '600',
    },
    recipeMeta: {
        fontSize: 13,
        marginTop: 2,
    },
    viewHeader: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        alignItems: 'center',
    },
    viewTitle: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    viewDesc: {
        fontSize: 14,
        marginTop: 6,
        textAlign: 'center',
        opacity: 0.8,
    },
});
