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
import { useTheme } from "../contexts/ThemeContext";
import { Check } from "lucide-react-native";
import { AppIcon } from "../components/ui/AppIcon";

export const ThemeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentPalette, setPalette } = useTheme();

  return (
    <AppLayout showNav={false}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <AppIcon name="chevronLeft" size={24} color="#000" />
          </Pressable>
          <Text style={styles.title}>Theme Gallery</Text>
        </View>

        <Text style={styles.sectionTitle}>Color Palette</Text>

        <View style={styles.themeList}>
          {(Object.keys(theme.palettes) as Array<keyof typeof theme.palettes>).map((key) => {
            const palette = theme.palettes[key];
            const isActive = currentPalette === key;

            return (
              <Pressable
                key={key}
                style={[
                  styles.themeCard,
                  isActive && styles.activeCard
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
                    <Text style={styles.themeName}>{palette.name}</Text>
                    {isActive && <Check size={20} color={theme.colors.success} />}
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
    backgroundColor: "#FFFFFF",
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
    borderRadius: 0,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
    color: "#000000",
  },
  themeList: {
    gap: 20,
  },
  themeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeCard: {
    borderColor: "#22C55E", // Success green
    borderWidth: 2,
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
    backgroundColor: "#FFFFFF",
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
    color: "#000000",
  },
  hexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hexText: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: "#64748B", // Slate 500
  },
});
