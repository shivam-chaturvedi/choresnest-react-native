import { database } from '../database';
import { Recipe, Collection, CollectionRecipe } from '../database/models/Recipe';
import MealPlan from '../database/models/MealPlan';
import { Q } from '@nozbe/watermelondb';

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
            return await database.write(async () => {
                return await database.get<Recipe>('recipes').create(r => {
                    r.name = data.name || 'Untitled Recipe';
                    r.description = data.description || '';
                    r.prepTime = data.prepTime || '0 mins';
                    r.cookTime = data.cookTime || '0 mins';
                    r.servings = data.servings || 1;
                    r.imagePath = data.imagePath || '';
                    r.isSaved = data.isSaved || false;
                    r.ingredients = data.ingredients || [];
                    r.instructions = data.instructions || [];
                    r.tags = data.tags || [];
                    // Handle other fields safely if they exist in data
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
            // Return empty observable or handle gracefully? WatermelonDB usually handles observer errors but setup might fail.
            // For observe, we might not be able to catch easily inside here without breaking return type.
            // Letting it throw might be better or returning empty if possible.
            // Standard approach: just let observe happen, errors usually in query definition.
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
