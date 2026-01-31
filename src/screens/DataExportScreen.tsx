import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppLayout } from "../components/layout/AppLayout";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import {
  ChevronLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Check,
  Loader2,
  Share2
} from "lucide-react-native";
import { exportService, ExportFormat, ExportStats } from "../services/ExportService";

const initialDataOptions = [
  { id: 'events', label: "Calendar Events", items: 0, selected: true },
  { id: 'tasks', label: "Tasks & Chores", items: 0, selected: true },
  { id: 'lists', label: "Shopping Lists", items: 0, selected: true },
  { id: 'recipes', label: "Recipes", items: 0, selected: true },
  { id: 'documents', label: "Documents", items: 0, selected: false },
  { id: 'expenses', label: "Expenses", items: 0, selected: true },
  { id: 'system', label: "System & Settings", items: 0, selected: true },
];

export const DataExportScreen: React.FC = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  // Format is always 'json' now

  const [dataOptions, setDataOptions] = useState(initialDataOptions);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<string>("Calculating...");

  const [isExporting, setIsExporting] = useState(false);

  // Load live stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const liveStats = await exportService.getStats();
    setStats(liveStats);

    // Update options with live counts
    setDataOptions(prev => prev.map(opt => ({
      ...opt,
      items: liveStats[opt.id as keyof ExportStats] || 0
    })));
  };

  // Recalculate size when selection changes
  useEffect(() => {
    if (!stats) return;

    // Create a temporary stats object reflecting only SELECTED items
    const selectedStats = { ...stats };
    dataOptions.forEach(opt => {
      if (!opt.selected) {
        selectedStats[opt.id as keyof ExportStats] = 0;
      }
    });

    exportService.calculateEstimatedSize(selectedStats).then(setEstimatedSize);
  }, [stats, dataOptions]);

  const toggleData = (id: string) => {
    setDataOptions(prev => prev.map(opt =>
      opt.id === id ? { ...opt, selected: !opt.selected } : opt
    ));
  };

  const handleExport = async () => {
    const selectedIds = dataOptions.filter(o => o.selected).map(o => o.id);
    if (selectedIds.length === 0) {
      Alert.alert("No Data Selected", "Please select at least one data type to export.");
      return;
    }

    setIsExporting(true);
    try {
      const filePath = await exportService.generateBackup(selectedIds);
      await exportService.shareBackup(filePath);
    } catch (error: any) {
      const errorMessage = error?.message || "Could not generate or share backup file.";
      Alert.alert("Export Failed", errorMessage);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppLayout>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { borderRadius: radius.sm }]}>
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Data Export</Text>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary, shadowColor: colors.primary, borderRadius: radius.card }]}>
          <View style={[styles.heroIcon, { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.card }]}>
            <Download size={32} color={colors.primaryForeground} />
          </View>
          <View>
            <Text style={[styles.heroTitle, { color: colors.primaryForeground }]}>Full Backup</Text>
            <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>Export your family data as a JSON file</Text>
          </View>
        </View>


        {/* Select Data */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Select Data</Text>
          <Text style={[styles.sizeEstimate, { color: colors.mutedForeground }]}>Est. Size: {estimatedSize}</Text>
        </View>

        <View style={[styles.dataCard, { backgroundColor: colors.card, shadowColor: colors.shadow, borderRadius: radius.card }]}>
          {dataOptions.map((option) => (
            <Pressable
              key={option.id}
              style={styles.dataRow}
              onPress={() => toggleData(option.id)}
            >
              <View style={[
                styles.checkbox,
                { borderColor: colors.border, borderRadius: radius.sm },
                option.selected && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}>
                {option.selected && <Check size={14} color="#fff" />}
              </View>
              <View style={styles.dataText}>
                <Text style={[styles.dataLabel, { color: colors.foreground }]}>{option.label}</Text>
              </View>
              <Text style={[styles.dataCount, { color: colors.mutedForeground }]}>
                {stats ? `${option.items} items` : '...'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Export Button */}
        <Pressable
          style={[styles.exportButton, { backgroundColor: colors.primary, shadowColor: colors.primary, borderRadius: radius.card }, isExporting && { opacity: 0.8 }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Loader2 size={24} color="#fff" style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={[styles.exportText, { color: colors.primaryForeground }]}>Exporting...</Text>
            </View>
          ) : (
            <>
              <Share2 size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={[styles.exportText, { color: colors.primaryForeground }]}>Export & Share</Text>
            </>
          )}
        </Pressable>

        {/* Export PDF Button */}
        <Pressable
          style={[styles.exportButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 12, borderRadius: radius.card }, isExporting && { opacity: 0.8 }]}
          onPress={async () => {
            const selectedIds = dataOptions.filter(o => o.selected).map(o => o.id);
            if (selectedIds.length === 0) {
              Alert.alert("No Data Selected", "Please select at least one data type to export.");
              return;
            }

            setIsExporting(true);
            try {
              await exportService.exportAsPDF(selectedIds);
            } catch (error: any) {
              Alert.alert("Export Failed", error?.message || "Could not generate PDF.");
            } finally {
              setIsExporting(false);
            }
          }}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <>
              <FileText size={20} color={colors.foreground} style={{ marginRight: 8 }} />
              <Text style={[styles.exportText, { color: colors.foreground }]}>Export as PDF</Text>
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
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sizeEstimate: {
    fontSize: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
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
  dataCard: {
    padding: 12,
    marginBottom: 24,
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
  exportButton: {
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

