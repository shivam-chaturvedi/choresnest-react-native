import React, { createContext, useContext, useState, ReactNode } from 'react';
import { recipes as initialRecipes, collections as initialCollections, Recipe } from '../data/recipes';

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
    toggleBookmark: (id: number) => void;
    addCollection: (collection: Omit<Collection, 'id' | 'count'>) => void;
    updateCollection: (id: number, updates: Partial<Collection>) => void;
    addRecipesToCollection: (collectionId: number, recipeIds: number[]) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
    const [collections, setCollections] = useState<Collection[]>(
        initialCollections.map(c => ({ ...c, recipeIds: [] })) // Initialize with empty recipeIds
    );

    const addRecipe = (newRecipeData: Omit<Recipe, 'id' | 'saved'>) => {
        try {
            // Validation
            if (!newRecipeData.name || !newRecipeData.name.trim()) {
                console.error('Recipe name is required');
                return;
            }

            const newRecipe: Recipe = {
                ...newRecipeData,
                id: Math.max(...recipes.map(r => r.id), 0) + 1,
                saved: false,
            };
            setRecipes([...recipes, newRecipe]);
        } catch (error) {
            console.error('Error adding recipe:', error);
        }
    };

    const toggleBookmark = (id: number) => {
        try {
            if (typeof id !== 'number' || id <= 0) {
                console.error('Invalid recipe ID');
                return;
            }
            setRecipes(recipes.map(recipe =>
                recipe.id === id ? { ...recipe, saved: !recipe.saved } : recipe
            ));
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    const addCollection = (newCollectionData: Omit<Collection, 'id' | 'count'>) => {
        try {
            if (!newCollectionData.name || !newCollectionData.name.trim()) {
                console.error('Collection name is required');
                return;
            }

            const newCollection: Collection = {
                ...newCollectionData,
                id: Math.max(...collections.map(c => c.id), 0) + 1,
                count: newCollectionData.recipeIds ? newCollectionData.recipeIds.length : 0,
            };
            setCollections([...collections, newCollection]);
        } catch (error) {
            console.error('Error adding collection:', error);
        }
    };

    const updateCollection = (id: number, updates: Partial<Collection>) => {
        try {
            if (typeof id !== 'number' || id <= 0) {
                console.error('Invalid collection ID');
                return;
            }
            setCollections(collections.map(col =>
                col.id === id ? { ...col, ...updates, count: updates.recipeIds ? updates.recipeIds.length : (updates.recipeIds === undefined ? col.count : 0) } : col
            ));
        } catch (error) {
            console.error('Error updating collection:', error);
        }
    };

    const addRecipesToCollection = (collectionId: number, recipeIds: number[]) => {
        try {
            if (typeof collectionId !== 'number' || collectionId <= 0) {
                console.error('Invalid collection ID');
                return;
            }
            if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
                console.error('Invalid recipe IDs');
                return;
            }

            setCollections(collections.map(col => {
                if (col.id === collectionId) {
                    const updatedRecipeIds = [...(col.recipeIds || [])];
                    recipeIds.forEach(id => {
                        if (!updatedRecipeIds.includes(id)) {
                            updatedRecipeIds.push(id);
                        }
                    });
                    return {
                        ...col,
                        recipeIds: updatedRecipeIds,
                        count: updatedRecipeIds.length
                    };
                }
                return col;
            }));
        } catch (error) {
            console.error('Error adding recipes to collection:', error);
        }
    };

    return (
        <RecipeContext.Provider value={{
            recipes,
            collections,
            addRecipe,
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
