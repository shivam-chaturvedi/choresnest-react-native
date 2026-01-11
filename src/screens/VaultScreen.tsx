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
import { theme } from "../theme";
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

const categories = [
  { id: 'warranty', name: 'Warranties', icon: '🛡️', count: 8, color: '#dbeafe' }, // bg-info-light
  { id: 'bill', name: 'Bills', icon: '🧾', count: 15, color: '#fef3c7' }, // bg-warning-light
  { id: 'insurance', name: 'Insurance', icon: '📋', count: 4, color: '#dcfce7' }, // bg-success-light
  { id: 'service', name: 'Service', icon: '🔧', count: 6, color: '#f3f4f6' }, // bg-accent
  { id: 'certificate', name: 'Certificates', icon: '📜', count: 3, color: '#e5e7eb' }, // bg-secondary
  { id: 'receipt', name: 'Receipts', icon: '🧾', count: 22, color: '#dbeafe' }, // bg-primary-light
];

const initialAlerts = [
  { id: 1, icon: '📺', name: 'TV Warranty', message: 'Expires in 30 days', type: 'warning' },
  { id: 2, icon: '🚗', name: 'Car Service', message: 'Due in 15 days', type: 'info' },
];

export const VaultScreen: React.FC = () => {
  const { globalVault, memberVaults, activeMember } = useFamily();
  const { openSidebar } = useSidebar();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={openSidebar} style={styles.menuBtn}>
              <Menu size={24} color={theme.colors.foreground} />
            </Pressable>
            <View>
              <Text style={styles.title}>Family Vault</Text>
              <Text style={styles.subtitle}>Your digital document locker</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} onPress={handleScan}>
              <Camera size={20} color={theme.colors.foreground} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={handleUpload}>
              <Upload size={20} color={theme.colors.foreground} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={16} color={theme.colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vault, warranties..."
              placeholderTextColor={theme.colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable style={styles.filterBtn}>
              <Filter size={16} color={theme.colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Secure Storage Card */}
          <View style={styles.storageCard}>
            <View style={styles.storageContent}>
              <View style={styles.shieldIcon}>
                <Shield size={28} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storageTitle}>Secure Storage</Text>
                <Text style={styles.storageDesc}>{allDocs.length} documents • 1.2 GB used</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.alertCount}>{initialAlerts.length}</Text>
                <Text style={styles.alertLabel}>Alerts</Text>
              </View>
            </View>
          </View>

          {/* Alerts */}
          {initialAlerts.length > 0 && (
            <View style={styles.alertSection}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Bell size={16} color="#f59e0b" />
                  <Text style={styles.sectionTitle}>Alerts & Reminders</Text>
                </View>
                <Text style={styles.viewAll}>View All</Text>
              </View>

              {initialAlerts.map(alert => (
                <Pressable key={alert.id} style={[styles.alertCard, alert.type === 'warning' ? styles.warningBorder : styles.infoBorder]}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{alert.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertName}>{alert.name}</Text>
                    <Text style={styles.alertMsg}>{alert.message}</Text>
                  </View>
                  <ChevronRight size={16} color={theme.colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
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
                  <View style={[styles.catIconBox, { backgroundColor: cat.color }]}>
                    <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                  </View>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catCount}>{cat.count}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Documents */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Recent Vault Items'}
              </Text>
              <Text style={styles.viewAll}>See All</Text>
            </View>

            {filteredDocs.length > 0 ? (
              filteredDocs.map(doc => (
                <Pressable key={doc.id} style={styles.docRow}>
                  <View style={styles.docIconBox}>
                    <Text style={{ fontSize: 20 }}>{doc.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={styles.docBadge}>
                        <Text style={styles.docBadgeText}>{doc.type}</Text>
                      </View>
                      <Text style={styles.docDate}>{doc.date}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={theme.colors.mutedForeground} />
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>No documents found</Text>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsGrid}>
            <Pressable style={styles.actionCard} onPress={handleScan}>
              <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                <Camera size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Scan</Text>
                <Text style={styles.actionSub}>With OCR</Text>
              </View>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={handleUpload}>
              <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
                <Upload size={20} color="#22c55e" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Upload</Text>
                <Text style={styles.actionSub}>From device</Text>
              </View>
            </Pressable>
          </View>

          {/* Emergency Access */}
          <Pressable style={styles.emergencyCard}>
            <View style={styles.emergencyIcon}>
              <AlertTriangle size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>Emergency Access</Text>
              <Text style={styles.emergencySub}>Quick access to critical docs</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.mutedForeground} />
          </Pressable>

        </ScrollView>

        {/* Floating Add Button */}
        <Pressable style={styles.fab} onPress={handleScan}>
          <Plus size={24} color="#fff" />
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
    backgroundColor: theme.colors.background,
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
    borderRadius: 12,
    backgroundColor: theme.colors.muted, // hover:bg-muted eq
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.foreground,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.muted,
    borderRadius: 12,
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
    color: theme.colors.foreground,
    fontSize: 14,
  },
  filterBtn: {
    padding: 4,
  },
  storageCard: {
    backgroundColor: '#1e3a8a', // gradient primary approx
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#1e3a8a",
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
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  storageDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  alertCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  alertLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
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
    color: theme.colors.foreground,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.card, // card-soft
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  warningBorder: {
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb', // slight yellow tint
  },
  infoBorder: {
    borderLeftColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  alertName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground,
  },
  alertMsg: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  catCount: {
    fontSize: 11,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  docIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.foreground,
  },
  docBadge: {
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.mutedForeground,
    textTransform: 'capitalize',
  },
  docDate: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.mutedForeground,
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
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
  actionSub: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2', // red-50
    borderColor: '#fecaca', // red-200
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  emergencySub: {
    fontSize: 12,
    color: '#6b7280',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
