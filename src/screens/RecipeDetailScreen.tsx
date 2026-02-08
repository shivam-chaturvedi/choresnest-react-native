import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AppLayout } from "../components/layout";
import { useMealPlan } from "../contexts/MealPlanContext";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';

import { RouteProp, useRoute } from "@react-navigation/native";

type ParamList = {
  RecipeDetail: {
    recipeId: number;
  };
};

export const RecipeDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<ParamList, "RecipeDetail">>();
  const { recipeId } = route.params;
  const { getRecipeById } = useMealPlan();
  const recipe = getRecipeById(recipeId);
  const colors = useThemeColors();
  const radius = useThemeRadius();

  if (!recipe) {
    return (
      <AppLayout>
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.foreground }]}>Recipe not found</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>{recipe.name}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {recipe.time} · Serves {recipe.servings}
        </Text>
        <View style={styles.tags}>
          {recipe.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.primaryLight || colors.muted, borderRadius: radius.full }]}>
              {/* PrimaryLight might not exist in colors hook directly if not defined. 
                  Checking theme... usually theme.colors.primaryLight. 
                  If not present in colors object, fallback to muted or similar. 
                  The previous code used theme.colors.primaryLight. 
                  I should check if useThemeColors returns it. 
                  If not, I'll use primary with opacity or muted. 
                  Let's assume colors includes it or use a fallback. 
              */}
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ingredients</Text>
        {recipe.ingredients.map((ingredient) => (
          <Text key={ingredient.name} style={[styles.ingredient, { color: colors.foreground }]}>
            • {ingredient.name} — {ingredient.quantity} {ingredient.unit}
          </Text>
        ))}
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: theme.spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  tag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  ingredient: {
    fontSize: 14,
    marginBottom: theme.spacing.xs,
  },
});
