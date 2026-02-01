import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
} from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { RecipeImage } from '../recipes/RecipeImage';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useRecipes } from '../../contexts/RecipeContext';

interface AddMealModalProps {
    open: boolean;
    onClose: () => void;
    onSelectRecipe: (recipeId: number) => void;
}

export const AddMealModal: React.FC<AddMealModalProps> = ({
    open,
    onClose,
    onSelectRecipe,
}) => {
    const colors = useThemeColors();
    const { recipes } = useRecipes();

    return (
        <Modal
            visible={open}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable
                    style={[styles.modalContent, { backgroundColor: colors.card }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <View style={styles.titleRow}>
                            <AppIcon name="plus" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.title, { color: colors.foreground }]}>Select a Recipe</Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <AppIcon name="x" size={20} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                        <View style={styles.recipeList}>
                            {recipes.map((recipe) => (
                                <Pressable
                                    key={recipe.id}
                                    onPress={() => onSelectRecipe(recipe.id)}
                                    style={[styles.recipeCard, { backgroundColor: colors.muted }]}
                                >
                                    <RecipeImage image={recipe.image} size={40} />
                                    <View style={styles.recipeInfo}>
                                        <Text style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
                                        <Text style={[styles.recipeMeta, { color: colors.mutedForeground }]}>
                                            {recipe.time} • {recipe.servings} servings
                                        </Text>
                                    </View>
                                    <AppIcon name="plus" size={20} color={colors.primary} />
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    modalContent: {
        borderRadius: 24,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContainer: {
        padding: 20,
    },
    recipeList: {
        gap: 12,
    },
    recipeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    recipeEmoji: {
        fontSize: 28,
        marginRight: 16,
    },
    recipeInfo: {
        flex: 1,
    },
    recipeName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    recipeMeta: {
        fontSize: 13,
    },
});
