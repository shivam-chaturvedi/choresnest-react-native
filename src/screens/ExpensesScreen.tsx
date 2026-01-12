import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { AppLayout } from '../components/layout/AppLayout';
import { theme } from '../theme';
import {
  Plus,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Lightbulb,
  ChevronRight,
  Menu,
  Target,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { AddExpenseModal, ExpenseData } from '../components/modals/AddExpenseModal';
import { useSidebar } from '../contexts/SidebarContext';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { AppIcon } from '../components/ui/AppIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const tabs = ['Overview', 'Breakdown', 'Insights'];

const initialTransactions = [
  { id: 1, name: 'Grocery Store', amount: 1250, date: 'Today', icon: '🛒', type: 'expense', category: 'groceries' },
  { id: 2, name: 'Salary Credit', amount: 85000, date: 'Jan 1', icon: '💼', type: 'income', category: 'salary' },
  { id: 3, name: 'Electricity Bill', amount: 2400, date: 'Jan 5', icon: '⚡', type: 'expense', category: 'utilities' },
  { id: 4, name: 'Freelance Project', amount: 15000, date: 'Jan 8', icon: '💻', type: 'income', category: 'freelance' },
  { id: 5, name: 'Restaurant', amount: 850, date: 'Jan 10', icon: '🍽️', type: 'expense', category: 'food' },
  { id: 6, name: 'Uber Ride', amount: 450, date: 'Jan 12', icon: '🚗', type: 'expense', category: 'transport' },
  { id: 7, name: 'Netflix', amount: 199, date: 'Jan 15', icon: '🎬', type: 'expense', category: 'entertainment' },
];

const budgets: Record<string, number> = {
  groceries: 10000,
  utilities: 5000,
  transport: 6000,
  food: 8000,
  shopping: 5000,
  healthcare: 3000,
  entertainment: 2000,
  education: 5000,
};

const monthlyData = [
  { month: 'Aug', income: 75000, expenses: 42000 },
  { month: 'Sep', income: 80000, expenses: 38000 },
  { month: 'Oct', income: 78000, expenses: 45000 },
  { month: 'Nov', income: 85000, expenses: 41000 },
  { month: 'Dec', income: 92000, expenses: 52000 },
  { month: 'Jan', income: 100000, expenses: 39770 },
];

const categoryColors: Record<string, string> = {
  groceries: '#10b981',
  utilities: '#f59e0b',
  transport: '#3b82f6',
  food: '#f97316',
  shopping: '#ec4899',
  healthcare: '#ef4444',
  entertainment: '#8b5cf6',
  education: '#6366f1',
  other: '#6b7280',
};

const categoryIcons: Record<string, string> = {
  groceries: '🛒',
  utilities: '⚡',
  transport: '🚗',
  food: '🍽️',
  shopping: '🛍️',
  healthcare: '🏥',
  entertainment: '🎬',
  education: '📚',
  salary: '💼',
  freelance: '💻',
};

const aiInsights = [
  { icon: '📊', text: 'You overspent on groceries by 15% this month', type: 'warning' },
  { icon: '💡', text: 'Switch to LED bulbs to save ₹500/month', type: 'tip' },
  { icon: '🎯', text: "Great job! You're on track to save ₹15k this month", type: 'success' },
  { icon: '📈', text: 'Your income increased 17% compared to last month', type: 'success' },
];

export const ExpensesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [transactions, setTransactions] = useState(initialTransactions);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const { openSidebar } = useSidebar();

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  const savings = totalIncome - totalExpenses;
  const savingsPercent = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Calculate spending by category
  const categorySpending = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const categories = Object.entries(categorySpending).map(([name, amount]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    id: name,
    amount: `₹${amount.toLocaleString()}`,
    numAmount: amount,
    percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    icon: categoryIcons[name] || '📦',
    color: categoryColors[name] || categoryColors.other,
    budget: budgets[name] || 0,
  })).sort((a, b) => b.numAmount - a.numAmount);

  const handleAddExpense = (expense: ExpenseData) => {
    const newTransaction = {
      id: Date.now(),
      name: expense.name,
      amount: expense.amount,
      date: expense.date === new Date().toISOString().split('T')[0] ? 'Today' : expense.date,
      icon: categoryIcons[expense.category] || '📦',
      type: expense.type,
      category: expense.category,
    };
    // @ts-ignore
    setTransactions(prev => [newTransaction, ...prev]);
  };

  // --- Chart Components ---

  const AreaChart = () => {
    const height = 180;
    const width = SCREEN_WIDTH - 64; // padding accounting
    const maxValue = 120000; // max Y value

    const getY = (val: number) => height - (val / maxValue) * height;
    const getX = (index: number) => (index / (monthlyData.length - 1)) * width;

    const createPath = (key: 'income' | 'expenses') => {
      const points = monthlyData.map((d, i) => `${getX(i)},${getY(d[key])}`);
      return `M0,${height} L${points.join(' L')} L${width},${height} Z`; // Close path for area
    };

    const createLinePath = (key: 'income' | 'expenses') => {
      const points = monthlyData.map((d, i) => `${getX(i)},${getY(d[key])}`);
      return `M${points.join(' L')}`;
    };

    return (
      <View style={{ height: 220, marginTop: 16 }}>
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
          {[0.25, 0.5, 0.75, 1].map((t, i) => (
            <Path
              key={i}
              d={`M0,${height * t} L${width},${height * t}`}
              stroke={theme.colors.border}
              strokeDasharray="4,4"
            />
          ))}

          <Path d={createPath('income')} fill="url(#incomeGradient)" />
          <Path d={createPath('expenses')} fill="url(#expenseGradient)" />

          <Path d={createLinePath('income')} stroke="#10b981" strokeWidth={2} fill="none" />
          <Path d={createLinePath('expenses')} stroke="#ef4444" strokeWidth={2} fill="none" />

          {/* X Axis Labels */}
          {monthlyData.map((d, i) => (
            <SvgText
              key={i}
              x={getX(i)}
              y={height + 20}
              fontSize="10"
              fill={theme.colors.mutedForeground}
              textAnchor="middle"
            >
              {d.month}
            </SvgText>
          ))}
        </Svg>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={[styles.legendText, { color: theme.colors.mutedForeground }]}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.legendText, { color: theme.colors.mutedForeground }]}>Expenses</Text>
          </View>
        </View>
      </View>
    );
  };

  const DonutChart = () => {
    const size = 180;
    const radius = size / 2;
    const strokeWidth = 35;
    const center = size / 2;
    const innerRadius = radius - strokeWidth;

    let startAngle = 0;
    const total = categories.reduce((sum, cat) => sum + cat.numAmount, 0);

    return (
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <Svg height={size} width={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {categories.map((cat, index) => {
              const percentage = cat.numAmount / total;
              const angle = percentage * 360;

              // Standard SVG Arc calculation
              const x1 = center + innerRadius * Math.cos(Math.PI * startAngle / 180);
              const y1 = center + innerRadius * Math.sin(Math.PI * startAngle / 180);
              const x2 = center + radius * Math.cos(Math.PI * startAngle / 180);
              const y2 = center + radius * Math.sin(Math.PI * startAngle / 180);
              const x3 = center + radius * Math.cos(Math.PI * (startAngle + angle) / 180);
              const y3 = center + radius * Math.sin(Math.PI * (startAngle + angle) / 180);
              const x4 = center + innerRadius * Math.cos(Math.PI * (startAngle + angle) / 180);
              const y4 = center + innerRadius * Math.sin(Math.PI * (startAngle + angle) / 180);

              const d = `
                                M ${x1} ${y1}
                                L ${x2} ${y2}
                                A ${radius} ${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x3} ${y3}
                                L ${x4} ${y4}
                                A ${innerRadius} ${innerRadius} 0 ${angle > 180 ? 1 : 0} 0 ${x1} ${y1}
                                Z
                             `;

              startAngle += angle;

              return (
                <Path
                  key={cat.id}
                  d={d}
                  fill={cat.color}
                  stroke={theme.colors.card}
                  strokeWidth={2}
                />
              );
            })}
          </G>
        </Svg>
      </View>
    );
  };

  const HorizontalBarChart = () => {
    const height = categories.length * 40;
    const width = SCREEN_WIDTH - 64; // Adjusted to match other charts
    const maxVal = Math.max(...categories.map(c => c.numAmount)) || 1;

    return (
      <View style={{ height, marginTop: 10 }}>
        {categories.map((cat, i) => (
          <View key={cat.id} style={styles.barChartRow}>
            <View style={{ width: 80 }}>
              <Text style={[styles.barLabel, { color: theme.colors.foreground }]} numberOfLines={1}>{cat.name}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(cat.numAmount / maxVal) * 100}%`,
                    backgroundColor: cat.color
                  }
                ]}
              />
            </View>
            <Text style={[styles.barValue, { color: theme.colors.mutedForeground }]}>{cat.amount}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <AppLayout showNav={false}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: theme.colors.card }]}>
            <AppIcon name="chevronLeft" size={24} color={theme.colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>Family Finances</Text>
            <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>Track income, expenses & budgets</Text>
          </View>
          <TouchableOpacity onPress={() => setExpenseModalOpen(true)} style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
            <Plus size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: theme.colors.muted }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabButton,
                activeTab === tab && { backgroundColor: theme.colors.card }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? theme.colors.foreground : theme.colors.mutedForeground }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Balance Card - Dynamic Theme Primary */}
        <View style={[styles.card, { backgroundColor: theme.colors.primary, borderWidth: 0 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Wallet size={24} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={styles.balanceAmount}>₹{balance.toLocaleString()}</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <ArrowDownLeft size={14} color="#6ee7b7" />
                <Text style={styles.statLabel}> Income</Text>
              </View>
              <Text style={styles.statValue}>₹{totalIncome.toLocaleString()}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <ArrowUpRight size={14} color="#fca5a5" />
                <Text style={styles.statLabel}> Expenses</Text>
              </View>
              <Text style={styles.statValue}>₹{totalExpenses.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {activeTab === 'Overview' && (
          <View>
            {/* Savings Goal */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.savingsContent}>
                <View style={[styles.savingsIcon, { backgroundColor: theme.colors.background }]}>
                  <PiggyBank size={24} color={theme.colors.success} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Monthly Savings</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.colors.mutedForeground }]}>{savingsPercent.toFixed(1)}% of income</Text>
                </View>
                <Text style={[styles.amountText, { color: theme.colors.success }]}>
                  ₹{savings.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: theme.colors.muted }]}>
                <View style={[styles.progressBarFill, { width: `${Math.min(savingsPercent * 2, 100)}%`, backgroundColor: theme.colors.success }]} />
              </View>
            </View>

            {/* Monthly Trend Chart */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.chartHeader}>
                <BarChart3 size={20} color={theme.colors.primary} />
                <Text style={[styles.chartTitle, { color: theme.colors.foreground }]}>6-Month Trend</Text>
              </View>
              <AreaChart />
            </View>

            {/* Recent Transactions */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Recent Transactions</Text>
              <TouchableOpacity>
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>

            <View>
              {transactions.slice(0, 5).map((tx) => (
                <View key={tx.id} style={[styles.transactionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={[styles.transactionIconBg, { backgroundColor: theme.colors.muted }]}>
                    <Text style={{ fontSize: 20 }}>{tx.icon}</Text>
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={[styles.txName, { color: theme.colors.foreground }]}>{tx.name}</Text>
                    <Text style={[styles.txDate, { color: theme.colors.mutedForeground }]}>{tx.date}</Text>
                  </View>
                  <Text style={[
                    styles.txAmount,
                    tx.type === 'income' ? { color: theme.colors.success } : { color: theme.colors.danger }
                  ]}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'Breakdown' && (
          <View>
            {/* Pie Chart */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.chartHeader}>
                <PieChartIcon size={20} color={theme.colors.primary} />
                <Text style={[styles.chartTitle, { color: theme.colors.foreground }]}>Spending Breakdown</Text>
              </View>
              <DonutChart />
            </View>

            {/* Budget vs Actual */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.chartHeader}>
                <Target size={20} color={theme.colors.primary} />
                <Text style={[styles.chartTitle, { color: theme.colors.foreground }]}>Budget vs Actual</Text>
              </View>

              <View style={{ gap: 16 }}>
                {categories.map((cat) => {
                  const percentUsed = cat.budget > 0 ? (cat.numAmount / cat.budget) * 100 : 0;
                  const isOverBudget = percentUsed > 100;

                  return (
                    <View key={cat.id}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ marginRight: 8, fontSize: 16 }}>{cat.icon}</Text>
                          <Text style={[styles.catName, { color: theme.colors.foreground }]}>{cat.name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <Text style={[styles.catAmount, isOverBudget && { color: theme.colors.danger }, { color: theme.colors.foreground }]}>
                            {cat.amount}
                          </Text>
                          {cat.budget > 0 && <Text style={[styles.catBudget, { color: theme.colors.mutedForeground }]}> / ₹{cat.budget.toLocaleString()}</Text>}
                        </View>
                      </View>
                      <View style={[styles.progressBarBg, { backgroundColor: theme.colors.muted }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(percentUsed, 100)}%`,
                              backgroundColor: isOverBudget ? theme.colors.danger : theme.colors.primary
                            }
                          ]}
                        />
                      </View>
                      {isOverBudget && (
                        <Text style={[styles.overBudgetText, { color: theme.colors.danger }]}>
                          ⚠️ Over budget by ₹{(cat.numAmount - cat.budget).toLocaleString()}
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
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.chartHeader}>
                <Lightbulb size={20} color="#f59e0b" />
                <Text style={[styles.chartTitle, { color: theme.colors.foreground }]}>AI Insights</Text>
              </View>
              <View style={{ gap: 8 }}>
                {aiInsights.map((insight, i) => (
                  <View
                    key={i}
                    style={[
                      styles.insightCard,
                      insight.type === 'warning' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } : // Warning tint
                        insight.type === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } : // Success tint
                          { backgroundColor: theme.colors.muted }
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>{insight.icon}</Text>
                    <Text style={[styles.insightText, { color: theme.colors.foreground }]}>{insight.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Spending Bar Chart */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.chartHeader}>
                <BarChart3 size={20} color={theme.colors.primary} />
                <Text style={[styles.chartTitle, { color: theme.colors.foreground }]}>Category Spending</Text>
              </View>
              <HorizontalBarChart />
            </View>

            {/* Tips Card */}
            <View style={[styles.card, styles.tipsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.tipsTitle, { color: theme.colors.foreground }]}>💡 Money Saving Tips</Text>
              <View style={{ gap: 10 }}>
                {[
                  'Set up automatic transfers to savings on payday',
                  'Review subscriptions monthly and cancel unused ones',
                  'Use the 24-hour rule before making impulse purchases',
                  'Plan meals weekly to reduce food waste and dining out'
                ].map((tip, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ color: theme.colors.success }}>✓</Text>
                    <Text style={[styles.tipText, { color: theme.colors.mutedForeground }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Spacer for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setExpenseModalOpen(true)}
      >
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      <AddExpenseModal
        visible={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onAdd={handleAddExpense}
        budgets={budgets}
        currentSpending={categorySpending}
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
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
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
    borderRadius: 12,
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
    borderRadius: 16,
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
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
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
    borderRadius: 4,
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
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  transactionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
    borderRadius: 12,
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
    fontSize: 13,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 12,
    width: 60,
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
