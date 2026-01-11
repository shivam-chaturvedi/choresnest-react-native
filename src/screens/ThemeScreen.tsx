import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppLayout } from "../components/layout/AppLayout";
import { theme } from "../theme";
import { useSidebar } from "../contexts/SidebarContext";
import { ChevronLeft, Palette, Sun, Moon, Smartphone, Check } from "lucide-react-native";
// Using generic View for slider mock if package not available, 
// maintaining pure UI implementation as per request.

const themes = [
  { id: 'light', name: 'Light', icon: Sun },
  { id: 'dark', name: 'Dark', icon: Moon },
  { id: 'system', name: 'System', icon: Smartphone },
];

const accentColors = [
  // ReactJS: bg-[hsl(210,55%,39%)] -> ~#2D5E8E. Let's use the list from ReactJS logic
  { id: 'blue', name: 'Ocean Blue', color: '#2D5E8E' },
  { id: 'green', name: 'Forest Green', color: '#339966' },
  { id: 'purple', name: 'Royal Purple', color: '#8A2BE2' },
  { id: 'orange', name: 'Sunset Orange', color: '#FF7F50' },
  { id: 'pink', name: 'Rose Pink', color: '#E91E63' },
  { id: 'teal', name: 'Ocean Teal', color: '#009688' },
];

export const ThemeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedTheme, setSelectedTheme] = useState("light");
  const [selectedAccent, setSelectedAccent] = useState("blue");
  const [textSize, setTextSize] = useState(0.5); // 0 to 1 for mock slider
  const { openSidebar } = useSidebar();

  const currentAccentName = accentColors.find(a => a.id === selectedAccent)?.name;

  return (
    <AppLayout>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.colors.foreground} />
          </Pressable>
          <Text style={styles.title}>Theme</Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Palette size={32} color={theme.colors.primaryForeground} />
          </View>
          <View>
            <Text style={styles.heroTitle}>Personalize</Text>
            <Text style={styles.heroSubtitle}>Make Family Chores yours</Text>
          </View>
        </View>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.gridRow}>
          {themes.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.themeCard,
                selectedTheme === item.id && styles.activeCard
              ]}
              onPress={() => setSelectedTheme(item.id)}
            >
              <View style={[
                styles.themeIconBox,
                item.id === 'dark' && { backgroundColor: theme.colors.foreground, },
                item.id !== 'dark' && { backgroundColor: theme.colors.muted }
              ]}>
                <item.icon
                  size={24}
                  color={item.id === 'dark' ? theme.colors.background : theme.colors.foreground}
                />
              </View>
              <Text style={styles.cardLabel}>{item.name}</Text>
              {selectedTheme === item.id && <Check size={16} color={theme.colors.primary} style={{ marginTop: 4 }} />}
            </Pressable>
          ))}
        </View>

        {/* Accent Color */}
        <Text style={styles.sectionTitle}>Accent Color</Text>
        <View style={styles.accentCard}>
          <View style={styles.accentGrid}>
            {accentColors.map((accent) => (
              <Pressable
                key={accent.id}
                style={[
                  styles.colorDot,
                  { backgroundColor: accent.color },
                  selectedAccent === accent.id && styles.colorDotActive
                ]}
                onPress={() => setSelectedAccent(accent.id)}
              >
                {selectedAccent === accent.id && <Check size={20} color="#fff" />}
              </Pressable>
            ))}
          </View>
          <Text style={styles.accentName}>{currentAccentName}</Text>
        </View>

        {/* Text Size */}
        <Text style={styles.sectionTitle}>Text Size</Text>
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', paddingVertical: 24 }]}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.foreground }}>A</Text>
          <View style={styles.sliderTrackBg}>
            <View style={[styles.sliderTrackFill, { width: '50%' }]} />
            <View style={[styles.sliderThumb, { left: '50%' }]} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.foreground }}>A</Text>
        </View>

        {/* Preview */}
        <Text style={styles.sectionTitle}>Preview</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitleSmall}>Preview</Text>
          <View style={styles.previewBox}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={styles.previewAvatar}>
                <Text style={{ fontSize: 20 }}>👨</Text>
              </View>
              <View>
                <Text style={styles.previewTaskTitle}>Sample Task</Text>
                <Text style={styles.previewTaskSub}>Due today</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={styles.tagHigh}>
                <Text style={styles.tagHighText}>High Priority</Text>
              </View>
              <View style={styles.tagComplete}>
                <Text style={styles.tagCompleteText}>Completed</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 0,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 0,
    padding: 16,
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 0,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primaryForeground,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 12,
    marginTop: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 0,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCard: {
    borderColor: theme.colors.primary,
  },
  themeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 0,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accentCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 0,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  colorDot: {
    width: 48,
    height: 48,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: theme.colors.foreground, // Ring effect
  },
  accentName: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.mutedForeground,
    marginTop: 16,
  },
  sliderTrackBg: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.muted,
    borderRadius: 0,
    marginHorizontal: 16,
    justifyContent: 'center',
  },
  sliderTrackFill: {
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 0,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    marginLeft: -10, // center
  },
  cardTitleSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
    marginBottom: 12,
  },
  previewBox: {
    backgroundColor: theme.colors.muted,
    borderRadius: 0,
    padding: 16,
  },
  previewAvatar: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  previewTaskSub: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  tagHigh: {
    backgroundColor: '#dbeafe', // light blue
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  tagHighText: {
    fontSize: 11,
    color: '#2563eb', // blue 600
    fontWeight: '600',
  },
  tagComplete: {
    backgroundColor: '#dcfce7', // light green
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  tagCompleteText: {
    fontSize: 11,
    color: '#16a34a', // green 600
    fontWeight: '600',
  },
});
