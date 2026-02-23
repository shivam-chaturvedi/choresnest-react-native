import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { AppLayout } from '../components/layout';
import { theme } from '../theme';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { Camera, AlertTriangle, TrendingUp, Check, ChevronRight, Heart, Droplet, Flame, Apple } from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const mealTimeline = [
  {
    time: 'Breakfast',
    icon: 'coffee',
    status: 'done',
    items: ['Oatmeal', 'Banana', 'Coffee'],
    calories: 380,
    quality: 'good',
  },
  {
    time: 'Lunch',
    icon: 'food',
    status: 'done',
    items: ['Rice', 'Dal', 'Vegetables'],
    calories: 550,
    quality: 'good',
  },
  {
    time: 'Snack',
    icon: 'food-apple',
    status: 'done',
    items: ['Apple', 'Almonds'],
    calories: 180,
    quality: 'excellent',
  },
  {
    time: 'Dinner',
    icon: 'pasta',
    status: 'pending',
    items: [],
    calories: 0,
    suggestion: 'Try: Grilled Chicken Salad (420 cal)',
  },
];

const nutritionStats = [
  { label: 'Calories', value: '1,110', target: '2,000', icon: Flame, color: 'warning', progress: 55 },
  { label: 'Protein', value: '48g', target: '60g', icon: TrendingUp, color: 'info', progress: 80 },
  { label: 'Water', value: '1.5L', target: '2.5L', icon: Droplet, color: 'info', progress: 60 },
  { label: 'Fiber', value: '18g', target: '25g', icon: Apple, color: 'success', progress: 72 },
];

const warnings = [
  { icon: 'candy', text: 'Sugar intake 15g above daily limit', type: 'warning' },
  { icon: 'shaker', text: 'Sodium levels are optimal', type: 'success' },
];

const healthTips = [
  'Add more greens to dinner for fiber boost',
  'Consider reducing sugar in your coffee',
  'Great protein intake today!',
];

export const NutritionScreen: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();

  // Helper to get color values
  const getColor = (colorName: string) => {
    const colorMap: any = colors;
    return colorMap[colorName] || colors.primary;
  };

  return (
    <AppLayout showNav={false}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Nutrition</Text>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
            <Camera size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Scan Card */}
        <TouchableOpacity style={[styles.card, styles.scanCard, { backgroundColor: colors.primary, borderRadius: radius.card }]}>
          <View style={styles.scanContent}>
            <View style={[styles.scanIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.lg }]}>
              <Camera size={32} color="#fff" />
            </View>
            <View style={styles.scanTextContainer}>
              <Text style={styles.scanTitle}>Scan Food</Text>
              <Text style={styles.scanSubtitle}>Get instant nutrition info & alternatives</Text>
            </View>
            <ChevronRight size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Daily Stats */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Heart size={20} color={colors.danger} fill={colors.danger} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Today's Balance</Text>
            </View>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>Jan 15, 2026</Text>
          </View>

          <View style={styles.statsGrid}>
            {nutritionStats.map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <View style={styles.statHeader}>
                  <stat.icon size={16} color={getColor(stat.color)} />
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
                </View>
                <View style={styles.statValueContainer}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                  <Text style={[styles.statTarget, { color: colors.mutedForeground }]}>/ {stat.target}</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.muted, borderRadius: radius.xs }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${stat.progress}%`,
                        backgroundColor: getColor(stat.color),
                        borderRadius: radius.xs
                      }
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Warnings */}
        <View style={styles.warningsContainer}>
          {warnings.map((warning, i) => (
            <View
              key={i}
              style={[
                styles.warningCard,
                {
                  backgroundColor: warning.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  borderRadius: radius.md
                }
              ]}
            >
              <MaterialCommunityIcons name={warning.icon} size={24} color={warning.type === 'warning' ? colors.warning : colors.success} style={{ marginRight: 12 }} />
              <Text style={[styles.warningText, { color: colors.foreground }]}>{warning.text}</Text>
              {warning.type === 'warning' ? (
                <AlertTriangle size={20} color={colors.warning} />
              ) : (
                <Check size={20} color={colors.success} />
              )}
            </View>
          ))}
        </View>

        {/* Meal Timeline */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          <Text style={[styles.cardTitle, { marginBottom: 16, color: colors.foreground }]}>Meal Timeline</Text>

          <View style={styles.timelineContainer}>
            {mealTimeline.map((meal, i) => (
              <View key={meal.time} style={styles.timelineItem}>
                {/* Timeline dot */}
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    {
                      backgroundColor: meal.status === 'done'
                        ? meal.quality === 'excellent' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                        : colors.muted,
                      borderRadius: radius.full
                    }
                  ]}>
                    <MaterialCommunityIcons name={meal.icon} size={24} color={colors.foreground} />
                  </View>
                  {i < mealTimeline.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      { backgroundColor: meal.status === 'done' ? colors.border : colors.muted }
                    ]} />
                  )}
                </View>

                {/* Content */}
                <View style={[
                  styles.timelineContent,
                  meal.status === 'pending' && { opacity: 0.6 }
                ]}>
                  <View style={styles.timelineHeader}>
                    <Text style={[styles.timelineTime, { color: colors.foreground }]}>{meal.time}</Text>
                    {meal.status === 'done' && (
                      <Text style={[styles.timelineCalories, { color: colors.primary }]}>{meal.calories} cal</Text>
                    )}
                  </View>

                  {meal.items.length > 0 ? (
                    <Text style={[styles.timelineItems, { color: colors.mutedForeground }]}>
                      {meal.items.join(' • ')}
                    </Text>
                  ) : meal.suggestion ? (
                    <Text style={[styles.timelineSuggestion, { color: colors.primary }]}>
                      💡 {meal.suggestion}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Health Tips */}
        <View style={[styles.card, styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 12 }]}>💡 Today's Tips</Text>
          <View style={styles.tipsList}>
            {healthTips.map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Text style={[styles.tipBullet, { color: colors.primary }]}>•</Text>
                <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Diet Profiles */}
        <View style={styles.profileContainer}>
          <Text style={[styles.cardTitle, { marginBottom: 12, color: colors.foreground }]}>Personalized for</Text>
          <View style={styles.tagsContainer}>
            {[
              { text: 'Shivam', icon: 'account' },
              { text: 'Gym Diet', icon: 'dumbbell' },
              { text: 'Low Sugar', icon: 'medical-bag' }
            ].map((profile, i) => (
              <View key={i} style={[styles.profileTag, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <MaterialCommunityIcons name={profile.icon} size={16} color={colors.foreground} />
                <Text style={[styles.profileTagText, { color: colors.foreground }]}>{profile.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  iconButton: {
    padding: 8,
    borderWidth: 1,
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scanCard: {
    borderWidth: 0,
  },
  scanContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanIconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  scanTextContainer: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  scanSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  dateText: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statItem: {
    width: '50%',
    padding: 6,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    marginLeft: 6,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statTarget: {
    fontSize: 12,
    marginLeft: 4,
  },
  progressBarBg: {
    height: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  warningsContainer: {
    marginBottom: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
    marginRight: 16,
  },
  timelineDot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineCalories: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineItems: {
    fontSize: 14,
  },
  timelineSuggestion: {
    fontSize: 14,
    fontWeight: '500',
  },
  tipsCard: {
    marginTop: 0,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  profileContainer: {
    padding: 16,
    paddingTop: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  profileTagText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
