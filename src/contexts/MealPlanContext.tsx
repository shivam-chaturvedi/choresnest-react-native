import React, { createContext, useContext, useState, ReactNode } from 'react';
import { addDays, startOfWeek, format } from 'date-fns';
import { useRecipes } from './RecipeContext';
import { Recipe } from '../types/recipes';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface PlannedMeal {
  id: string;
  recipeId: number;
  date: string; // YYYY-MM-DD
  mealType: MealType;
}

export interface GroceryListItem {
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  fromRecipes: string[];
}

interface MealPlanContextType {
  plannedMeals: PlannedMeal[];
  currentWeekStart: Date;
  setCurrentWeekStart: (date: Date) => void;
  addMealToPlan: (recipeId: number, date: string, mealType: MealType) => void;
  removeMealFromPlan: (mealId: string) => void;
  getMealsForDay: (date: string) => PlannedMeal[];
  getRecipeById: (id: number) => Recipe | undefined;
  generateGroceryList: () => GroceryListItem[];
  clearWeekPlan: () => void;
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export const MealPlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { recipes } = useRecipes();
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const addMealToPlan = (recipeId: number, date: string, mealType: MealType) => {
    try {
      if (!recipeId || !date || !mealType) return;
      const newMeal: PlannedMeal = {
        id: Date.now().toString(),
        recipeId,
        date,
        mealType,
      };
      setPlannedMeals(prev => [...prev, newMeal]);
    } catch (error) {
      console.error("Error in addMealToPlan:", error);
    }
  };

  const removeMealFromPlan = (mealId: string) => {
    try {
      if (!mealId) return;
      setPlannedMeals(prev => prev.filter(m => m.id !== mealId));
    } catch (error) {
      console.error("Error in removeMealFromPlan:", error);
    }
  };

  const getMealsForDay = (date: string): PlannedMeal[] => {
    try {
      if (!date) return [];
      return plannedMeals.filter(m => m.date === date);
    } catch (error) {
      console.error("Error in getMealsForDay:", error);
      return [];
    }
  };

  const getRecipeById = (id: number): Recipe | undefined => {
    try {
      if (!id) return undefined;
      return recipes.find(r => r.id === id);
    } catch (error) {
      console.error("Error in getRecipeById:", error);
      return undefined;
    }
  };

  const generateGroceryList = (): GroceryListItem[] => {
    try {
      const ingredientMap = new Map<string, GroceryListItem>();

      plannedMeals.forEach(meal => {
        const recipe = getRecipeById(meal.recipeId);
        if (!recipe || !recipe.ingredients) return;

        recipe.ingredients.forEach(ingredient => {
          if (!ingredient.name || !ingredient.unit) return;
          const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
          const existing = ingredientMap.get(key);

          if (existing) {
            existing.quantity += ingredient.quantity || 0;
            if (!existing.fromRecipes.includes(recipe.name)) {
              existing.fromRecipes.push(recipe.name);
            }
          } else {
            ingredientMap.set(key, {
              name: ingredient.name,
              quantity: ingredient.quantity || 0,
              unit: ingredient.unit,
              checked: false,
              fromRecipes: [recipe.name],
            });
          }
        });
      });

      return Array.from(ingredientMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } catch (error) {
      console.error("Error in generateGroceryList:", error);
      return [];
    }
  };

  const clearWeekPlan = () => {
    try {
      const weekEnd = addDays(currentWeekStart, 6);
      setPlannedMeals(prev => prev.filter(m => {
        if (!m.date) return false;
        const mealDate = new Date(m.date);
        return isNaN(mealDate.getTime()) || (mealDate < currentWeekStart || mealDate > weekEnd);
      }));
    } catch (error) {
      console.error("Error in clearWeekPlan:", error);
    }
  };

  return (
    <MealPlanContext.Provider value={{
      plannedMeals,
      currentWeekStart,
      setCurrentWeekStart,
      addMealToPlan,
      removeMealFromPlan,
      getMealsForDay,
      getRecipeById,
      generateGroceryList,
      clearWeekPlan,
    }}>
      {children}
    </MealPlanContext.Provider>
  );
};

export const useMealPlan = () => {
  const context = useContext(MealPlanContext);
  if (!context) {
    throw new Error('useMealPlan must be used within a MealPlanProvider');
  }
  return context;
};
