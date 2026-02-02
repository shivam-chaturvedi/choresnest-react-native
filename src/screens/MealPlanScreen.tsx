import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppLayout } from '../components/layout/AppLayout';
import { theme } from '../theme';
import { AppIcon } from '../components/ui/AppIcon';
import { Recipe } from '../types/recipes';
import { useToast } from '../components/ui/Toast';
import { useMealPlan, MealType } from '../contexts/MealPlanContext';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { useFamily } from '../contexts/FamilyContext';
import { AddMealModal } from '../components/modals/AddMealModal';
import { RecipeDetailModal } from '../components/modals/RecipeDetailModal';
import { WeeklyGroceryListModal } from '../components/modals/WeeklyGroceryListModal';
import { RecipeImage } from '../components/recipes/RecipeImage';
import { addDays, subDays, isToday, isTomorrow, parse, subMinutes, isAfter, startOfDay } from 'date-fns';
import { safeFormat } from '../utils/SafeDateUtils';
import { getTargetTimeForMeal } from '../utils/mealTimes';
import { useRecipes } from '../contexts/RecipeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

const getDayName = (date: Date) => safeFormat(date, 'EEEE'); // Monday
const getDayNumber = (date: Date) => safeFormat(date, 'd'); // 5

// Helper to parse duration string "15 min" -> 15 (number)
const parseDuration = (timeStr: string): number => {
  const match = timeStr.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1], 10) : 30; // default 30
};

