import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  FlatList,
} from "react-native";
import { Swipeable, PanGestureHandler, State } from "react-native-gesture-handler";
import { useRoute, RouteProp } from "@react-navigation/native";
import { AppLayout } from "../components/layout";
import { useFamily, GroceryItem } from "../contexts/FamilyContext";
import { useMealPlan } from "../contexts/MealPlanContext";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon, CustomDateTimePicker } from "../components/ui";
import { ScreenErrorView } from "../components/ui/ScreenErrorView";
import { AddShoppingItemModal } from "../components/modals/AddShoppingItemModal";

type GroceryRowProps = {
  item: GroceryItem;
  isPurchased: boolean;
  categoryColor?: string;
  categoryIcon?: string;
  colors: ReturnType<typeof useThemeColors>;
  radius: ReturnType<typeof useThemeRadius>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  getMemberIcon: (memberId: string) => string;
};

const GroceryRow = React.memo<GroceryRowProps>(({
  item,
  isPurchased,
  categoryColor,
  categoryIcon,
  colors,
  radius,
  onToggle,
  onRemove,
  getMemberIcon,
}) => {
  const renderRightActions = useCallback(() => (
    <Pressable
      style={[styles.swipedAction, { backgroundColor: colors.danger }]}
      onPress={() => onRemove(item.id)}
    >
      <AppIcon name="trash" size={20} color="#fff" />
      <Text style={styles.actionText}>Delete</Text>
    </Pressable>
  ), [colors.danger, item.id, onRemove]);

  const renderLeftActions = useCallback(() => (
    <Pressable
      style={[styles.swipedAction, styles.leftAction, { backgroundColor: colors.success }]}
      onPress={() => {
        if (!item.completed) onToggle(item.id);
      }}
    >
      <AppIcon name="check" size={20} color="#fff" />
      <Text style={styles.actionText}>Done</Text>
    </Pressable>
  ), [colors.success, item, onToggle]);

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableRightOpen={() => onRemove(item.id)}
      onSwipeableLeftOpen={() => !item.completed && onToggle(item.id)}
      containerStyle={{ marginBottom: 10 }}
    >
      <View
        style={[
          styles.itemRow,
          {
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.categoryIconSmall, { backgroundColor: (categoryColor || colors.muted) + '20' }]}> 
            <Text style={{ fontSize: 16 }}>{categoryIcon || "📦"}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.itemName, { color: colors.foreground, textDecorationLine: isPurchased ? 'line-through' : 'none', opacity: isPurchased ? 0.7 : 1 }]}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={[styles.itemDetail, { color: colors.mutedForeground }]}>{item.quantity} {item.unit}</Text>
              <View style={[styles.addedByBadge, { backgroundColor: colors.muted, borderRadius: radius.sm, marginLeft: 8 }]}> 
                <Text style={{ fontSize: 10 }}>{getMemberIcon(item.addedBy || "")}</Text>
              </View>
              {isPurchased && item.purchasedAt && (
                <Text style={[styles.itemDetail, { color: colors.mutedForeground, marginLeft: 8 }]}> 
                  {new Date(item.purchasedAt).toLocaleDateString()} at {new Date(item.purchasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          </View>
        </View>

        {!isPurchased ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => onRemove(item.id)}
              style={[styles.actionIconBtn, { backgroundColor: '#fff' }]}
            >
              <AppIcon name="trash" size={18} color={colors.danger} />
            </Pressable>
            <Pressable
              onPress={() => onToggle(item.id)}
              style={[styles.doneBtn, { backgroundColor: colors.success, borderRadius: radius.sm }]}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => onToggle(item.id)}
            style={[styles.actionIconBtn, { backgroundColor: colors.muted }]}
          >
            <AppIcon name="rotateCw" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>
    </Swipeable>
  );
}, (prev, next) => {
  return prev.item.id === next.item.id && prev.item.completed === next.item.completed && prev.onToggle === next.onToggle && prev.onRemove === next.onRemove && prev.isPurchased === next.isPurchased;
});

export const ListsScreen: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const route = useRoute<RouteProp<{ params: { addItems?: any[] } }, 'params'>>();
  const { groceryList, addGroceryItem, toggleGroceryItem, removeGroceryItem, activeMember, members, categories } = useFamily();
  const { generateGroceryList } = useMealPlan();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // State to track expanded categories. Default all expanded.
  const [activeTab, setActiveTab] = useState<"current" | "purchased">("current");
  const { openSidebar } = useSidebar();
  const [mealPlanItems, setMealPlanItems] = useState<ReturnType<typeof generateGroceryList>>([]);

  // Purchase history filters
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string | null>(null);
  const [historyDate, setHistoryDate] = useState<Date | null>(null);
  const [historyTime, setHistoryTime] = useState<Date | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  // Handle addItems from route params
  useEffect(() => {
    const addItems = route.params?.addItems;
    if (addItems && Array.isArray(addItems) && addItems.length > 0) {
      try {
        addItems.forEach((item) => {
          addGroceryItem({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            categoryId: categories[0]?.id || "cat6",
            addedBy: activeMember?.id || "1",
            completed: false,
          });
        });
        // Clear the params after adding
        // Note: You might want to use navigation.setParams({ addItems: undefined }) here
      } catch (error) {
        handleScreenError("handleRouteAddItems", error);
        Alert.alert("Error", "Failed to add items from meal plan.");
      }
    }
  }, [route.params?.addItems]);

  const handleScreenError = useCallback((context: string, error: unknown) => {
    console.error(`ListsScreen - ${context}`, error);
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong";
    setScreenError(message);
  }, []);

  const resetScreenError = useCallback(() => setScreenError(null), []);

  const categoriesById = useMemo(() => {
    const map = new Map<string, { color?: string; icon?: string }>();
    categories.forEach(cat => map.set(cat.id, { color: cat.color, icon: cat.icon }));
    return map;
  }, [categories]);

  const getMemberIcon = useCallback((memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member ? member.symbol : "👤";
  }, [members]);

  const handleToggleItem = useCallback(async (id: string) => {
    try {
      await toggleGroceryItem(id);
    } catch (error) {
      console.error("Failed to toggle grocery item:", error);
      Alert.alert("Error", "Could not update item. Please try again.");
    }
  }, [toggleGroceryItem]);

  const handleRemoveItem = useCallback(async (id: string) => {
    try {
      await removeGroceryItem(id);
    } catch (error) {
      console.error("Failed to remove grocery item:", error);
      Alert.alert("Error", "Unable to delete item right now.");
    }
  }, [removeGroceryItem]);

  const renderItemCard = useCallback((item: GroceryItem, _index: number, _isHistory: boolean) => {
    const categoryMeta = categoriesById.get(item.categoryId || "") || {
      color: colors.muted,
      icon: "📦",
    };

    return (
      <GroceryRow
        key={item.id}
        item={item}
        isPurchased={item.completed}
        categoryColor={categoryMeta.color}
        categoryIcon={categoryMeta.icon}
        colors={colors}
        radius={radius}
        onToggle={handleToggleItem}
        onRemove={handleRemoveItem}
        getMemberIcon={getMemberIcon}
      />
    );
  }, [categoriesById, colors, radius, handleRemoveItem, handleToggleItem, getMemberIcon]);

  const filteredItems = useMemo(() => {
    return (groceryList as GroceryItem[]).filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groceryList, searchQuery]);

  const todoItems = useMemo(() => filteredItems.filter((item) => !item.completed), [filteredItems]);
  const doneItems = useMemo(() => filteredItems.filter((item) => item.completed), [filteredItems]);

  const historyItems = useMemo(() => {
    let items = doneItems;
    if (historyCategoryFilter) {
      items = items.filter(i => i.categoryId === historyCategoryFilter);
    }
    if (historyDate) {
      const dateStr = historyDate.toISOString().split('T')[0];
      const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
      const dayEnd = dayStart + 86400000;
      items = items.filter(i =>
        typeof i.purchasedAt === 'number' &&
        i.purchasedAt >= dayStart &&
        i.purchasedAt < dayEnd
      );
    }
    if (historyTime) {
      const hours = historyTime.getHours();
      const mins = historyTime.getMinutes();
      items = items.filter(i => {
        if (typeof i.purchasedAt !== 'number') return false;
        const pDate = new Date(i.purchasedAt);
        // Show items at or after this time on the selected date (or any date if date filter isn't set)
        return pDate.getHours() > hours || (pDate.getHours() === hours && pDate.getMinutes() >= mins);
      });
    }
    // Sort by date descending
    return [...items].sort((a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0));
  }, [doneItems, historyCategoryFilter, historyDate, historyTime]);

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
      handleScreenError("handleAddItem", error);
      Alert.alert("Error", "Failed to add item. Please try again.");
    }
  };

  const handleOpenImport = () => {
    try {
      const items = generateGroceryList();
      setMealPlanItems(items);
      setShowImportModal(true);
    } catch (error) {
      handleScreenError("handleOpenImport", error);
      Alert.alert("Error", "Unable to load meal plan items.");
    }
  };

  const handleImportItem = (item: { name: string; quantity: number; unit: string }) => {
    try {
      addGroceryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        categoryId: categories[0]?.id || "cat6",
        addedBy: activeMember?.id || "1",
        completed: false,
      });
      Alert.alert("Item added", `${item.name} added to grocery list`);
    } catch (error) {
      handleScreenError("handleImportItem", error);
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
      handleScreenError("handleImportAll", error);
      Alert.alert("Error", "Failed to import all items.");
    }
  };

  // The callbacks above already expose optimized handler hooks.

  const handleBulkDelete = () => {
    const targetItems = activeTab === "current" ? todoItems : doneItems;
    if (targetItems.length === 0) {
      Alert.alert("Empty List", "No items to delete.");
      return;
    }

    Alert.alert(
      "Clear List",
      `Are you sure you want to delete all ${targetItems.length} items from the ${activeTab === 'current' ? 'current' : 'purchased'} list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              // Execute sequentially to avoid overwhelming DB/State
              for (const item of targetItems) {
                await removeGroceryItem(item.id);
              }
            } catch (e) {
              console.error(e);
              Alert.alert("Error", "Failed to clear list.");
            }
          }
        }
      ]
    );
  };

  const handleGestureEvent = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      // Trigger if swipe is long enough (50px) and fast enough
      if (translationX > 50 && Math.abs(velocityX) > 300) {
        // Right Swipe (Drag L -> R)
        if (activeTab === "current") setActiveTab("purchased");
      } else if (translationX < -50 && Math.abs(velocityX) > 300) {
        // Left Swipe (Drag R -> L)
        if (activeTab === "purchased") setActiveTab("current");
      }
    }
  };

  if (screenError) {
    return (
      <>
        <AppLayout
          showAddButton={false}
          showNav={false}
          style={{ backgroundColor: colors.background }}
        >
          <ScreenErrorView
            message={screenError}
            onRetry={resetScreenError}
            actionLabel="Reload"
          />
        </AppLayout>
        <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      </>
    );
  }

  return (
    <>
      <AppLayout
        showAddButton={true}
        onAddPress={() => setShowAddModal(true)}
        showNav={false}
      >
        <PanGestureHandler
          onHandlerStateChange={handleGestureEvent}
          activeOffsetX={[-20, 20]} // Capture horizontal swipes more easily
          failOffsetY={[-20, 20]} // Allow vertical scrolling to continue if moving vertically
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
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
                <View style={[styles.headerActions, { gap: 8, flexDirection: 'row' }]}>
                  <Pressable style={[styles.roundButton, { backgroundColor: colors.card, borderRadius: radius.md }]} onPress={() => setShowSearch(true)}>
                    <AppIcon name="search" size={18} color={colors.foreground} />
                  </Pressable>
                  <Pressable
                    style={[styles.roundButton, { backgroundColor: colors.danger + '15', borderRadius: radius.md }]}
                    onPress={handleBulkDelete}
                  >
                    <AppIcon name="trash" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>

              {/* Tabs */}
              <View style={[styles.tabContainer, { backgroundColor: colors.card, borderRadius: radius.md, marginBottom: 20 }]}>
                <Pressable
                  onPress={() => setActiveTab("current")}
                  style={[styles.tab, activeTab === "current" && { backgroundColor: colors.primary, borderRadius: radius.sm }]}
                >
                  <Text style={[styles.tabText, { color: activeTab === "current" ? colors.primaryForeground : colors.mutedForeground }]}>
                    Current Bag ({todoItems.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab("purchased")}
                  style={[styles.tab, activeTab === "purchased" && { backgroundColor: colors.primary, borderRadius: radius.sm }]}
                >
                  <Text style={[styles.tabText, { color: activeTab === "purchased" ? colors.primaryForeground : colors.mutedForeground }]}>
                    Purchased
                  </Text>
                </Pressable>
              </View>

              {activeTab === "current" ? (
                <>
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

                    <View style={styles.heroActions}>
                      <Pressable onPress={handleOpenImport} style={[styles.heroBtn, { backgroundColor: colors.background, borderColor: colors.success + '30', borderRadius: radius.md }]}>
                        <AppIcon name="calendar" size={14} color={colors.foreground} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>From Meal Plan</Text>
                      </Pressable>
                    </View>
                  </View>



                  {/* Pro Tip Card */}
                  {todoItems.length > 0 && (
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

                  {/* Single List for Current Items */}
                  {todoItems.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View style={[styles.emptyIcon, { backgroundColor: colors.muted, borderRadius: radius.xl }]}>
                        <AppIcon name="shoppingCart" size={32} color={colors.mutedForeground} />
                      </View>
                      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your bag is empty</Text>
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add items above or import from your meal plan</Text>
                    </View>
                  ) : (
                    <View style={styles.listContainer}>
                      {todoItems.map((item, index) => renderItemCard(item, index, false))}
                    </View>
                  )}
                </>
              ) : (
                <>
                  {/* History Filters Section */}
                  <View style={[styles.historyFilterCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, marginBottom: 20 }]}>
                    <View style={styles.filterSectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppIcon name="filter" size={16} color={colors.primary} />
                        <Text style={[styles.filterSectionTitle, { color: colors.foreground }]}>Filter History</Text>
                      </View>
                      {(historyCategoryFilter || historyDate || historyTime) && (
                        <Pressable
                          onPress={() => {
                            setHistoryCategoryFilter(null);
                            setHistoryDate(null);
                            setHistoryTime(null);
                          }}
                          style={styles.resetFiltersBtn}
                        >
                          <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>Reset All</Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={{ padding: 12 }}>
                      <Text style={[styles.filterLabel, { color: colors.mutedForeground, marginBottom: 8 }]}>Category</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        <Pressable
                          onPress={() => setHistoryCategoryFilter(null)}
                          style={[styles.miniChip, !historyCategoryFilter && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        >
                          <Text style={[styles.miniChipText, !historyCategoryFilter && { color: colors.primaryForeground }]}>All</Text>
                        </Pressable>
                        {categories.map((cat: any) => (
                          <Pressable
                            key={cat.id}
                            onPress={() => setHistoryCategoryFilter(cat.id)}
                            style={[styles.miniChip, historyCategoryFilter === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                          >
                            <Text style={{ marginRight: 4, fontSize: 12 }}>{cat.icon}</Text>
                            <Text style={[styles.miniChipText, historyCategoryFilter === cat.id && { color: colors.primaryForeground }]}>{cat.name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>

                      <View style={styles.dateTimeFilterRow}>
                        <View style={{ flex: 1 }}>
                          <CustomDateTimePicker
                            mode="date"
                            value={historyDate || new Date()}
                            onChange={setHistoryDate}
                            placeholder="All Dates"
                            label="Purchase Date"
                          />
                        </View>
                        <View style={{ width: 12 }} />
                        <View style={{ flex: 1 }}>
                          <CustomDateTimePicker
                            mode="time"
                            value={historyTime || new Date()}
                            onChange={setHistoryTime}
                            placeholder="All Times"
                            label="From Time"
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {historyItems.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View style={[styles.emptyIcon, { backgroundColor: colors.muted, borderRadius: radius.xl }]}>
                        <AppIcon name="package" size={32} color={colors.mutedForeground} />
                      </View>
                      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No purchase history</Text>
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Items you mark as done will appear here</Text>
                    </View>
                  ) : (
                    <View style={styles.listContainer}>
                      {historyItems.map((item, index) => renderItemCard(item, index, true))}
                    </View>
                  )}
                </>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </PanGestureHandler>
      </AppLayout>

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
    paddingBottom: 20,
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
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
  listContainer: {
    gap: 0,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
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
  categoryIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    paddingHorizontal: 16,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingVertical: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
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
  swipedAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  leftAction: {
    flexDirection: 'row',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4,
  },
  historyFilterCard: {
    overflow: 'hidden',
    marginBottom: 20,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resetFiltersBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  miniChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateTimeFilterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});
