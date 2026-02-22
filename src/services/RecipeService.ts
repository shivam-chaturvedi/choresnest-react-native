import RNFS from 'react-native-fs';
import { database } from '../database';
import { Recipe, Collection } from '../database/models/Recipe';
import MealPlan from '../database/models/MealPlan';
import { Q } from '@nozbe/watermelondb';

// Helper to save image to permanent storage
const saveImageToStorage = async (tempUri: string): Promise<string> => {
    try {
        if (!tempUri) return '';

        // Create recipes directory if it doesn't exist
        const destDir = `${RNFS.DocumentDirectoryPath}/recipes`;
        const exists = await RNFS.exists(destDir);
        if (!exists) {
            await RNFS.mkdir(destDir);
        }

        // Generate unique filename
        const filename = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const destPath = `${destDir}/${filename}`;

        // Copy file
        await RNFS.copyFile(tempUri, destPath);
        return `file://${destPath}`;
    } catch (error) {
        console.error('Error saving image to storage:', error);
        // Fallback to original URI if copy fails
        return tempUri;
    }
};

export const RecipeService = {
    // Recipes
    observeRecipes: () => {
        return database.get<Recipe>('recipes').query().observe();
    },

    getRecipeById: async (id: string) => {
        try {
            return await database.get<Recipe>('recipes').find(id);
        } catch {
            return null;
        }
    },

    // Recipe Operations
    addRecipe: async (data: Partial<Recipe>) => {
        try {
            // Persist image if provided
            let finalImagePath = data.imagePath;
            if (finalImagePath && !finalImagePath.includes(RNFS.DocumentDirectoryPath)) {
                finalImagePath = await saveImageToStorage(finalImagePath);
            }

            return await database.write(async () => {
                return await database.get<Recipe>('recipes').create(r => {
                    r.name = data.name || 'Untitled Recipe';
                    r.description = data.description || '';
                    r.prepTime = data.prepTime || '0 mins';
                    r.cookTime = data.cookTime || '0 mins';
                    r.servings = data.servings || 1;
                    r.imagePath = finalImagePath ?? null;
                    r.isSaved = data.isSaved || false;
                    r.ingredients = data.ingredients || [];
                    r.instructions = data.instructions || [];
                    r.tags = data.tags || [];
                });
            });
        } catch (error) {
            console.error('Error adding recipe:', error);
            return null;
        }
    },

    // Meal Plans
    observeMealPlansForDate: (date: string) => {
        try {
            return database.get<MealPlan>('meal_plans').query(Q.where('date', date)).observe();
        } catch (error) {
            console.error('Error observing meal plans:', error);
            return database.get<MealPlan>('meal_plans').query(Q.where('date', date)).observe();
        }
    },

    addMealPlan: async (recipeId: string, date: string, type: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
        try {
            await database.write(async () => {
                await database.get<MealPlan>('meal_plans').create(mp => {
                    mp.recipeId = recipeId;
                    mp.date = date;
                    mp.type = type;
                    mp.isCooked = false;
                });
            });
        } catch (error) {
            console.error('Error adding meal plan:', error);
        }
    },

    // Collections
    observeCollections: () => {
        return database.get<Collection>('collections').query().observe();
    }
};
