import React, { useState } from "react";
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
import { recipes as staticRecipes } from "../../data/recipes";
import { AppIcon } from "../ui/AppIcon";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useRecipes } from "../../contexts/RecipeContext";
import { RecipeImage } from "../recipes/RecipeImage";

interface CreateCollectionModalProps {
    open: boolean;
    onClose: () => void;
}

const EMOJI_OPTIONS = ['🍳', '🥗', '🍕', '🍜', '🍰', '🥘', '🌮', '🍱', '🥙', '🍲'];

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({ open, onClose }) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const { addCollection, recipes } = useRecipes();

    // Dynamic color options based on theme
    const COLOR_OPTIONS = [
        colors.primary + '20',
        colors.secondary + '20',
        colors.success + '20',
        colors.warning + '20',
        colors.muted,
        colors.card,
    ];

    const [name, setName] = useState("");
    const [selectedEmoji, setSelectedEmoji] = useState("🍳");
    const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
    const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);

    const toggleRecipe = (id: number) => {
        if (selectedRecipes.includes(id)) {
            setSelectedRecipes(selectedRecipes.filter(rid => rid !== id));
        } else {
            setSelectedRecipes([...selectedRecipes, id]);
        }
    };

    const handleSelectAll = () => {
        if (selectedRecipes.length === recipes.length) {
            setSelectedRecipes([]);
        } else {
            setSelectedRecipes(recipes.map(r => r.id));
        }
    };

    const handleCreate = () => {
        if (!name.trim()) return;

        addCollection({
            name: `${selectedEmoji} ${name}`,
            color: selectedColor,
            recipeIds: selectedRecipes
        });

        onClose();
        setName("");
        setSelectedRecipes([]);
    };

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
                            <AppIcon name="plus" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.title, { color: colors.foreground }]}>Create Collection</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <AppIcon name="x" size={20} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Name */}
                        <Text style={[styles.label, { color: colors.foreground }]}>Collection Name</Text>
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
                            placeholder="e.g., Weekly Dinners, Kids Favorites"
                            placeholderTextColor={colors.mutedForeground}
                            value={name}
                            onChangeText={setName}
                        />

                        {/* Icon Picker */}
                        <Text style={[styles.label, { color: colors.foreground }]}>Choose Icon</Text>
                        <View style={styles.emojiRow}>
                            {EMOJI_OPTIONS.map(emoji => (
                                <TouchableOpacity
                                    key={emoji}
                                    style={[
                                        styles.emojiBtn,
                                        {
                                            backgroundColor: colors.card,
                                            borderColor: colors.border,
                                            borderRadius: radius.full
                                        },
                                        selectedEmoji === emoji && {
                                            borderColor: colors.primary,
                                            backgroundColor: colors.primary + '10'
                                        }
                                    ]}
                                    onPress={() => setSelectedEmoji(emoji)}
                                >
                                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Color Picker */}
                        <Text style={[styles.label, { color: colors.foreground }]}>Choose Color</Text>
                        <View style={styles.colorRow}>
                            {COLOR_OPTIONS.map((color, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.colorBtn,
                                        { backgroundColor: color },
                                        selectedColor === color && {
                                            borderColor: colors.foreground,
                                            transform: [{ scale: 1.1 }]
                                        }
                                    ]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </View>

                        {/* Recipe Selector */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                            <Text style={[styles.label, { marginTop: 0, marginBottom: 0, color: colors.foreground }]}>Add Recipes ({selectedRecipes.length})</Text>
                            <TouchableOpacity onPress={handleSelectAll}>
                                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                                    {selectedRecipes.length === recipes.length ? "Deselect All" : "Select All"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.recipeList}>
                            {recipes.map(recipe => {
                                const isSelected = selectedRecipes.includes(recipe.id);
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
                                            isSelected && {
                                                borderColor: colors.primary,
                                                backgroundColor: colors.primary + '10'
                                            }
                                        ]}
                                        onPress={() => toggleRecipe(recipe.id)}
                                    >
                                        <RecipeImage image={recipe.image} size={40} />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
                                            <Text style={[styles.recipeMeta, { color: colors.mutedForeground }]}>{recipe.ingredients.length} ingredients</Text>
                                        </View>
                                        {isSelected && <AppIcon name="check" size={20} color={colors.primary} />}
                                    </Pressable>
                                );
                            })}
                        </View>

                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, {
                        borderTopColor: colors.border,
                        backgroundColor: colors.background
                    }]}>
                        <TouchableOpacity
                            style={[
                                styles.cancelBtn,
                                { borderColor: colors.border }
                            ]}
                            onPress={onClose}
                        >
                            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.createBtn,
                                { backgroundColor: colors.primary }
                            ]}
                            onPress={handleCreate}
                        >
                            <Text style={[styles.createText, { color: colors.primaryForeground }]}>Create Collection</Text>
                        </TouchableOpacity>
                    </View>
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
        paddingBottom: 10,
        borderBottomWidth: 1, // Added border width for better separation
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        paddingTop: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        marginTop: 0,
    },
    emojiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    emojiBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 12,
    },
    colorBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    recipeList: {
        gap: 8,
    },
    recipeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
    },
    recipeName: {
        fontSize: 14,
        fontWeight: '600',
    },
    recipeMeta: {
        fontSize: 12,
    },
    footer: {
        padding: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelText: {
        fontWeight: '600',
    },
    createBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 24,
        alignItems: 'center',
    },
    createText: {
        fontWeight: '600',
    },
});
