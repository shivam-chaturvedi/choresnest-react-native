import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppLayout } from '../components/layout';
import {
  useTheme,
  useThemeColors,
  useThemeRadius,
} from '../contexts/ThemeContext';
import { useFinance, Transaction } from '../contexts/FinanceContext';
import { DateTimePicker } from '../components/ui/SimpleDatePicker';
import { ChevronLeft, Pencil, Search, Trash2, X } from 'lucide-react-native';
import {
  formatMonthKey,
  formatMonthLabel,
  parseTransactionDate,
} from '../utils/financeDateUtils';
import { useCountry } from '../contexts/CountryContext';
import { IconGlyph } from '../components/ui/IconGlyph';
import {
  AddExpenseModal,
  ExpenseData,
} from '../components/modals/AddExpenseModal';
import { CATEGORY_COLOR_FALLBACK } from '../constants/categoryColors';
import {
  filterHistoryTransactions,
  formatCategoryLabel,
  getKnownCategoryLabels,
  HistoryPeriodFilter,
  normalizeCategoryKey,
  summarizeHistoryTransactions,
} from '../utils/transactionHistoryFilters';

const getWeekStartIso = (): string => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const y = start.getFullYear();
  const m = `${start.getMonth() + 1}`.padStart(2, '0');
  const d = `${start.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatWeekRangeLabel = (startIso: string): string => {
  const [y, m, d] = startIso.split('-').map(Number);
  const startDate = new Date(y, m - 1, d);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString(
    'en-US',
    opts,
  )} - ${endDate.toLocaleDateString('en-US', opts)}`;
};

type DatedTx = Transaction & { dateObj: Date };

