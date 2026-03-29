import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { AppIcon } from '../ui';
import { CategoryIcon, IconLibrary } from '../ui/CategoryIcon';
import { MemberIcon } from '../ui/MemberIcon';
import { GroceryItem } from '../../contexts/FamilyContext';
import { useThemeColors, useThemeRadius } from '../../contexts/ThemeContext';


type GroceryRowProps = {
  item: GroceryItem;
  isPurchased: boolean;
  categoryColor?: string;
  categoryIcon?: string;
  categoryLibrary?: IconLibrary;
  colors: ReturnType<typeof useThemeColors>;
  radius: ReturnType<typeof useThemeRadius>;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
  memberSymbol?: string;
  memberName?: string;
};

export const GroceryRow = React.memo<GroceryRowProps>(
  ({
    item,
    isPurchased,
    categoryColor,
    categoryIcon,
    categoryLibrary,
    colors,
    radius,
    onToggle,
    onRemove,
    isSelectable = false,
    isSelected = false,
    onSelectToggle = () => {},
    memberSymbol,
    memberName,
  }) => {
    const renderRightActions = useCallback(
      () => (
        <Pressable
          style={[groceryRowStyles.swipedAction, { backgroundColor: colors.danger }]}
          onPress={() => onRemove(item.id)}
        >
          <AppIcon name="trash" size={20} color="#fff" />
          <Text style={groceryRowStyles.actionText}>Delete</Text>
        </Pressable>
      ),
      [colors.danger, item.id, onRemove],
    );

    const renderLeftActions = useCallback(
      () => (
        <Pressable
          style={[
            groceryRowStyles.swipedAction,
            groceryRowStyles.leftAction,
            { backgroundColor: colors.success },
          ]}
          onPress={() => {
            if (!item.completed) onToggle(item.id);
          }}
        >
          <AppIcon name="check" size={20} color="#fff" />
          <Text style={groceryRowStyles.actionText}>Done</Text>
        </Pressable>
      ),
      [colors.success, item, onToggle],
    );

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
              groceryRowStyles.itemRow,
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
              {isSelectable && (
                <Pressable
                  onPress={() => onSelectToggle?.(item.id)}
                  style={[
                    groceryRowStyles.selectionIndicator,
                    isSelected && groceryRowStyles.selectionIndicatorActive,
                  ]}
                >
                  {isSelected ? (
                    <AppIcon name="check" size={14} color={colors.primary} />
                  ) : (
                    <View style={groceryRowStyles.selectionPlaceholder} />
                  )}
                </Pressable>
              )}
              <View
                style={[
                  groceryRowStyles.categoryIconSmall,
                  { backgroundColor: (categoryColor || colors.muted) + '20' },
                  isSelectable && { marginLeft: 8 },
                ]}
              >
              {categoryIcon ? (
                <CategoryIcon
                  icon={categoryIcon}
                  library={categoryLibrary}
                  size={20}
                  color={colors.foreground}
                />
              ) : (
                <Text style={{ fontSize: 16 }}>📦</Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  groceryRowStyles.itemName,
                  {
                    color: colors.foreground,
                    textDecorationLine: isPurchased ? 'line-through' : 'none',
                    opacity: isPurchased ? 0.7 : 1,
                  },
                ]}
              >
                {item.name}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 2,
                }}
              >
                <Text
                  style={[groceryRowStyles.itemDetail, { color: colors.mutedForeground }]}
                >
                  {item.quantity} {item.unit}
                </Text>
                <View
                  style={[
                    groceryRowStyles.addedByBadge,
                    {
                      backgroundColor: colors.muted,
                      borderRadius: radius.sm,
                      marginLeft: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 6,
                    },
                  ]}
                >
                  <MemberIcon
                    symbol={memberSymbol}
                    size={14}
                    color={colors.foreground}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      marginLeft: 4,
                      color: colors.foreground,
                    }}
                  >
                    {memberName || 'Family Member'}
                  </Text>
                </View>
                {isPurchased && item.purchasedAt && (
                  <Text
                    style={[
                      groceryRowStyles.itemDetail,
                      { color: colors.mutedForeground, marginLeft: 8 },
                    ]}
                  >
                    {new Date(item.purchasedAt).toLocaleDateString()} at{' '}
                    {new Date(item.purchasedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {!isPurchased ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => onRemove(item.id)}
                style={[groceryRowStyles.actionIconBtn, { backgroundColor: '#fff' }]}
              >
                <AppIcon name="trash" size={18} color={colors.danger} />
              </Pressable>
              <Pressable
                onPress={() => onToggle(item.id)}
                style={[
                  groceryRowStyles.doneBtn,
                  { backgroundColor: colors.success, borderRadius: radius.sm },
                ]}
              >
                <Text
                  style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}
                >
                  Done
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Swipeable>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.completed === next.item.completed &&
      prev.onToggle === next.onToggle &&
      prev.onRemove === next.onRemove &&
      prev.isPurchased === next.isPurchased &&
      prev.isSelectable === next.isSelectable &&
      prev.isSelected === next.isSelected &&
      prev.onSelectToggle === next.onSelectToggle
    );
  },
);

const groceryRowStyles = StyleSheet.create({
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
  selectionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  selectionIndicatorActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8',
  },
  selectionPlaceholder: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
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
});
