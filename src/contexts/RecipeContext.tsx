import React, { createContext, useContext, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, RecipeCollection } from '../types/recipes';

interface RecipeContextType {
    recipes: Recipe[];
    collections: RecipeCollection[];
    addRecipe: (recipe: Omit<Recipe, 'id' | 'saved'>) => void;
    updateRecipe: (id: number, updates: Partial<Recipe>) => void;
    toggleBookmark: (id: number) => boolean;
    addCollection: (collection: Omit<RecipeCollection, 'id' | 'count'>) => void;
    updateCollection: (id: number, updates: Partial<RecipeCollection>) => void;
    addRecipesToCollection: (collectionId: number, recipeIds: number[]) => void;
    removeRecipe: (id: number) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [collections, setCollections] = useState<RecipeCollection[]>([]);

    const RECIPES_STORAGE_KEY = '@family_chores_recipes';
    const COLLECTIONS_STORAGE_KEY = '@family_chores_collections';

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const storedRecipes = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
                const storedCollections = await AsyncStorage.getItem(COLLECTIONS_STORAGE_KEY);

                if (storedRecipes) {
                    setRecipes(JSON.parse(storedRecipes));
                }
                if (storedCollections) {
                    setCollections(JSON.parse(storedCollections));
                }
            } catch (error) {
                console.error('Failed to load recipe data:', error);
            }
        };
        loadData();
    }, []);

    const saveData = async (newRecipes: Recipe[], newCollections: RecipeCollection[]) => {
        try {
            await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(newRecipes));
            await AsyncStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(newCollections));
        } catch (error) {
            console.error('Failed to save recipe data:', error);
        }
    };

    const addRecipe = (newRecipeData: Omit<Recipe, 'id' | 'saved'>) => {
        try {
            if (!newRecipeData.name || !newRecipeData.name.trim()) return;

            const nextId = recipes.reduce((maxId, recipe) => Math.max(maxId, recipe.id), 0) + 1;
            const newRecipe: Recipe = {
                ...newRecipeData,
                id: nextId,
                saved: false,
            };
            const updatedRecipes = [...recipes, newRecipe];
            setRecipes(updatedRecipes);
            saveData(updatedRecipes, collections);
        } catch (error) {
            console.error('Error adding recipe:', error);
        }
    };

    const updateRecipe = (id: number, updates: Partial<Recipe>) => {
        try {
            const updatedRecipes = recipes.map(recipe =>
                recipe.id === id ? { ...recipe, ...updates } : recipe
            );
            setRecipes(updatedRecipes);
            saveData(updatedRecipes, collections);
        } catch (error) {
            console.error('Error updating recipe:', error);
        }
    };

    const removeRecipe = (id: number) => {
        try {
            const updatedRecipes = recipes.filter(recipe => recipe.id !== id);
            setRecipes(updatedRecipes);
            saveData(updatedRecipes, collections);
        } catch (error) {
            console.error('Error deleting recipe:', error);
        }
    };

    const toggleBookmark = (id: number) => {
        try {
            const updatedRecipes = recipes.map(recipe =>
                recipe.id === id ? { ...recipe, saved: !recipe.saved } : recipe
            );
            setRecipes(updatedRecipes);
            saveData(updatedRecipes, collections);
            const updatedRecipe = updatedRecipes.find(recipe => recipe.id === id);
            return !!updatedRecipe?.saved;
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            return false;
        }
    };

    const addCollection = (newCollectionData: Omit<RecipeCollection, 'id' | 'count'>) => {
        try {
            if (!newCollectionData.name) return;

            const nextId = collections.reduce((maxId, collection) => Math.max(maxId, collection.id), 0) + 1;
            const newCollection: RecipeCollection = {
                ...newCollectionData,
                id: nextId,
                count: newCollectionData.recipeIds ? newCollectionData.recipeIds.length : 0,
            };
            const updatedCollections = [...collections, newCollection];
            setCollections(updatedCollections);
            saveData(recipes, updatedCollections);
        } catch (error) {
            console.error('Error adding collection:', error);
        }
    };

    const updateCollection = (id: number, updates: Partial<RecipeCollection>) => {
        try {
            const updatedCollections = collections.map(col => {
                if (col.id !== id) {
                    return col;
                }
                const nextRecipeIds = updates.recipeIds ?? col.recipeIds;
                const nextCount =
                    updates.recipeIds !== undefined ? updates.recipeIds.length : col.count;
                return { ...col, ...updates, recipeIds: nextRecipeIds, count: nextCount };
            });
            setCollections(updatedCollections);
            saveData(recipes, updatedCollections);
        } catch (error) {
            console.error('Error updating collection:', error);
        }
    };

    const addRecipesToCollection = (collectionId: number, recipeIds: number[]) => {
        try {
            const updatedCollections = collections.map(col => {
                if (col.id === collectionId) {
                    const updatedRecipeIds = [...(col.recipeIds || [])];
                    recipeIds.forEach(id => {
                        if (!updatedRecipeIds.includes(id)) {
                            updatedRecipeIds.push(id);
                        }
                    });
                    return { ...col, recipeIds: updatedRecipeIds, count: updatedRecipeIds.length };
                }
                return col;
            });
            setCollections(updatedCollections);
            saveData(recipes, updatedCollections);
        } catch (error) {
            console.error('Error adding recipes to collection:', error);
        }
    };

    return (
        <RecipeContext.Provider value={{
            recipes,
            collections,
            addRecipe,
            updateRecipe,
            toggleBookmark,
            addCollection,
            updateCollection,
            addRecipesToCollection,
            removeRecipe
        }}>
            {children}
        </RecipeContext.Provider>
    );
};

export const useRecipes = () => {
    const context = useContext(RecipeContext);
    if (context === undefined) {
        throw new Error('useRecipes must be used within a RecipeProvider');
    }
    return context;
};
