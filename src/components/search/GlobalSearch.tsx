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
import { theme } from "../../theme";
import { AppIcon, AppIconName } from "../ui/AppIcon";

interface SearchResult {
  id: string;
  type: "event" | "task" | "grocery" | "recipe" | "document";
  title: string;
  subtitle: string;
  icon: string;
  path: string;
  meta?: string;
}

// Sample data from React JS
const sampleData: SearchResult[] = [
  // Events
  { id: "e1", type: "event", title: "School Meeting", subtitle: "Parent-teacher conference", icon: "🏫", path: "calendar", meta: "Tomorrow 10:00 AM" },
  { id: "e2", type: "event", title: "Dad's Birthday", subtitle: "Family celebration", icon: "🎂", path: "calendar", meta: "Jan 15" },
  { id: "e3", type: "event", title: "Doctor Appointment", subtitle: "Annual checkup", icon: "🏥", path: "calendar", meta: "Jan 20" },
  { id: "e4", type: "event", title: "Team Meeting", subtitle: "Work call with team", icon: "💼", path: "calendar", meta: "Monday 2:00 PM" },
  { id: "e5", type: "event", title: "Grocery Shopping", subtitle: "Weekly shopping trip", icon: "🛒", path: "calendar", meta: "Saturday" },

  // Tasks
  { id: "t1", type: "task", title: "Clean Room", subtitle: "Assigned to Ananya", icon: "🧹", path: "tasks", meta: "High Priority" },
  { id: "t2", type: "task", title: "Take out Trash", subtitle: "Recurring weekly", icon: "🗑️", path: "tasks", meta: "Due Today" },
  { id: "t3", type: "task", title: "Water Plants", subtitle: "Assigned to Mom", icon: "🌱", path: "tasks", meta: "Every 3 days" },
  { id: "t4", type: "task", title: "Pay Electricity Bill", subtitle: "Due this week", icon: "💡", path: "tasks", meta: "Medium Priority" },
  { id: "t5", type: "task", title: "Homework Help", subtitle: "Assigned to Dad", icon: "📚", path: "tasks", meta: "Daily" },

  // Grocery
  { id: "g1", type: "grocery", title: "Milk", subtitle: "2 liters - Dairy", icon: "🥛", path: "lists", meta: "Pending" },
  { id: "g2", type: "grocery", title: "Eggs", subtitle: "1 dozen - Dairy", icon: "🥚", path: "lists", meta: "Pending" },
  { id: "g3", type: "grocery", title: "Bread", subtitle: "Whole wheat - Bakery", icon: "🍞", path: "lists", meta: "Pending" },
  { id: "g4", type: "grocery", title: "Apples", subtitle: "1 kg - Fruits", icon: "🍎", path: "lists", meta: "Pending" },
  { id: "g5", type: "grocery", title: "Chicken", subtitle: "500g - Meat", icon: "🍗", path: "lists", meta: "Pending" },

  // Recipes
  { id: "r1", type: "recipe", title: "Butter Chicken", subtitle: "Indian Main Course", icon: "🍛", path: "Recipes", meta: "45 mins" },
  { id: "r2", type: "recipe", title: "Caesar Salad", subtitle: "Healthy Salad", icon: "🥗", path: "Recipes", meta: "15 mins" },
  { id: "r3", type: "recipe", title: "Pasta Carbonara", subtitle: "Italian Classic", icon: "🍝", path: "Recipes", meta: "30 mins" },
  { id: "r4", type: "recipe", title: "Chocolate Cake", subtitle: "Dessert", icon: "🎂", path: "Recipes", meta: "60 mins" },
  { id: "r5", type: "recipe", title: "Veggie Stir Fry", subtitle: "Quick & Healthy", icon: "🥦", path: "Recipes", meta: "20 mins" },

  // Documents
  { id: "d1", type: "document", title: "Passport - Dad", subtitle: "ID Document", icon: "📘", path: "Vault", meta: "Expires 2026" },
  { id: "d2", type: "document", title: "Car Insurance", subtitle: "Insurance Policy", icon: "🚗", path: "Vault", meta: "Expires Mar 2025" },
  { id: "d3", type: "document", title: "TV Warranty", subtitle: "Warranty Card", icon: "📺", path: "Vault", meta: "Expires Feb 2025" },
  { id: "d4", type: "document", title: "Medical Records", subtitle: "Health Documents", icon: "🏥", path: "Vault", meta: "Updated Jan 2024" },
  { id: "d5", type: "document", title: "Property Papers", subtitle: "Legal Documents", icon: "🏠", path: "Vault", meta: "Permanent" },
];

