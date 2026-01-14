import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { AppLayout } from "../components/layout/AppLayout";
import { useFamily, GroceryItem } from "../contexts/FamilyContext";
import { useMealPlan } from "../contexts/MealPlanContext";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon } from "../components/ui/AppIcon";
import { AddShoppingItemModal } from "../components/modals/AddShoppingItemModal";

export const ListsScreen: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { groceryList, addGroceryItem, toggleGroceryItem, removeGroceryItem, activeMember, members, categories } = useFamily();
  const { generateGroceryList } = useMealPlan();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // State to track expanded categories. Default all expanded.
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    categories.map(c => c.id)
  );

  const { openSidebar } = useSidebar();
  const [mealPlanItems, setMealPlanItems] = useState<ReturnType<typeof generateGroceryList>>([]);

  const filteredItems = useMemo(() => {
    return groceryList.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groceryList, searchQuery]);

  const todoItems = filteredItems.filter((item) => !item.completed);
  const doneItems = filteredItems.filter((item) => item.completed);

  const progress = filteredItems.length > 0
    ? Math.round((doneItems.length / filteredItems.length) * 100)
    : 0;

  const handleAddItem = (item: { name: string; quantity: number; unit: string; categoryId: string }) => {
    try {
      addGroceryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        categoryId: item.categoryId,
        addedBy: activeMember?.id || "1",
        completed: false,
      });
    } catch (error) {
      console.error("Error adding grocery item:", error);
      Alert.alert("Error", "Failed to add item. Please try again.");
    }
  };

  const handleOpenImport = () => {
    const items = generateGroceryList();
    setMealPlanItems(items);
    setShowImportModal(true);
  };

  const handleImportItem = (item: { name: string; quantity: number; unit: string }) => {
    try {
      addGroceryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        categoryId: categories[0]?.id || "cat6", // Default to first or Other
        addedBy: activeMember?.id || "1",
        completed: false,
      });
      Alert.alert("Item added", `${item.name} added to grocery list`);
    } catch (error) {
      console.error("Error importing item:", error);
      Alert.alert("Error", "Failed to import item.");
    }
  };

  const handleImportAll = () => {
    try {
      mealPlanItems.forEach((item) => {
        addGroceryItem({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          categoryId: categories[0]?.id || "cat6",
          addedBy: activeMember?.id || "1",
          completed: false,
        });
      });
      setShowImportModal(false);
      Alert.alert("All items imported!", `${mealPlanItems.length} items added to your list`);
    } catch (error) {
      console.error("Error importing all items:", error);
      Alert.alert("Error", "Failed to import all items.");
    }
  };

  const getMemberIcon = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member ? member.symbol : "👤";
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, GroceryItem[]> = {};
    categories.forEach(cat => groups[cat.id] = []);

    // Also handle items with unknown categories by putting them in "Other" or creating a fallback group?
    // For now, assume all items have valid categories or fall into 'Other' if we default correctly.
    // However, let's allow dynamic keys just in case.

    todoItems.forEach((item) => {
      if (!groups[item.categoryId]) {
        groups[item.categoryId] = [];
      }
      groups[item.categoryId].push(item);
    });
    return groups;
  }, [todoItems, categories]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  return (
    <>
      <AppLayout
        showAddButton={false} // We have our own add button
        showNav={false}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: colors.card, borderRadius: radius.md }]}>
              <AppIcon name="menu" size={20} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Grocery List</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your family's shopping list</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={[styles.roundButton, { backgroundColor: colors.card, borderRadius: radius.md }]} onPress={() => setShowSearch(true)}>
                <AppIcon source="🔍" size={18} color={colors.foreground} />
              </Pressable>
              <Pressable style={[styles.roundButton, { backgroundColor: colors.card, borderRadius: radius.md }]} onPress={handleOpenImport}>
                <AppIcon source="📅" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Hero / Progress Card */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.success + '20', borderWidth: 1 }]}>
            <View style={[styles.heroBg, { backgroundColor: colors.success + '05' }]} />
            <View style={styles.heroContent}>
              <View style={[styles.heroIcon, { backgroundColor: colors.success + '20', borderRadius: radius.md }]}>
                <AppIcon name="shoppingBag" size={24} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
                  <Text style={[styles.heroTitle, { color: colors.foreground }]}>{todoItems.length} items to buy</Text>
                  <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>{doneItems.length}/{filteredItems.length} purchased</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.muted, borderRadius: radius.full }]}>
                  <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.success, borderRadius: radius.full }]} />
                </View>
              </View>
            </View>

            {/* Quick Actions in Hero */}
            <View style={styles.heroActions}>
              <Pressable onPress={handleOpenImport} style={[styles.heroBtn, { backgroundColor: colors.background, borderColor: colors.success + '30', borderRadius: radius.md }]}>
                <AppIcon name="calendar" size={14} color={colors.foreground} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>From Meal Plan</Text>
              </Pressable>
            </View>
          </View>

          {/* Add Item Button (Prominent) */}
          <Pressable
            style={[styles.mainAddButton, { backgroundColor: colors.primary, borderRadius: radius.lg, shadowColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <AppIcon name="plus" size={20} color={colors.primaryForeground} />
            <Text style={[styles.mainAddText, { color: colors.primaryForeground }]}>Add Item to List</Text>
          </Pressable>

          {/* Swipe Guide Tip */}
          {filteredItems.length > 0 && (
            <View style={[styles.guideCard, { backgroundColor: colors.info + '10', borderColor: colors.info + '20', borderRadius: radius.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <AppIcon name="info" size={16} color={colors.info} />
                <Text style={[styles.guideTitle, { color: colors.foreground }]}>Pro Tip</Text>
              </View>
              <Text style={[styles.guideText, { color: colors.mutedForeground }]}>
                Swipe <Text style={{ color: colors.success, fontWeight: '700' }}>Right</Text> to mark purchased,
                Swipe <Text style={{ color: colors.danger, fontWeight: '700' }}>Left</Text> to delete.
              </Text>
            </View>
          )}

          {/* Empty State */}
          {filteredItems.length === 0 && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted, borderRadius: radius.xl }]}>
                <AppIcon name="shoppingCart" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your list is empty</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add items above or import from your meal plan to get started</Text>
            </View>
          )}

          {/* Categories Groups */}
          {categories.map((category) => {
            const items = groupedItems[category.id] || [];
            if (items.length === 0) return null;
            const isExpanded = expandedCategories.includes(category.id);

            return (
              <View key={category.id} style={[styles.groupCard, { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.border, borderWidth: 1 }]}>
                {/* ... header ... */}
                <Pressable
                  style={styles.groupHeader}
                  onPress={() => toggleCategory(category.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={{ fontSize: 22 }}>{category.icon}</Text>
                    <Text style={[styles.groupTitle, { color: colors.foreground }]}>{category.name}</Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: colors.primary + '10', borderRadius: radius.full }]}>
                    <Text style={[styles.countText, { color: colors.primary }]}>{items.length}</Text>
                  </View>
                  <AppIcon name={isExpanded ? "chevronDown" : "chevronRight"} size={18} color={colors.mutedForeground} />
                </Pressable>

                {isExpanded && (
                  <View style={styles.groupItems}>
                    {items.map((item, index) => {
                      const renderRightActions = (progress: any, dragX: any) => {
                        return (
                          <Pressable
                            style={[
                              styles.swipedAction,
                              { backgroundColor: colors.danger, borderTopRightRadius: index === 0 ? 0 : 0, borderBottomRightRadius: index === items.length - 1 ? radius.card : 0 }
                            ]}
                            onPress={() => removeGroceryItem(item.id)}
                          >
                            <AppIcon name="trash" size={20} color="#fff" />
                            <Text style={styles.actionText}>Delete</Text>
                          </Pressable>
                        );
                      };

                      const renderLeftActions = (progress: any, dragX: any) => {
                        return (
                          <Pressable
                            style={[
                              styles.swipedAction,
                              styles.leftAction,
                              { backgroundColor: colors.success }
                            ]}
                            onPress={() => {
                              if (!item.completed) toggleGroceryItem(item.id);
                            }}
                          >
                            <AppIcon name="check" size={20} color="#fff" />
                            <Text style={styles.actionText}>Mark Purchased</Text>
                          </Pressable>
                        );
                      };

                      return (
                        <Swipeable
                          key={item.id}
                          renderRightActions={renderRightActions}
                          renderLeftActions={renderLeftActions}
                          onSwipeableRightOpen={() => removeGroceryItem(item.id)}
                          onSwipeableLeftOpen={() => !item.completed && toggleGroceryItem(item.id)}
                        >
                          <View
                            style={[
                              styles.itemRow,
                              {
                                borderTopColor: colors.border,
                                borderTopWidth: index > 0 ? 1 : 0,
                                backgroundColor: colors.card // Ensure opaque background for swipe
                              }
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Pressable
                                onPress={() => toggleGroceryItem(item.id)}
                                style={[
                                  styles.checkbox,
                                  { borderColor: colors.mutedForeground, borderRadius: radius.xs }
                                ]}
                              >
                              </Pressable>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                  <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>{item.quantity} {item.unit}</Text>
                                  <View style={[styles.addedByBadge, { backgroundColor: colors.muted, borderRadius: radius.sm, marginLeft: 8 }]}>
                                    <Text style={{ fontSize: 10 }}>{getMemberIcon(item.addedBy)}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>

                            {/* Visual cues arrows */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.5 }}>
                              <AppIcon name="chevronLeft" size={24} color={colors.danger} />
                              <AppIcon name="chevronRight" size={24} color={colors.success} />
                            </View>
                          </View>
                        </Swipeable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          {/* Completed Items Section */}
          {doneItems.length > 0 && (
            <View style={[styles.groupCard, { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.border, borderWidth: 1, marginTop: 16 }]}>
              <Pressable
                style={styles.groupHeader}
                onPress={() => setShowCompleted(!showCompleted)}
              >
                <View style={[styles.completedIcon, { backgroundColor: colors.success + '20', borderRadius: radius.md }]}>
                  <AppIcon name="check" size={16} color={colors.success} />
                </View>
                <Text style={[styles.groupTitle, { color: colors.foreground, marginLeft: 10, flex: 1 }]}>Purchased</Text>
                <View style={[styles.countBadge, { backgroundColor: colors.success + '10', borderRadius: radius.full }]}>
                  <Text style={[styles.countText, { color: colors.success }]}>{doneItems.length}</Text>
                </View>
                <AppIcon name={showCompleted ? "chevronDown" : "chevronRight"} size={18} color={colors.mutedForeground} />
              </Pressable>

              {showCompleted && (
                <View style={[styles.groupItems, { backgroundColor: colors.success + '05' }]}>
                  {doneItems.map((item, index) => (
                    <Swipeable
                      key={item.id}
                      renderRightActions={(progress, dragX) => (
                        <Pressable
                          style={[
                            styles.swipedAction,
                            { backgroundColor: colors.danger }
                          ]}
                          onPress={() => removeGroceryItem(item.id)}
                        >
                          <AppIcon name="trash" size={20} color="#fff" />
                          <Text style={styles.actionText}>Delete</Text>
                        </Pressable>
                      )}
                      onSwipeableRightOpen={() => removeGroceryItem(item.id)}
                    >
                      <View
                        key={item.id}
                        style={[
                          styles.itemRow,
                          { borderTopColor: colors.border + '50', borderTopWidth: index > 0 ? 1 : 0 }
                        ]}
                      >
                        <Pressable
                          onPress={() => toggleGroceryItem(item.id)}
                          style={[
                            styles.checkbox,
                            { backgroundColor: colors.success, borderColor: colors.success, borderRadius: radius.xs }
                          ]}
                        >
                          <AppIcon name="check" size={12} color="#fff" />
                        </Pressable>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.itemName, { color: colors.foreground, textDecorationLine: 'line-through', opacity: 0.7 }]}>{item.name}</Text>
                          <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>{item.quantity} {item.unit}</Text>
                        </View>

                        {/* Visual cues arrows */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.5 }}>
                          <AppIcon name="chevronLeft" size={24} color={colors.danger} />
                          <AppIcon name="chevronRight" size={24} color={colors.success} />
                        </View>
                      </View>
                    </Swipeable>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </AppLayout>

      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            borderRadius: radius.full,
          },
        ]}
        onPress={() => setShowAddModal(true)}
      >
        <AppIcon name="plus" size={28} color={colors.primaryForeground} />
      </Pressable>

      {/* Add Item Modal */}
      <AddShoppingItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
      />

      {/* Import Modal */}
      <Modal visible={showImportModal} transparent animationType="slide" onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card, shadowColor: colors.foreground, borderRadius: radius.card }]}>
            <View style={styles.modalHeader}>
              <AppIcon name="calendar" size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Import from Meal Plan</Text>
              <Pressable onPress={() => setShowImportModal(false)} style={styles.closeButton}>
                <AppIcon name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent}>
              {mealPlanItems.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 32 }}>
                  <AppIcon name="calendar" size={48} color={colors.muted} />
                  <Text style={{ marginTop: 16, color: colors.mutedForeground }}>No meals planned yet.</Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {mealPlanItems.map((item, index) => (
                    <View key={`${item.name}-${index}`} style={[styles.importItemRow, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.importItemName, { color: colors.foreground }]}>{item.name}</Text>
                        <Text style={[styles.importItemMeta, { color: colors.mutedForeground }]}>{item.quantity} {item.unit} • from {item.fromRecipes.length} recipe(s)</Text>
                      </View>
                      <Pressable
                        style={[styles.importItemAdd, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.sm }]}
                        onPress={() => handleImportItem(item)}
                      >
                        <AppIcon name="plus" size={16} color={colors.foreground} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={[styles.importAllButton, { backgroundColor: colors.primary, borderRadius: radius.lg }]} onPress={handleImportAll}>
                    <AppIcon name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.importAllText}>Import All ({mealPlanItems.length} items)</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  roundButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroCard: {
    padding: 16,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  heroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  mainAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mainAddText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    maxWidth: 240,
  },
  groupCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  groupItems: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemDetail: {
    fontSize: 12,
  },
  addedByBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Import Modal Styles (kept similar)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContainer: {
    maxHeight: "80%",
    padding: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    marginBottom: 0,
  },
  importItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  importItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  importItemMeta: {
    fontSize: 12,
  },
  importItemAdd: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  importAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 16,
  },
  importAllText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20, // Match AppLayout default
    right: 24,  // Match AppLayout default
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  swipedAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  leftAction: {
    // Left action appears on the left when swiping right
    flexDirection: 'row',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4,
  },
  guideCard: {
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  guideText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
