import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { AppLayout } from "../components/layout/AppLayout";
import { useFamily } from "../contexts/FamilyContext";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { useSidebar } from "../contexts/SidebarContext";
import { useToast } from "../components/ui/Toast";
import { DocumentScanner } from "../components/vault/DocumentScanner";
import {
  Menu,
  Camera,
  Upload,
  Search,
  Filter,
  Shield,
  Bell,
  ChevronRight,
  Plus,
  AlertTriangle
} from "lucide-react-native";

export const VaultScreen: React.FC = () => {
  const { globalVault, memberVaults, activeMember } = useFamily();
  const { openSidebar } = useSidebar();
  const { showToast } = useToast();
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const categories = [
    { id: 'warranty', name: 'Warranties', icon: '🛡️', count: 8, color: colors.info + '30' },
    { id: 'bill', name: 'Bills', icon: '🧾', count: 15, color: colors.warning + '30' },
    { id: 'insurance', name: 'Insurance', icon: '📋', count: 4, color: colors.success + '30' },
    { id: 'service', name: 'Service', icon: '🔧', count: 6, color: colors.muted + '50' },
    { id: 'certificate', name: 'Certificates', icon: '📜', count: 3, color: colors.border },
    { id: 'receipt', name: 'Receipts', icon: '🧾', count: 22, color: colors.primary + '30' },
  ];

  const initialAlerts = [
    { id: 1, icon: '📺', name: 'TV Warranty', message: 'Expires in 30 days', type: 'warning' },
    { id: 2, icon: '🚗', name: 'Car Service', message: 'Due in 15 days', type: 'info' },
  ];

  // Combine global and active member docs for display (simplified logic)
  const allDocs = [...globalVault, ...(activeMember ? (memberVaults[activeMember.id] || []) : [])];

  const filteredDocs = allDocs.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || doc.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleScan = () => {
    setShowScanner(true);
  };

  const handleUpload = () => {
    showToast({ title: "Upload File", description: "File picker opening...", type: "default" });
  };

  return (
    <AppLayout showNav={false} showAddButton={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={openSidebar} style={[styles.menuBtn, { backgroundColor: colors.card, borderRadius: radius.md }]}>
              <Menu size={24} color={colors.foreground} />
            </Pressable>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Family Vault</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your digital document locker</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={[styles.iconBtn, { borderColor: colors.border, borderRadius: radius.sm }]} onPress={handleScan}>
              <Camera size={20} color={colors.foreground} />
            </Pressable>
            <Pressable style={[styles.iconBtn, { borderColor: colors.border, borderRadius: radius.sm }]} onPress={handleUpload}>
              <Upload size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
            <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search vault, warranties..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable style={styles.filterBtn}>
              <Filter size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Secure Storage Card */}
          <View style={[styles.storageCard, { backgroundColor: colors.primary, shadowColor: colors.primary, borderRadius: radius.card }]}>
            <View style={styles.storageContent}>
              <View style={[styles.shieldIcon, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.card }]}>
                <Shield size={28} color={colors.primaryForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.storageTitle, { color: colors.primaryForeground }]}>Secure Storage</Text>
                <Text style={[styles.storageDesc, { color: colors.primaryForeground, opacity: 0.8 }]}>{allDocs.length} documents • 1.2 GB used</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.alertCount, { color: colors.primaryForeground }]}>{initialAlerts.length}</Text>
                <Text style={[styles.alertLabel, { color: colors.primaryForeground, opacity: 0.7 }]}>Alerts</Text>
              </View>
            </View>
          </View>

          {/* Alerts */}
          {initialAlerts.length > 0 && (
            <View style={styles.alertSection}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Bell size={16} color={colors.warning} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alerts & Reminders</Text>
                </View>
                <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
              </View>

              {initialAlerts.map(alert => (
                <Pressable
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    { backgroundColor: colors.card, borderRadius: radius.md },
                    alert.type === 'warning' ? { borderLeftColor: colors.warning, borderLeftWidth: 4 } : { borderLeftColor: colors.info, borderLeftWidth: 4 }
                  ]}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{alert.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertName, { color: colors.foreground }]}>{alert.name}</Text>
                    <Text style={[styles.alertMsg, { color: colors.mutedForeground }]}>{alert.message}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Categories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Categories</Text>
            <View style={styles.categoryGrid}>
              {categories.map(cat => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === cat.id && styles.categorySelected
                  ]}
                  onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                >
                  <View style={[styles.catIconBox, { backgroundColor: cat.color, borderRadius: radius.md }]}>
                    <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                  </View>
                  <Text style={[styles.catName, { color: colors.foreground }]}>{cat.name}</Text>
                  <Text style={[styles.catCount, { color: colors.mutedForeground }]}>{cat.count}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Documents */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Recent Vault Items'}
              </Text>
              <Text style={[styles.viewAll, { color: colors.primary }]}>See All</Text>
            </View>

            {filteredDocs.length > 0 ? (
              filteredDocs.map(doc => (
                <Pressable key={doc.id} style={[styles.docRow, { backgroundColor: colors.card, borderRadius: radius.md }]}>
                  <View style={[styles.docIconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                    <Text style={{ fontSize: 20 }}>{doc.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docName, { color: colors.foreground }]}>{doc.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={[styles.docBadge, { backgroundColor: colors.muted, borderRadius: radius.xs }]}>
                        <Text style={[styles.docBadgeText, { color: colors.mutedForeground }]}>{doc.type}</Text>
                      </View>
                      <Text style={[styles.docDate, { color: colors.mutedForeground }]}>{doc.date}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No documents found</Text>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsGrid}>
            <Pressable style={[styles.actionCard, { backgroundColor: colors.card, borderRadius: radius.md }]} onPress={handleScan}>
              <View style={[styles.actionIcon, { backgroundColor: colors.info + '30', borderRadius: radius.sm }]}>
                <Camera size={20} color={colors.info} />
              </View>
              <View>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>Scan</Text>
                <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>With OCR</Text>
              </View>
            </Pressable>
            <Pressable style={[styles.actionCard, { backgroundColor: colors.card, borderRadius: radius.md }]} onPress={handleUpload}>
              <View style={[styles.actionIcon, { backgroundColor: colors.success + '30', borderRadius: radius.sm }]}>
                <Upload size={20} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>Upload</Text>
                <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>From device</Text>
              </View>
            </Pressable>
          </View>

          {/* Emergency Access */}
          <Pressable style={[styles.emergencyCard, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30', borderRadius: radius.card }]}>
            <View style={[styles.emergencyIcon, { backgroundColor: colors.danger, borderRadius: radius.md }]}>
              <AlertTriangle size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.emergencyTitle, { color: colors.foreground }]}>Emergency Access</Text>
              <Text style={[styles.emergencySub, { color: colors.mutedForeground }]}>Quick access to critical docs</Text>
            </View>
            <ChevronRight size={20} color={colors.mutedForeground} />
          </Pressable>

        </ScrollView>

        {/* Floating Add Button */}
        <Pressable style={[styles.fab, { backgroundColor: colors.primary, borderRadius: radius.full }]} onPress={handleScan}>
          <Plus size={24} color={colors.primaryForeground} />
        </Pressable>

        {/* Document Scanner Modal */}
        <DocumentScanner
          open={showScanner}
          onOpenChange={setShowScanner}
        />
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  filterBtn: {
    padding: 4,
  },
  storageCard: {
    padding: 16,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  storageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  shieldIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  storageDesc: {
    fontSize: 14,
  },
  alertCount: {
    fontSize: 24,
    fontWeight: '700',
  },
  alertLabel: {
    fontSize: 12,
  },
  alertSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '500',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  alertName: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertMsg: {
    fontSize: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryCard: {
    width: '33.33%',
    padding: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  categorySelected: {
    opacity: 0.7,
  },
  catIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  catCount: {
    fontSize: 11,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  docIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
  },
  docBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  docDate: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSub: {
    fontSize: 12,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emergencySub: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
