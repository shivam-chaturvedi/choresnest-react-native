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
import { GlobalSearch } from "../components/search/GlobalSearch";
import { useSidebar } from "../contexts/SidebarContext";
import { AppIcon } from "../components/ui/AppIcon";

const tabs = ["By Category", "All Items"];

const categorizeItem = (name: string): string => {
  // Simple categorization logic for demo purposes
  const lowerName = name.toLowerCase();
  if (["milk", "cheese", "yogurt", "butter"].some(i => lowerName.includes(i))) return "Dairy";
  if (["bread", "bagel", "croissant"].some(i => lowerName.includes(i))) return "Bakery";
  if (["apple", "banana", "lettuce", "tomato", "vegetable", "fruit"].some(i => lowerName.includes(i))) return "Produce";
  if (["chicken", "beef", "pork", "egg", "meat"].some(i => lowerName.includes(i))) return "Meat & Protein";
  if (["rice", "pasta", "cereal", "flour"].some(i => lowerName.includes(i))) return "Pantry";
  return "Other";
};

export const ListsScreen: React.FC = () => {
  const { groceryList, addGroceryItem, toggleGroceryItem, activeMember, members } = useFamily();
  const { generateGroceryList } = useMealPlan();

  const [activeTab, setActiveTab] = useState("By Category");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [newItemName, setNewItemName] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
    if (newItemName.trim()) {
      addGroceryItem({
        name: newItemName.trim(),
        quantity: quantity,
        unit: "pcs", // Default unit
        addedBy: activeMember?.id || "1",
        completed: false,
      });
      setNewItemName("");
      setQuantity(1);
    }
  };

  const handleOpenImport = () => {
    const items = generateGroceryList();
    setMealPlanItems(items);
    setShowImportModal(true);
  };

  const handleImportItem = (item: { name: string; quantity: number; unit: string }) => {
    addGroceryItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      addedBy: activeMember?.id || "1",
      completed: false,
    });
    Alert.alert("Item added", `${item.name} added to grocery list`);
  };

  const handleImportAll = () => {
    mealPlanItems.forEach((item) => {
      addGroceryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        addedBy: activeMember?.id || "1",
        completed: false,
      });
    });
    setShowImportModal(false);
    Alert.alert("All items imported!", `${mealPlanItems.length} items added to your list`);
  };

  const getMemberIcon = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member ? member.symbol : "👤";
  };

  const groupedByCategory = (items: GroceryItem[]) => {
    const groups: Record<string, GroceryItem[]> = {};
    items.forEach((item) => {
      const category = categorizeItem(item.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return Object.entries(groups).map(([category, groupItems]) => ({
      category,
      items: groupItems,
    }));
  };

  const inputRef = React.useRef<TextInput>(null);

  const handleFabPress = () => {
    inputRef.current?.focus();
  };

  return (
    <>
      <AppLayout
        showAddButton={true}
        showNav={false}
        onAddPress={handleFabPress}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={openSidebar} style={styles.menuButton}>
              <AppIcon name="menu" size={20} color={theme.colors.foreground} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.title}>Grocery List</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.roundButton} onPress={() => setShowSearch(true)}>
                <AppIcon source="🔍" size={18} color={theme.colors.foreground} />
              </Pressable>

              <Pressable style={styles.roundButton} onPress={handleOpenImport}>
                <AppIcon source="📅" size={18} color={theme.colors.foreground} />
              </Pressable>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressIcon}>
              <AppIcon name="shoppingCart" size={28} color={theme.colors.success} />
            </View>
            <View style={styles.progressContent}>
              <Text style={styles.progressTitle}>{doneItems.length}/{filteredItems.length} items</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.tabRow}>
            {tabs.map((tab) => {
              const active = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.addRow}>
            <TextInput
              ref={inputRef}
              style={styles.addInput}
              placeholder="Add item..."
              placeholderTextColor={theme.colors.mutedForeground}
              value={newItemName}
              onChangeText={setNewItemName}
              onSubmitEditing={handleAddItem}
            />
            <View style={styles.qtyControl}>
              <Pressable style={styles.qtyButton} onPress={() => handleAddQuantity(-1)}>
                <AppIcon name="minus" size={16} color={theme.colors.foreground} />
              </Pressable>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Pressable style={styles.qtyButton} onPress={() => handleAddQuantity(1)}>
                <AppIcon name="plus" size={16} color={theme.colors.foreground} />
              </Pressable>
            </View>
            <Pressable style={styles.addButton} onPress={handleAddItem}>
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          </View>

          {activeTab === "By Category" ? (
            <>
              {groupedByCategory(todoItems).map((group) => (
                <View key={group.category} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{group.category}</Text>
                    <Text style={styles.categoryCount}>{group.items.length}</Text>
                  </View>
                  {group.items.map((item) => (
                    <View key={item.id} style={styles.todoRow}>
                      <View style={styles.todoLeft}>
                        <Pressable
                          onPress={() => toggleGroceryItem(item.id)}
                          style={[styles.checkbox, item.completed && styles.checkboxActive]}
                        >
                          {item.completed && <AppIcon name="check" size={14} color="#fff" />}
                        </Pressable>
                        <Text style={[styles.todoText, item.completed && styles.completedText]}>{item.name}</Text>
                      </View>
                      <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
                      <View style={styles.ownerBadge}>
                        <Text style={{ fontSize: 14 }}>{getMemberIcon(item.addedBy)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.listWrapper}>
                <Text style={styles.sectionTitle}>To Buy ({todoItems.length})</Text>
                {todoItems.length === 0 && (
                  <Text style={[styles.todoText, { textAlign: 'center', opacity: 0.5, padding: 20 }]}>All items purchased!</Text>
                )}
                {todoItems.map((item) => (
                  <View key={item.id} style={styles.todoRow}>
                    <View style={styles.todoLeft}>
                      <Pressable
                        onPress={() => toggleGroceryItem(item.id)}
                        style={[styles.checkbox, item.completed && styles.checkboxActive]}
                      >
                        {item.completed && <AppIcon name="check" size={14} color="#fff" />}
                      </Pressable>
                      <Text style={styles.todoText}>{item.name}</Text>
                    </View>
                    <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
                    <View style={styles.ownerBadge}>
                      <Text style={{ fontSize: 14 }}>{getMemberIcon(item.addedBy)}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {doneItems.length > 0 && (
                <View style={styles.listWrapper}>
                  <Text style={styles.sectionTitle}>Completed ({doneItems.length})</Text>
                  {doneItems.map((item) => (
                    <View key={item.id} style={[styles.todoRow, styles.completedRow]}>
                      <View style={styles.todoLeft}>
                        <Pressable
                          onPress={() => toggleGroceryItem(item.id)}
                          style={[styles.checkbox, styles.checkboxActive]}
                        >
                          <AppIcon name="check" size={14} color="#fff" />
                        </Pressable>
                        <Text style={[styles.todoText, styles.completedText]}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
                      <View style={styles.ownerBadge}>
                        <Text style={{ fontSize: 14 }}>{getMemberIcon(item.addedBy)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={styles.memberRow}>
            <Text style={styles.sectionTitle}>Added by</Text>
            <View style={styles.badgeList}>
              {members.map((member) => {
                const count = groceryList.filter(i => i.addedBy === member.id).length;
                if (count === 0) return null;
                return (
                  <View key={member.id} style={styles.memberBadge}>
                    <Text>{member.symbol}</Text>
                    <Text style={styles.memberText}>{member.name}</Text>
                    <Text style={styles.memberCount}>({count})</Text>
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
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <AppIcon name="calendar" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>Import from Meal Plan</Text>
              <Pressable onPress={() => setShowImportModal(false)} style={styles.closeButton}>
                <AppIcon name="x" size={24} color={theme.colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent}>
              {mealPlanItems.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 32 }}>
                  <AppIcon name="calendar" size={48} color={theme.colors.muted} />
                  <Text style={{ marginTop: 16, color: theme.colors.mutedForeground }}>No meals planned yet.</Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {mealPlanItems.map((item, index) => (
                    <View key={`${item.name}-${index}`} style={styles.importItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.importItemName}>{item.name}</Text>
                        <Text style={styles.importItemMeta}>{item.quantity} {item.unit} • from {item.fromRecipes.length} recipe(s)</Text>
                      </View>
                      <Pressable
                        style={styles.importItemAdd}
                        onPress={() => handleImportItem(item)}
                      >
                        <AppIcon name="plus" size={16} color={theme.colors.foreground} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.importAllButton} onPress={handleImportAll}>
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
    padding: theme.spacing.lg,
    paddingBottom: 120,
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  headerActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    padding: theme.spacing.md,
    borderRadius: 24,
    marginBottom: theme.spacing.md,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  progressIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(46, 94, 153, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  progressContent: {
    flex: 1,
  },
  progressTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  progressBar: {
    height: 10,
    backgroundColor: theme.colors.muted,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.success,
    borderRadius: 10,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.muted,
    borderRadius: 18,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  tabPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: 14,
  },
  tabPillActive: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabText: {
    color: theme.colors.mutedForeground,
    fontWeight: "600",
  },
  tabTextActive: {
    color: theme.colors.foreground,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  addInput: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.muted,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.foreground,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: theme.spacing.sm,
  },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyValue: {
    width: 30,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    color: theme.colors.foreground,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: 16,
  },
  addText: {
    color: theme.colors.primaryForeground,
    fontWeight: "700",
  },
  categoryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
    alignItems: "center",
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  categoryCount: {
    color: theme.colors.mutedForeground,
    fontSize: 14,
  },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.muted,
    padding: theme.spacing.sm,
    borderRadius: 14,
    marginBottom: theme.spacing.sm,
  },
  todoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  todoText: {
    fontWeight: "600",
    color: theme.colors.foreground,
    flex: 1,
  },
  completedText: {
    textDecorationLine: "line-through",
    color: theme.colors.mutedForeground,
  },
  quantityText: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.mutedForeground,
    fontSize: 12,
  },
  ownerBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  listWrapper: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
    color: theme.colors.foreground,
  },
  completedRow: {
    backgroundColor: "rgba(46, 94, 153, 0.05)",
  },
  memberRow: {
    marginVertical: theme.spacing.md,
  },
  badgeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    gap: theme.spacing.xs,
    shadowColor: "#0a1a3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  memberText: {
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  memberCount: {
    color: theme.colors.mutedForeground,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    maxHeight: "80%",
    padding: 20,
    shadowColor: "#000",
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
    color: theme.colors.foreground,
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
    backgroundColor: theme.colors.muted,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  importItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  importItemMeta: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  importItemAdd: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  importAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  importAllText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
