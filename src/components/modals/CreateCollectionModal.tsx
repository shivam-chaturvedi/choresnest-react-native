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
import { AppIcon } from "../ui/AppIcon";
import { theme } from "../../theme";
import { recipes } from "../../data/recipes";

interface CreateCollectionModalProps {
    open: boolean;
    onClose: () => void;
}

const EMOJI_OPTIONS = ['🍳', '🥗', '🍕', '🍜', '🍰', '🥘', '🌮', '🍱', '🥙', '🍲'];
const COLOR_OPTIONS = [
    '#DBEAFE', // bg-primary-light (blue-100)
    '#E0E7FF', // bg-secondary (indigo-100)
    '#DCFCE7', // bg-success-light (green-100)
    '#FEF3C7', // bg-warning-light (amber-100)
    '#F1F5F9', // bg-accent (slate-100)
    '#1E293B', // Dark Navy
];

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({ open, onClose }) => {
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

    const handleCreate = () => {
        // Logic to create would go here
        console.log("Creating collection:", { name, emoji: selectedEmoji, color: selectedColor, recipes: selectedRecipes });
        onClose();
        setName("");
        setSelectedRecipes([]);
    };

    return (
        <Modal visible={open} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppIcon name="plus" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.title}>Create Collection</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <AppIcon name="x" size={20} color={theme.colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Name */}
                        <Text style={styles.label}>Collection Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Weekly Dinners, Kids Favorites"
                            placeholderTextColor={theme.colors.mutedForeground}
                            value={name}
                            onChangeText={setName}
                        />

                        {/* Icon Picker */}
                        <Text style={styles.label}>Choose Icon</Text>
                        <View style={styles.emojiRow}>
                            {EMOJI_OPTIONS.map(emoji => (
                                <TouchableOpacity
                                    key={emoji}
                                    style={[
                                        styles.emojiBtn,
                                        selectedEmoji === emoji && styles.emojiBtnActive
                                    ]}
                                    onPress={() => setSelectedEmoji(emoji)}
                                >
                                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Color Picker */}
                        <Text style={styles.label}>Choose Color</Text>
                        <View style={styles.colorRow}>
                            {COLOR_OPTIONS.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorBtn,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.colorBtnActive
                                    ]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </View>

                        {/* Recipe Selector */}
                        <Text style={styles.label}>Add Recipes ({selectedRecipes.length} selected)</Text>
                        <View style={styles.recipeList}>
                            {recipes.map(recipe => {
                                const isSelected = selectedRecipes.includes(recipe.id);
                                return (
                                    <Pressable
                                        key={recipe.id}
                                        style={[
                                            styles.recipeRow,
                                            isSelected && styles.recipeRowActive
                                        ]}
                                        onPress={() => toggleRecipe(recipe.id)}
                                    >
                                        <Text style={{ fontSize: 24, marginRight: 12 }}>{recipe.image}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.recipeName}>{recipe.name}</Text>
                                            <Text style={styles.recipeMeta}>{recipe.ingredients.length} ingredients</Text>
                                        </View>
                                        {isSelected && <AppIcon name="check" size={20} color={theme.colors.primary} />}
                                    </Pressable>
                                );
                            })}
                        </View>

                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                            <Text style={styles.createText}>Create Collection</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
        borderRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    content: {
        padding: 20,
        paddingTop: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0F172A',
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
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emojiBtnActive: {
        borderColor: theme.colors.primary,
        backgroundColor: '#EFF6FF',
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
    colorBtnActive: {
        borderColor: '#0F172A',
        transform: [{ scale: 1.1 }],
    },
    recipeList: {
        gap: 8,
        maxHeight: 200, // Roughly show 3-4 items
    },
    recipeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    recipeRowActive: {
        borderColor: theme.colors.primary,
        backgroundColor: '#EFF6FF',
    },
    recipeName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    recipeMeta: {
        fontSize: 12,
        color: '#64748B',
    },
    footer: {
        padding: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#fff',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 24, // Pill
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
    },
    cancelText: {
        fontWeight: '600',
        color: '#334155',
    },
    createBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 24, // Pill
        backgroundColor: '#2E5E99',
        alignItems: 'center',
    },
    createText: {
        fontWeight: '600',
        color: '#fff',
    },
});
