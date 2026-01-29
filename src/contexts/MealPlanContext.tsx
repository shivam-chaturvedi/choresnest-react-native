import React, { createContext, useContext, useState, ReactNode } from 'react';
import { addDays, startOfWeek, format } from 'date-fns';
import { useRecipes } from './RecipeContext';
import { Recipe } from '../types/recipes';
import { MealType } from '../types/meals';
import { NotificationScheduler } from '../services/NotificationScheduler';
import { NotificationPreferencesService } from '../services/NotificationPreferencesService';
import { getTargetTimeForMeal } from '../utils/mealTimes';

export type { MealType };

export interface PlannedMeal {
  id: string;
  recipeId: number;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  notificationId?: string;
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

  const getRecipeById = (id: number): Recipe | undefined => {
    try {
      if (!id) return undefined;
      return recipes.find(r => r.id === id);
    } catch (error) {
      console.error("Error in getRecipeById:", error);
      return undefined;
    }
  };

  const scheduleMealReminder = async (meal: PlannedMeal) => {
    if (!meal) return;
    try {
      const reminderMinutes = await NotificationPreferencesService.getReminderTime('meals');
      const mealTime = getTargetTimeForMeal(new Date(meal.date), meal.mealType);
      const triggerDate = new Date(mealTime.getTime() - reminderMinutes * 60000);
      if (triggerDate <= new Date()) return;

      const recipeName = getRecipeById(meal.recipeId)?.name || 'Meal';
      const formattedTime = mealTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const notificationId = await NotificationScheduler.scheduleNotification(
        'meals',
        {
          title: `Meal prep: ${recipeName}`,
          body: `Prepare ${recipeName} for ${meal.mealType} at ${formattedTime}.`,
          data: {
            mealId: meal.id,
            recipeId: meal.recipeId,
          },
        },
        triggerDate,
        {
          notifyCenter: true,
          promptForPermission: true,
          promptForAlarm: true,
        }
      );

      if (notificationId) {
        setPlannedMeals(prev => prev.map(item => item.id === meal.id ? { ...item, notificationId } : item));
      }
    } catch (error) {
      console.error("Failed to schedule meal reminder:", error);
    }
  };

  const cancelMealReminder = (notificationId?: string) => {
    if (!notificationId) return;
    NotificationScheduler.cancelNotification(notificationId).catch(error => {
      console.error("Failed to cancel meal reminder:", error);
    });
  };

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
      void scheduleMealReminder(newMeal);
    } catch (error) {
      console.error("Error in addMealToPlan:", error);
    }
  };

  const removeMealFromPlan = (mealId: string) => {
    try {
      if (!mealId) return;
      setPlannedMeals(prev => {
        const meal = prev.find(m => m.id === mealId);
        if (meal?.notificationId) {
          cancelMealReminder(meal.notificationId);
        }
        return prev.filter(m => m.id !== mealId);
      });
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
      setPlannedMeals(prev => {
        const toKeep: PlannedMeal[] = [];
        const toRemove: PlannedMeal[] = [];
        prev.forEach(meal => {
          if (!meal.date) {
            toRemove.push(meal);
            return;
          }
          const mealDate = new Date(meal.date);
          const isOutOfWeek = isNaN(mealDate.getTime()) || (mealDate < currentWeekStart || mealDate > weekEnd);
          if (isOutOfWeek) {
            toKeep.push(meal);
          } else {
            toRemove.push(meal);
          }
        });

        toRemove.forEach(meal => {
          if (meal.notificationId) {
            cancelMealReminder(meal.notificationId);
          }
        });

        return toKeep;
      });
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