const typeConfig: Record<string, { label: string; icon: AppIconName; color: string; bg: string }> = {
  event: { label: "Events", icon: "calendar", color: "#2563EB", bg: "#EFF6FF" },
  task: { label: "Tasks", icon: "checkSquare", color: "#16A34A", bg: "#DCFCE7" },
  grocery: { label: "Grocery", icon: "shoppingCart", color: "#EA580C", bg: "#FFEDD5" },
  recipe: { label: "Recipes", icon: "utensils", color: "#4F46E5", bg: "#E0E7FF" },
  document: { label: "Vault", icon: "file", color: "#0891B2", bg: "#CFFAFE" },
};

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onClose }) => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveFilter(null);
    }
  }, [open]);

  const filteredResults = useMemo(() => {
    if (!query.trim() && !activeFilter) return [];

    return sampleData.filter((item) => {
      const matchesQuery = !query.trim() ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(query.toLowerCase());

      const matchesFilter = !activeFilter || item.type === activeFilter;

      return matchesQuery && matchesFilter;
    });
  }, [query, activeFilter]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    filteredResults.forEach((result) => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    });
    return groups;
  }, [filteredResults]);

  const handleSelect = (result: SearchResult) => {
    onClose();
    navigation.navigate(result.path);
  };

  const recentSearches = ["Milk", "Birthday", "Doctor", "Butter Chicken"];

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.searchBar}>
            <View style={styles.searchInputContainer}>
              <AppIcon name="search" size={20} color={theme.colors.mutedForeground} style={styles.searchIcon} />
              <TextInput
                style={styles.input}
                placeholder="Search events, tasks, recipes, vault..."
                placeholderTextColor={theme.colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} style={styles.clearButton}>
                  <AppIcon name="x" size={16} color={theme.colors.mutedForeground} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.cancelButton}>
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
                  color={activeFilter === type ? "#fff" : theme.colors.mutedForeground}
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
              {/* Recent Searches */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <View style={styles.recentRow}>
                  {recentSearches.map((term, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setQuery(term)}
                      style={styles.recentChip}
                    >
                      <Text style={styles.recentText}>{term}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Quick Access */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Access</Text>
                <View style={styles.grid}>
                  {Object.entries(typeConfig).map(([type, config]) => {
                    const count = sampleData.filter((d) => d.type === type).length;
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
                    <AppIcon name="sparkles" size={16} color="#fff" />
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
              {filteredResults.length > 0 ? (
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
                          <AppIcon name="chevronRight" size={16} color={theme.colors.mutedForeground} />
                        </Pressable>
                      ))}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <AppIcon name="search" size={32} color={theme.colors.mutedForeground} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Should be #F1F5F9 or similar light blue-grey based on screenshot
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === "android" ? 40 : 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
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
    backgroundColor: "#E2E8F0", // Slate-200ish
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.foreground,
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
    color: theme.colors.primary,
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
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary, // Dark blue selected
    borderColor: theme.colors.primary,
  },
  filterChipInactive: {
    backgroundColor: theme.colors.muted, // Light grey unselected
    borderColor: "transparent",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  filterTextInactive: {
    color: theme.colors.mutedForeground,
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
    color: theme.colors.mutedForeground,
  },
  recentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentChip: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recentText: {
    fontSize: 14,
    color: theme.colors.foreground,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickCard: {
    width: "48%", // 2 columns approx
    backgroundColor: theme.colors.card,
    borderRadius: 12,
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
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  quickCardCount: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  tipCard: {
    backgroundColor: "#EFF6FF", // Light Blue
    borderRadius: 12,
    padding: 16,
  },
  tipHeader: {
    flexDirection: "row",
    gap: 12,
  },
  tipIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: "#475569",
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
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  groupCount: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 12,
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
    color: theme.colors.foreground,
  },
  resultSubtitle: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
  },
  metaTag: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.mutedForeground,
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
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.mutedForeground,
  },
});
