import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Swipeable,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import {
  useRoute,
  useNavigation,
  NavigationProp,
  RouteProp,
} from '@react-navigation/native';
import { AppLayout } from '../components/layout';
import { useFamily, GroceryItem } from '../contexts/FamilyContext';
import { useMealPlan } from '../contexts/MealPlanContext';
import {
  useTheme,
  useThemeColors,
  useThemeRadius,
} from '../contexts/ThemeContext';
import { GlobalSearch } from '../components/search/GlobalSearch';
import { useSidebar } from '../contexts/SidebarContext';
import { AppIcon, CustomDateTimePicker } from '../components/ui';
import { MemberIcon } from '../components/ui/MemberIcon';
import { ScreenErrorView } from '../components/ui/ScreenErrorView';
import { CategoryIcon, IconLibrary } from '../components/ui/CategoryIcon';
import { shoppingCategories } from '../constants/shoppingCategories';
import Config from 'react-native-config';
import { withDeferredScreen } from '../components/layout/DeferredScreen';
import NetInfo from '@react-native-community/netinfo';
import { SyncService } from '../services/SyncService';
import { trackScreen } from '../services/analytics';
import Share from 'react-native-share';
import { useToast } from '../hooks/useToast';
import {
  exportService,
  ShoppingListExportMode,
} from '../services/ExportService';
import { ListsStackParamList } from '../navigation/ListsStackParams';

const ENABLE_RECIPE_AND_MEALS = Config.ENABLE_RECIPE_AND_MEALS !== 'false';

const isSameLocalDay = (
  timestamp?: number | null,
  targetDate?: Date | null,
): boolean => {
  if (timestamp === undefined || timestamp === null || !targetDate)
    return false;
  const date = new Date(timestamp);
  return (
    date.getFullYear() === targetDate.getFullYear() &&
    date.getMonth() === targetDate.getMonth() &&
    date.getDate() === targetDate.getDate()
  );
};

