import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppLayout } from "../components/layout/AppLayout";
import { theme } from "../theme";
import { useSidebar } from "../contexts/SidebarContext";
import {
  ChevronLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  Cloud,
  Check,
  Loader2
} from "lucide-react-native";

const exportFormats = [
  { id: 'json', label: "JSON", description: "Full data export", size: "~2.4 MB", icon: FileJson },
  { id: 'csv', label: "CSV", description: "Spreadsheet compatible", size: "~1.8 MB", icon: FileSpreadsheet },
  { id: 'cloud', label: "Cloud Backup", description: "Secure cloud storage", size: "Automatic", icon: Cloud },
];

const dataOptions = [
  { id: 'events', label: "Calendar Events", items: 156, selected: true },
  { id: 'tasks', label: "Tasks & Chores", items: 89, selected: true },
  { id: 'lists', label: "Shopping Lists", items: 234, selected: true },
  { id: 'recipes', label: "Recipes", items: 45, selected: true },
  { id: 'documents', label: "Documents", items: 58, selected: false },
  { id: 'expenses', label: "Expenses", items: 312, selected: true },
];

export const DataExportScreen: React.FC = () => {
  const navigation = useNavigation();
  const [format, setFormat] = useState("json");
  const { openSidebar } = useSidebar();
  const [selectedData, setSelectedData] = useState(
    dataOptions.filter((option) => option.selected).map((option) => option.id)
  );
  const [isExporting, setIsExporting] = useState(false);

  const toggleData = (id: string) => {
    setSelectedData((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  return (
    <AppLayout>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>Data Export</Text>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
          <View style={[styles.heroIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Download size={32} color={theme.colors.primaryForeground} />
          </View>
          <View>
            <Text style={[styles.heroTitle, { color: theme.colors.primaryForeground }]}>Backup Your Data</Text>
            <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>Export all your family data securely</Text>
          </View>
        </View>

        {/* Export Format */}
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Export Format</Text>
        <View style={{ gap: 8 }}>
          {exportFormats.map((option) => (
            <Pressable
              key={option.id}
              style={[
                styles.optionCard,
                { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow },
                format === option.id && { borderColor: theme.colors.primary, borderWidth: 2 }
              ]}
              onPress={() => setFormat(option.id)}
            >
              <View style={[
                styles.optionIcon,
                { backgroundColor: theme.colors.muted },
                format === option.id && { backgroundColor: theme.colors.primary + '1A' } // Light blue
              ]}>
                <option.icon
                  size={24}
                  color={format === option.id ? theme.colors.primary : theme.colors.mutedForeground}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: theme.colors.foreground }]}>{option.label}</Text>
                <Text style={[styles.optionSubtitle, { color: theme.colors.mutedForeground }]}>{option.description}</Text>
              </View>
              <Text style={[styles.optionSize, { color: theme.colors.mutedForeground }]}>{option.size}</Text>
              {format === option.id && <Check size={20} color={theme.colors.primary} />}
            </Pressable>
          ))}
        </View>

        {/* Select Data */}
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Select Data</Text>
        <View style={[styles.dataCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          {dataOptions.map((option) => (
            <Pressable
              key={option.id}
              style={styles.dataRow}
              onPress={() => toggleData(option.id)}
            >
              <View style={[
                styles.checkbox,
                { borderColor: theme.colors.border },
                selectedData.includes(option.id) && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              ]}>
                {selectedData.includes(option.id) && <Check size={14} color="#fff" />}
              </View>
              <View style={styles.dataText}>
                <Text style={[styles.dataLabel, { color: theme.colors.foreground }]}>{option.label}</Text>
              </View>
              <Text style={[styles.dataCount, { color: theme.colors.mutedForeground }]}>{option.items} items</Text>
            </Pressable>
          ))}
        </View>

        {/* Last Backup */}
        <View style={[styles.lastBackup, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View>
            <Text style={[styles.lastBackupLabel, { color: theme.colors.foreground }]}>Last Backup</Text>
            <Text style={[styles.lastBackupTime, { color: theme.colors.mutedForeground }]}>December 28, 2025 at 3:45 PM</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Check size={14} color={theme.colors.success} />
            <Text style={[styles.backupStatus, { color: theme.colors.success }]}>Up to date</Text>
          </View>
        </View>

        {/* Export Button */}
        <Pressable
          style={[styles.exportButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }, isExporting && { opacity: 0.8 }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Loader2 size={24} color="#fff" style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={[styles.exportText, { color: theme.colors.primaryForeground }]}>Exporting...</Text>
            </View>
          ) : (
            <>
              <Download size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={[styles.exportText, { color: theme.colors.primaryForeground }]}>Export Data</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionSubtitle: {
    fontSize: 12,
  },
  optionSize: {
    fontSize: 12,
    marginRight: 12,
  },
  dataCard: {
    borderRadius: 16,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dataText: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  dataCount: {
    fontSize: 12,
  },
  lastBackup: {
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  lastBackupLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastBackupTime: {
    fontSize: 12,
  },
  backupStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  exportButton: {
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exportText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
