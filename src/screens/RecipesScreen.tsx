import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Dimensions,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AppLayout } from "../components/layout/AppLayout";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { theme } from "../theme";
import { useSidebar } from "../contexts/SidebarContext";
import { useFamily } from "../contexts/FamilyContext";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { AppIcon } from "../components/ui/AppIcon";
import { useRecipes } from "../contexts/RecipeContext";
import { Recipe } from "../data/recipes";
import { RecipeDetailModal } from "../components/modals/RecipeDetailModal";
import { AddNewRecipeModal } from "../components/modals/AddNewRecipeModal";
import { CreateCollectionModal } from "../components/modals/CreateCollectionModal";
import { CollectionDetailModal } from "../components/modals/CollectionDetailModal";
import { useToast } from "../components/ui/Toast";

const preferences = [
  "Vegetarian",
  "High Protein",
  "Low Sugar",
  "Quick Meals",
  "Kids Friendly",
  "Healthy",
];

const tabs = ["For You", "All Recipes", "Collections"];

export const RecipesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<Record<string, undefined>>>();
  const { openSidebar } = useSidebar();
  const { addGroceryItem } = useFamily();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { recipes, collections, toggleBookmark } = useRecipes();

  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState("For You");
  const [query, setQuery] = useState("");

  // Recipe Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);

  const [activePreferences, setActivePreferences] = useState<string[]>([]);

  const togglePreference = (pref: string) => {
    setActivePreferences(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const filteredRecipes = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return recipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(lowerQuery) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }, [query, recipes]);

  // For "Quick Meals" (under 25 mins, sorted)
  const quickMeals = useMemo(() => {
    return recipes
      .filter((r) => {
        const timeVal = parseInt(r.time.split(" ")[0]);
        return timeVal <= 25;
      })
      .sort((a, b) => {
        const timeA = parseInt(a.time.split(" ")[0]);
        const timeB = parseInt(b.time.split(" ")[0]);
        return timeA - timeB;
      });
  }, [recipes]);

  // Favorites - Show ALL saved
  const favorites = recipes.filter(r => r.saved);

  // Recommended - Based on active preferences or show random
  const recommended = useMemo(() => {
    if (activePreferences.length === 0) {
      // If no preferences, show generic mix (excluding saved to avoid dupe if we want, or just random)
      // For now, let's just show top 4
      return recipes.slice(0, 4);
    }
    return recipes.filter(r =>
      r.tags.some(tag => activePreferences.includes(tag)) ||
      activePreferences.some(pref => {
        if (pref === "Quick Meals") return parseInt(r.time) <= 25;
        if (pref === "Vegetarian") return r.tags.includes("Vegetarian");
        if (pref === "High Protein") return r.tags.includes("High Protein");
        if (pref === "Low Sugar") return r.tags.includes("Low Sugar");
        if (pref === "Kids Friendly") return r.tags.includes("Kids Friendly");
        if (pref === "Healthy") return r.tags.includes("Healthy");
        return false;
      })
    );
  }, [recipes, activePreferences]);

  // Handle Recipe Click
  const handleRecipePress = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeDetail(true);
  };

  const { showToast } = useToast();

  const handleAddToGroceryList = (recipe: Recipe) => {
    try {
      recipe.ingredients.forEach(ing => {
        addGroceryItem({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          categoryId: "cat6", // Default category
          addedBy: "1", // Current user ID (mock)
          completed: false,
        });
      });
      showToast({ title: "Success", description: "Ingredients added to grocery list", type: "success" });
    } catch (error) {
      console.error(error);
      showToast({ title: "Error", description: "Failed to add ingredients", type: "warning" });
    }
  };

  const handleAddCollectionToGrocery = (collectionId: number) => {
    // Logic to add all recipes in collection to grocery list
    // For now, since collections don't have explicit recipe mapping in the UI, we'll skipping this or mocking it.
    // But the context update allows mapping.
    // If collection.recipeIds exists:
    const collection = collections.find(c => c.id === collectionId);
    if (collection && collection.recipeIds) {
      const recipesInCollection = recipes.filter(r => collection.recipeIds?.includes(r.id));
      recipesInCollection.forEach(r => handleAddToGroceryList(r));
      showToast({ title: "Success", description: `Added recipes from ${collection.name} to list`, type: "success" });
    } else {
      showToast({ title: "Info", description: "No recipes in this collection yet", type: "default" });
    }
  };

  const renderForYou = () => (
    <>
      {/* Preferences */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
        <View style={styles.sectionHeader}>
          <AppIcon name="sparkles" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Preferences</Text>
        </View>
        <View style={styles.tagGroup}>
          {preferences.map((tag) => {
            const isActive = activePreferences.includes(tag);
            return (
              <Pressable
                key={tag}
                style={[
                  styles.prefTag,
                  {
                    backgroundColor: isActive ? colors.primary : colors.muted,
                    borderRadius: radius.md
                  }
                ]}
                onPress={() => togglePreference(tag)}
              >
                <View style={styles.prefIcon}>
                  <AppIcon
                    name={
                      tag === "Vegetarian" ? "leaf" :
                        tag.includes("Protein") ? "biceps" :
                          tag.includes("Sugar") ? "droplet" :
                            tag.includes("Quick") ? "clock" :
                              tag.includes("Kids") ? "smile" : "heart"
                    }
                    size={14}
                    color={isActive ? colors.primaryForeground : colors.mutedForeground}
                  />
                </View>
                <Text style={[styles.prefText, { color: isActive ? colors.primaryForeground : colors.mutedForeground }]}>{tag}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.groceryNoteRow}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>📦</Text>
          <Text style={[styles.groceryNote, { color: colors.mutedForeground }]}>4 ingredients available from your grocery list</Text>
        </View>
      </View>

      {/* Recommended for Preference (Dynamic) */}
      {activePreferences.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          <View style={styles.sectionHeader}>
            <AppIcon name="star" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recommended For You
            </Text>
          </View>

          {recommended.length > 0 ? recommended.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={[styles.recommendRow, { backgroundColor: colors.muted, borderRadius: radius.lg }]}
              onPress={() => handleRecipePress(recipe)}
            >
              <View style={styles.recommendLeft}>
                <View style={[styles.emojiContainer, { backgroundColor: colors.card, borderRadius: radius.sm }]}>
                  <Text style={styles.recommendEmoji}>{recipe.image}</Text>
                </View>
                <View>
                  <Text style={[styles.recommendTitle, { color: colors.foreground }]}>{recipe.name}</Text>
                  <Text style={[styles.recommendMeta, { color: colors.mutedForeground }]}>
                    {recipe.time}
                  </Text>
                </View>
              </View>
              <View style={styles.recommendRight}>
                <Pressable onPress={() => toggleBookmark(recipe.id)}>
                  <AppIcon name="bookmark" size={20} color={recipe.saved ? colors.primary : colors.mutedForeground} style={recipe.saved ? { opacity: 1 } : { opacity: 0.5 }} />
                </Pressable>
                <AppIcon name="chevronRight" size={20} color={colors.mutedForeground} />
              </View>
            </Pressable>
          )) : (
            <Text style={{ color: colors.mutedForeground, padding: 8 }}>No recipes match these preferences.</Text>
          )}
        </View>
      )}

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          <View style={styles.sectionHeader}>
            <AppIcon name="heart" size={20} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Your Favorites
            </Text>
          </View>

          {favorites.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={[styles.recommendRow, { backgroundColor: colors.muted, borderRadius: radius.lg }]}
              onPress={() => handleRecipePress(recipe)}
            >
              <View style={styles.recommendLeft}>
                <View style={[styles.emojiContainer, { backgroundColor: colors.card, borderRadius: radius.sm }]}>
                  <Text style={styles.recommendEmoji}>{recipe.image}</Text>
                </View>
                <View>
                  <Text style={[styles.recommendTitle, { color: colors.foreground }]}>{recipe.name}</Text>
                  <Text style={[styles.recommendMeta, { color: colors.mutedForeground }]}>
                    {recipe.time}
                  </Text>
                </View>
              </View>
              <View style={styles.recommendRight}>
                <Pressable onPress={() => toggleBookmark(recipe.id)}>
                  <AppIcon name="bookmark" size={20} color={recipe.saved ? colors.primary : colors.mutedForeground} style={recipe.saved ? { opacity: 1 } : { opacity: 0.5 }} />
                </Pressable>
                <AppIcon name="chevronRight" size={20} color={colors.mutedForeground} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Quick Meals */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
        <View style={styles.sectionHeader}>
          <AppIcon name="clock" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Meals (Under 25 min)</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {quickMeals.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={[styles.quickCard, { backgroundColor: colors.muted, borderRadius: radius.lg }]}
              onPress={() => handleRecipePress(recipe)}
            >
              <Text style={styles.quickEmoji}>{recipe.image}</Text>
              <Text style={[styles.quickTitle, { color: colors.foreground }]} numberOfLines={2}>{recipe.name}</Text>
              <Text style={[styles.quickMeta, { color: colors.mutedForeground }]}>{recipe.time}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Meal Plan CTA */}
      <View style={[styles.planBanner, { backgroundColor: colors.card, borderRadius: radius.card }]}>
        <View style={styles.planContent}>
          <Text style={[styles.planTitle, { color: colors.foreground }]}>Plan your week's meals</Text>
          <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>Auto-generate grocery lists from recipes</Text>
        </View>
        <Pressable
          style={[styles.planButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          onPress={() => navigation.navigate("MealPlan" as any)}
        >
          <Text style={[styles.planButtonText, { color: colors.primaryForeground }]}>Plan Now</Text>
        </Pressable>
      </View>
    </>
  );

  const renderAllRecipes = () => (
    <View style={styles.listContainer}>
      {filteredRecipes.map((recipe) => (
        <Pressable
          key={recipe.id}
          style={[styles.recipeCard, { backgroundColor: colors.card, borderRadius: radius.lg }]}
          onPress={() => handleRecipePress(recipe)}
        >
          <View style={[styles.recipeImage, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
            <Text style={{ fontSize: 32 }}>{recipe.image}</Text>
          </View>
          <View style={styles.recipeInfo}>
            <View style={styles.recipeHeader}>
              <Text style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
              <Pressable onPress={(e) => {
                e.stopPropagation();
                toggleBookmark(recipe.id);
              }}>
                <AppIcon
                  name="bookmark"
                  size={20}
                  color={recipe.saved ? colors.primary : colors.mutedForeground}
                  style={recipe.saved ? { opacity: 1 } : { opacity: 0.5 }}
                />
              </Pressable>
            </View>

            <View style={styles.recipeMetaRow}>
              <View style={styles.metaItem}>
                <AppIcon name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.time}</Text>
              </View>
              <View style={styles.metaItem}>
                <AppIcon name="users" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.servings}</Text>
              </View>
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.ingredients.length} items</Text>
            </View>

            <View style={styles.tagsRow}>
              {recipe.tags.map((tag) => (
                <View key={tag} style={[styles.smallTag, { backgroundColor: 'rgba(46, 94, 153, 0.1)', borderRadius: radius.xs }]}>
                  <Text style={[styles.smallTagText, { color: colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      ))}
      {filteredRecipes.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recipes found</Text>
        </View>
      )}
    </View>
  );

  const renderCollections = () => (
    <>
      <View style={styles.gridContainer}>
        {collections.map((collection) => (
          <Pressable
            key={collection.id}
            style={[styles.collectionCard, { backgroundColor: collection.color, borderRadius: radius.card }]}
            onPress={() => setSelectedCollection(collection)}
          >
            <Text style={styles.collectionEmoji}>{collection.name.split(' ')[0]}</Text>
            <Text style={styles.collectionTitle}>{collection.name.substring(2)}</Text>
            <Text style={styles.collectionCount}>{collection.count} recipes</Text>

            <View style={styles.collectionFooter}>
              <AppIcon name="chevronRight" size={20} color={colors.mutedForeground} />
              <Pressable style={[styles.addAllButton, { borderRadius: radius.sm }]} onPress={() => handleAddCollectionToGrocery(collection.id)}>
                <AppIcon name="shoppingCart" size={14} color={colors.foreground} style={{ marginRight: 4 }} />
                <Text style={styles.addAllText}>Add All</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.createCollectionButton, { backgroundColor: colors.card, borderColor: colors.muted, borderRadius: radius.card }]}
        onPress={() => setShowCreateCollectionModal(true)}
      >
        <AppIcon name="plus" size={20} color={colors.mutedForeground} />
        <Text style={[styles.createCollectionText, { color: colors.mutedForeground }]}>Create Collection</Text>
      </Pressable>
    </>
  );

  return (
    <>
      <AppLayout showNav={false} onAddPress={() => setShowAddRecipeModal(true)}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: colors.card, borderRadius: radius.md }]}>
              <AppIcon name="menu" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>Recipes</Text>

            <View style={styles.headerActions}>
              <Pressable
                style={[styles.pillButton, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}
                onPress={() => navigation.navigate("MealPlan" as any)}
              >
                <AppIcon name="calendar" size={16} color={colors.foreground} style={{ marginRight: 6 }} />
                <Text style={[styles.pillText, { color: colors.foreground }]}>Meal Plan</Text>
              </Pressable>
              <Pressable
                style={[styles.iconButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                onPress={() => setShowAddRecipeModal(true)}
              >
                <AppIcon name="plus" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
            <AppIcon name="search" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search recipes..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {/* Tabs */}
          <View style={[styles.tabRow, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
            {tabs.map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  style={[
                    styles.tabPill,
                    { borderRadius: radius.md },
                    active && { backgroundColor: colors.card, shadowColor: '#000' }
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  {tab === "For You" && <AppIcon name="sparkles" size={14} color={active ? colors.foreground : colors.mutedForeground} style={{ marginRight: 6 }} />}
                  <Text style={[styles.tabText, { color: active ? colors.foreground : colors.mutedForeground }]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Content */}
          {activeTab === "For You" && renderForYou()}
          {activeTab === "All Recipes" && renderAllRecipes()}
          {activeTab === "Collections" && renderCollections()}

        </ScrollView>
      </AppLayout>
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        open={showRecipeDetail}
        onOpenChange={setShowRecipeDetail}
        recipe={selectedRecipe}
        onAddToGroceryList={handleAddToGroceryList}
      />

      <AddNewRecipeModal
        open={showAddRecipeModal}
        onClose={() => setShowAddRecipeModal(false)}
      />

      <CreateCollectionModal
        open={showCreateCollectionModal}
        onClose={() => setShowCreateCollectionModal(false)}
      />

      <CollectionDetailModal
        open={!!selectedCollection}
        onClose={() => setSelectedCollection(null)}
        collection={selectedCollection}
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  menuButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    marginLeft: theme.spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  iconButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    marginBottom: theme.spacing.md,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  tabRow: {
    flexDirection: "row",
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  tabPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  tagGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  prefTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  prefIcon: {
    opacity: 0.7,
  },
  prefText: {
    fontWeight: "600",
    fontSize: 13,
  },
  groceryNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groceryNote: {
    fontSize: 14,
  },
  recommendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
  },
  recommendLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  emojiContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendEmoji: {
    fontSize: 22,
  },
  recommendTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  recommendMeta: {
    fontSize: 12,
  },
  recommendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickCard: {
    width: 140,
    padding: 16,
    marginRight: 0,
    alignItems: "flex-start",
  },
  quickEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    height: 40,
  },
  quickMeta: {
    fontSize: 12,
  },
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    marginBottom: 24,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  planContent: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  planMeta: {
    fontSize: 13,
  },
  planButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  planButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  // All Recipes
  listContainer: {
    gap: 12,
  },
  recipeCard: {
    flexDirection: 'row',
    padding: 16,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'flex-start',
  },
  recipeImage: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  // Collections
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  collectionCard: {
    width: (Dimensions.get('window').width - 40 - 12) / 2, // 40 padding, 12 gap
    padding: 16,
    minHeight: 160,
  },
  collectionEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
    marginBottom: 16,
  },
  collectionFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  createCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 24,
    gap: 8,
  },
  createCollectionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
