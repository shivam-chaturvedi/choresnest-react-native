import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { AppLayout } from '../components/layout';
import { AppIcon } from '../components/ui';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { useFamily } from '../contexts/FamilyContext';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { shoppingCategories } from '../constants/shoppingCategories';
import { ListsStackParamList } from '../navigation/ListsStackParams';
import { GroceryRow } from '../components/lists/GroceryRow';

type CategoryDetailRouteProp = RouteProp<ListsStackParamList, 'CategoryDetail'>;

export const ListCategoryDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ListsStackParamList>>();
  const route = useRoute<CategoryDetailRouteProp>();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { groceryList, toggleGroceryItem, removeGroceryItem, members } = useFamily();
  const {
    categoryId,
    mode,
    categoryName,
    categoryIcon,
    categoryColor,
    categoryLibrary,
  } = route.params;
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  const items = useMemo(() => {
    return groceryList
      .filter(item => item.category === categoryId)
      .filter(item => (mode === 'current' ? !item.completed : item.completed))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groceryList, categoryId, mode]);

  const itemIds = useMemo(() => items.map(item => item.id), [items]);
  const selectedCount = selectedItemIds.length;
  const hasSelection = selectedCount > 0;
  const allSelected =
    itemIds.length > 0 && selectedCount === itemIds.length;

  useEffect(() => {
    setSelectedItemIds([]);
  }, [mode, categoryId, itemIds.length]);

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id],
    );
  }, []);

  const handleSelectAllToggle = useCallback(() => {
    if (allSelected) {
      setSelectedItemIds([]);
      return;
    }
    setSelectedItemIds(itemIds);
  }, [allSelected, itemIds]);

  const handleBulkMoveToCurrent = useCallback(async () => {
    if (!hasSelection) return;
    setIsBulkMoving(true);
    try {
      await Promise.all(selectedItemIds.map(id => toggleGroceryItem(id)));
      setSelectedItemIds([]);
    } catch (error) {
      console.error('Failed to move items back:', error);
      Alert.alert(
        'Error',
        'Unable to move the selected items back into the bag right now.',
      );
    } finally {
      setIsBulkMoving(false);
    }
  }, [hasSelection, selectedItemIds, toggleGroceryItem]);

  const memberMeta = useCallback(
    (memberId?: string) => {
      const member = members.find(m => m.id === memberId);
      return {
        symbol: member?.symbol,
        name: member?.name,
      };
    },
    [members],
  );

  const handleToggle = useCallback(
    async (id: string) => {
      try {
        await toggleGroceryItem(id);
      } catch (error) {
        console.error('Failed to toggle grocery item:', error);
        Alert.alert('Error', 'Could not update item. Please try again.');
      }
    },
    [toggleGroceryItem],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await removeGroceryItem(id);
      } catch (error) {
        console.error('Failed to remove grocery item:', error);
        Alert.alert('Error', 'Unable to delete item right now.');
      }
    },
    [removeGroceryItem],
  );

  const headerName =
    categoryName ||
    shoppingCategories.find(cat => cat.id === categoryId)?.name ||
    'Category';

  return (
    <AppLayout showNav={false} showAddButton={false} disableScroll>
      <View
        style={[
          detailStyles.header,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} style={detailStyles.backButton}>
          <AppIcon name="chevronLeft" size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[detailStyles.title, { color: colors.foreground }]}>
            {headerName}
          </Text>
          <Text style={[detailStyles.subtitle, { color: colors.mutedForeground }]}> 
            {mode === 'current' ? 'Current bag' : 'Purchased items'}
          </Text>
        </View>
        <View
          style={[
            detailStyles.iconBadge,
            { backgroundColor: (categoryColor || colors.primary) + '25' },
          ]}
        >
          <CategoryIcon
            icon={categoryIcon || 'package'}
            size={18}
            color={colors.foreground}
            library={categoryLibrary}
          />
        </View>
      </View>
      {mode === 'purchased' && items.length > 0 && (
        <View
          style={[
            detailStyles.selectionBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <View style={detailStyles.selectionInfo}>
            <Text
              style={[
                detailStyles.selectionTitle,
                { color: colors.foreground },
              ]}
            >
              {hasSelection
                ? `${selectedCount} selected`
                : 'Select items to move back'}
            </Text>
            <Text
              style={[
                detailStyles.selectionHint,
                { color: colors.mutedForeground },
              ]}
            >
              Tap the circles to pick entries or use the chips below.
            </Text>
          </View>
          <View style={detailStyles.selectionActions}>
            <Pressable
              onPress={handleSelectAllToggle}
              style={({ pressed }) => [
                detailStyles.selectionChip,
                {
                  borderColor: allSelected ? colors.primary : colors.border,
                  backgroundColor: allSelected ? colors.primary : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppIcon
                name="checkSquare"
                size={14}
                color={allSelected ? '#fff' : colors.foreground}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  detailStyles.selectionChipText,
                  allSelected && { color: '#fff' },
                ]}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </Text>
            </Pressable>
            {hasSelection && (
              <Pressable
                onPress={() => setSelectedItemIds([])}
                style={({ pressed }) => [
                  detailStyles.selectionChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.muted,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    detailStyles.selectionChipText,
                    { color: colors.foreground },
                  ]}
                >
                  Clear selection
                </Text>
              </Pressable>
            )}
          </View>
          {hasSelection && (
            <Pressable
              onPress={handleBulkMoveToCurrent}
              disabled={isBulkMoving}
              style={({ pressed }) => [
                detailStyles.bulkMoveButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <AppIcon
                name="shoppingCart"
                size={16}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={detailStyles.bulkMoveText}>
                {isBulkMoving ? 'Moving back...' : 'Move to current bag'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      <ScrollView
        style={detailStyles.scroll}
        contentContainerStyle={detailStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={detailStyles.emptyState}>
            <Text
              style={[detailStyles.emptyText, { color: colors.mutedForeground }]}
            >
              No items recorded for this category yet.
            </Text>
          </View>
        ) : (
          <View style={detailStyles.itemsList}>
            {items.map(item => {
              const meta = memberMeta(item.addedBy);
              const isSelected = selectedItemIds.includes(item.id);
              return (
                <GroceryRow
                  key={item.id}
                  item={item}
                  isPurchased={mode !== 'current'}
                  categoryColor={categoryColor}
                  categoryIcon={categoryIcon}
                  categoryLibrary={categoryLibrary}
                  colors={colors}
                  radius={radius}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                  isSelectable={mode === 'purchased'}
                  isSelected={isSelected}
                  onSelectToggle={toggleItemSelection}
                  memberSymbol={meta.symbol}
                  memberName={meta.name}
                />
              );
            })}
          </View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </AppLayout>
  );
};

const detailStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    padding: 16,
    paddingTop: 32,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
  },
  itemsList: {
    width: '100%',
  },
  selectionBar: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
  },
  selectionInfo: {
    marginBottom: 8,
  },
  selectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionHint: {
    fontSize: 12,
  },
  selectionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  selectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  selectionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bulkMoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  bulkMoveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
