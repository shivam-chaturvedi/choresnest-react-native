import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppIcon, AppIconName } from "../ui/AppIcon";
import { useTheme, useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useFamily } from "../../contexts/FamilyContext";
import { useRecipes } from "../../contexts/RecipeContext";

interface SearchResult {
  id: string;
  type: "event" | "task" | "grocery" | "recipe" | "document";
  title: string;
  subtitle: string;
  icon: string;
  path: string;
  meta?: string;
}

// Live data integration
import { SearchService } from "../../services/SearchService";
// sampleData removed



interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { themeVersion } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius, themeVersion]);
  const typeConfig = useMemo<Record<string, { label: string; icon: AppIconName; color: string; bg: string }>>(
    () => ({
      event: { label: "Events", icon: "calendar", color: colors.info, bg: colors.info + "20" },
      task: { label: "Tasks", icon: "checkSquare", color: colors.success, bg: colors.success + "20" },
      grocery: { label: "Grocery", icon: "shoppingCart", color: colors.warning, bg: colors.warning + "20" },
      recipe: { label: "Recipes", icon: "utensils", color: colors.primary, bg: colors.primary + "20" },
      document: { label: "Vault", icon: "file", color: colors.secondary, bg: colors.secondary + "20" },
    }),
    [colors]
  );
  const { events, tasks, groceryList, globalVault, memberVaults } = useFamily();
  const { recipes } = useRecipes();
  const vaultCount = useMemo(() => {
    const memberCount = Object.values(memberVaults || {} as Record<string, any[]>).reduce((total: number, docs: any[]) => total + (docs?.length ?? 0), 0);
    return (globalVault?.length ?? 0) + memberCount;
  }, [globalVault, memberVaults]);
  const quickCounts = useMemo(() => ({
    event: events.length,
    task: tasks.length,
    grocery: (groceryList || []).filter((item: any) => !item.completed).length,
    recipe: recipes.length,
    document: vaultCount,
  }), [events, tasks, groceryList, recipes, vaultCount]) as Record<keyof typeof typeConfig, number>;
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const buildContextResults = (filter: string): SearchResult[] => {
    switch (filter) {
      case "event":
        return events.map(e => ({
          id: `evt-${e.id}`,
          type: "event" as const,
          title: e.title,
          subtitle: e.dateString || e.date || "",
          icon: "📅",
          path: "calendar",
          meta: e.time,
        }));
      case "task":
        return tasks.map(t => ({
          id: `task-${t.id}`,
          type: "task" as const,
          title: t.name,
          subtitle: t.status,
          icon: "✅",
          path: "Tasks",
          meta: t.priority,
        }));
      case "grocery":
        return (groceryList || [])
          .map((item: any, index: number) => ({
            id: `grocery-${item.id ?? index}`,
            type: "grocery" as const,
            title: item.name,
            subtitle: item.category || "Grocery item",
            icon: "🛒",
            path: "lists",
            meta: item.quantity ? `${item.quantity} ${item.unit ?? ""}`.trim() : "",
          }))
          .filter(item => !item.subtitle || !item.subtitle.includes("completed"));
      case "recipe":
        return recipes.map(r => ({
          id: `recipe-${r.id}`,
          type: "recipe" as const,
          title: r.name,
          subtitle: r.description || "Recipe",
          icon: "🍳",
          path: "Recipes",
        }));
      case "document": {
        const memberDocs = Object.entries(memberVaults || {}).flatMap(([memberId, docs]) =>
          (docs || []).map(doc => ({ ...doc, memberId }))
        );
        const allDocs = [...(globalVault || []), ...memberDocs];
        return allDocs.map(doc => ({
          id: `doc-${doc.id ?? doc.documentId ?? Math.random().toString(36).slice(2, 8)}`,
          type: "document" as const,
          title: doc.name,
          subtitle: doc.type || "Vault item",
          icon: "📄",
          path: "Vault",
          meta: doc.date || doc.purchaseDate,
        }));
      }
      default:
        return [];
    }
  };

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveFilter(null);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() && activeFilter) {
      setResults(buildContextResults(activeFilter));
    }
  }, [activeFilter, query, events, tasks, groceryList, recipes, globalVault, memberVaults]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      const { tasks, events, recipes, documents } = await SearchService.search(query);

      const mappedResults: SearchResult[] = [
        ...events.map(e => ({ id: e.id, type: 'event' as const, title: e.title, subtitle: e.dateString, icon: '📅', path: 'calendar', meta: e.time })),
        ...tasks.map(t => ({ id: t.id, type: 'task' as const, title: t.name, subtitle: t.status, icon: '✅', path: 'tasks', meta: t.priority })),
        ...recipes.map(r => ({ id: r.id, type: 'recipe' as const, title: r.name, subtitle: 'Recipe', icon: '🍳', path: 'Recipes', meta: '' })),
        ...documents.map(d => ({ id: d.id, type: 'document' as const, title: d.name, subtitle: d.type, icon: '📄', path: 'Vault', meta: d.date })),
      ];

      // Filter by active type if set
      const finalResults = activeFilter
        ? mappedResults.filter(r => r.type === activeFilter)
        : mappedResults;

      setResults(finalResults);
    };

    // Debounce slightly
    const timeout = setTimeout(performSearch, 300);
    return () => clearTimeout(timeout);
  }, [query, activeFilter]);

  // Grouping Logic
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((result) => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    });
    return groups;
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    onClose();

    // Handle nested navigation based on path/type
    const homeScreens = ["Recipes", "RecipeDetail", "MealPlan", "Nutrition", "Vault", "Expenses", "Family", "Notes", "NoteDetail"];
    const moreScreens = ["Notifications", "Privacy", "Theme", "Export", "DataExport", "Help", "Tasks"];

    if (homeScreens.includes(result.path)) {
      // Navigate to Home Stack
      navigation.navigate("home", { screen: result.path });
    } else if (moreScreens.includes(result.path)) {
      // Navigate to More Stack
      navigation.navigate("more", { screen: result.path });
    } else {
      // Navigate directly (Tabs or other root screens)
      navigation.navigate(result.path);
    }
  };

  const recentSearches = ["Milk", "Birthday", "Doctor", "Butter Chicken"];

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.searchBar}>
            <View style={styles.searchInputContainer}>
              <AppIcon name="search" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
              <TextInput
                style={styles.input}
                placeholder="Search events, tasks, recipes, vault..."
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} style={styles.clearButton}>
                  <AppIcon name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.cancelButton} hitSlop={10}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Pressable
              onPress={() => setActiveFilter(null)}
              style={[
                styles.filterChip,
                !activeFilter ? styles.filterChipActive : styles.filterChipInactive,
              ]}
            >
              <Text style={!activeFilter ? styles.filterTextActive : styles.filterTextInactive}>All</Text>
            </Pressable>

            {Object.entries(typeConfig).map(([type, config]) => (
              <Pressable
                key={type}
                onPress={() => setActiveFilter(activeFilter === type ? null : type)}
                style={[
                  styles.filterChip,
                  activeFilter === type ? styles.filterChipActive : styles.filterChipInactive,
                ]}
              >
                <AppIcon
                  name={config.icon}
                  size={14}
                  color={activeFilter === type ? "#fff" : colors.mutedForeground}
                  style={{ marginRight: 6 }}
                />
                <Text style={activeFilter === type ? styles.filterTextActive : styles.filterTextInactive}>
                  {config.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!query.trim() && !activeFilter ? (
            <View style={styles.defaultContent}>
              {/* Recent Searches - Removed/Cleared as per request 
              <View style={styles.section}>
                 ...
              </View>
              */}

              {/* Quick Access */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Access</Text>
                <View style={styles.grid}>
                  {Object.entries(typeConfig).map(([type, config]) => {
                    const count = quickCounts[type as keyof typeof quickCounts] ?? 0;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setActiveFilter(type)} // Switch to filter view
                        style={styles.quickCard}
                      >
                        <View style={[styles.quickIconBox, { backgroundColor: config.bg }]}>
                          <AppIcon name={config.icon} size={20} color={config.color} />
                        </View>
                        <View>
                          <Text style={styles.quickCardTitle}>{config.label}</Text>
                          <Text style={styles.quickCardCount}>{count} items</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Search Tips */}
              <View style={styles.tipCard}>
                <View style={styles.tipHeader}>
                  <View style={styles.tipIconBox}>
                    <AppIcon name="sparkles" size={16} color={colors.primaryForeground} />
                  </View>
                  <View>
                    <Text style={styles.tipTitle}>Search Tips</Text>
                    <Text style={styles.tipText}>• Type to search across all categories</Text>
                    <Text style={styles.tipText}>• Use filters to narrow results</Text>
                    <Text style={styles.tipText}>• Tap any result to navigate</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.resultsContent}>
              {results.length > 0 ? (
                Object.entries(groupedResults).map(([type, results]) => {
                  const config = typeConfig[type as keyof typeof typeConfig];
                  if (!config) return null;

                  return (
                    <View key={type} style={styles.resultGroup}>
                      <View style={styles.resultGroupHeader}>
                        <View style={[styles.groupIconBox, { backgroundColor: config.bg }]}>
                          <AppIcon name={config.icon} size={14} color={config.color} />
                        </View>
                        <Text style={styles.groupTitle}>{config.label}</Text>
                        <Text style={styles.groupCount}>({results.length})</Text>
                      </View>

                      {results.slice(0, 5).map((result) => (
                        <Pressable
                          key={result.id}
                          style={styles.resultRow}
                          onPress={() => handleSelect(result)}
                        >
                          <View style={styles.resultEmojiBox}>
                            <Text style={styles.resultEmoji}>{result.icon}</Text>
                          </View>
                          <View style={styles.resultInfo}>
                            <Text style={styles.resultTitle}>{result.title}</Text>
                            <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
                          </View>
                          {result.meta && (
                            <View style={styles.metaTag}>
                              <Text style={styles.metaText}>{result.meta}</Text>
                            </View>
                          )}
                          <AppIcon name="chevronRight" size={16} color={colors.mutedForeground} />
                        </Pressable>
                      ))}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <AppIcon name="search" size={32} color={colors.mutedForeground} />
                  </View>
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySubtitle}>Try different keywords or filters</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

type ThemeColors = ReturnType<typeof useThemeColors>;
type ThemeRadius = ReturnType<typeof useThemeRadius>;

const makeStyles = (colors: ThemeColors, radius: ThemeRadius) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.background,
      paddingTop: Platform.OS === "android" ? 40 : 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.foreground,
      height: "100%",
    },
    clearButton: {
      padding: 4,
    },
    cancelButton: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    cancelText: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 16,
    },
    filterScroll: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radius.sm,
      borderWidth: 1,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipInactive: {
      backgroundColor: colors.muted,
      borderColor: "transparent",
    },
    filterTextActive: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 14,
    },
    filterTextInactive: {
      color: colors.mutedForeground,
      fontWeight: "500",
      fontSize: 14,
    },
    content: {
      flex: 1,
    },
    defaultContent: {
      padding: 16,
      gap: 24,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.mutedForeground,
    },
    recentRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    recentChip: {
      backgroundColor: colors.muted,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.sm,
    },
    recentText: {
      fontSize: 14,
      color: colors.foreground,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    quickCard: {
      width: "48%",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    quickIconBox: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    quickCardTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
    },
    quickCardCount: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    tipCard: {
      backgroundColor: colors.primary + "15",
      borderRadius: radius.md,
      padding: 16,
    },
    tipHeader: {
      flexDirection: "row",
      gap: 12,
    },
    tipIconBox: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    tipTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 4,
    },
    tipText: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    resultsContent: {
      padding: 16,
      gap: 24,
    },
    resultGroup: {
      marginBottom: 8,
    },
    resultGroupHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 8,
    },
    groupIconBox: {
      width: 24,
      height: 24,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    groupTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.foreground,
    },
    groupCount: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    resultEmojiBox: {
      marginRight: 12,
    },
    resultEmoji: {
      fontSize: 24,
    },
    resultInfo: {
      flex: 1,
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.foreground,
    },
    resultSubtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    metaTag: {
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.sm,
      marginRight: 8,
    },
    metaText: {
      fontSize: 11,
      color: colors.mutedForeground,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 64,
    },
    emptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
  });
