import { Recipe } from '../types/recipes';

export type RecipeType = 'url' | 'audio' | 'image' | 'text';

/**
 * Determines the type of recipe based on its populated fields.
 * Priority: Link (url) > Audio (audio) > Image (images) > Text (default)
 */
export const getRecipeType = (recipe: Recipe): RecipeType => {
    if (recipe.url && recipe.url.trim().length > 0) {
        return 'url';
    }

    if (recipe.audio && recipe.audio.trim().length > 0) {
        return 'audio';
    }

    if (recipe.images && recipe.images.length > 0) {
        return 'image';
    }

    return 'text';
};
