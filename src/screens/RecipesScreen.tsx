import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Dimensions,
  Image,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { AppLayout } from "../components/layout";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { theme } from "../theme";
import { useSidebar } from "../contexts/SidebarContext";
import { useFamily } from "../contexts/FamilyContext";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { AppIcon } from "../components/ui/AppIcon";
import { useRecipes } from "../contexts/RecipeContext";
import { useCountry } from "../contexts/CountryContext";
import { RecipeImage } from "../components/recipes/RecipeImage";
import { Recipe } from "../types/recipes";
import { RecipeDetailModal } from "../components/modals/RecipeDetailModal";
import { AddNewRecipeModal } from "../components/modals/AddNewRecipeModal";
import { CreateCollectionModal } from "../components/modals/CreateCollectionModal";
import { CollectionDetailModal } from "../components/modals/CollectionDetailModal";
import { useToast } from "../components/ui/Toast";
import { ScreenErrorView } from "../components/ui/ScreenErrorView";
import { Linking } from "react-native";
import { ImageGalleryModal } from "../components/modals/ImageGalleryModal";
import { AudioPlayerModal } from "../components/modals/AudioPlayerModal";
import { getRecipeType } from "../utils/recipeUtils";

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

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
  const { addGroceryItem, activeMember } = useFamily();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { recipes, collections, toggleBookmark, removeRecipe } = useRecipes();
  const { currentCountry } = useCountry();
  const { showToast } = useToast();

  const [screenError, setScreenError] = useState<string | null>(null);
  const handleScreenError = useCallback((context: string, error: unknown) => {
    console.error(`RecipesScreen - ${context}`, error);
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";
    setScreenError(message);
  }, []);
  const resetScreenError = useCallback(() => setScreenError(null), []);

  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState("For You");
  const [query, setQuery] = useState("");
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [recipeEditType, setRecipeEditType] = useState<'Text' | 'Image' | 'Link' | 'Audio' | undefined>(undefined);

  // Auto-switch to "All Recipes" when searching
  useEffect(() => {
    if (query.trim().length > 0 && activeTab !== "All Recipes") {
      setActiveTab("All Recipes");
    }
  }, [query]);

  // Clear search for better UX when switching tabs manually
  useEffect(() => {
    if (activeTab !== "All Recipes" && query.trim().length > 0) {
      setQuery("");
    }
  }, [activeTab]);

  // ... (Keep existing state)
  // Recipe Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);

  const [activePreferences, setActivePreferences] = useState<string[]>([]);

  // ... (Keep existing logic: togglePreference, filteredRecipes, quickMeals, favorites, recommended)

  const togglePreference = (pref: string) => {
    setActivePreferences(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const locationAwareRecipes = useMemo(() => {
    return recipes.filter(recipe => !recipe.countryCode || recipe.countryCode === currentCountry.code);
  }, [recipes, currentCountry.code]);

  const filteredRecipes = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return locationAwareRecipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(lowerQuery) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }, [query, locationAwareRecipes]);

  const quickMeals = useMemo(() => {
    return locationAwareRecipes
      .filter((r) => {
        const timeVal = parseInt(r.time.split(" ")[0]);
        return timeVal <= 25;
      })
      .sort((a, b) => {
        const timeA = parseInt(a.time.split(" ")[0]);
        const timeB = parseInt(b.time.split(" ")[0]);
        return timeA - timeB;
      });
  }, [locationAwareRecipes]);

  const favorites = locationAwareRecipes.filter(r => r.saved);

  const recommended = useMemo(() => {
    if (activePreferences.length === 0) {
      return locationAwareRecipes.slice(0, 4);
    }
    return locationAwareRecipes.filter(r =>
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
  }, [locationAwareRecipes, activePreferences]);

  // Handle Recipe Click
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  // ... (handleRecipePress, toast, handleAddToGroceryList, handleAddCollectionToGrocery, render helpers)

  const openRecipeLink = useCallback(async (rawUrl: string) => {
    try {
      let targetUrl = rawUrl;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }
      const supported = await Linking.canOpenURL(targetUrl);
      if (!supported) {
        showToast({ title: "Error", description: "Invalid link format", type: "warning" });
        throw new Error("Link cannot be handled");
      }
      await Linking.openURL(targetUrl);
    } catch (error) {
      handleScreenError("openRecipeLink", error);
    }
  }, [handleScreenError, showToast]);

  const handleRecipePress = (recipe: Recipe) => {
    try {
      const updated = recipes.find((r) => r.id === recipe.id) ?? recipe;
      setSelectedRecipe(updated);

      if (recipe.url) {
        void openRecipeLink(recipe.url);
      } else if (recipe.audio) {
        setShowAudioPlayer(true);
      } else if (recipe.images && recipe.images.length > 0) {
        setShowImageGallery(true);
      } else {
        setShowRecipeDetail(true);
      }
    } catch (error) {
      handleScreenError("handleRecipePress", error);
    }
  };



  const handleBookmark = (recipe: Recipe) => {
    try {
      const nextSaved = toggleBookmark(recipe.id);
      const updated = recipes.find((r) => r.id === recipe.id) ?? { ...recipe, saved: nextSaved };
      setSelectedRecipe(updated);
      return nextSaved;
    } catch (error) {
      handleScreenError("handleBookmark", error);
      return recipe.saved;
    }
  };

  const handleAddToGroceryList = async (recipe: Recipe): Promise<boolean> => {
    try {
      // showToast({ title: "Adding...", description: `Adding ingredients from ${recipe.name}`, type: "default" });

      for (const ing of recipe.ingredients) {
        await addGroceryItem({
          name: ing.name,
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit || 'pcs',
          categoryId: undefined,
          addedBy: activeMember?.id,
          completed: false,
        });
      }
      // showToast({ title: "Success", description: "Ingredients added to grocery list", type: "success" });
      return true;
    } catch (error) {
      handleScreenError("handleAddToGroceryList", error);
      // showToast({ title: "Error", description: "Failed to add ingredients", type: "warning" });
      return false;
    }
  };

  const handleAddCollectionToGrocery = async (collectionId: number) => {
    try {
      const collection = collections.find(c => c.id === collectionId);
      if (collection && collection.recipeIds) {
        const recipesInCollection = recipes.filter(r => collection.recipeIds?.includes(r.id));

        if (recipesInCollection.length === 0) {
          showToast({ title: "Info", description: "No valid recipes found in collection", type: "default" });
          return;
        }

        showToast({ title: "Adding Collection", description: `Adding items from ${collection.name}...`, type: "default" });

        for (const r of recipesInCollection) {
          await handleAddToGroceryList(r);
        }

        showToast({ title: "Success", description: `Added recipes from ${collection.name} to list`, type: "success" });
      } else {
        showToast({ title: "Info", description: "No recipes in this collection yet", type: "default" });
      }
    } catch (error) {
      handleScreenError("handleAddCollectionToGrocery", error);
    }
  };

  const renderRecipeImage = (imageString: string) => {
    return <RecipeImage image={imageString} size={48} />;
  };

  const renderRecommendedItem = (recipe: Recipe) => (
    <Pressable
      key={recipe.id}
      style={[styles.recommendRow, { backgroundColor: colors.muted, borderRadius: radius.lg }]}
      onPress={() => handleRecipePress(recipe)}
    >
      <View style={styles.recommendLeft}>
        <View style={[styles.emojiContainer, { backgroundColor: colors.card, borderRadius: radius.sm }]}>
          {renderRecipeImage(recipe.image)}
        </View>
        <View>
          <Text style={[styles.recommendTitle, { color: colors.foreground }]}>{recipe.name}</Text>
          {recipe.time ? (
            <Text style={[styles.recommendMeta, { color: colors.mutedForeground }]}>
              {recipe.time}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.recommendRight}>
        <Pressable onPress={() => toggleBookmark(recipe.id)}>
          <AppIcon name="bookmark" size={20} color={recipe.saved ? colors.primary : colors.mutedForeground} style={recipe.saved ? { opacity: 1 } : { opacity: 0.5 }} />
        </Pressable>
        <AppIcon name="chevronRight" size={20} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );

  const renderForYou = () => {
    if (recipes.length === 0) {
      return (
        <View style={[styles.emptyContentCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          <Text style={[styles.emptyContentTitle, { color: colors.foreground }]}>Add a recipe to unlock this space</Text>
          <Text style={[styles.emptyContentSubtitle, { color: colors.mutedForeground }]}>
            Your For You, Quick Meals, and Favorites are generated from recipes and bookmarks you create. Tap + to add your first one.
          </Text>
        </View>
      );
    }

    return (
      <>
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

        {/* ... keeping other sections ... */}
        {activePreferences.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
            <View style={styles.sectionHeader}>
              <AppIcon name="star" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Recommended For You
              </Text>
            </View>
            {recommended.length > 0 ? recommended.map(renderRecommendedItem) : (
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
            {favorites.map(renderRecommendedItem)}
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
                <View style={{ marginBottom: 12, height: 40, justifyContent: 'center' }}>
                  {renderRecipeImage(recipe.image)}
                </View>
                <Text style={[styles.quickTitle, { color: colors.foreground }]} numberOfLines={2}>{recipe.name}</Text>
                <Text style={[styles.quickMeta, { color: colors.mutedForeground }]}>{recipe.time}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.planBanner, { backgroundColor: colors.card, borderRadius: radius.card }]}>
          <View style={styles.planContent}>
            <Text style={[styles.planTitle, { color: colors.foreground }]}>Plan your week's meals</Text>
            <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>Auto-generate grocery lists from recipes</Text>
          </View>
          <Pressable
            style={[styles.planButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
            onPress={() => (navigation as any).navigate("home", { screen: "MealPlan" })}
          >
            <Text style={[styles.planButtonText, { color: colors.primaryForeground }]}>Plan Now</Text>
          </Pressable>
        </View>
      </>
    );

  };

  // ... (renderAllRecipes and renderCollections same)
  const renderAllRecipes = () => (
    <View style={styles.listContainer}>
      {filteredRecipes.map((recipe) => (
        <View key={recipe.id} style={{ marginBottom: 16 }}>
          {/* Main Card */}
          <Pressable
            style={[styles.recipeCard, { backgroundColor: colors.card, borderRadius: radius.lg }]}
            onPress={() => handleRecipePress(recipe)}
          >
            <View style={[styles.recipeImage, { backgroundColor: colors.muted, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
              {renderRecipeImage(recipe.image)}
            </View>
            <View style={styles.recipeInfo}>
              <View style={styles.recipeHeader}>
                <Text style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
                <Pressable onPress={() => toggleBookmark(recipe.id)}>
                  <AppIcon
                    name="bookmark"
                    size={20}
                    color={recipe.saved ? colors.primary : colors.mutedForeground}
                    style={recipe.saved ? { opacity: 1 } : { opacity: 0.5 }}
                  />
                </Pressable>
              </View>

              <View style={styles.recipeMetaRow}>
                {recipe.time ? (
                  <View style={styles.metaItem}>
                    <AppIcon name="clock" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.time}</Text>
                  </View>
                ) : null}
                {recipe.image !== "AUDIO_ICON" && recipe.image !== "mic" && (
                  <>
                    <View style={styles.metaItem}>
                      <AppIcon name="users" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.servings}</Text>
                    </View>
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{recipe.ingredients.length} items</Text>
                  </>
                )}
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

          {/* Action Buttons - Outside the Card */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12, paddingHorizontal: 4 }}>
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: 'black',
                borderRadius: radius.md,
                paddingVertical: 8,
                paddingHorizontal: 16,
              }}
              onPress={() => handleEditRecipe(recipe)}
            >
              <AppIcon name="edit" size={16} color="black" />
              <Text style={{ fontSize: 13, color: "black", fontWeight: '600' }}>Edit</Text>
            </Pressable>
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: 'black',
                borderRadius: radius.md,
                paddingVertical: 8,
                paddingHorizontal: 16,
              }}
              onPress={() => handleDeleteRecipe(recipe)}
            >
              <AppIcon name="trash" size={16} color="black" />
              <Text style={{ fontSize: 13, color: "black", fontWeight: '600' }}>Delete</Text>
            </Pressable>
          </View>
        </View>
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
      {collections.length === 0 ? (
        <View style={[styles.emptyContentCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          <Text style={[styles.emptyContentTitle, { color: colors.foreground }]}>No collections yet</Text>
          <Text style={[styles.emptyContentSubtitle, { color: colors.mutedForeground }]}>
            Collections group the recipes you add. Tap “Create Collection” below to start curating your own sets.
          </Text>
        </View>
      ) : (
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
      )}

      <Pressable
        style={[styles.createCollectionButton, { backgroundColor: colors.card, borderColor: colors.muted, borderRadius: radius.card }]}
        onPress={() => setShowCreateCollectionModal(true)}
      >
        <AppIcon name="plus" size={20} color={colors.mutedForeground} />
        <Text style={[styles.createCollectionText, { color: colors.mutedForeground }]}>Create Collection</Text>
      </Pressable>
    </>
  );

  // GESTURE LOGIC
  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = tabs.indexOf(activeTab);
    if (direction === 'left') {
      // Swiping Left -> Next Tab
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    } else {
      // Swiping Right -> Prev Tab
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
  };

  const panGesture = Gesture.Pan()
    .failOffsetY([-20, 20]) // Allow vertical scrolling to take precedence
    .activeOffsetX([-50, 50]) // Only trigger horizontal if moved enough
    .onEnd((e) => {
      if (e.translationX < -50) {
        runOnJS(handleSwipe)('left');
      } else if (e.translationX > 50) {
        runOnJS(handleSwipe)('right');
      }
    });

  if (screenError) {
    return (
      <>
        <AppLayout showNav={false}>
          <ScreenErrorView message={screenError} onRetry={resetScreenError} actionLabel="Reload" />
        </AppLayout>
        <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      </>
    );
  }

  const handleEditRecipe = (recipe: Recipe) => {
    const recipeType = getRecipeType(recipe);
    const tabTypeMap: Record<string, 'Text' | 'Image' | 'Link' | 'Audio'> = {
      'text': 'Text',
      'image': 'Image',
      'url': 'Link',
      'audio': 'Audio'
    };
    setRecipeEditType(tabTypeMap[recipeType]);
    setRecipeToEdit(recipe);
    setShowRecipeDetail(false);
    setShowAddRecipeModal(true);
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    Alert.alert(
      "Delete recipe",
      `Delete ${recipe.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeRecipe(recipe.id);
            showToast({ title: "Deleted", description: `${recipe.name} removed`, type: "default" });
            setShowRecipeDetail(false);
            setRecipeToEdit(null);
          }
        }
      ]
    );
  };

  const handleOpenAddModal = () => {
    setRecipeToEdit(null);
    setShowAddRecipeModal(true);
  };

  if (screenError) {
    return (
      <>
        <AppLayout showNav={false}>
          <ScreenErrorView message={screenError} onRetry={resetScreenError} actionLabel="Reload" />
        </AppLayout>
        <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      </>
    );
  }

  return (
    <>
      <AppLayout showNav={false} onAddPress={() => {
        if (activeTab === "Collections") {
          setShowCreateCollectionModal(true);
        } else {
          handleOpenAddModal();
        }
      }}>
        <GestureDetector gesture={panGesture}>
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
                  onPress={() => (navigation as any).navigate("MealPlan")}
                >
                  <AppIcon name="calendar" size={16} color={colors.foreground} style={{ marginRight: 6 }} />
                  <Text style={[styles.pillText, { color: colors.foreground }]}>Meal Plan</Text>
                </Pressable>
                <Pressable
                  style={[styles.iconButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                  onPress={() => {
                    if (activeTab === "Collections") {
                      setShowCreateCollectionModal(true);
                    } else {
                      setShowAddRecipeModal(true);
                    }
                  }}
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
                onFocus={() => {
                  if (activeTab !== "All Recipes") {
                    setActiveTab("All Recipes");
                  }
                }}
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
        </GestureDetector>
      </AppLayout>
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        open={showRecipeDetail}
        onOpenChange={setShowRecipeDetail}
        recipe={selectedRecipe}
        onAddToGroceryList={handleAddToGroceryList}
        onBookmark={(recipe) => handleBookmark(recipe)}
        onEdit={handleEditRecipe}
        onDelete={handleDeleteRecipe}
      />

      {showAddRecipeModal && (
        <AddNewRecipeModal
          open={showAddRecipeModal}
          recipe={recipeToEdit ?? undefined}
          initialType={recipeEditType}
          onClose={() => {
            setShowAddRecipeModal(false);
            setRecipeToEdit(null);
            setRecipeEditType(undefined);
          }}
        />
      )}

      <CreateCollectionModal
        open={showCreateCollectionModal}
        onClose={() => setShowCreateCollectionModal(false)}
      />

      <CollectionDetailModal
        open={!!selectedCollection}
        onClose={() => setSelectedCollection(null)}
        collection={selectedCollection}
        onRecipePress={handleRecipePress}
      />

      {/* Rich Media Modals */}
      <ImageGalleryModal
        open={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        images={selectedRecipe?.images || (selectedRecipe?.image ? [selectedRecipe.image] : [])} // Fallback to single image if array empty (though logic prioritizes array)
        title={selectedRecipe?.name}
      />

      <AudioPlayerModal
        open={showAudioPlayer}
        onClose={() => setShowAudioPlayer(false)}
        audioSrc={selectedRecipe?.audio || ""}
        title={selectedRecipe?.name}
        duration={selectedRecipe?.duration || 0}
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
    marginRight: 16,
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
  emptyContentCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  emptyContentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyContentSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