export const ExpensesHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { appearanceMode } = useTheme();
  const isLightAppearance =
    appearanceMode === 'light' || appearanceMode === 'cream';
  const {
    transactions,
    updateTransaction,
    deleteTransaction,
    budgets,
    categoryColors,
    categoryIcons,
  } = useFinance();
  const { formatCurrency } = useCountry();
  const searchInputRef = useRef<TextInput>(null);

  const [historyFilter, setHistoryFilter] =
    useState<HistoryPeriodFilter>('month');
  const [historyMonth, setHistoryMonth] = useState(formatMonthKey(new Date()));
  const [historyWeekStart, setHistoryWeekStart] = useState(getWeekStartIso());
  const [historyYear, setHistoryYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [historyCustomStart, setHistoryCustomStart] = useState('');
  const [historyCustomEnd, setHistoryCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const monthOptions = useMemo(() => {
    const unique = new Set<string>();
    transactions.forEach(tx => {
      const date = parseTransactionDate(tx);
      if (date) unique.add(formatMonthKey(date));
    });
    unique.add(formatMonthKey(new Date()));
    return Array.from(unique)
      .sort((a, b) => b.localeCompare(a))
      .map(value => ({ value, label: formatMonthLabel(value) }));
  }, [transactions]);

  useEffect(() => {
    if (!historyMonth && monthOptions.length > 0) {
      setHistoryMonth(monthOptions[0].value);
    }
  }, [historyMonth, monthOptions]);

  const yearOptions = useMemo(() => {
    const uniqueYears = new Set<string>();
    transactions.forEach(tx => {
      const date = parseTransactionDate(tx);
      if (date) uniqueYears.add(String(date.getFullYear()));
    });
    uniqueYears.add(String(new Date().getFullYear()));
    return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  const availableCategories = useMemo(() => {
    const used = new Map<string, number>();
    transactions.forEach(tx => {
      const key = normalizeCategoryKey(tx.category || 'other');
      used.set(key, (used.get(key) || 0) + 1);
    });

    const known = getKnownCategoryLabels();
    const keys = new Set<string>([...Object.keys(known), ...used.keys()]);

    return Array.from(keys)
      .map(id => ({
        id,
        label: formatCategoryLabel(id),
        color: categoryColors[id] ?? CATEGORY_COLOR_FALLBACK,
        icon: categoryIcons[id] || '📦',
        count: used.get(id) || 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      });
  }, [transactions, categoryColors, categoryIcons]);

  const filteredTransactions = useMemo(
    () =>
      filterHistoryTransactions(transactions, {
        period: historyFilter,
        monthKey: historyMonth || formatMonthKey(new Date()),
        weekStartIso: historyWeekStart,
        year: historyYear,
        customStart: historyCustomStart,
        customEnd: historyCustomEnd,
        searchQuery,
        selectedCategories,
      }) as DatedTx[],
    [
      transactions,
      historyFilter,
      historyMonth,
      historyWeekStart,
      historyYear,
      historyCustomStart,
      historyCustomEnd,
      searchQuery,
      selectedCategories,
    ],
  );

  const summary = useMemo(
    () => summarizeHistoryTransactions(filteredTransactions),
    [filteredTransactions],
  );

  const hasCategoryFilter = selectedCategories.length > 0;
  const hasSearchQuery = searchQuery.length > 0;

  const weekPickerOpener = useRef<(() => void) | undefined>(undefined);
  const registerWeekPickerOpener = useCallback((openFn: () => void) => {
    weekPickerOpener.current = openFn;
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    const key = normalizeCategoryKey(categoryId);
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key],
    );
  }, []);

  const clearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const onSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const categorySpending = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [transactions]);

  const handleEditTransaction = useCallback((item: Transaction) => {
    setEditingTransaction(item);
    setExpenseModalOpen(true);
  }, []);

  const handleDeleteTransaction = useCallback(
    (item: Transaction) => {
      Alert.alert(
        'Delete Transaction',
        `Delete "${item.name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteTransaction(item.id);
              setEditingTransaction(prev =>
                prev?.id === item.id ? null : prev,
              );
              setExpenseModalOpen(open =>
                editingTransaction?.id === item.id ? false : open,
              );
            },
          },
        ],
      );
    },
    [deleteTransaction, editingTransaction?.id],
  );

  const handleUpdateExpense = useCallback(
    (id: string, expense: ExpenseData) => {
      updateTransaction(id, {
        name: expense.name,
        amount: expense.amount,
        date: expense.date,
        icon: categoryIcons[expense.category] || '📦',
        type: expense.type,
        category: expense.category,
      });
      setEditingTransaction(null);
      setExpenseModalOpen(false);
    },
    [updateTransaction, categoryIcons],
  );

  const renderFilterControls = () => {
    const weekRangeLabel = formatWeekRangeLabel(historyWeekStart);
    const normalizedYearOptions = yearOptions.length
      ? yearOptions
      : [new Date().getFullYear().toString()];

    return (
      <View style={styles.filterSection}>
        <View style={styles.filterTabs}>
          {(['month', 'week', 'year', 'custom'] as HistoryPeriodFilter[]).map(
            filter => (
              <Pressable
                key={filter}
                onPress={() => setHistoryFilter(filter)}
                style={[
                  styles.filterTab,
                  { borderColor: colors.border },
                  historyFilter === filter && {
                    borderColor: colors.primary,
                    backgroundColor: colors.success + '15',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    {
                      color:
                        historyFilter === filter
                          ? colors.success
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {filter.toUpperCase()}
                </Text>
              </Pressable>
            ),
          )}
        </View>
        <View style={styles.filterControls}>
          {historyFilter === 'month' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthScroll}
              keyboardShouldPersistTaps="always"
            >
              {(monthOptions.length
                ? monthOptions
                : [
                    {
                      value: formatMonthKey(new Date()),
                      label: formatMonthLabel(formatMonthKey(new Date())),
                    },
                  ]
              ).map(monthValue => (
                <Pressable
                  key={monthValue.value}
                  onPress={() => setHistoryMonth(monthValue.value)}
                  style={[
                    styles.monthOption,
                    { borderColor: colors.border },
                    historyMonth === monthValue.value && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '20',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        historyMonth === monthValue.value
                          ? isLightAppearance
                            ? '#0f172a'
                            : colors.primaryForeground
                          : isLightAppearance
                          ? '#0f172a'
                          : colors.foreground,
                    }}
                  >
                    {monthValue.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {historyFilter === 'week' && (
            <View style={styles.weekSelector}>
              <Text
                style={[styles.weekLabel, { color: colors.mutedForeground }]}
              >
                Week range
              </Text>
              <View style={styles.weekPickerRow}>
                <DateTimePicker
                  value={historyWeekStart}
                  onChange={setHistoryWeekStart}
                  placeholder="Select week start"
                  buttonStyle={styles.weekPickerButton}
                  textStyle={styles.weekPickerText}
                  onOpenRequested={registerWeekPickerOpener}
                />
                <Pressable
                  style={styles.weekRangeContainer}
                  onPress={() => weekPickerOpener.current?.()}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text
                    style={[styles.weekRangeText, { color: colors.foreground }]}
                  >
                    {weekRangeLabel}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          {historyFilter === 'year' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearScroll}
              keyboardShouldPersistTaps="always"
            >
              {normalizedYearOptions.map(yearValue => (
                <Pressable
                  key={yearValue}
                  onPress={() => setHistoryYear(yearValue)}
                  style={[
                    styles.monthOption,
                    { borderColor: colors.border },
                    historyYear === yearValue && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '20',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        historyYear === yearValue
                          ? isLightAppearance
                            ? '#0f172a'
                            : colors.primaryForeground
                          : isLightAppearance
                          ? '#0f172a'
                          : colors.foreground,
                    }}
                  >
                    {yearValue}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {historyFilter === 'custom' && (
            <View style={styles.customRangeRow}>
              <View style={styles.dateField}>
                <Text
                  style={[
                    styles.dateFieldLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Start
                </Text>
                <DateTimePicker
                  value={historyCustomStart}
                  onChange={setHistoryCustomStart}
                  placeholder="Start date"
                  buttonStyle={styles.customDateButton}
                  textStyle={styles.customDateText}
                />
              </View>
              <View style={styles.dateField}>
                <Text
                  style={[
                    styles.dateFieldLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  End
                </Text>
                <DateTimePicker
                  value={historyCustomEnd}
                  onChange={setHistoryCustomEnd}
                  placeholder="End date"
                  buttonStyle={styles.customDateButton}
                  textStyle={styles.customDateText}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {renderFilterControls()}
      <View style={styles.summarySection}>
        <View
          style={[
            styles.summaryCardFull,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text
            style={[styles.summaryLabel, { color: colors.mutedForeground }]}
          >
            Transactions
          </Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>
            {summary.count}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.success }]}>
              Income
            </Text>
            <Text
              style={[styles.summaryValue, { color: colors.success }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(summary.income)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.danger }]}>
              Expenses
            </Text>
            <Text
              style={[styles.summaryValue, { color: colors.danger }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(summary.expense)}
            </Text>
          </View>
        </View>
      </View>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.foreground, marginBottom: 8 },
        ]}
      >
        Showing {summary.count} transaction{summary.count === 1 ? '' : 's'}
      </Text>
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: DatedTx }) => (
      <View
        style={[
          styles.txRow,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            borderRadius: radius.md,
          },
        ]}
      >
        <View style={[styles.txIcon, { backgroundColor: colors.muted }]}>
          <IconGlyph icon={item.icon} size={18} color={colors.foreground} />
        </View>
        <View style={styles.txDetails}>
          <Text
            style={[styles.txTitle, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.txMeta, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {formatCategoryLabel(item.category)} •{' '}
            {item.dateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <Text
            style={[
              styles.txAmountInline,
              item.type === 'income'
                ? { color: colors.success }
                : { color: colors.danger },
            ]}
          >
            {item.type === 'income' ? '+' : '-'}
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View style={styles.txActions}>
          <Pressable
            onPress={() => handleEditTransaction(item)}
            style={[styles.txActionBtn, { backgroundColor: colors.muted }]}
            hitSlop={8}
          >
            <Pencil size={14} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => handleDeleteTransaction(item)}
            style={[
              styles.txActionBtn,
              { backgroundColor: colors.danger + '20' },
            ]}
            hitSlop={8}
          >
            <Trash2 size={14} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    ),
    [
      colors,
      radius.md,
      formatCurrency,
      handleEditTransaction,
      handleDeleteTransaction,
    ],
  );

  return (
    <AppLayout showNav={false} showAddButton={false} disableScroll>
      <View
        style={[styles.screenContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.stickyChrome}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={colors.foreground} />
            </Pressable>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>
                Transaction History
              </Text>
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                Type to search · tap categories to filter
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search by name, category, amount..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={onSearchChange}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              blurOnSubmit={false}
              importantForAutofill="no"
            />
            {hasSearchQuery ? (
              <Pressable
                onPress={clearSearch}
                hitSlop={10}
                style={styles.clearSearchBtn}
              >
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>

          <Text
            style={[styles.categoryBarLabel, { color: colors.mutedForeground }]}
          >
            Categories
            {hasCategoryFilter
              ? ` · ${selectedCategories.length} selected`
              : ''}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipRow}
            keyboardShouldPersistTaps="always"
          >
            <Pressable
              onPress={clearCategories}
              style={[
                styles.categoryChip,
                {
                  borderColor: !hasCategoryFilter
                    ? colors.primary
                    : colors.border,
                  backgroundColor: !hasCategoryFilter
                    ? colors.primary + '20'
                    : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: !hasCategoryFilter
                      ? colors.primary
                      : colors.foreground,
                  },
                ]}
              >
                All
              </Text>
            </Pressable>

            {availableCategories.map(cat => {
              const selected = selectedCategories.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: selected ? cat.color : colors.border,
                      backgroundColor: selected
                        ? cat.color + '22'
                        : colors.card,
                    },
                  ]}
                >
                  <IconGlyph
                    icon={cat.icon}
                    size={14}
                    color={colors.foreground}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: colors.foreground },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}

            {hasCategoryFilter ? (
              <Pressable
                onPress={clearCategories}
                style={styles.clearCategoriesChip}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  Clear
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>

        <FlatList
          style={styles.list}
          data={filteredTransactions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                {hasSearchQuery || hasCategoryFilter
                  ? 'No transactions match your search or categories.'
                  : 'No transactions match the selected period.'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          removeClippedSubviews={false}
          initialNumToRender={12}
          windowSize={7}
          maxToRenderPerBatch={12}
        />
      </View>
      <AddExpenseModal
        visible={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingTransaction(null);
        }}
        onAdd={() => {}}
        onUpdate={handleUpdateExpense}
        transactionToEdit={editingTransaction}
        budgets={budgets}
        currentSpending={categorySpending}
        categoryColors={categoryColors}
      />
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stickyChrome: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    zIndex: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
    paddingTop: 4,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  clearSearchBtn: {
    padding: 4,
  },
  categoryBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  categoryChipRow: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 8,
    paddingBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearCategoriesChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterControls: {
    gap: 12,
  },
  monthScroll: {
    gap: 8,
  },
  monthOption: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  weekSelector: {
    gap: 6,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  weekPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weekPickerButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 34,
    justifyContent: 'center',
    maxHeight: 38,
  },
  weekPickerText: {
    fontWeight: '600',
    fontSize: 13,
  },
  weekRangeContainer: {
    flex: 1,
  },
  weekRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  yearScroll: {
    gap: 8,
  },
  summarySection: {
    gap: 10,
    marginBottom: 12,
  },
  summaryCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  customRangeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  customDateButton: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  customDateText: {
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  txTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  txMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmountInline: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  txActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
