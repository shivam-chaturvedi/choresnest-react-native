import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppLayout } from "../components/layout";
import { theme } from "../theme";
import { useTheme, useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { Check } from "lucide-react-native";
import { AppIcon } from "../components/ui/AppIcon";

export const ThemeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentPalette, setPalette, shapeMode, setShapeMode, isDark, appearanceMode, setAppearanceMode } = useTheme();
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const shapes: { mode: 'rounded' | 'squared', label: string }[] = [
    { mode: 'rounded', label: 'Rounded' },
    { mode: 'squared', label: 'Squared' },
  ];

  return (
    <AppLayout showNav={false}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { borderRadius: radius.sm }]}>
            <AppIcon name="chevronLeft" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Theme Gallery</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
        <View style={styles.shapeList}>
        {([
          { mode: 'light', label: 'Light', icon: 'sun' },
          { mode: 'cream', label: 'Cream', icon: 'coffee' },
          { mode: 'midnight', label: 'Midnight', icon: 'moon' },
        ] as const).map((mode) => (
          <Pressable
            key={mode.mode}
            style={[
              styles.shapeCard,
              {
                backgroundColor: colors.card,
                borderColor: appearanceMode === mode.mode ? colors.success : colors.border,
                borderRadius: radius.card
              },
              appearanceMode === mode.mode && { borderWidth: 2 }
            ]}
            onPress={() => setAppearanceMode(mode.mode)}
          >
            <AppIcon name={mode.icon} size={28} color={appearanceMode === 'midnight' ? colors.foreground : colors.primary} style={{ marginBottom: 12 }} />
            <View style={styles.shapeInfo}>
              <Text style={[styles.shapeLabel, { color: colors.foreground }]}>{mode.label}</Text>
              {appearanceMode === mode.mode && <Check size={18} color={colors.success} />}
            </View>
          </Pressable>
        ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>UI Shape</Text>
        <View style={styles.shapeList}>
          {shapes.map((shape) => (
            <Pressable
              key={shape.mode}
              style={[
                styles.shapeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: shapeMode === shape.mode ? colors.success : colors.border,
                  borderRadius: radius.card
                },
                shapeMode === shape.mode && { borderWidth: 2 }
              ]}
              onPress={() => setShapeMode(shape.mode)}
            >
              {/* Visual Preview of Shape */}
              <View style={[styles.shapePreview, {
                backgroundColor: appearanceMode === 'midnight' ? colors.foreground + '15' : colors.primary + '20',
                borderRadius: shape.mode === 'rounded' ? 12 : 2
              }]}
              />
              <View style={styles.shapeInfo}>
                <Text style={[styles.shapeLabel, { color: colors.foreground }]}>{shape.label}</Text>
                {shapeMode === shape.mode && <Check size={18} color={colors.success} />}
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Color Palette</Text>

        <View style={styles.themeList}>
          {(Object.keys(theme.palettes) as Array<keyof typeof theme.palettes>).map((key) => {
            const palette = theme.palettes[key];
            const isActive = currentPalette === key;

            return (
              <Pressable
                key={key}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: colors.card,
                    borderRadius: radius.card,
                    borderColor: isActive ? colors.success : 'transparent',
                    borderWidth: 2,
                    shadowColor: colors.shadow
                  }
                ]}
                onPress={() => {
                  setPalette(key);
                }}
              >
                {/* Visual Preview */}
                <View style={styles.palettePreview}>
                  {palette.colors.map((color, index) => (
                    <View
                      key={index}
                      style={[
                        styles.colorStripe,
                        { backgroundColor: color, flex: 1 }
                      ]}
                    />
                  ))}
                </View>

                {/* Info */}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.themeName, { color: colors.foreground }]}>{palette.name}</Text>
                    {isActive && <Check size={20} color={colors.success} />}
                  </View>

                  {/* Hex Codes */}
                  <View style={styles.hexRow}>
                    {palette.colors.map((color, index) => (
                      <Text key={index} style={styles.hexText}>{color}</Text>
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    minHeight: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  themeList: {
    gap: 20,
  },
  themeCard: {
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  palettePreview: {
    flexDirection: 'row',
    height: 80,
    width: '100%',
  },
  colorStripe: {
    height: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeName: {
    fontSize: 18,
    fontWeight: '700',
  },
  hexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hexText: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: "#64748B",
  },
  shapeList: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  shapeCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  shapePreview: {
    width: 48,
    height: 48,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  shapeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shapeLabel: {
    fontWeight: '600',
  }
});
