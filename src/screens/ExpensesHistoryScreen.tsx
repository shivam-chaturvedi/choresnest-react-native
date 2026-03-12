import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppLayout } from '../components/layout';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { useFinance, Transaction } from '../contexts/FinanceContext';
import { DateTimePicker } from '../components/ui/SimpleDatePicker';
import { ChevronLeft } from 'lucide-react-native';
import { formatMonthKey, formatMonthLabel, parseTransactionDate, toDate } from '../utils/financeDateUtils';
import { useCountry } from '../contexts/CountryContext';
import { IconGlyph } from '../components/ui/IconGlyph';

type HistoryFilter = 'month' | 'week' | 'year' | 'custom';

const getWeekStartIso = (): string => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return start.toISOString().split('T')[0];
};

type TransactionWithDate = Transaction & { dateObj: Date };

const formatWeekRangeLabel = (start: string): string => {
  const startDate = toDate(start) || new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', formatOptions)} - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
};

export const ExpensesHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { transactions } = useFinance();
  const { formatCurrency } = useCountry();

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('month');
  const [historyMonth, setHistoryMonth] = useState(formatMonthKey(new Date()));
  const [historyWeekStart, setHistoryWeekStart] = useState(getWeekStartIso());
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear().toString());
  const [historyCustomStart, setHistoryCustomStart] = useState('');
  const [historyCustomEnd, setHistoryCustomEnd] = useState('');

  const monthOptions = useMemo(() => {
    const unique = new Set<string>();
    transactions.forEach(tx => {
      const date = parseTransactionDate(tx);
      if (date) {
        unique.add(formatMonthKey(date));
      }
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

  const transactionsWithDate = useMemo(() => {
    return transactions
      .map(tx => {
        const parsed = parseTransactionDate(tx);
        if (!parsed) return null;
        return { ...tx, dateObj: parsed };
      })
      .filter((tx): tx is TransactionWithDate => Boolean(tx));
  }, [transactions]);

  const yearOptions = useMemo(() => {
    const uniqueYears = new Set<string>();
    transactionsWithDate.forEach(tx => {
      uniqueYears.add(tx.dateObj.getFullYear().toString());
    });
    uniqueYears.add(new Date().getFullYear().toString());
    return Array.from(uniqueYears)
      .sort((a, b) => Number(b) - Number(a));
  }, [transactionsWithDate]);

  const filteredTransactions = useMemo(() => {
    const monthKey = historyMonth || formatMonthKey(new Date());
    return transactionsWithDate
      .filter(tx => {
        const txDate = tx.dateObj;
        switch (historyFilter) {
          case 'month': {
            const [year, month] = monthKey.split('-').map(Number);
            return txDate.getFullYear() === year && txDate.getMonth() + 1 === month;
          }
          case 'week': {
            const start = toDate(historyWeekStart);
            if (!start) return true;
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            return txDate >= start && txDate <= end;
          }
          case 'year': {
            const yearDate = toDate(historyYear);
            if (!yearDate) return true;
            return txDate.getFullYear() === yearDate.getFullYear();
          }
          case 'custom': {
            const start = toDate(historyCustomStart);
            const end = toDate(historyCustomEnd);
            if (start && end) {
              const endInclusive = new Date(end);
              endInclusive.setHours(23, 59, 59, 999);
              return txDate >= start && txDate <= endInclusive;
            }
            if (start) {
              return txDate >= start;
            }
            if (end) {
              const endInclusive = new Date(end);
              endInclusive.setHours(23, 59, 59, 999);
              return txDate <= endInclusive;
            }
            return true;
          }
          default:
            return true;
        }
      })
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [transactionsWithDate, historyFilter, historyMonth, historyWeekStart, historyYear, historyCustomStart, historyCustomEnd]);

  const summary = useMemo(() => {
    const totals = { income: 0, expense: 0 };
    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') {
        totals.income += tx.amount;
      } else {
        totals.expense += tx.amount;
      }
    });
    return {
      count: filteredTransactions.length,
      income: totals.income,
      expense: totals.expense,
    };
  }, [filteredTransactions]);

  const weekPickerOpener = useRef<() => void>();
  const registerWeekPickerOpener = useCallback((openFn: () => void) => {
    weekPickerOpener.current = openFn;
  }, []);

  const renderFilterControls = () => {
    const weekRangeLabel = formatWeekRangeLabel(historyWeekStart);
    const normalizedYearOptions = yearOptions.length ? yearOptions : [new Date().getFullYear().toString()];

    return (
      <View style={styles.filterSection}>
        <View style={styles.filterTabs}>
          {(['month', 'week', 'year', 'custom'] as HistoryFilter[]).map(filter => (
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
              <Text style={[
                styles.filterTabText,
                { color: historyFilter === filter ? colors.success : colors.mutedForeground }
              ]}>
                {filter.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterControls}>
          {historyFilter === 'month' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.monthScroll}
            >
                {(monthOptions.length ? monthOptions : [{ value: formatMonthKey(new Date()), label: formatMonthLabel(formatMonthKey(new Date())) }]).map(monthValue => (
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
                    <Text style={{ color: historyMonth === monthValue.value ? colors.primaryForeground : colors.foreground }}>
                      {monthValue.label}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
          )}
          {historyFilter === 'week' && (
            <View style={styles.weekSelector}>
              <Text style={[styles.weekLabel, { color: colors.mutedForeground }]}>Week range</Text>
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
                  <Text style={[styles.weekRangeText, { color: colors.foreground }]}>{weekRangeLabel}</Text>
                  <Text style={[styles.weekRangeHint, { color: colors.mutedForeground }]}>Aligned to the selected start date</Text>
                </Pressable>
              </View>
            </View>
          )}
          {historyFilter === 'year' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.yearScroll}
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
                    <Text style={{ color: historyYear === yearValue ? colors.primaryForeground : colors.foreground }}>
                      {yearValue}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
          )}
          {historyFilter === 'custom' && (
            <View style={styles.customRangeRow}>
              <View style={styles.dateField}>
                <Text style={[styles.dateFieldLabel, { color: colors.mutedForeground }]}>Start date & time</Text>
                <DateTimePicker
                  value={historyCustomStart}
                  onChange={setHistoryCustomStart}
                  placeholder="Start date"
                  buttonStyle={styles.customDateButton}
                  textStyle={styles.customDateText}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={[styles.dateFieldLabel, { color: colors.mutedForeground }]}>End date & time</Text>
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

  const renderItem = ({ item }: { item: TransactionWithDate }) => (
    <View style={[styles.txRow, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.md }]}>
      <View style={[styles.txIcon, { backgroundColor: colors.muted }]}>
        <IconGlyph icon={item.icon} size={18} color={colors.foreground} />
      </View>
      <View style={styles.txDetails}>
        <Text style={[styles.txTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>
          {item.category} • {item.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
      <Text style={[
        styles.txAmount,
        item.type === 'income' ? { color: colors.success } : { color: colors.danger }
      ]}>
        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </View>
  );

  const renderListHeader = () => (
    <>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <View>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Transaction History</Text>
          <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>Review every entry and filter by period.</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      {renderFilterControls()}
      <View style={styles.summarySection}>
        {/* Transactions card - full width at top */}
        <View style={[styles.summaryCardFull, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Transactions</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{summary.count}</Text>
        </View>
        {/* Income and Expenses - 50/50 row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.summaryLabel, { color: colors.success }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(summary.income)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.summaryLabel, { color: colors.danger }]}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(summary.expense)}</Text>
          </View>
        </View>
      </View>
      <View style={{ marginBottom: 8 }}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Showing {summary.count} transactions
        </Text>
      </View>
    </>
  );

  const emptyComponent = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        No transactions match the selected period.
      </Text>
    </View>
  );

  return (
    <AppLayout showNav={false} showAddButton={false} disableScroll>
      <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
        <FlatList
          data={filteredTransactions}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={emptyComponent}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 40,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  weekRangeHint: {
    fontSize: 11,
    marginTop: 2,
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
  },
  txTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  txMeta: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
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
