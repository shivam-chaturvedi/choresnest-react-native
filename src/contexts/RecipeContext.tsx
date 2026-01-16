import React, { createContext, useContext, useState, ReactNode } from 'react';
import { recipes as initialRecipes, collections as initialCollections, Recipe } from '../data/recipes';

import AsyncStorage from '@react-native-async-storage/async-storage';

interface Collection {
    id: number;
    name: string;
    description?: string;
    count: number;
    color: string;
    recipeIds?: number[]; // Added to track which recipes are in which collection
}

interface RecipeContextType {
    recipes: Recipe[];
    collections: Collection[];
    addRecipe: (recipe: Omit<Recipe, 'id' | 'saved'>) => void;
    updateRecipe: (id: number, updates: Partial<Recipe>) => void;
    toggleBookmark: (id: number) => void;
    addCollection: (collection: Omit<Collection, 'id' | 'count'>) => void;
    updateCollection: (id: number, updates: Partial<Collection>) => void;
    addRecipesToCollection: (collectionId: number, recipeIds: number[]) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
    const [collections, setCollections] = useState<Collection[]>(
        initialCollections.map(c => ({ ...c, recipeIds: [] }))
    );

    // Persistence Keys
    const RECIPES_STORAGE_KEY = '@family_chores_recipes';
    const COLLECTIONS_STORAGE_KEY = '@family_chores_collections';

    // Load Data on Mount
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

    // Save Data Helper
    const saveData = async (newRecipes: Recipe[], newCollections: Collection[]) => {
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

            const newRecipe: Recipe = {
                ...newRecipeData,
                id: Math.max(...recipes.map(r => r.id), 0) + 1,
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

    const toggleBookmark = (id: number) => {
        try {
            const updatedRecipes = recipes.map(recipe =>
                recipe.id === id ? { ...recipe, saved: !recipe.saved } : recipe
            );
            setRecipes(updatedRecipes);
            saveData(updatedRecipes, collections);
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    const addCollection = (newCollectionData: Omit<Collection, 'id' | 'count'>) => {
        try {
            if (!newCollectionData.name) return;

            const newCollection: Collection = {
                ...newCollectionData,
                id: Math.max(...collections.map(c => c.id), 0) + 1,
                count: newCollectionData.recipeIds ? newCollectionData.recipeIds.length : 0,
            };
            const updatedCollections = [...collections, newCollection];
            setCollections(updatedCollections);
            saveData(recipes, updatedCollections);
        } catch (error) {
            console.error('Error adding collection:', error);
        }
    };

    const updateCollection = (id: number, updates: Partial<Collection>) => {
        try {
            const updatedCollections = collections.map(col =>
                col.id === id ? { ...col, ...updates, count: updates.recipeIds ? updates.recipeIds.length : (updates.recipeIds === undefined ? col.count : 0) } : col
            );
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
            addRecipesToCollection
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
