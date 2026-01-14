import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { AppLayout } from "../components/layout/AppLayout";
import { useFamily, GroceryItem } from "../contexts/FamilyContext";
import { useMealPlan } from "../contexts/MealPlanContext";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon } from "../components/ui/AppIcon";

const tabs = ["By Category", "All Items"];

export const ListsScreen: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { groceryList, addGroceryItem, toggleGroceryItem, activeMember, members, categories, addCategory, removeCategory, updateCategory } = useFamily();
  const { generateGroceryList } = useMealPlan();

  const [activeTab, setActiveTab] = useState("By Category");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [newItemName, setNewItemName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || "");
  const [showSearch, setShowSearch] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
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

  const handleAddQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddItem = () => {
    try {
      if (newItemName.trim()) {
        addGroceryItem({
          name: newItemName.trim(),
          quantity: quantity,
          unit: "pcs", // Default unit
          categoryId: selectedCategoryId || categories[0]?.id || "cat6",
          addedBy: activeMember?.id || "1",
          completed: false,
        });
        setNewItemName("");
        setQuantity(1);
      }
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
        categoryId: selectedCategoryId || categories[0]?.id || "cat6",
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
          categoryId: selectedCategoryId || categories[0]?.id || "cat6",
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

  const groupedByCategory = (items: GroceryItem[]) => {
    const groups: Record<string, { category: any; items: GroceryItem[] }> = {};

    // Group items by their categoryId
    items.forEach((item) => {
      const category = categories.find(c => c.id === item.categoryId);
      if (category) {
        if (!groups[category.id]) {
          groups[category.id] = { category, items: [] };
        }
        groups[category.id].items.push(item);
      }
    });

    return Object.values(groups);
  };

  const inputRef = React.useRef<TextInput>(null);

  return (
    <>
      <AppLayout
        showAddButton={true}
        showNav={false}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={openSidebar} style={[styles.menuButton, { backgroundColor: colors.card, borderRadius: radius.md }]}>
              <AppIcon name="menu" size={20} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>Grocery List</Text>
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

          <View style={[styles.progressCard, { backgroundColor: colors.card, shadowColor: colors.border, borderRadius: radius.card }]}>
            <View style={[styles.progressIcon, { backgroundColor: colors.success + '20', borderRadius: radius.lg }]}>
              <AppIcon name="shoppingCart" size={28} color={colors.success} />
            </View>
            <View style={styles.progressContent}>
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>{doneItems.length}/{filteredItems.length} items</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.muted, borderRadius: radius.sm }]}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.success, borderRadius: radius.sm }]} />
              </View>
            </View>
          </View>

          <View style={[styles.tabRow, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
            {tabs.map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  style={[
                    styles.tabPill,
                    { borderRadius: radius.md },
                    active && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[
                    styles.tabText,
                    active ? { color: colors.foreground } : { color: colors.mutedForeground }
                  ]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Category Selector for New Items */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 8, paddingHorizontal: 4 }]}>
              Select category for new items:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: selectedCategoryId === cat.id ? cat.color : colors.muted, borderRadius: radius.full }
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                  <Text style={[styles.categoryChipText, { color: colors.foreground }]}>{cat.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.addRow, { backgroundColor: colors.card, borderRadius: radius.card }]}>
            <TextInput
              ref={inputRef}
              style={[styles.addInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: radius.md }]}
              placeholder="Add item..."
              placeholderTextColor={colors.mutedForeground}
              value={newItemName}
              onChangeText={setNewItemName}
              onSubmitEditing={handleAddItem}
            />
            <View style={styles.qtyControl}>
              <Pressable style={[styles.qtyButton, { backgroundColor: colors.muted, borderRadius: radius.sm }]} onPress={() => handleAddQuantity(-1)}>
                <AppIcon name="minus" size={16} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.qtyValue, { color: colors.foreground }]}>{quantity}</Text>
              <Pressable style={[styles.qtyButton, { backgroundColor: colors.muted, borderRadius: radius.sm }]} onPress={() => handleAddQuantity(1)}>
                <AppIcon name="plus" size={16} color={colors.foreground} />
              </Pressable>
            </View>
            <Pressable style={[styles.addButton, { backgroundColor: colors.primary, borderRadius: radius.lg }]} onPress={handleAddItem}>
              <Text style={[styles.addText, { color: colors.primaryForeground }]}>Add</Text>
            </Pressable>
          </View>

          {activeTab === "By Category" ? (
            <>
              {groupedByCategory(todoItems).map((group) => (
                <View key={group.category.id} style={[styles.categoryCard, { backgroundColor: colors.card, shadowColor: colors.border, borderRadius: radius.card }]}>
                  <View style={styles.categoryHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>{group.category.icon}</Text>
                      <Text style={[styles.categoryTitle, { color: colors.foreground }]}>{group.category.name}</Text>
                    </View>
                    <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>{group.items.length}</Text>
                  </View>
                  {group.items.map((item) => (
                    <View key={item.id} style={[styles.todoRow, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                      <View style={styles.todoLeft}>
                        <Pressable
                          onPress={() => toggleGroceryItem(item.id)}
                          style={[
                            styles.checkbox,
                            { borderColor: "#000", borderRadius: radius.xs },
                            item.completed && { backgroundColor: colors.success, borderColor: colors.success }
                          ]}
                        >
                          {item.completed && <AppIcon name="check" size={14} color="#fff" />}
                        </Pressable>
                        <Text style={[styles.todoText, { color: colors.foreground }, item.completed && styles.completedText]}>{item.name}</Text>
                      </View>
                      <Text style={[styles.quantityText, { color: colors.mutedForeground }]}>{item.quantity} {item.unit}</Text>
                      <View style={[styles.ownerBadge, { backgroundColor: colors.background, borderRadius: radius.sm }]}>
                        <Text style={{ fontSize: 14 }}>{getMemberIcon(item.addedBy)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={[styles.listWrapper, { backgroundColor: colors.card, shadowColor: colors.border, borderRadius: radius.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>To Buy ({todoItems.length})</Text>
                {todoItems.length === 0 && (
                  <Text style={[styles.todoText, { textAlign: 'center', opacity: 0.5, padding: 20, color: colors.foreground }]}>All items purchased!</Text>
                )}
                {todoItems.map((item) => (
                  <View key={item.id} style={[styles.todoRow, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                    <View style={styles.todoLeft}>
                      <Pressable
                        onPress={() => toggleGroceryItem(item.id)}
                        style={[
                          styles.checkbox,
                          { borderColor: "#000", borderRadius: radius.xs },
                          item.completed && { backgroundColor: colors.success, borderColor: colors.success }
                        ]}
                      >
                        {item.completed && <AppIcon name="check" size={14} color="#fff" />}
                      </Pressable>
                      <Text style={[styles.todoText, { color: colors.foreground }]}>{item.name}</Text>
                    </View>
                    <Text style={[styles.quantityText, { color: colors.mutedForeground }]}>{item.quantity} {item.unit}</Text>
                    <View style={[styles.ownerBadge, { backgroundColor: colors.background, borderRadius: radius.sm }]}>
                      <Text style={{ fontSize: 14 }}>{getMemberIcon(item.addedBy)}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {doneItems.length > 0 && (
                <View style={[styles.listWrapper, { backgroundColor: colors.card, shadowColor: colors.border, borderRadius: radius.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Completed ({doneItems.length})</Text>
                  {doneItems.map((item) => (
                    <View key={item.id} style={[styles.todoRow, { backgroundColor: colors.success + '10', borderRadius: radius.md }]}>
                      <View style={styles.todoLeft}>
                        <Pressable
                          onPress={() => toggleGroceryItem(item.id)}
                          style={[styles.checkbox, { backgroundColor: colors.success, borderColor: colors.success, borderRadius: radius.xs }]}
                        >
                          <AppIcon name="check" size={14} color="#fff" />
                        </Pressable>
                        <Text style={[styles.todoText, styles.completedText, { color: colors.foreground }]}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={[styles.quantityText, { color: colors.mutedForeground }]}>{item.quantity} {item.unit}</Text>
                      <View style={[styles.ownerBadge, { backgroundColor: colors.background, borderRadius: radius.sm }]}>
                        <Text style={{ fontSize: 14 }}>{getMemberIcon(item.addedBy)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={styles.memberRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Added by</Text>
            <View style={styles.badgeList}>
              {members.map((member) => {
                const count = groceryList.filter(i => i.addedBy === member.id).length;
                if (count === 0) return null;
                return (
                  <View key={member.id} style={[styles.memberBadge, { backgroundColor: colors.card, shadowColor: colors.border, borderRadius: radius.md }]}>
                    <Text>{member.symbol}</Text>
                    <Text style={[styles.memberText, { color: colors.foreground }]}>{member.name}</Text>
                    <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>({count})</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </AppLayout>

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
    // Background handled by AppLayout
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  progressIcon: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  progressContent: {
    flex: 1,
  },
  progressTitle: {
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 4,
  },
  progressBar: {
    height: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  tabRow: {
    flexDirection: "row",
    padding: 4,
    marginBottom: 24,
  },
  tabPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabText: {
    fontWeight: "600",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginBottom: 24,
  },
  addInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  qtyButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyValue: {
    width: 30,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addText: {
    fontWeight: "700",
  },
  categoryCard: {
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  categoryCount: {
    fontSize: 14,
  },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    marginBottom: 8,
  },
  todoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  todoText: {
    fontWeight: "600",
    flex: 1,
  },
  completedText: {
    textDecorationLine: "line-through",
  },
  quantityText: {
    marginHorizontal: 16,
    fontSize: 12,
  },
  ownerBadge: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  listWrapper: {
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  completedRow: {
    // handled inline now
  },
  memberRow: {
    marginVertical: 16,
  },
  badgeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  memberText: {
    fontWeight: "600",
  },
  memberCount: {
  },
  // Modal
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
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