const ListsScreenContent: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { currentPalette, appearanceMode } = useTheme();
  const isMidnight = appearanceMode === 'midnight';
  const route =
    useRoute<RouteProp<{ params: { addItems?: any[] } }, 'params'>>();
  const {
    groceryList,
    addGroceryItem,
    toggleGroceryItem,
    removeGroceryItem,
    activeMember,
    members,
  } = useFamily();
  const navigation = useNavigation<NavigationProp<ListsStackParamList>>();
  const { generateGroceryList } = useMealPlan();
  const defaultCategoryId = shoppingCategories[0]?.id ?? 'Groceries';
  const { showToast } = useToast();
  useEffect(() => {
    void trackScreen('ListsScreen');
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [memberFilterId, setMemberFilterId] = useState<string | null>(null);
  const [updatedDateFilter, setUpdatedDateFilter] = useState<Date | null>(null);
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);
  const [categoryScrollX, setCategoryScrollX] = useState(0);
  const [categoryContainerWidth, setCategoryContainerWidth] = useState(0);
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);
  const categoryScrollRef = useRef<ScrollView>(null);
  const canScrollLeft = categoryScrollX > 10;
  const canScrollRight =
    categoryContentWidth > categoryContainerWidth &&
    categoryScrollX + categoryContainerWidth + 10 < categoryContentWidth;

  const scrollCategory = useCallback(
    (direction: 'left' | 'right') => {
      if (!categoryScrollRef.current) {
        return;
      }
      const maxOffset = Math.max(0, categoryContentWidth - categoryContainerWidth);
      const target =
        direction === 'left'
          ? Math.max(0, categoryScrollX - categoryContainerWidth)
          : Math.min(maxOffset, categoryScrollX + categoryContainerWidth);
      categoryScrollRef.current.scrollTo({ x: target, animated: true });
    },
    [categoryContentWidth, categoryContainerWidth, categoryScrollX],
  );
  const [exportCategorySelection, setExportCategorySelection] = useState<string[]>([]);
  const [exportMode, setExportMode] = useState<ShoppingListExportMode>('formal');

  // State to track expanded categories. Default all expanded.
  const [activeTab, setActiveTab] = useState<'current' | 'purchased'>(
    'current',
  );
  const { openSidebar } = useSidebar();
  const [mealPlanItems, setMealPlanItems] = useState<
    ReturnType<typeof generateGroceryList>
  >([]);

  const filterAccentColor = useMemo(() => {
    if (isMidnight) return colors.foreground;
    switch (currentPalette) {
      case 'amber':
        return '#B45309';
      case 'obsidian':
        return '#DC2626';
      default:
        return '#1E40AF';
    }
  }, [currentPalette, colors.foreground, isMidnight]);
  const primaryIconColor = isMidnight ? colors.foreground : colors.primary;
  const isPurchasedCreamTheme =
    activeTab === 'purchased' && appearanceMode === 'cream';

  // Purchase history filters
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<
    string | null
  >(null);
  const [historyDate, setHistoryDate] = useState<Date | null>(null);
  const [historyTime, setHistoryTime] = useState<Date | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(
        Boolean(state.isConnected && (state.isInternetReachable ?? true)),
      );
    });
    return () => unsubscribe();
  }, []);

  // Handle addItems from route params
  useEffect(() => {
    const addItems = route.params?.addItems;
    if (addItems && Array.isArray(addItems) && addItems.length > 0) {
      try {
        addItems.forEach(item => {
          addGroceryItem({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: defaultCategoryId,
            addedBy: activeMember?.id || '1',
            completed: false,
          });
        });
        // Clear the params after adding
        // Note: You might want to use navigation.setParams({ addItems: undefined }) here
      } catch (error) {
        handleScreenError('handleRouteAddItems', error);
        Alert.alert('Error', 'Failed to add items from meal plan.');
      }
    }
  }, [route.params?.addItems]);

  const handleScreenError = useCallback((context: string, error: unknown) => {
    console.error(`ListsScreen - ${context}`, error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Something went wrong';
    setScreenError(message);
  }, []);

  const resetScreenError = useCallback(() => setScreenError(null), []);

  const categoriesById = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        color?: string;
        icon?: string;
        library?: IconLibrary;
      }
    >();
    shoppingCategories.forEach(cat =>
      map.set(cat.id, {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        library: cat.library,
      }),
    );
    return map;
  }, []);

  const fallbackCategoryMeta = useMemo(
    () => ({
      name: 'Other',
      icon: 'package',
      color: colors.primary,
      library: 'MaterialCommunityIcons' as IconLibrary,
    }),
    [colors.primary],
  );

  const buildCategoryCards = useCallback(
    (items: GroceryItem[]) => {
      const totals = new Map<string, number>();
      items.forEach(item => {
        const categoryKey = item.category || defaultCategoryId;
        totals.set(categoryKey, (totals.get(categoryKey) ?? 0) + 1);
      });
      return Array.from(totals.entries())
        .map(([categoryId, count]) => {
          const meta = categoriesById.get(categoryId) ?? fallbackCategoryMeta;
          return {
            categoryId,
            count,
            name: meta.name || fallbackCategoryMeta.name,
            icon: meta.icon || fallbackCategoryMeta.icon,
            color: meta.color || fallbackCategoryMeta.color,
            library: meta.library,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [categoriesById, defaultCategoryId, fallbackCategoryMeta],
  );

  const handleToggleItem = useCallback(
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

  const handleRemoveItem = useCallback(
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

  const handleOpenCategory = useCallback(
    (categoryId: string, mode: 'current' | 'purchased') => {
      const meta = categoriesById.get(categoryId);
      navigation.navigate('CategoryDetail', {
        categoryId,
        mode,
        categoryName: meta?.name,
        categoryIcon: meta?.icon,
        categoryLibrary: meta?.library,
        categoryColor: meta?.color,
      });
    },
    [categoriesById, navigation],
  );

  const baseItems = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    return (groceryList as GroceryItem[]).filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchLower);
      const matchesMember = !memberFilterId || item.addedBy === memberFilterId;
      const matchesCategory =
        !categoryFilterId || item.category === categoryFilterId;
      return matchesSearch && matchesMember && matchesCategory;
    });
  }, [groceryList, searchQuery, memberFilterId, categoryFilterId]);

  const filterByDate = useCallback(
    (items: GroceryItem[], targetDate?: Date | null) => {
      if (!targetDate) return items;
      return items.filter(item => {
        const ts = item.updatedAt ?? item.purchasedAt ?? item.createdAt;
        return isSameLocalDay(ts, targetDate);
      });
    },
    [],
  );

  const applyDateFilter = useMemo(() => filterByDate, [filterByDate]);

  const baseTodoItems = useMemo(
    () => baseItems.filter(item => !item.completed),
    [baseItems],
  );
  const baseDoneItems = useMemo(
    () => baseItems.filter(item => item.completed),
    [baseItems],
  );

  const currentTodoItems = useMemo(
    () => applyDateFilter(baseTodoItems, updatedDateFilter),
    [baseTodoItems, updatedDateFilter, applyDateFilter],
  );
  const currentCategoryCards = useMemo(
    () => buildCategoryCards(currentTodoItems),
    [buildCategoryCards, currentTodoItems],
  );
  const currentDoneItems = useMemo(
    () => applyDateFilter(baseDoneItems, updatedDateFilter),
    [baseDoneItems, updatedDateFilter, applyDateFilter],
  );
  const filteredItems = useMemo(
    () => [...currentTodoItems, ...currentDoneItems],
    [currentTodoItems, currentDoneItems],
  );

  const historyItems = useMemo(() => {
    let items = baseDoneItems;
    if (historyCategoryFilter) {
      items = items.filter(i => i.category === historyCategoryFilter);
    }
    if (historyDate) {
      const dateStr = historyDate.toISOString().split('T')[0];
      const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
      const dayEnd = dayStart + 86400000;
      items = items.filter(
        i =>
          typeof i.purchasedAt === 'number' &&
          i.purchasedAt >= dayStart &&
          i.purchasedAt < dayEnd,
      );
    }
    if (historyTime) {
      const hours = historyTime.getHours();
      const mins = historyTime.getMinutes();
      items = items.filter(i => {
        if (typeof i.purchasedAt !== 'number') return false;
        const pDate = new Date(i.purchasedAt);
        // Show items at or after this time on the selected date (or any date if date filter isn't set)
        return (
          pDate.getHours() > hours ||
          (pDate.getHours() === hours && pDate.getMinutes() >= mins)
        );
      });
    }
    // Sort by date descending
    return [...items].sort(
      (a, b) => (b.purchasedAt || 0) - (a.purchasedAt || 0),
    );
  }, [baseDoneItems, historyCategoryFilter, historyDate, historyTime]);
  const purchasedCategoryCards = useMemo(
    () => buildCategoryCards(historyItems),
    [buildCategoryCards, historyItems],
  );

  const progress =
    filteredItems.length > 0
      ? Math.round((currentDoneItems.length / filteredItems.length) * 100)
      : 0;

  const handleOpenImport = () => {
    try {
      const items = generateGroceryList();
      setMealPlanItems(items);
      setShowImportModal(true);
    } catch (error) {
      handleScreenError('handleOpenImport', error);
      Alert.alert('Error', 'Unable to load meal plan items.');
    }
  };

  const handleImportItem = (item: {
    name: string;
    quantity: number;
    unit: string;
  }) => {
    try {
      addGroceryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: defaultCategoryId,
        addedBy: activeMember?.id || '1',
        completed: false,
      });
      Alert.alert('Item added', `${item.name} added to grocery list`);
    } catch (error) {
      handleScreenError('handleImportItem', error);
      Alert.alert('Error', 'Failed to import item.');
    }
  };

  const handleImportAll = () => {
    try {
      mealPlanItems.forEach(item => {
        addGroceryItem({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: defaultCategoryId,
          addedBy: activeMember?.id || '1',
          completed: false,
        });
      });
      setShowImportModal(false);
      Alert.alert(
        'All items imported!',
        `${mealPlanItems.length} items added to your list`,
      );
    } catch (error) {
      handleScreenError('handleImportAll', error);
      Alert.alert('Error', 'Failed to import all items.');
    }
  };
  const [showExportModal, setShowExportModal] = useState(false);

  const runPdfExport = useCallback(
    async (items: GroceryItem[], mode: ShoppingListExportMode) => {
      setIsExportingPdf(true);
      setShowExportModal(false);
      try {
        const filePath = await exportService.exportShoppingListAsPDF(
          items,
          mode,
        );
        const shareUrl = ensureFileUri(filePath);
        await Share.open({
          title: 'Current Bag Items',
          subject: 'Current Bag Items',
          url: shareUrl,
          type: 'application/pdf',
        });
      } catch (error: any) {
        const userCancelled =
          error?.error === 'User did not share' ||
          error?.message === 'User did not share' ||
          error?.message === 'User did not share.';
        if (userCancelled) {
          return;
        }
        const alreadyRunning =
          error?.message === 'A PDF export is already in progress. Please wait.';
        if (alreadyRunning) {
          return;
        }
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Unable to export items. Please try again later.';
        showToast({
          type: 'error',
          title: 'Export failed',
          description: message,
        });
      } finally {
        setIsExportingPdf(false);
      }
    },
    [showToast],
  );

  const handleExportCategoryToggle = useCallback((categoryId: string) => {
    setExportCategorySelection(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

  const allExportCategoriesSelected =
    currentCategoryCards.length > 0 &&
    exportCategorySelection.length === currentCategoryCards.length;

  const handleExportSelectAllToggle = useCallback(() => {
    if (allExportCategoriesSelected) {
      setExportCategorySelection([]);
      return;
    }
    setExportCategorySelection(currentCategoryCards.map(card => card.categoryId));
  }, [allExportCategoriesSelected, currentCategoryCards]);

  const handleConfirmExport = useCallback(() => {
    if (exportCategorySelection.length === 0) {
      showToast({
        type: 'warning',
        title: 'No categories selected',
        description: 'Select at least one category to export.',
      });
      return;
    }
    const itemsToExport = currentTodoItems.filter(item =>
      exportCategorySelection.includes(item.category || defaultCategoryId),
    );
    if (itemsToExport.length === 0) {
      showToast({
        type: 'warning',
        title: 'Empty selection',
        description:
          'The selected categories do not contain any current bag items.',
      });
      return;
    }
    runPdfExport(itemsToExport, exportMode);
  }, [
    currentTodoItems,
    defaultCategoryId,
    exportCategorySelection,
    exportMode,
    runPdfExport,
    showToast,
  ]);

  const handleExportCurrentBag = useCallback(() => {
    if (currentTodoItems.length === 0) {
      showToast({
        type: 'warning',
        title: 'No items',
        description: 'Add items to your bag before exporting.',
      });
      return;
    }
    setExportCategorySelection(currentCategoryCards.map(card => card.categoryId));
    setExportMode('formal');
    setShowExportModal(true);
  }, [currentCategoryCards, currentTodoItems.length, showToast]);

  // The callbacks above already expose optimized handler hooks.

  const ensureFileUri = (path: string) =>
    path.startsWith('file://') || path.startsWith('content://')
      ? path
      : `file://${path}`;

  const handleBulkDelete = () => {
    const targetItems =
      activeTab === 'current' ? currentTodoItems : baseDoneItems;
    if (targetItems.length === 0) {
      Alert.alert('Empty List', 'No items to delete.');
      return;
    }

    Alert.alert(
      'Clear List',
      `Are you sure you want to delete all ${
        targetItems.length
      } items from the ${
        activeTab === 'current' ? 'current' : 'purchased'
      } list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Execute sequentially to avoid overwhelming DB/State
              for (const item of targetItems) {
                await removeGroceryItem(item.id);
              }
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to clear list.');
            }
          },
        },
      ],
    );
  };

  const handleManualRefresh = useCallback(async () => {
    if (!isOnline || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await SyncService.sync(false, { mode: 'manual' });
    } catch (error) {
      console.error('ListsScreen: Manual sync failed', error);
      Alert.alert(
        'Refresh failed',
        'Could not sync right now. Please try again.',
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline, isRefreshing]);

  const handleGestureEvent = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      // Trigger if swipe is long enough (50px) and fast enough
      if (translationX > 50 && Math.abs(velocityX) > 300) {
        // Right Swipe (Drag L -> R)
        if (activeTab === 'current') setActiveTab('purchased');
      } else if (translationX < -50 && Math.abs(velocityX) > 300) {
        // Left Swipe (Drag R -> L)
        if (activeTab === 'purchased') setActiveTab('current');
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
        onAddPress={() => navigation.navigate('CreateListFlow')}
        showNav={false}
      >
        <PanGestureHandler
          onHandlerStateChange={handleGestureEvent}
          activeOffsetX={[-20, 20]} // Capture horizontal swipes more easily
          failOffsetY={[-20, 20]} // Allow vertical scrolling to continue if moving vertically
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <Pressable
                  onPress={openSidebar}
                  style={[
                    styles.menuButton,
                    { backgroundColor: colors.card, borderRadius: radius.md },
                  ]}
                >
                  <AppIcon name="menu" size={20} color={colors.foreground} />
                </Pressable>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.title, { color: colors.foreground }]}>
                    Grocery List
                  </Text>
                  <Text
                    style={[styles.subtitle, { color: colors.mutedForeground }]}
                  >
                    Your family's shopping list
                  </Text>
                </View>
                <View
                  style={[
                    styles.headerActions,
                    { gap: 8, flexDirection: 'row' },
                  ]}
                >
                  <Pressable
                    style={[
                      styles.roundButton,
                      { backgroundColor: colors.card, borderRadius: radius.md },
                    ]}
                    onPress={() => setShowSearch(true)}
                  >
                    <AppIcon
                      name="search"
                      size={18}
                      color={colors.foreground}
                    />
                  </Pressable>
                  {isOnline && (
                    <Pressable
                      style={[
                        styles.refreshButton,
                        {
                          backgroundColor: colors.card,
                          borderRadius: radius.md,
                        },
                      ]}
                      onPress={handleManualRefresh}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.foreground}
                        />
                      ) : (
                        <AppIcon
                          name="rotateCw"
                          size={18}
                          color={colors.foreground}
                        />
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    style={[
                      styles.roundButton,
                      {
                        backgroundColor: colors.danger + '15',
                        borderRadius: radius.md,
                      },
                    ]}
                    onPress={handleBulkDelete}
                  >
                    <AppIcon name="trash" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>

              {/* Tabs */}
              <View
                style={[
                  styles.tabContainer,
                  {
                    backgroundColor: colors.card,
                    borderRadius: radius.md,
                    marginBottom: 20,
                  },
                ]}
              >
                <Pressable
                  onPress={() => setActiveTab('current')}
                  style={[
                    styles.tab,
                    activeTab === 'current'
                      ? {
                          backgroundColor: colors.primary,
                          borderRadius: radius.sm,
                        }
                      : {
                          backgroundColor: colors.background,
                          borderRadius: radius.sm,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          activeTab === 'current'
                            ? colors.primaryForeground
                            : colors.foreground,
                      },
                    ]}
                  >
                    Current Bag ({currentTodoItems.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('purchased')}
                  style={[
                    styles.tab,
                    activeTab === 'purchased'
                      ? {
                          backgroundColor: colors.primary,
                          borderRadius: radius.sm,
                        }
                      : {
                          backgroundColor: colors.background,
                          borderRadius: radius.sm,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          activeTab === 'purchased'
                            ? colors.primaryForeground
                            : colors.foreground,
                      },
                    ]}
                  >
                    Purchased
                  </Text>
                </Pressable>
              </View>
              {activeTab === 'current' && (
                <View style={styles.filterToggleRow}>
                  <Pressable
                    onPress={() => setShowFiltersPanel(prev => !prev)}
                    style={({ pressed }) => [
                      styles.filterToggleButton,
                      {
                        borderColor: colors.primary,
                        backgroundColor: showFiltersPanel
                          ? colors.primary + '15'
                          : colors.card,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <AppIcon
                      name="filter"
                      size={14}
                      color={colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.filterToggleText,
                        {
                          color: colors.primary,
                        },
                      ]}
                    >
                      Filters
                    </Text>
                  </Pressable>
                </View>
              )}
              {activeTab === 'current' && showFiltersPanel && (
                <View
                  style={[
                    styles.filterRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <View style={styles.memberFilterRow}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.memberFilterScroll}
                    >
                      <Pressable
                        onPress={() => setMemberFilterId(null)}
                        style={[
                          styles.memberFilterChip,
                          !memberFilterId
                            ? {
                                backgroundColor: colors.primary + '10',
                                borderColor: colors.primary,
                              }
                            : {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                              },
                        ]}
                      >
                        <AppIcon
                          name="users"
                          size={14}
                          color={
                            !memberFilterId ? colors.primary : colors.foreground
                          }
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.memberFilterChipText,
                            !memberFilterId
                              ? { color: colors.primary }
                              : { color: colors.foreground },
                          ]}
                        >
                          All members
                        </Text>
                      </Pressable>
                      {members.map(member => {
                        const isMemberActive = memberFilterId === member.id;
                        return (
                          <Pressable
                            key={member.id}
                            onPress={() => setMemberFilterId(member.id)}
                            style={[
                              styles.memberFilterChip,
                              isMemberActive
                                ? {
                                    backgroundColor: colors.primary + '10',
                                    borderColor: colors.primary,
                                  }
                                : {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                  },
                            ]}
                          >
                            <MemberIcon
                              symbol={member.symbol}
                              size={14}
                              color={
                                isMemberActive
                                  ? colors.primary
                                  : colors.foreground
                              }
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.memberFilterChipText,
                                isMemberActive
                                  ? { color: colors.primary }
                                  : { color: colors.foreground },
                              ]}
                            >
                              {member.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <View style={{ marginTop: 12, width: '100%' }}>
                    <Text
                      style={[
                        styles.filterLabel,
                        { color: colors.mutedForeground, marginBottom: 8 },
                      ]}
                    >
                      Category
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, alignItems: 'center' }}
                      style={{ width: '100%', paddingBottom: 4 }}
                    >
                      <Pressable
                        onPress={() => setCategoryFilterId(null)}
                        style={[
                          styles.memberHistoryChip,
                          { minHeight: 38 },
                          !categoryFilterId
                            ? {
                                borderColor: colors.primary,
                                backgroundColor: colors.primary + '10',
                              }
                            : {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                              },
                        ]}
                      >
                        <CategoryIcon
                          icon="package"
                          size={14}
                          color={
                            !categoryFilterId
                              ? colors.primary
                              : colors.foreground
                          }
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.memberFilterChipText,
                            !categoryFilterId
                              ? { color: colors.primary }
                              : { color: colors.foreground },
                          ]}
                        >
                          All categories
                        </Text>
                      </Pressable>
                      {shoppingCategories.map(cat => {
                        const isCategoryActive = categoryFilterId === cat.id;
                        return (
                          <Pressable
                            key={cat.id}
                            onPress={() => setCategoryFilterId(cat.id)}
                            style={[
                              styles.memberHistoryChip,
                              { minHeight: 38 },
                              isCategoryActive
                                ? {
                                    borderColor: colors.primary,
                                    backgroundColor: colors.primary + '10',
                                  }
                                : {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                  },
                            ]}
                          >
                            <CategoryIcon
                              icon={cat.icon}
                              library={cat.library}
                              size={14}
                              color={
                                isCategoryActive
                                  ? colors.primary
                                  : colors.foreground
                              }
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.memberFilterChipText,
                                isCategoryActive
                                  ? { color: colors.primary }
                                  : { color: colors.foreground },
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              )}

              {activeTab === 'current' ? (
                <>
                  {/* Hero / Progress Card */}
                  <View
                    style={[
                      styles.heroCard,
                      {
                        backgroundColor: colors.card,
                        borderRadius: radius.lg,
                        borderColor: colors.success + '20',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.heroBg,
                        { backgroundColor: colors.success + '05' },
                      ]}
                    />
                    <View style={styles.heroContent}>
                      <View
                        style={[
                          styles.heroIcon,
                          {
                            backgroundColor: colors.success + '20',
                            borderRadius: radius.md,
                          },
                        ]}
                      >
                        <AppIcon
                          name="shoppingBag"
                          size={24}
                          color={colors.success}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={[
                              styles.heroTitle,
                              { color: colors.foreground },
                            ]}
                          >
                            {currentTodoItems.length} items to buy
                          </Text>
                          <Text
                            style={[
                              styles.heroSubtitle,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {currentDoneItems.length}/{filteredItems.length}{' '}
                            purchased
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              backgroundColor: colors.muted,
                              borderRadius: radius.full,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${progress}%`,
                                backgroundColor: colors.success,
                                borderRadius: radius.full,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>

                    {ENABLE_RECIPE_AND_MEALS && (
                      <View style={styles.heroActions}>
                        <Pressable
                          onPress={handleOpenImport}
                          style={[
                            styles.heroBtn,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.success + '30',
                              borderRadius: radius.md,
                            },
                          ]}
                        >
                          <AppIcon
                            name="calendar"
                            size={14}
                            color={colors.foreground}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: colors.foreground,
                            }}
                          >
                            From Meal Plan
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Pro Tip Card */}
                  {currentTodoItems.length > 0 && (
                    <View
                      style={[
                        styles.guideCard,
                        {
                          backgroundColor: colors.info + '10',
                          borderColor: colors.info + '20',
                          borderRadius: radius.md,
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <AppIcon name="info" size={16} color={colors.info} />
                        <Text
                          style={[
                            styles.guideTitle,
                            { color: colors.foreground },
                          ]}
                        >
                          Pro Tip
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.guideText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Swipe{' '}
                        <Text
                          style={{ color: colors.success, fontWeight: '700' }}
                        >
                          Right
                        </Text>{' '}
                        to mark purchased, Swipe{' '}
                        <Text
                          style={{ color: colors.danger, fontWeight: '700' }}
                        >
                          Left
                        </Text>{' '}
                        to delete.
                      </Text>
                    </View>
                  )}

                  <View style={styles.exportRow}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.foreground, marginBottom: 0 },
                      ]}
                    >
                     Export your bag
                    </Text>
                    <Pressable
                      onPress={handleExportCurrentBag}
                      disabled={isExportingPdf}
                      style={({ pressed }) => [
                        styles.exportBtn,
                        {
                          backgroundColor: colors.primary,
                          opacity: isExportingPdf ? 0.6 : pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      {isExportingPdf ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <AppIcon
                          name="download"
                          size={14}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                      )}
                      <Text style={styles.exportBtnText}>Export PDF</Text>
                    </Pressable>
                  </View>

                  {/* Single List for Current Items */}
                  {currentCategoryCards.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View
                        style={[
                          styles.emptyIcon,
                          {
                            backgroundColor: colors.muted,
                            borderRadius: radius.xl,
                          },
                        ]}
                      >
                        <AppIcon
                          name="shoppingCart"
                          size={32}
                          color={colors.mutedForeground}
                        />
                      </View>
                      <Text
                        style={[
                          styles.emptyTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Your bag is empty
                      </Text>
                      <Text
                        style={[
                          styles.emptyText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Add items above or import from your meal plan
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.categorySectionTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Tap a category to view its items
                      </Text>
                      <View style={styles.categoryGrid}>
                        {currentCategoryCards.map(card => (
                          <Pressable
                            key={card.categoryId}
                            onPress={() => handleOpenCategory(card.categoryId, 'current')}
                            style={[
                              styles.categoryCard,
                              {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.categoryIconBadge,
                                {
                                  backgroundColor:
                                    (card.color || colors.primary) + '20',
                                },
                              ]}
                            >
                              <CategoryIcon
                                icon={card.icon}
                                library={card.library}
                                size={18}
                                color={card.color || colors.primary}
                              />
                            </View>
                            <Text
                              style={[
                                styles.categoryCardLabel,
                                { color: colors.foreground },
                              ]}
                            >
                              {card.name}
                            </Text>
                            <Text
                              style={[
                                styles.categoryCardCount,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {card.count} item{card.count === 1 ? '' : 's'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.filterToggleRow}>
                    <Pressable
                      onPress={() => setShowHistoryFilters(prev => !prev)}
                      style={({ pressed }) => [
                        styles.filterToggleButton,
                        {
                          borderColor: colors.primary,
                          backgroundColor: showHistoryFilters
                            ? colors.primary + '15'
                            : colors.card,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <AppIcon
                        name="filter"
                        size={14}
                        color={colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.filterToggleText,
                          { color: colors.primary },
                        ]}
                      >
                        Filters
                      </Text>
                    </Pressable>
                  </View>
                  {/* History Filters Section */}
                  {showHistoryFilters && (
                    <View
                      style={[
                        styles.historyFilterCard,
                        {
                          backgroundColor: colors.card,
                          borderRadius: radius.lg,
                          borderColor: colors.border,
                          borderWidth: 1,
                          marginBottom: 20,
                        },
                      ]}
                    >
                    <View style={styles.filterSectionHeader}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <AppIcon
                          name="filter"
                          size={16}
                          color={primaryIconColor}
                        />
                        <Text
                          style={[
                            styles.filterSectionTitle,
                            { color: colors.foreground },
                          ]}
                        >
                          Filter History
                        </Text>
                      </View>
                      {(historyCategoryFilter ||
                        historyDate ||
                        historyTime) && (
                        <Pressable
                          onPress={() => {
                            setHistoryCategoryFilter(null);
                            setHistoryDate(null);
                            setHistoryTime(null);
                          }}
                          style={styles.resetFiltersBtn}
                        >
                          <Text
                            style={{
                              color: colors.danger,
                              fontSize: 12,
                              fontWeight: '600',
                            }}
                          >
                            Reset All
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    <View style={{ padding: 12 }}>
                      {members.length > 0 && (
                        <View style={styles.memberHistoryFilterRow}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8 }}
                          >
                            <Pressable
                              style={[
                                styles.memberHistoryChip,
                                !memberFilterId
                                  ? {
                                      borderColor: colors.primary,
                                      backgroundColor: colors.background,
                                    }
                                  : {
                                      borderColor: colors.border,
                                      backgroundColor: colors.background,
                                    },
                              ]}
                              onPress={() => setMemberFilterId(null)}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '600',
                                  color: !memberFilterId
                                    ? filterAccentColor
                                    : colors.foreground,
                                }}
                              >
                                All
                              </Text>
                            </Pressable>
                            {members.map(member => {
                              const isMemberActive =
                                memberFilterId === member.id;
                              return (
                                <Pressable
                                  key={member.id}
                                  style={[
                                    styles.memberHistoryChip,
                                    isMemberActive
                                      ? {
                                          borderColor: colors.primary,
                                          backgroundColor:
                                            colors.primary + '10',
                                        }
                                      : {
                                          borderColor: colors.border,
                                          backgroundColor: colors.background,
                                        },
                                  ]}
                                  onPress={() => setMemberFilterId(member.id)}
                                >
                                  <MemberIcon
                                    symbol={member.symbol}
                                    size={14}
                                    color={
                                      isMemberActive
                                        ? colors.primary
                                        : colors.foreground
                                    }
                                  />
                                  <Text
                                    style={{
                                      marginLeft: 6,
                                      fontSize: 12,
                                      color: isMemberActive
                                        ? colors.primary
                                        : colors.foreground,
                                    }}
                                  >
                                    {member.name}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.filterLabel,
                          { color: filterAccentColor, marginBottom: 8 },
                        ]}
                      >
                        Category
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoryScroll}
                        contentContainerStyle={{ gap: 8, alignItems: 'center' }}
                      >
                        <Pressable
                          onPress={() => setHistoryCategoryFilter(null)}
                          style={[
                            styles.miniChip,
                            !historyCategoryFilter
                              ? {
                                  backgroundColor: colors.primary,
                                  borderColor: colors.primary,
                                }
                              : {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                },
                          ]}
                        >
                          <CategoryIcon
                            icon="package"
                            size={12}
                            color={
                              isPurchasedCreamTheme && !historyCategoryFilter
                                ? colors.primaryForeground
                                : historyCategoryFilter
                                ? filterAccentColor
                                : colors.foreground
                            }
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.miniChipText,
                              {
                                color:
                                  isPurchasedCreamTheme && !historyCategoryFilter
                                    ? colors.primaryForeground
                                    : colors.foreground,
                              },
                            ]}
                          >
                            All
                          </Text>
                        </Pressable>
                      {shoppingCategories.map(cat => {
                        const isCategoryActive =
                          historyCategoryFilter === cat.id;
                        const activeBorderColor = colors.primary;
                        return (
                          <Pressable
                            key={cat.id}
                            onPress={() => setHistoryCategoryFilter(cat.id)}
                            style={[
                              styles.miniChip,
                              {
                                backgroundColor: colors.background,
                                borderColor: isCategoryActive
                                  ? activeBorderColor
                                  : colors.border,
                                borderWidth: isCategoryActive ? 1.5 : 1,
                              },
                            ]}
                          >
                            <CategoryIcon
                              icon={cat.icon}
                              library={cat.library}
                              size={12}
                              color={
                                isCategoryActive
                                  ? activeBorderColor
                                  : filterAccentColor
                              }
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.miniChipText,
                                {
                                  color: isCategoryActive
                                    ? activeBorderColor
                                    : colors.foreground,
                                },
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </Pressable>
                        );
                      })}
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
                  )}

                  {purchasedCategoryCards.length === 0 ? (
                    <View style={styles.emptyState}>
                      <View
                        style={[
                          styles.emptyIcon,
                          {
                            backgroundColor: colors.muted,
                            borderRadius: radius.xl,
                          },
                        ]}
                      >
                        <AppIcon
                          name="package"
                          size={32}
                          color={colors.mutedForeground}
                        />
                      </View>
                      <Text
                        style={[
                          styles.emptyTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        No purchase history
                      </Text>
                      <Text
                        style={[
                          styles.emptyText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Items you mark as done will appear here
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.categorySectionTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Tap a category to view purchased items
                      </Text>
                      <View style={styles.categoryGrid}>
                        {purchasedCategoryCards.map(card => (
                          <Pressable
                            key={card.categoryId}
                            onPress={() =>
                              handleOpenCategory(card.categoryId, 'purchased')
                            }
                            style={[
                              styles.categoryCard,
                              {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.categoryIconBadge,
                                {
                                  backgroundColor:
                                    (card.color || colors.primary) + '20',
                                },
                              ]}
                            >
                              <CategoryIcon
                                icon={card.icon}
                                library={card.library}
                                size={18}
                                color={card.color || colors.primary}
                              />
                            </View>
                            <Text
                              style={[
                                styles.categoryCardLabel,
                                { color: colors.foreground },
                              ]}
                            >
                              {card.name}
                            </Text>
                            <Text
                              style={[
                                styles.categoryCardCount,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {card.count} item{card.count === 1 ? '' : 's'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </PanGestureHandler>
      </AppLayout>

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: colors.card,
                shadowColor: colors.foreground,
                borderRadius: radius.card,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <AppIcon name="calendar" size={24} color={primaryIconColor} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Import from Meal Plan
              </Text>
              <Pressable
                onPress={() => setShowImportModal(false)}
                style={styles.closeButton}
              >
                <AppIcon name="x" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent}>
              {mealPlanItems.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 32 }}>
                  <AppIcon name="calendar" size={48} color={colors.muted} />
                  <Text
                    style={{ marginTop: 16, color: colors.mutedForeground }}
                  >
                    No meals planned yet.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {mealPlanItems.map((item, index) => (
                    <View
                      key={`${item.name}-${index}`}
                      style={[
                        styles.importItemRow,
                        {
                          backgroundColor: colors.muted,
                          borderRadius: radius.md,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.importItemName,
                            { color: colors.foreground },
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.importItemMeta,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {item.quantity} {item.unit} • from{' '}
                          {item.fromRecipes.length} recipe(s)
                        </Text>
                      </View>
                      <Pressable
                        style={[
                          styles.importItemAdd,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            borderRadius: radius.sm,
                          },
                        ]}
                        onPress={() => handleImportItem(item)}
                      >
                        <AppIcon
                          name="plus"
                          size={16}
                          color={colors.foreground}
                        />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    style={[
                      styles.importAllButton,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: radius.lg,
                      },
                    ]}
                    onPress={handleImportAll}
                  >
                    <AppIcon
                      name="download"
                      size={16}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.importAllText}>
                      Import All ({mealPlanItems.length} items)
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <Pressable
          style={styles.exportOverlay}
          onPress={() => setShowExportModal(false)}
        />
        <View style={styles.exportOverlay}>
          <View
            style={[
              styles.exportCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.exportHeader}>
              <View
                style={[
                  styles.exportPillar,
                  { backgroundColor: colors.primary },
                ]}
              />
              <Text style={[styles.exportTitle, { color: colors.foreground }]}>
                Export PDF
              </Text>
            </View>
            <ScrollView
              style={styles.exportScroll}
              contentContainerStyle={styles.exportContent}
            >
              <View style={styles.exportSectionHeader}>
                <Text
                  style={[
                    styles.exportSectionTitle,
                    { color: colors.foreground },
                  ]}
                >
                  Select categories
                </Text>
                <Pressable
                  onPress={handleExportSelectAllToggle}
                  style={({ pressed }) => [
                    styles.exportSelectAllChip,
                    {
                      borderColor: allExportCategoriesSelected
                        ? colors.primary
                        : colors.border,
                      backgroundColor: allExportCategoriesSelected
                        ? colors.primary
                        : 'transparent',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <AppIcon
                    name={allExportCategoriesSelected ? 'checkSquare' : 'stop'}
                    size={14}
                    color={
                      allExportCategoriesSelected ? '#fff' : colors.foreground
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.exportSelectAllText,
                      allExportCategoriesSelected && { color: '#fff' },
                    ]}
                  >
                    {allExportCategoriesSelected ? 'Deselect all' : 'Select all'}
                  </Text>
                </Pressable>
              </View>
              {currentCategoryCards.length === 0 ? (
                <Text style={{ color: colors.mutedForeground }}>
                  Add items to your bag to unlock export categories.
                </Text>
              ) : (
                <View style={styles.exportCategoryRow}>
                  <Pressable
                    onPress={() => scrollCategory('left')}
                    disabled={!canScrollLeft}
                    style={[
                      styles.exportCategoryArrow,
                      styles.exportCategoryArrowLeft,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                      },
                      !canScrollLeft && styles.exportArrowHidden,
                    ]}
                  >
                    <AppIcon name="chevronLeft" size={18} color={colors.foreground} />
                  </Pressable>
                  <ScrollView
                    ref={categoryScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.exportCategoryScroll}
                    style={{ flex: 1 }}
                    onLayout={event =>
                      setCategoryContainerWidth(event.nativeEvent.layout.width)
                    }
                    onContentSizeChange={(width) => setCategoryContentWidth(width)}
                    onScroll={event =>
                      setCategoryScrollX(event.nativeEvent.contentOffset.x)
                    }
                    scrollEventThrottle={16}
                  >
                    {currentCategoryCards.map(card => {
                      const isActive = exportCategorySelection.includes(
                        card.categoryId,
                      );
                      return (
                        <Pressable
                          key={card.categoryId}
                          onPress={() => handleExportCategoryToggle(card.categoryId)}
                          style={[
                            styles.exportCategoryChip,
                            {
                              borderColor: isActive ? colors.primary : colors.border,
                              backgroundColor: isActive
                                ? colors.primary + '15'
                                : colors.card,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.exportCategoryIcon,
                              {
                                backgroundColor:
                                  (card.color || colors.primary) + '20',
                              },
                            ]}
                          >
                            <CategoryIcon
                              icon={card.icon}
                              library={card.library}
                              size={18}
                              color={card.color || colors.primary}
                            />
                          </View>
                          <View style={{ flexShrink: 1 }}>
                            <Text
                              style={[
                                styles.exportCategoryLabel,
                                { color: colors.foreground },
                              ]}
                              numberOfLines={2}
                            >
                              {card.name}
                            </Text>
                            <Text
                              style={[
                                styles.exportCategoryCount,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {card.count} item{card.count === 1 ? '' : 's'}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Pressable
                    onPress={() => scrollCategory('right')}
                    disabled={!canScrollRight}
                    style={[
                      styles.exportCategoryArrow,
                      styles.exportCategoryArrowRight,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                      },
                      !canScrollRight && styles.exportArrowHidden,
                    ]}
                  >
                    <AppIcon name="chevronRight" size={18} color={colors.foreground} />
                  </Pressable>
                </View>
              )}
            <Text
              style={[
                  styles.exportSectionTitle,
                  { color: colors.foreground, marginTop: 8 },
                ]}
              >
                Export style
              </Text>
              <View style={styles.exportStyleRow}>
                {[
                  {
                    mode: 'formal' as ShoppingListExportMode,
                    label: 'Machine',
                    hint: 'Organized table layout',
                  },
                  {
                    mode: 'raw' as ShoppingListExportMode,
                    label: 'Handwritten',
                    hint: 'Casual simple list',
                  },
                ].map(option => {
                  const isActive = exportMode === option.mode;
                  return (
                    <Pressable
                      key={option.mode}
                      onPress={() => setExportMode(option.mode)}
                      style={[
                        styles.exportStyleChip,
                        isActive && styles.exportStyleChipActive,
                        {
                          borderColor: isActive ? colors.primary : colors.border,
                          backgroundColor: isActive
                            ? colors.primary + '15'
                            : colors.card,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.exportStyleLabel,
                          isActive && { color: colors.primary },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.exportStyleHint,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {option.hint}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.exportFooter}>
              <Pressable
                onPress={() => setShowExportModal(false)}
                style={({ pressed }) => [
                  styles.exportActionBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmExport}
                disabled={isExportingPdf}
                style={({ pressed }) => [
                  styles.exportActionBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed || isExportingPdf ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.exportActionText, { color: '#fff' }]}>
                  {isExportingPdf ? 'Exporting…' : 'Export PDF'}
                </Text>
              </Pressable>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roundButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
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
  categorySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryCard: {
    flexBasis: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryCardCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  filterToggleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  memberFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberFilterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  memberFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    backgroundColor: '#f8fafc',
    marginRight: 8,
  },
  memberFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateFilterRow: {
    width: '100%',
    marginTop: 8,
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12,
  },
  memberHistoryFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  memberHistoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    backgroundColor: '#f8fafc',
    marginRight: 8,
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    maxHeight: '80%',
    padding: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 1000,
  },
  exportCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 14,
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  exportPillar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  exportTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  exportScroll: {
    maxHeight: 300,
  },
  exportContent: {
    paddingBottom: 12,
  },
  exportSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exportSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  exportSelectAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  exportSelectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportCategoryScroll: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 8,
  },
  exportCategoryChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    width: 170, // fixed width instead of min/max
    height: 70, // fixed height Instead of minHeight
    marginRight: 10,
    marginBottom: 10,
  },
  exportCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative', // for absolute arrow positioning
  },
  exportCategoryArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#fff',
    position: 'absolute',
    top: '50%',
    marginTop: -22, // adjust vertically relative to category height
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportCategoryArrowLeft: {
    left: 4,
  },
  exportCategoryArrowRight: {
    right: 4,
  },
  exportArrowHidden: {
    opacity: 0,
  },
  exportCategoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exportCategoryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  exportCategoryCount: {
    fontSize: 12,
    marginTop: 2,
  },
  exportStyleRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  exportStyleChip: {
    flex: 1,
    minWidth: 140,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  exportStyleChipActive: {
    borderWidth: 2,
  },
  exportStyleLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  exportStyleHint: {
    fontSize: 12,
    marginTop: 4,
  },
  exportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  exportActionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
  },
  exportActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export const ListsScreen = withDeferredScreen(ListsScreenContent, {
  title: 'Lists',
  subtitle: 'Loading grocery items...',
  layoutProps: { showNav: false, showAddButton: true },
});
