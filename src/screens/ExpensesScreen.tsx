import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppLayout } from '../components/layout';
import { theme } from '../theme';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import {
  Plus,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Lightbulb,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Edit2,
} from 'lucide-react-native';
import {
  AddExpenseModal,
  ExpenseData,
} from '../components/modals/AddExpenseModal';
import { EditBudgetsModal } from '../components/modals/EditBudgetsModal';
import { useSidebar } from '../contexts/SidebarContext';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  G,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { AppIcon } from '../components/ui/AppIcon';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useFinance, Transaction } from '../contexts/FinanceContext';
import { trackScreen } from '../services/analytics';
import { ScreenErrorView } from '../components/ui/ScreenErrorView';
import { useCountry } from '../contexts/CountryContext';
import { SyncService } from '../services/SyncService';
import { CategoryColorService } from '../services/CategoryColorService';
import { CATEGORY_COLOR_FALLBACK } from '../constants/categoryColors';
import { IconGlyph } from '../components/ui/IconGlyph';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const tabs = ['Overview', 'Breakdown', 'Insights'];

type DailyDataItem = { day: number; income: number; expenses: number };

type Category = {
  name: string;
  id: string;
  formattedAmount: string;
  numAmount: number;
  percent: number;
  icon: string;
  color: string;
  budget: number;
  formattedBudget: string | null;
};