export const MealPlanScreen: React.FC = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const {
    currentWeekStart,
    setCurrentWeekStart,
    getMealsForDay,
    getRecipeById,
    addMealToPlan,
    removeMealFromPlan,
    clearWeekPlan,
    generateGroceryList,
  } = useMealPlan();
  const { toggleBookmark } = useRecipes();
  const { addGroceryItem, activeMember } = useFamily();

  const [activeTab, setActiveTab] = useState<'plan' | 'prep'>('plan');
  const [addMealModal, setAddMealModal] = useState<{ open: boolean; date: string; mealType: MealType } | null>(null);
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const totalMeals = weekDays.reduce((acc, day) => {
    return acc + getMealsForDay(safeFormat(day, 'yyyy-MM-dd')).length;
  }, 0);

  const { showToast } = useToast();

  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(direction === 'prev' ? subDays(currentWeekStart, 7) : addDays(currentWeekStart, 7));
  };

  const handleOpenAddMeal = (dateStr: string, mealType: MealType) => {
    setAddMealModal({ open: true, date: dateStr, mealType });
  };

  const handleSelectRecipe = (recipeId: number) => {
    if (addMealModal) {
      try {
        addMealToPlan(recipeId, addMealModal.date, addMealModal.mealType);
        showToast({ title: "Meal Added", description: "Recipe added to your plan", type: "success" });
        setAddMealModal(null);
      } catch (error) {
        console.error(error);
        showToast({ title: "Error", description: "Failed to add meal", type: "warning" });
      }
    }
  };

  const handleRemoveMeal = (id: string) => {
    try {
      removeMealFromPlan(id);
      showToast({ title: "Removed", description: "Meal removed from plan", type: "default" });
    } catch (error) {
      showToast({ title: "Error", description: "Could not remove meal", type: "warning" });
    }
  };

  const handleClearPlan = () => {
    try {
      clearWeekPlan();
      showToast({ title: "Plan Cleared", description: "All meals for this week removed", type: "default" });
    } catch (error) {
      showToast({ title: "Error", description: "Could not clear plan", type: "warning" });
    }
  };

  const handleOpenRecipe = (recipeId: number) => {
    const recipe = getRecipeById(recipeId);
    if (recipe) {
      setSelectedRecipe(recipe);
      setShowRecipeDetail(true);
    }
  };

  const handleRecipeAddToGrocery = async (recipe: Recipe): Promise<boolean> => {
    try {
      // showToast({ title: "Adding...", description: `Adding ingredients from ${recipe.name}`, type: "default" });

      for (const ing of recipe.ingredients) {
        await addGroceryItem({
          name: ing.name,
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit || 'pcs',
          categoryId: undefined,
          addedBy: activeMember?.id, // Use active member ID
          completed: false,
        });
      }
      // showToast({ title: "Success", description: "Ingredients added to grocery list", type: "success" });
      return true;
    } catch (error) {
      console.error(error);
      // showToast({ title: "Error", description: "Failed to add ingredients", type: "warning" });
      return false;
    }
  };

  const handleAddToGroceryList = (items: any[]) => {
    try {
      // Navigate to Lists screen
      // @ts-ignore - navigation types
      navigation.navigate('lists', { addItems: items });
      showToast({
        title: "Added to Grocery List",
        description: `${items.length} item${items.length > 1 ? 's' : ''} added to your grocery list`,
        type: "success"
      });
    } catch (error) {
      showToast({ title: "Error", description: "Could not add items to grocery list", type: "warning" });
    }
  };

  const handleBookmark = (recipe: Recipe) => {
    const nextSaved = toggleBookmark(recipe.id);
    const updated = getRecipeById(recipe.id) ?? { ...recipe, saved: nextSaved };
    setSelectedRecipe(updated);
    return nextSaved;
  };

  const renderPlanTab = () => {
    const displayDays = [...weekDays].sort((a, b) => {
      if (isToday(a)) return -1;
      if (isToday(b)) return 1;
      return 0;
    });

    return (
      <View style={styles.tabContent}>
        {/* Week Navigator */}
        <View style={[styles.weekNavigator, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
          <Pressable onPress={() => handleNavigateWeek('prev')} style={styles.navArrow}>
            <AppIcon name="chevronLeft" size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.weekDateRange, { color: colors.foreground }]}>
              {safeFormat(currentWeekStart, 'MMM d')} - {safeFormat(addDays(currentWeekStart, 6), 'MMM d')}
            </Text>
            <Text style={[styles.weekYear, { color: colors.mutedForeground }]}>{safeFormat(currentWeekStart, 'yyyy')}</Text>
          </View>
          <Pressable onPress={() => handleNavigateWeek('next')} style={styles.navArrow}>
            <AppIcon name="chevronRight" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Days List */}
        <View style={{ gap: 16 }}>
          {displayDays.map((day) => {
            const dateStr = safeFormat(day, 'yyyy-MM-dd');
            const dayMeals = getMealsForDay(dateStr);
            const isTodayDate = isToday(day);

            return (
              <View key={dateStr} style={[
                styles.dayCard,
                { backgroundColor: colors.card, borderRadius: radius.card },
                isTodayDate && { borderWidth: 2, borderColor: colors.primary }
              ]}>
                {/* Day Header */}
                <View style={[styles.dayHeader, { borderColor: colors.border }]}>
                  <View style={styles.dayDateGroup}>
                    <View style={[
                      styles.dateBadge,
                      { backgroundColor: colors.muted, borderRadius: radius.md },
                      isTodayDate && { backgroundColor: colors.primary }
                    ]}>
                      <Text style={[
                        styles.dateNumber,
                        { color: colors.foreground },
                        isTodayDate && { color: '#fff' }
                      ]}>{getDayNumber(day)}</Text>
                    </View>
                    <View>
                      <Text style={[styles.dayName, { color: colors.foreground }]}>{getDayName(day)}</Text>
                      <Text style={[styles.monthName, { color: colors.mutedForeground }]}>{safeFormat(day, 'MMM yyyy')}</Text>
                    </View>
                  </View>
                </View>

                {/* Meal Slots */}
                <View style={styles.mealGrid}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mealType) => {
                    const meal = dayMeals.find((m) => m.mealType === mealType);
                    const recipe = meal ? getRecipeById(meal.recipeId) : null;

                    const typeConfig = {
                      breakfast: { label: 'Breakfast', icon: 'coffee' },
                      lunch: { label: 'Lunch', icon: 'sun' },
                      dinner: { label: 'Dinner', icon: 'moon' },
                      snack: { label: 'Snack', icon: 'cookie' },
                    };
                    const config = typeConfig[mealType];

                    return (
                      <View key={mealType} style={[
                        styles.mealSlot,
                        { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md }
                      ]}>
                        {/* Slot Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppIcon name={config.icon as any} size={14} color={colors.primary} />
                            <Text style={[styles.slotLabel, { color: colors.primary }]}>{config.label}</Text>
                          </View>
                          {meal && (
                            <Pressable onPress={() => handleRemoveMeal(meal.id)} hitSlop={8}>
                              <AppIcon name="x" size={14} color={colors.mutedForeground} />
                            </Pressable>
                          )}
                        </View>
                        {meal && recipe ? (
                          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                            <RecipeImage image={recipe.image} size={32} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.slotRecipeName, { color: colors.foreground }]} numberOfLines={1}>{recipe.name}</Text>
                              <Text style={[styles.slotRecipeTime, { color: colors.mutedForeground }]}>{recipe.time}</Text>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            style={styles.addSlotButton}
                            onPress={() => handleOpenAddMeal(dateStr, mealType)}
                          >
                            <AppIcon name="plus" size={16} color={colors.mutedForeground} />
                            <Text style={[styles.addSlotText, { color: colors.mutedForeground }]}>Add</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const getPrepItems = (date: Date) => {
    const meals = getMealsForDay(safeFormat(date, 'yyyy-MM-dd'));
    return meals.map(meal => {
      const recipe = getRecipeById(meal.recipeId);
      if (!recipe) return null;

      const readyTime = getTargetTimeForMeal(date, meal.mealType);
      const totalMinutes = parseDuration(recipe.time);
      const startTime = subMinutes(readyTime, totalMinutes); // Simplified: total time is prep + cook

      return {
        ...meal,
        recipe,
        readyTime,
        startTime,
        duration: totalMinutes,
      };
    }).filter(Boolean).sort((a, b) => (a?.startTime.getTime() || 0) - (b?.startTime.getTime() || 0));
  };

  const renderPrepRow = (item: any) => {
    if (!item) return null;

    // Difficulty logic mock
    const difficulty = item.duration > 45 ? 'Complex' : item.duration > 30 ? 'Medium' : 'Easy';
    const difficultyColor = difficulty === 'Complex' ? colors.danger : difficulty === 'Medium' ? colors.warning : colors.success;

    return (
      <Pressable
        key={item.id}
        style={[styles.prepItemCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}
        onPress={() => handleOpenRecipe(item.recipe.id)}
      >
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
          <RecipeImage image={item.recipe.image} size={44} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {/* Meal Icon */}
              <AppIcon
                name={item.mealType === 'breakfast' ? 'coffee' : item.mealType === 'lunch' ? 'sun' : item.mealType === 'dinner' ? 'moon' : 'cookie'}
                size={14}
                color={colors.warning}
              />
              <View style={[styles.badge, { backgroundColor: difficultyColor, borderRadius: radius.xs }]}>
                <AppIcon name="zap" size={10} color="#fff" style={{ marginRight: 2 }} />
                <Text style={styles.badgeText}>{difficulty}</Text>
              </View>
            </View>

            <Text style={[styles.prepItemTitle, { color: colors.foreground }]}>{item.recipe.name}</Text>

            <View style={styles.prepTimeRow}>
              <View style={styles.timeBlock}>
                <AppIcon name="clock" size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>Start: </Text>
                <Text style={[styles.timeValue, { color: colors.mutedForeground }]}>{safeFormat(item.startTime, 'h:mm a')}</Text>
              </View>
              <View style={styles.timeBlock}>
                <AppIcon name="checkCircle" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.timeLabel, { color: colors.primary }]}>Ready: </Text>
                <Text style={[styles.timeValue, { color: colors.primary }]}>{safeFormat(item.readyTime, 'h:mm a')}</Text>
              </View>
            </View>

            <Text style={[styles.prepDuration, { color: colors.mutedForeground }]}>
              {Math.floor(item.duration * 0.6)} min prep + {Math.ceil(item.duration * 0.4)} min cooking
            </Text>
          </View>

        </View>
      </Pressable>
    );
  };

  const renderPrepTab = () => {
    const today = new Date();
    const tomorrow = addDays(today, 1);

    // Get meals for Today and Tomorrow
    const todaysPrep = getPrepItems(today);
    const tomorrowsPrep = getPrepItems(tomorrow);

    // Find upcoming (next 2 days after tomorrow)
    const upcomingDays = [addDays(today, 2), addDays(today, 3)];
    let upcomingPrep: any[] = [];
    upcomingDays.forEach(day => {
      const items = getPrepItems(day);
      if (items) upcomingPrep = [...upcomingPrep, ...items.map(i => ({ ...i, showDate: true }))];
    });

    return (
      <View style={styles.tabContent}>
        {/* Today's Prep */}
        <View>
          <View style={styles.sectionHeader}>
            <AppIcon name="calendar" size={18} color={colors.success} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Prep</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.primary, borderRadius: radius.sm }]}>
              <Text style={styles.countText}>{todaysPrep.length}</Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {todaysPrep.length > 0 ? todaysPrep.map(renderPrepRow) : (
              <Text style={{ color: colors.mutedForeground, padding: 16, fontStyle: 'italic' }}>No meals planned for today.</Text>
            )}
          </View>
        </View>

        {/* Tomorrow's Prep */}
        <View style={{ marginTop: 24 }}>
          <View style={styles.sectionHeader}>
            <AppIcon name="clock" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tomorrow's Prep</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.info, borderRadius: radius.sm }]}>
              <Text style={styles.countText}>{tomorrowsPrep.length}</Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {tomorrowsPrep.length > 0 ? tomorrowsPrep.map(renderPrepRow) : (
              <Text style={{ color: colors.mutedForeground, padding: 16, fontStyle: 'italic' }}>No meals planned for tomorrow.</Text>
            )}
          </View>
        </View>

        {/* Upcoming Prep */}
        {upcomingPrep.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.sectionHeader}>
              <AppIcon name="calendar" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Upcoming Prep Tasks</Text>
            </View>

            <View style={{ gap: 12 }}>
              {upcomingPrep.map((item: any) => (
                <Pressable
                  key={item.id}
                  style={[styles.prepItemCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}
                  onPress={() => handleOpenRecipe(item.recipe.id)}
                >
                  <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                    <RecipeImage image={item.recipe.image} size={40} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <View style={{ backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs, marginRight: 8 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Easy</Text>
                        </View>
                        <Text style={[styles.prepItemTitle, { fontSize: 15, color: colors.foreground }]}>{item.recipe.name}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 4 }}>
                        {safeFormat(item.startTime, 'EEEE, MMM d')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AppIcon name="clock" size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                        <Text style={[styles.timeLabel, { color: colors.mutedForeground, fontSize: 12 }]}>Start: {safeFormat(item.startTime, 'h:mm a')}</Text>
                        <Text style={[styles.timeLabel, { color: colors.primary, fontSize: 12, marginLeft: 8 }]}>Ready: {safeFormat(item.readyTime, 'h:mm a')}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

      </View>
    );
  };

  return (
    <>
      <AppLayout showNav={false}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <AppIcon name="chevronLeft" size={20} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Meal Plan</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{totalMeals} meals planned this week</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}
                onPress={() => setShowGroceryModal(true)}
              >
                <AppIcon name="shoppingCart" size={18} color={colors.foreground} style={{ marginRight: 4 }} />
                <Text style={[styles.actionButtonText, { color: colors.foreground }]}>List</Text>
              </Pressable>
            </View>
          </View>

          {/* Tabs */}
          <View style={[styles.tabBar, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
            {(['plan', 'prep'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const icons = { plan: 'calendar', prep: 'info' };
              return (
                <Pressable
                  key={tab}
                  style={[
                    styles.tabItem,
                    { borderRadius: radius.md },
                    isActive && { backgroundColor: colors.card }
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <AppIcon
                    name={icons[tab] as any}
                    size={16}
                    color={isActive ? colors.foreground : colors.mutedForeground}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[
                    styles.tabText,
                    { color: isActive ? colors.foreground : colors.mutedForeground }
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Tab Content */}
          {activeTab === 'plan' && renderPlanTab()}
          {activeTab === 'prep' && renderPrepTab()}

        </ScrollView>
      </AppLayout>

      <AddMealModal
        open={!!addMealModal}
        onClose={() => setAddMealModal(null)}
        onSelectRecipe={handleSelectRecipe}
      />

      <WeeklyGroceryListModal
        visible={showGroceryModal}
        onClose={() => setShowGroceryModal(false)}
        items={generateGroceryList(currentWeekStart, addDays(currentWeekStart, 6))}
        onAddToGroceryList={handleAddToGroceryList}
      />

      <RecipeDetailModal
        recipe={selectedRecipe}
        open={showRecipeDetail}
        onOpenChange={setShowRecipeDetail}
        onBookmark={handleBookmark}
        onAddToGroceryList={handleRecipeAddToGrocery}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 20,
    height: 48,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    gap: 16,
  },
  weekNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 4,
  },
  navArrow: {
    padding: 8,
  },
  weekDateRange: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekYear: {
    fontSize: 12,
  },
  dayCard: {
    padding: 16,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  dayDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthName: {
    fontSize: 12,
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealSlot: {
    width: (SCREEN_WIDTH - 32 - 32 - 12) / 2,
    flexBasis: '47%',
    padding: 12,
    minHeight: 100,
  },
  slotLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  addSlotButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
    gap: 4,
  },
  addSlotText: {
    fontSize: 12,
    fontWeight: '500',
  },
  slotRecipeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  slotRecipeTime: {
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  prepItemCard: {
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  prepItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  prepTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 13,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  prepDuration: {
    fontSize: 12,
    marginTop: 2,
  },
  notifyIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
