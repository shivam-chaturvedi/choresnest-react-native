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
import { AppIcon } from "../components/ui/AppIcon";
import { recipes, collections, Recipe } from "../data/recipes";
import { RecipeDetailModal } from "../components/modals/RecipeDetailModal";
import { AddNewRecipeModal } from "../components/modals/AddNewRecipeModal";
import { CreateCollectionModal } from "../components/modals/CreateCollectionModal";
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

  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState("For You");
  const [query, setQuery] = useState("");

  // Recipe Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);

  const filteredRecipes = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return recipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(lowerQuery) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }, [query]);

  // For "Quick Meals" (under 20 mins)
  const quickMeals = recipes.filter((r) => {
    const timeVal = parseInt(r.time.split(" ")[0]);
    return timeVal <= 20;
  });

  // Recommended (just showing all for now, or could filter)
  const recommended = recipes.slice(0, 4);

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

  const renderForYou = () => (
    <>
      {/* Preferences */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <AppIcon name="sparkles" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Your Preferences</Text>
        </View>
        <View style={styles.tagGroup}>
          {preferences.map((tag) => (
            <Pressable key={tag} style={[styles.prefTag, { backgroundColor: theme.colors.muted }]}>
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
                  color={theme.colors.mutedForeground}
                />
              </View>
              <Text style={[styles.prefText, { color: theme.colors.mutedForeground }]}>{tag}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.groceryNoteRow}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>📦</Text>
          <Text style={[styles.groceryNote, { color: theme.colors.mutedForeground }]}>4 ingredients available from your grocery list</Text>
        </View>
      </View>

      {/* Recommended For You */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <AppIcon name="sparkles" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Recommended For You</Text>
        </View>

        {recommended.map((recipe) => (
          <Pressable
            key={recipe.id}
            style={[styles.recommendRow, { backgroundColor: theme.colors.muted }]}
            onPress={() => handleRecipePress(recipe)}
          >
            <View style={styles.recommendLeft}>
              <View style={[styles.emojiContainer, { backgroundColor: theme.colors.card }]}>
                <Text style={styles.recommendEmoji}>{recipe.image}</Text>
              </View>
              <View>
                <Text style={[styles.recommendTitle, { color: theme.colors.foreground }]}>{recipe.name}</Text>
                <Text style={[styles.recommendMeta, { color: theme.colors.mutedForeground }]}>
                  {recipe.time}
                </Text>
              </View>
            </View>
            <View style={styles.recommendRight}>
              <View style={[styles.ratingBadge, { backgroundColor: '#7b8aac' }]}>
                <Text style={styles.ratingText}>
                  {recipe.id === 1 ? "37%" : recipe.id === 2 ? "18%" : "20%"}
                </Text>
              </View>
              <AppIcon name="chevronRight" size={20} color={theme.colors.mutedForeground} />
            </View>
          </Pressable>
        ))}
      </View>

      {/* Quick Meals */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <AppIcon name="clock" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Quick Meals (Under 20 min)</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {quickMeals.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={[styles.quickCard, { backgroundColor: theme.colors.muted }]}
              onPress={() => handleRecipePress(recipe)}
            >
              <Text style={styles.quickEmoji}>{recipe.image}</Text>
              <Text style={[styles.quickTitle, { color: theme.colors.foreground }]} numberOfLines={2}>{recipe.name}</Text>
              <Text style={[styles.quickMeta, { color: theme.colors.mutedForeground }]}>{recipe.time}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Meal Plan CTA */}
      <View style={[styles.planBanner, { backgroundColor: theme.colors.card }]}>
        <View style={styles.planContent}>
          <Text style={[styles.planTitle, { color: theme.colors.foreground }]}>Plan your week's meals</Text>
          <Text style={[styles.planMeta, { color: theme.colors.mutedForeground }]}>Auto-generate grocery lists from recipes</Text>
        </View>
        <Pressable
          style={[styles.planButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate("MealPlan" as any)}
        >
          <Text style={[styles.planButtonText, { color: theme.colors.primaryForeground }]}>Plan Now</Text>
        </Pressable>
      </View>
    </>
  );

  const renderAllRecipes = () => (
    <View style={styles.listContainer}>
      {filteredRecipes.map((recipe) => (
        <Pressable
          key={recipe.id}
          style={[styles.recipeCard, { backgroundColor: theme.colors.card }]}
          onPress={() => handleRecipePress(recipe)}
        >
          <View style={[styles.recipeImage, { backgroundColor: theme.colors.muted }]}>
            <Text style={{ fontSize: 32 }}>{recipe.image}</Text>
          </View>
          <View style={styles.recipeInfo}>
            <View style={styles.recipeHeader}>
              <Text style={[styles.recipeName, { color: theme.colors.foreground }]}>{recipe.name}</Text>
              <AppIcon
                name="bookmark"
                size={20}
                color={recipe.saved ? theme.colors.primary : theme.colors.mutedForeground}
                style={recipe.saved ? { opacity: 1 } : { opacity: 0.5 }}
              />
            </View>

            <View style={styles.recipeMetaRow}>
              <View style={styles.metaItem}>
                <AppIcon name="clock" size={14} color={theme.colors.mutedForeground} />
                <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>{recipe.time}</Text>
              </View>
              <View style={styles.metaItem}>
                <AppIcon name="users" size={14} color={theme.colors.mutedForeground} />
                <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>{recipe.servings}</Text>
              </View>
              <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>{recipe.ingredients.length} items</Text>
            </View>

            <View style={styles.tagsRow}>
              {recipe.tags.map((tag) => (
                <View key={tag} style={[styles.smallTag, { backgroundColor: 'rgba(46, 94, 153, 0.1)' }]}>
                  <Text style={[styles.smallTagText, { color: theme.colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>
      ))}
      {filteredRecipes.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.mutedForeground }]}>No recipes found</Text>
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
            style={[styles.collectionCard, { backgroundColor: collection.color }]}
          >
            <Text style={styles.collectionEmoji}>{collection.name.split(' ')[0]}</Text>
            <Text style={styles.collectionTitle}>{collection.name.substring(2)}</Text>
            <Text style={styles.collectionCount}>{collection.count} recipes</Text>

            <View style={styles.collectionFooter}>
              <AppIcon name="chevronRight" size={20} color={theme.colors.mutedForeground} />
              <Pressable style={styles.addAllButton}>
                <AppIcon name="shoppingCart" size={14} color={theme.colors.foreground} style={{ marginRight: 4 }} />
                <Text style={styles.addAllText}>Add All</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.createCollectionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.muted }]}
        onPress={() => setShowCreateCollectionModal(true)}
      >
        <AppIcon name="plus" size={20} color={theme.colors.mutedForeground} />
        <Text style={[styles.createCollectionText, { color: theme.colors.mutedForeground }]}>Create Collection</Text>
      </Pressable>
    </>
  );

  return (
    <>
      <AppLayout showNav={false}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: theme.colors.card }]}>
              <AppIcon name="menu" size={20} color={theme.colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>Recipes</Text>

            <View style={styles.headerActions}>
              <Pressable
                style={[styles.pillButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate("MealPlan" as any)}
              >
                <AppIcon name="calendar" size={16} color={theme.colors.foreground} style={{ marginRight: 6 }} />
                <Text style={[styles.pillText, { color: theme.colors.foreground }]}>Meal Plan</Text>
              </Pressable>
              <Pressable
                style={[styles.iconButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowAddRecipeModal(true)}
              >
                <AppIcon name="plus" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.muted }]}>
            <AppIcon name="search" size={20} color={theme.colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.foreground }]}
              placeholder="Search recipes..."
              placeholderTextColor={theme.colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {/* Tabs */}
          <View style={[styles.tabRow, { backgroundColor: theme.colors.muted }]}>
            {tabs.map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabPill, active && { backgroundColor: theme.colors.card, shadowColor: '#000' }]}
                  onPress={() => setActiveTab(tab)}
                >
                  {tab === "For You" && <AppIcon name="sparkles" size={14} color={active ? theme.colors.foreground : theme.colors.mutedForeground} style={{ marginRight: 6 }} />}
                  <Text style={[styles.tabText, { color: active ? theme.colors.foreground : theme.colors.mutedForeground }]}>{tab}</Text>
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
    borderRadius: 14,
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
    borderRadius: 14,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
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
    borderRadius: 16,
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
    borderRadius: 18,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  tabPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    borderRadius: 24,
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
    borderRadius: 12,
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
    borderRadius: 18,
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
    borderRadius: 10,
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
    borderRadius: 12,
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
    borderRadius: 20,
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
    borderRadius: 24,
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
    borderRadius: 14,
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
    borderRadius: 20,
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
    borderRadius: 18,
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
    borderRadius: 8,
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
    borderRadius: 24,
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
    borderRadius: 12,
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
    borderRadius: 24,
    padding: 24,
    gap: 8,
  },
  createCollectionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