const formatViewDate = (date: Date) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getMonth()]}, ${date.getFullYear()}`;
};

const AreaChart = ({
  dailyData,
  viewDate,
  onPrevMonth,
  onNextMonth,
}: {
  dailyData: DailyDataItem[];
  viewDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const height = 180;
  const width = SCREEN_WIDTH - 64;

  const maxDataVal = Math.max(
    ...dailyData.map(d => Math.max(d.income, d.expenses)),
  );
  const maxValue = maxDataVal > 0 ? maxDataVal * 1.2 : 1000;

  const getY = (val: number) => height - (val / maxValue) * height;
  const getX = (index: number) =>
    (index / (dailyData.length - 1)) * (width - 20) + 10;

  const createPath = (key: 'income' | 'expenses') => {
    if (dailyData.length === 0) return '';
    const points = dailyData.map((d, i) => `${getX(i)},${getY(d[key])}`);
    return `M${getX(0)},${height} L${points.join(' L')} L${getX(
      dailyData.length - 1,
    )},${height} Z`;
  };

  const createLinePath = (key: 'income' | 'expenses') => {
    if (dailyData.length === 0) return '';
    const points = dailyData.map((d, i) => `${getX(i)},${getY(d[key])}`);
    return `M${points.join(' L')}`;
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  const currentMonthLabel = formatViewDate(viewDate);

  return (
    <View style={{ marginTop: 8 }}>
      {/* Month Navigator & Legend at Top */}
      <View style={{ marginBottom: 16, gap: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={onPrevMonth}
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.muted,
                  borderRadius: radius.sm,
                  padding: 6,
                },
              ]}
            >
              <AppIcon name="chevronLeft" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.foreground,
                minWidth: 100,
                textAlign: 'center',
              }}
            >
              {currentMonthLabel}
            </Text>
            <TouchableOpacity
              onPress={onNextMonth}
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.muted,
                  borderRadius: radius.sm,
                  padding: 6,
                },
              ]}
            >
              <AppIcon
                name="chevronRight"
                size={18}
                color={colors.foreground}
              />
            </TouchableOpacity>
          </View>

          {/* Legend Tucked to Side */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: '#10b981', borderRadius: 2 },
                ]}
              />
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                Inc
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: '#ef4444', borderRadius: 2 },
                ]}
              />
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                Exp
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Svg height={height + 30} width={width}>
        <Defs>
          <LinearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#10b981" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#10b981" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ef4444" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#ef4444" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <Path
            key={i}
            d={`M0,${height * t} L${width},${height * t}`}
            stroke={colors.border}
            strokeDasharray="4,4"
            opacity={0.3}
          />
        ))}

        {dailyData.length > 0 && (
          <>
            <Path d={createPath('income')} fill="url(#incomeGradient)" />
            <Path d={createPath('expenses')} fill="url(#expenseGradient)" />

            <Path
              d={createLinePath('income')}
              stroke="#10b981"
              strokeWidth={2.5}
              fill="none"
            />
            <Path
              d={createLinePath('expenses')}
              stroke="#ef4444"
              strokeWidth={2.5}
              fill="none"
            />
          </>
        )}

        {/* X Axis Labels - Higher density (every 5 days) */}
        {(() => {
          if (dailyData.length === 0) return null;
          const labelDays = [];
          for (let d = 1; d <= dailyData.length; d += 6) {
            labelDays.push(d);
          }
          if (labelDays[labelDays.length - 1] < dailyData.length - 2) {
            labelDays.push(dailyData.length);
          }

          return labelDays.map((dayNum, i) => {
            const idx = dayNum - 1;
            const xPos = getX(idx);
            const isBoundary = dayNum === 1 || dayNum === dailyData.length;
            const labelText = `${dayNum}${
              isBoundary ? getOrdinalSuffix(dayNum) : ''
            }`;

            return (
              <SvgText
                key={i}
                x={xPos}
                y={height + 20}
                fontSize="9"
                fill={colors.mutedForeground}
                textAnchor="middle"
                fontWeight={isBoundary ? 'bold' : 'normal'}
              >
                {labelText}
              </SvgText>
            );
          });
        })()}
      </Svg>
    </View>
  );
};

const DonutChart = ({ categories }: { categories: Category[] }) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCountry();
  const size = Math.min(SCREEN_WIDTH - 48, 280);
  const chartRadius = size / 2;
  const strokeWidth = 48;
  const center = size / 2;
  const innerRadius = Math.max(chartRadius - strokeWidth, 32);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  let startAngle = 0;
  const total = categories.reduce((sum, cat) => sum + cat.numAmount, 0);

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <Text style={{ color: colors.mutedForeground }}>No expenses yet</Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', marginVertical: 16 }}>
      <Svg height={size} width={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {categories.map(cat => {
            const percentage = cat.numAmount / total;
            const angle = percentage * 360;

            if (angle <= 0) return null;

            // SVG arc doesn't handle 360 degrees in one go (start and end points are the same)
            // If it's 100%, render a simple Circle/Path that's a full ring
            if (percentage >= 0.999) {
              return (
                <Circle
                  key={cat.id}
                  cx={center}
                  cy={center}
                  r={(chartRadius + innerRadius) / 2}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth={strokeWidth}
                />
              );
            }

            const largeArcFlag = angle > 180 ? 1 : 0;

            const x1 =
              center + chartRadius * Math.cos((Math.PI * startAngle) / 180);
            const y1 =
              center + chartRadius * Math.sin((Math.PI * startAngle) / 180);
            const x2 =
              center +
              chartRadius * Math.cos((Math.PI * (startAngle + angle)) / 180);
            const y2 =
              center +
              chartRadius * Math.sin((Math.PI * (startAngle + angle)) / 180);

            const x3 =
              center +
              innerRadius * Math.cos((Math.PI * (startAngle + angle)) / 180);
            const y3 =
              center +
              innerRadius * Math.sin((Math.PI * (startAngle + angle)) / 180);
            const x4 =
              center + innerRadius * Math.cos((Math.PI * startAngle) / 180);
            const y4 =
              center + innerRadius * Math.sin((Math.PI * startAngle) / 180);

            const d = `
              M ${x1} ${y1}
              A ${chartRadius} ${chartRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
              L ${x3} ${y3}
              A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
              Z
            `;

            startAngle += angle;

            return (
              <Path
                key={cat.id}
                d={d}
                fill={cat.color}
                stroke={colors.card}
                strokeWidth={1}
                onPress={() => setActiveCategory(cat.name)}
              />
            );
          })}
        </G>
        <SvgText
          x={center}
          y={center - 10}
          fontSize="12"
          fill={colors.mutedForeground}
          textAnchor="middle"
          fontWeight="500"
        >
          Total
        </SvgText>
        <SvgText
          x={center}
          y={center + 15}
          fontSize="16"
          fill={colors.foreground}
          textAnchor="middle"
          fontWeight="bold"
        >
          {formatCurrency(total)}
        </SvgText>
      </Svg>
      {activeCategory && (
        <Text
          style={{
            marginTop: 8,
            color: colors.primary,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {activeCategory}
        </Text>
      )}
    </View>
  );
};

const HorizontalBarChart = ({ categories }: { categories: Category[] }) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const height = Math.max(categories.length * 40, 100);
  const maxVal = Math.max(...categories.map(c => c.numAmount)) || 1;

  if (categories.length === 0) {
    return (
      <View
        style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: colors.mutedForeground }}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={{ height, marginTop: 10 }}>
      {categories.map((cat, i) => (
        <View key={cat.id} style={styles.barChartRow}>
          <View style={{ width: 80 }}>
            <Text
              style={[styles.barLabel, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${(cat.numAmount / maxVal) * 100}%`,
                  backgroundColor: cat.color,
                  borderRadius: radius.xs,
                },
              ]}
            />
          </View>
          <Text style={[styles.barValue, { color: colors.mutedForeground }]}>
            {cat.formattedAmount}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const ExpensesScreen: React.FC = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const [activeTab, setActiveTab] = useState('Overview');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); // For month navigation in trend chart
  const { openSidebar } = useSidebar();

  useEffect(() => {
    void trackScreen('FinanceScreen');
  }, []);

  const {
    transactions,
    addTransaction,
    budgets,
    categoryColors,
    categoryIcons,
  } = useFinance();
  const { formatCurrency } = useCountry();
  const [screenError, setScreenError] = useState<string | null>(null);
  const handleScreenError = useCallback((context: string, error: unknown) => {
    console.error(`ExpensesScreen - ${context}`, error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Something went wrong';
    setScreenError(message);
  }, []);
  const resetScreenError = useCallback(() => setScreenError(null), []);

  const handlePullToRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await SyncService.sync(true);
    } catch (error) {
      console.error('Manual read-only sync failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  // --- Dynamic Data Calculation ---

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  const savings = Math.max(0, totalIncome - totalExpenses);
  const savingsPercent = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Spending by Category
  const categorySpending = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [transactions]);

  const categories = useMemo(() => {
    return Object.entries(categorySpending)
      .map(([name, amount]) => {
        const budgetValue = budgets[name] || 0;
        const normalizedKey = CategoryColorService.normalizeCategoryKey(name);
        const displayColor =
          categoryColors[normalizedKey] ?? CATEGORY_COLOR_FALLBACK;
        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          id: name,
          formattedAmount: formatCurrency(amount),
          numAmount: amount,
          percent:
            totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
          icon: categoryIcons[name] || '📦',
          color: displayColor,
          budget: budgetValue,
          formattedBudget: budgetValue > 0 ? formatCurrency(budgetValue) : null,
        };
      })
      .sort((a, b) => b.numAmount - a.numAmount);
  }, [
    categorySpending,
    totalExpenses,
    budgets,
    categoryIcons,
    categoryColors,
    formatCurrency,
  ]);

  // Daily Data for Area Chart (Current Month)
  const dailyData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const stats = [];
    for (let day = 1; day <= daysInMonth; day++) {
      // Filter transactions for this specific day
      const dayTransactions = transactions.filter(t => {
        if (!t.date) return false;

        let txYear, txMonth, txDay;
        if (t.date === 'Today') {
          const now = new Date();
          txYear = now.getFullYear();
          txMonth = now.getMonth();
          txDay = now.getDate();
        } else {
          const parts = t.date.split('-').map(Number);
          if (parts.length === 3) {
            txYear = parts[0];
            txMonth = parts[1] - 1;
            txDay = parts[2];
          } else {
            const dt = new Date(t.date);
            txYear = dt.getFullYear();
            txMonth = dt.getMonth();
            txDay = dt.getDate();
          }
        }
        return txYear === year && txMonth === month && txDay === day;
      });

      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      stats.push({ day, income, expenses });
    }

    return stats;
  }, [transactions, viewDate]);

  // AI Insights Generation
  const aiInsights = useMemo(() => {
    const insights = [];

    // Insight 1: Spending Trend
    if (totalExpenses > totalIncome) {
      insights.push({
        icon: '📉',
        text: 'You are spending more than you earn this month.',
        type: 'warning',
      });
    } else if (savingsPercent > 20) {
      insights.push({
        icon: '🎯',
        text: `Great job! You're converting ${savingsPercent.toFixed(
          0,
        )}% of income to savings.`,
        type: 'success',
      });
    }

    // Insight 2: Category Spike
    if (categories.length > 0) {
      const topCat = categories[0];
      insights.push({
        icon: '📊',
        text: `Your highest spending is in ${topCat.name} (${topCat.formattedAmount}).`,
        type: 'tip',
      });
    }

    // Insight 3: Income
    if (totalIncome > 0) {
      insights.push({
        icon: '📈',
        text: 'Income recorded. Keep tracking to maintain budget health.',
        type: 'success',
      });
    } else {
      insights.push({
        icon: '💡',
        text: 'Add your income to see your savings potential.',
        type: 'tip',
      });
    }

    return insights;
  }, [totalExpenses, totalIncome, savingsPercent, categories]);

  const handleAddExpense = (expense: ExpenseData) => {
    try {
      addTransaction({
        name: expense.name,
        amount: expense.amount,
        date: expense.date,
        icon: categoryIcons[expense.category] || '📦',
        type: expense.type,
        category: expense.category,
      });
    } catch (error) {
      handleScreenError('handleAddExpense', error);
    }
  };

  // --- Gesture Logic ---
  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = tabs.indexOf(activeTab);
    if (direction === 'left') {
      // Swiping Left -> Next Tab (Wrapped)
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex]);
    } else {
      // Swiping Right -> Prev Tab (Wrapped)
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[prevIndex]);
    }
  };

  const panGesture = Gesture.Pan()
    .failOffsetY([-20, 20]) // Strict vertical fail to allow scrolling
    .activeOffsetX([-30, 30]) // Lower threshold for horizontal activation
    .onEnd(e => {
      if (e.translationX < -30) runOnJS(handleSwipe)('left');
      else if (e.translationX > 30) runOnJS(handleSwipe)('right');
    });

  if (screenError) {
    return (
      <AppLayout showNav={false} showAddButton={false}>
        <ScreenErrorView
          message={screenError}
          onRetry={resetScreenError}
          actionLabel="Refresh"
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      showNav={false}
      showAddButton={true}
      onAddPress={() => setExpenseModalOpen(true)}
    >
      <GestureDetector gesture={panGesture}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { backgroundColor: colors.background },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handlePullToRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={openSidebar}
              style={[
                styles.iconButton,
                { backgroundColor: colors.card, borderRadius: radius.md },
              ]}
            >
              <AppIcon name="menu" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Family Finances
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Track income, expenses & budgets
              </Text>
            </View>
            {/* Removed top Add button, keeping only FAB */}
            <Pressable
              onPress={() => navigation.navigate('ExpensesHistory' as never)}
              style={[
                styles.historyBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.muted,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text
                style={[styles.historyBtnText, { color: colors.foreground }]}
              >
                History
              </Text>
            </Pressable>
          </View>

          {/* Tabs */}
          <View
            style={[
              styles.tabContainer,
              { backgroundColor: colors.muted, borderRadius: radius.md },
            ]}
          >
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  { borderRadius: radius.sm },
                  activeTab === tab && { backgroundColor: colors.card },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === tab
                          ? colors.foreground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Balance Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.primary,
                borderWidth: 0,
                borderRadius: radius.card,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Wallet size={24} color="rgba(255,255,255,0.6)" />
            </View>
            <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>

            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statBox,
                  {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: radius.md,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <ArrowDownLeft size={14} color="#6ee7b7" />
                  <Text style={styles.statLabel}> Income</Text>
                </View>
                <Text style={styles.statValue}>
                  {formatCurrency(totalIncome)}
                </Text>
              </View>
              <View
                style={[
                  styles.statBox,
                  {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: radius.md,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <ArrowUpRight size={14} color="#fca5a5" />
                  <Text style={styles.statLabel}> Expenses</Text>
                </View>
                <Text style={styles.statValue}>
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>
            </View>
          </View>

          {activeTab === 'Overview' && (
            <View>
              {/* Savings Goal */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.savingsContent}>
                  <View
                    style={[
                      styles.savingsIcon,
                      {
                        backgroundColor: colors.background,
                        borderRadius: radius.card,
                      },
                    ]}
                  >
                    <PiggyBank size={24} color={colors.success} />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text
                      style={[styles.cardTitle, { color: colors.foreground }]}
                    >
                      Monthly Savings
                    </Text>
                    <Text
                      style={[
                        styles.cardSubtitle,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {savingsPercent.toFixed(1)}% of income
                    </Text>
                  </View>
                  <Text style={[styles.amountText, { color: colors.success }]}>
                    {formatCurrency(savings)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: colors.muted, borderRadius: radius.xs },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(savingsPercent * 2, 100)}%`,
                        backgroundColor: colors.success,
                        borderRadius: radius.xs,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Monthly Trend Chart */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.chartHeader}>
                  <BarChart3 size={20} color={colors.primary} />
                  <Text
                    style={[styles.chartTitle, { color: colors.foreground }]}
                  >
                    Trend
                  </Text>
                </View>
                <AreaChart
                  dailyData={dailyData}
                  viewDate={viewDate}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                />
              </View>

              {/* Recent Transactions */}
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  Recent Transactions
                </Text>
              </View>

              <View>
                {transactions.slice(0, 5).map(tx => (
                  <View
                    key={tx.id}
                    style={[
                      styles.transactionCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: radius.card,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.transactionIconBg,
                        {
                          backgroundColor: colors.muted,
                          borderRadius: radius.md,
                        },
                      ]}
                    >
                      <IconGlyph
                        icon={tx.icon}
                        size={20}
                        color={colors.foreground}
                      />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <Text
                        style={[styles.txName, { color: colors.foreground }]}
                      >
                        {tx.name}
                      </Text>
                      <Text
                        style={[
                          styles.txDate,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {tx.date}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        tx.type === 'income'
                          ? { color: colors.success }
                          : { color: colors.danger },
                      ]}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </Text>
                  </View>
                ))}
                {transactions.length === 0 && (
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      textAlign: 'center',
                      marginVertical: 20,
                    }}
                  >
                    No transactions yet. Add one!
                  </Text>
                )}
              </View>
            </View>
          )}

          {activeTab === 'Breakdown' && (
            <View>
              {/* Pie Chart */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.chartHeader}>
                  <PieChartIcon size={20} color={colors.primary} />
                  <Text
                    style={[styles.chartTitle, { color: colors.foreground }]}
                  >
                    Spending Breakdown
                  </Text>
                </View>
                <DonutChart categories={categories} />

                {/* Legend List */}
                <View
                  style={{
                    marginTop: 24,
                    gap: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingTop: 16,
                  }}
                >
                  {categories.map(cat => (
                    <View
                      key={cat.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: cat.color + '20',
                            borderRadius: radius.sm,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconGlyph
                            icon={cat.icon}
                            size={18}
                            color={colors.foreground}
                          />
                        </View>
                        <View>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: colors.foreground,
                              }}
                            >
                              {cat.name}
                            </Text>
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                backgroundColor: cat.color,
                                borderRadius: 10,
                              }}
                            />
                          </View>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.mutedForeground,
                            }}
                          >
                            {cat.percent}% of total
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: colors.foreground,
                          }}
                        >
                          {cat.formattedAmount}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {categories.length === 0 && (
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        textAlign: 'center',
                      }}
                    >
                      No categorized expenses.
                    </Text>
                  )}
                </View>
              </View>

              {/* Budget vs Actual */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.chartHeader}>
                  <Target size={20} color={colors.primary} />
                  <Text
                    style={[styles.chartTitle, { color: colors.foreground }]}
                  >
                    Budget vs Actual
                  </Text>
                  <TouchableOpacity
                    onPress={() => setBudgetModalOpen(true)}
                    style={{ marginLeft: 'auto', padding: 4 }}
                  >
                    <Edit2 size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 16 }}>
                  {categories.map(cat => {
                    const percentUsed =
                      cat.budget > 0 ? (cat.numAmount / cat.budget) * 100 : 0;
                    const isOverBudget = percentUsed > 100;

                    return (
                      <View key={cat.id}>
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: 6,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
                            <IconGlyph
                              icon={cat.icon}
                              size={18}
                              color={cat.color}
                              style={{ marginRight: 8 }}
                            />
                            <Text
                              style={[
                                styles.catName,
                                { color: colors.foreground },
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'baseline',
                            }}
                          >
                            <Text
                              style={[
                                styles.catAmount,
                                isOverBudget && { color: colors.danger },
                                { color: colors.foreground },
                              ]}
                            >
                              {cat.formattedAmount}
                            </Text>
                            {cat.budget > 0 && (
                              <Text
                                style={[
                                  styles.catBudget,
                                  { color: colors.mutedForeground },
                                ]}
                              >
                                {' / '}
                                {cat.formattedBudget}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View
                          style={[
                            styles.progressBarBg,
                            {
                              backgroundColor: colors.muted,
                              borderRadius: radius.xs,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(percentUsed, 100)}%`,
                                backgroundColor: isOverBudget
                                  ? colors.danger
                                  : colors.primary,
                                borderRadius: radius.xs,
                              },
                            ]}
                          />
                        </View>
                        {isOverBudget && (
                          <Text
                            style={[
                              styles.overBudgetText,
                              { color: colors.danger },
                            ]}
                          >
                            ⚠️ Over budget by{' '}
                            {formatCurrency(
                              Math.max(cat.numAmount - cat.budget, 0),
                            )}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {activeTab === 'Insights' && (
            <View>
              {/* AI Insights */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.chartHeader}>
                  <Lightbulb size={20} color="#f59e0b" />
                  <Text
                    style={[styles.chartTitle, { color: colors.foreground }]}
                  >
                    AI Insights
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  {aiInsights.map((insight, i) => (
                    <View
                      key={i}
                      style={[
                        styles.insightCard,
                        { borderRadius: radius.md },
                        insight.type === 'warning'
                          ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } // Warning tint
                          : insight.type === 'success'
                          ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } // Success tint
                          : { backgroundColor: colors.muted },
                      ]}
                    >
                      <Text style={{ fontSize: 20 }}>{insight.icon}</Text>
                      <Text
                        style={[
                          styles.insightText,
                          { color: colors.foreground },
                        ]}
                      >
                        {insight.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Spending Bar Chart */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.chartHeader}>
                  <BarChart3 size={20} color={colors.primary} />
                  <Text
                    style={[styles.chartTitle, { color: colors.foreground }]}
                  >
                    Category Spending
                  </Text>
                </View>
                <HorizontalBarChart categories={categories} />
              </View>

              {/* Tips Card */}
              <View
                style={[
                  styles.card,
                  styles.tipsCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <Text style={[styles.tipsTitle, { color: colors.foreground }]}>
                  💡 Money Saving Tips
                </Text>
                <View style={{ gap: 10 }}>
                  {[
                    'Set up automatic transfers to savings on payday',
                    'Review subscriptions monthly and cancel unused ones',
                    'Use the 24-hour rule before making impulse purchases',
                    'Plan meals weekly to reduce food waste and dining out',
                  ].map((tip, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ color: colors.success }}>✓</Text>
                      <Text
                        style={[
                          styles.tipText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {tip}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Spacer for FAB */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </GestureDetector>

      <AddExpenseModal
        visible={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onAdd={handleAddExpense}
        budgets={budgets}
        currentSpending={categorySpending} // Now dynamic
        categoryColors={categoryColors}
      />

      <EditBudgetsModal
        visible={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
      />
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  historyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 110,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 12,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  savingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
  },
  legendText: {
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  transactionIconBg: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Breakdown
  catName: {
    fontSize: 14,
    fontWeight: '500',
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  catBudget: {
    fontSize: 12,
  },
  overBudgetText: {
    fontSize: 12,
    marginTop: 4,
  },
  // Insights
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
  },
  tipsCard: {
    marginTop: 0,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
  },

  barChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  barLabel: {
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  barValue: {
    fontSize: 12,
    width: 60,
    textAlign: 'right',
  },
});
