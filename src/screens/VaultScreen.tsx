import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  TouchableOpacity,
  BackHandler,
} from "react-native";
import { AppLayout } from "../components/layout";
import { useFamily } from "../contexts/FamilyContext";
import { useFinance } from "../contexts/FinanceContext";
import type { VaultDocument } from "../contexts/FamilyContext";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { useSidebar } from "../contexts/SidebarContext";
import { useToast } from "../components/ui/Toast";
import { useCountry } from "../contexts/CountryContext";
import { DocumentScanner } from "../components/vault/DocumentScanner";
import { ImageViewerModal } from "../components/modals/ImageViewerModal";
import { DocumentDetailsModal } from "../components/modals/DocumentDetailsModal";
import { FilterModal, FilterOptions } from "../components/modals/FilterModal";
import { NotificationPanel } from "../components/notifications/NotificationPanel";
import { calculateTotalStorage, formatStorageSize } from "../utils/StorageUtils";
import { generateAlerts, getCategoryCounts } from "../utils/VaultUtils";
import { formatReminderRulesSummary, getPrimaryReminderField } from "../utils/VaultReminderUtils";
import { SavedDocument } from "../utils/DocumentUtils";
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
  AlertTriangle,
  ArrowLeft,
  FileText,
  Activity
} from "lucide-react-native";


export const VaultScreen: React.FC = () => {
  const { globalVault, memberVaults, activeMember, addDocument, updateDocument } = useFamily();
  const { openSidebar } = useSidebar();
  const { showToast } = useToast();
  const { addTransaction, categoryIcons } = useFinance(); // For syncing expenses
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    dateFrom: '',
    dateTo: '',
    expiryStatus: [],
  });
  const [storageUsed, setStorageUsed] = useState('0 B');
  const [currentView, setCurrentView] = useState<'main' | 'category' | 'all'>('main');
  const [viewCategory, setViewCategory] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { formatDateTime } = useCountry();
  const nowDate = new Date(currentTime);

  const formatVaultDateLabel = (value?: string): string | null => {
    if (!value) return null;
    return formatDateTime(value, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDocumentDateLabel = (doc: VaultDocument): string | null => {
    if (doc.type === 'bill' && doc.billDate) {
      const formatted = formatVaultDateLabel(doc.billDate);
      return formatted ? `Due ${formatted}` : null;
    }
    if (doc.type === 'warranty' && doc.warrantyTillDate) {
      const formatted = formatVaultDateLabel(doc.warrantyTillDate);
      return formatted ? `Expires ${formatted}` : null;
    }
    if (doc.type === 'service' && doc.nextServiceDate) {
      const formatted = formatVaultDateLabel(doc.nextServiceDate);
      return formatted ? `Next service ${formatted}` : null;
    }
    if (doc.type === 'insurance' && doc.expiryDate) {
      const formatted = formatVaultDateLabel(doc.expiryDate);
      return formatted ? `Renewal ${formatted}` : null;
    }
    const fallback = formatVaultDateLabel(doc.date);
    return fallback ? `Added ${fallback}` : null;
  };

  const getDocumentStatus = (doc: VaultDocument): string | null => {
    const field = getPrimaryReminderField(doc.type);
    const rawDate = field ? (doc as any)[field] : doc.date;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    const days = Math.ceil((parsed.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) {
      return 'Expired';
    }
    if (days === 0) {
      return 'Due today';
    }
    if (days <= 7) {
      return `Expiring in ${days} day${days === 1 ? '' : 's'}`;
    }
    return `${days} day${days === 1 ? '' : 's'} left`;
  };

  const getReminderSummaryText = (doc: VaultDocument): string | null => {
    if (!doc.reminderRules || doc.reminderRules.length === 0) {
      return null;
    }
    return formatReminderRulesSummary(doc.reminderRules);
  };

  const renderDocMeta = (doc: VaultDocument) => {
    const statusText = getDocumentStatus(doc);
    const reminderText = getReminderSummaryText(doc);
    if (!statusText && !reminderText) return null;
    return (
      <View style={{ marginTop: 4 }}>
        {statusText ? <Text style={[styles.docMetaText, { color: colors.mutedForeground }]}>{statusText}</Text> : null}
        {reminderText ? (
          <Text style={[styles.docMetaText, { color: colors.primary }]} numberOfLines={2}>
            {reminderText}
          </Text>
        ) : null}
      </View>
    );
  };

  // Combine global vault and ALL member vaults (not just active member)
  // This matches the count shown on the home screen
  const allDocs = useMemo(() => {
    const allMemberDocs = Object.values(memberVaults || {}).flat();
    return [...(globalVault || []), ...allMemberDocs];
  }, [globalVault, memberVaults]);

  useEffect(() => {
    if (!selectedDocument) return;
    const updated = allDocs.find(doc => doc.id === selectedDocument.id);
    if (updated) {
      setSelectedDocument(updated);
    }
  }, [allDocs, selectedDocument]);

  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000);
    return () => clearInterval(ticker);
  }, []);

  // Calculate dynamic values
  const categoryCounts = getCategoryCounts(allDocs);
  const [vaultAlerts, setVaultAlerts] = useState<any[]>([]);
  const alertFingerprint = useMemo(
    () =>
      allDocs
        .map(doc =>
          [
            doc.id,
            doc.type,
            doc.warrantyTillDate || '',
            doc.billDate || '',
            doc.nextServiceDate || '',
            doc.expiryDate || '',
          ].join(':')
        )
        .join('|'),
    [allDocs]
  );

  useEffect(() => {
    setVaultAlerts(generateAlerts(allDocs));
  }, [alertFingerprint, currentTime]);

  const liveAlerts = vaultAlerts;

  const handleClearAllNotifications = () => {
    setVaultAlerts([]);
    setShowNotifications(false);
  };

  const handleMarkAllAsRead = () => {
    setVaultAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  const categories = [
    { id: 'warranty', name: 'Warranties', icon: '🛡️', count: categoryCounts.warranty, color: colors.info + '30' },
    { id: 'bill', name: 'Bills', icon: '🧾', count: categoryCounts.bill, color: colors.warning + '30' },
    { id: 'insurance', name: 'Insurance', icon: '📋', count: categoryCounts.insurance, color: colors.success + '30' },
    { id: 'service', name: 'Service', icon: '🔧', count: categoryCounts.service, color: colors.muted + '50' },
    { id: 'certificate', name: 'Certificates', icon: '📜', count: categoryCounts.certificate, color: colors.border },
    { id: 'receipt', name: 'Receipts', icon: '🧾', count: categoryCounts.receipt, color: colors.primary + '30' },
  ];

  // Calculate storage on mount and when docs change
  const docFingerprint = useMemo(
    () =>
      allDocs
        .map(doc =>
          [
            doc.id,
            doc.filePath || doc.uri || doc.fileUri || '',
            doc.date,
            doc.warrantyTillDate || '',
            doc.billDate || '',
            doc.nextServiceDate || '',
            doc.expiryDate || '',
          ].join(':')
        )
        .join('|'),
    [allDocs]
  );

  useEffect(() => {
    const calcStorage = async () => {
      const totalBytes = await calculateTotalStorage(allDocs);
      setStorageUsed(formatStorageSize(totalBytes));
    };
    calcStorage();
  }, [docFingerprint]);

  // Apply all filters
  const filteredDocs = allDocs.filter(doc => {
    // Search filter
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter (simple + advanced)
    const matchesCategory = !selectedCategory || doc.type === selectedCategory;
    const matchesAdvancedCategory = filters.categories.length === 0 || filters.categories.includes(doc.type);

    // Date range filter
    let matchesDateRange = true;
    if (filters.dateFrom || filters.dateTo) {
      const docDate = new Date(doc.date);
      if (filters.dateFrom && docDate < new Date(filters.dateFrom)) matchesDateRange = false;
      if (filters.dateTo && docDate > new Date(filters.dateTo)) matchesDateRange = false;
    }

    // Expiry status filter
    let matchesExpiryStatus = filters.expiryStatus.length === 0;
    if (!matchesExpiryStatus && (doc.warrantyTillDate || doc.nextServiceDate || doc.expiryDate)) {
      const now = new Date();
      const expiryDate = new Date(doc.warrantyTillDate || doc.nextServiceDate || doc.expiryDate || '');
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (filters.expiryStatus.includes('expired') && daysUntilExpiry < 0) matchesExpiryStatus = true;
      if (filters.expiryStatus.includes('expiring_soon') && daysUntilExpiry >= 0 && daysUntilExpiry <= 15) matchesExpiryStatus = true;
      if (filters.expiryStatus.includes('valid') && daysUntilExpiry > 15) matchesExpiryStatus = true;
    } else if (filters.expiryStatus.length === 0) {
      matchesExpiryStatus = true;
    }

    return matchesSearch && matchesCategory && matchesAdvancedCategory && matchesDateRange && matchesExpiryStatus;
  });

  // Get recent items (last 3 added)
  const recentDocs = [...filteredDocs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Get documents for category view
  const categoryDocs = viewCategory
    ? filteredDocs.filter(doc => doc.type === viewCategory)
    : [];

  // Handlers
  const handleCategoryClick = (categoryId: string) => {
    setViewCategory(categoryId);
    setCurrentView('category');
  };

  const handleSeeAll = () => {
    setCurrentView('all');
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 0 && currentView !== 'main') {
      // If typing, we likely want to see results.
      // User asked to "open all".
      if (currentView !== 'all') setCurrentView('all');
    } else if (text.length > 0 && currentView === 'main') {
      setCurrentView('all');
    }
  };

  useEffect(() => {
    // If filters are active, switch to all view to show results
    const isFiltered = filters.dateFrom || filters.dateTo || filters.categories.length > 0 || filters.expiryStatus.length > 0;
    if (isFiltered && currentView !== 'all') {
      setCurrentView('all');
    }
  }, [filters]);

  useEffect(() => {
    const backAction = () => {
      if (currentView !== 'main') {
        handleBackToMain();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [currentView]);

  const handleBackToMain = () => {
    setCurrentView('main');
    setViewCategory(null);
  };

  const handleDocumentSaved = (doc: SavedDocument & {
    documentName: string;
    category: string;
    purchaseDate?: string;
    warrantyTillDate?: string;
    billAmount?: string;
    billDate?: string;
    provider?: string;
    policyNumber?: string;
    premiumAmount?: string;
    serviceDate?: string;
    nextServiceDate?: string;
    cost?: string;
  }) => {
    const categoryIcons: Record<string, string> = {
      warranty: '🛡️',
      bill: '🧾',
      insurance: '📋',
      service: '🔧',
      certificate: '📜',
      receipt: '🧾',
      other: '📄',
    };

    addDocument({
      name: doc.documentName,
      type: doc.category as any,
      icon: categoryIcons[doc.category] || '📄',
      date: new Date().toISOString().split('T')[0],
      memberId: activeMember?.id || 'global',
      sharedWith: [],
      filePath: doc.uri,
      uri: doc.uri,
      // Warranty fields
      purchaseDate: doc.purchaseDate,
      warrantyTillDate: doc.warrantyTillDate,
      // Bill fields
      billAmount: doc.billAmount,
      billDate: doc.billDate,
      // Insurance fields
      provider: doc.provider,
      policyNumber: doc.policyNumber,
      premiumAmount: doc.premiumAmount,
      // Service fields
      serviceDate: doc.serviceDate,
      nextServiceDate: doc.nextServiceDate,
      cost: doc.cost,
    });

    // --- SYNC TO EXPENSES ---
    // Automatically add transaction if valid amount exists for Bills/Service/Insurance
    let expenseAmount = 0;
    const today = new Date().toISOString().split('T')[0];
    let expenseDate = today;
    let expenseCategory = '';
    let expenseName = doc.documentName;

    if (doc.category === 'bill' && doc.billAmount) {
      expenseAmount = parseFloat(doc.billAmount.replace(/[^0-9.]/g, ''));
      if (doc.billDate) expenseDate = doc.billDate;
      expenseCategory = 'Bills';
    } else if (doc.category === 'service' && doc.cost) {
      expenseAmount = parseFloat(doc.cost.replace(/[^0-9.]/g, ''));
      if (doc.serviceDate) expenseDate = doc.serviceDate;
      expenseCategory = 'Maintenance'; // Or Service
    } else if (doc.category === 'insurance' && doc.premiumAmount) {
      expenseAmount = parseFloat(doc.premiumAmount.replace(/[^0-9.]/g, ''));
      // expenseDate is usually now or purchase date? Use default.
      expenseCategory = 'Insurance';
    }

    if (expenseAmount > 0 && expenseCategory) {
      addTransaction({
        name: expenseName,
        amount: expenseAmount,
        date: expenseDate,
        type: 'expense',
        category: expenseCategory,
        icon: categoryIcons[doc.category] || '🧾'
      });

      // Optional: Notify user
      // showToast({ title: "Expense Added", description: `Added ₹${expenseAmount} to Expenses`, type: "success" });
    }
  };

  /* View Renderers */

  const renderCategoryView = () => {
    const categoryName = categories.find(c => c.id === viewCategory)?.name || 'Category';

    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {categoryDocs.length > 0 ? (
            categoryDocs.map(doc => {
              const docDateLabel = getDocumentDateLabel(doc);
              return (
                <Pressable
                  key={doc.id}
                  style={[styles.docRow, { backgroundColor: colors.card, borderRadius: radius.md }]}
                  onPress={() => {
                    setSelectedDocument(doc);
                    setShowDetailsModal(true);
                  }}
                >
                  <View style={[styles.docIconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                    <Text style={{ fontSize: 20 }}>{doc.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docName, { color: colors.foreground }]}>{doc.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {docDateLabel ? (
                        <Text style={[styles.docDate, { color: colors.mutedForeground }]}>{docDateLabel}</Text>
                      ) : null}
                    </View>
                    {renderDocMeta(doc)}
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <View style={[styles.shieldIcon, { backgroundColor: colors.muted, marginBottom: 16 }]}>
                <FileText size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyText, { color: colors.foreground, fontSize: 16, fontWeight: '600' }]}>
                No {categoryName.toLowerCase()} found
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderAllView = () => (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {categories.map(cat => {
          const docsInCat = filteredDocs.filter(d => d.type === cat.id);
          if (docsInCat.length === 0) return null;

          return (
            <View key={cat.id} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 8 }]}>{cat.name}</Text>
              {docsInCat.map(doc => {
                const docDateLabel = getDocumentDateLabel(doc);
                return (
                  <Pressable
                    key={doc.id}
                    style={[styles.docRow, { backgroundColor: colors.card, borderRadius: radius.md }]}
                    onPress={() => {
                      setSelectedDocument(doc);
                      setShowDetailsModal(true);
                    }}
                  >
                    <View style={[styles.docIconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                      <Text style={{ fontSize: 20 }}>{doc.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docName, { color: colors.foreground }]}>{doc.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {docDateLabel ? (
                          <Text style={[styles.docDate, { color: colors.mutedForeground }]}>{docDateLabel}</Text>
                        ) : null}
                      </View>
                      {renderDocMeta(doc)}
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {filteredDocs.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No documents found.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderMainView = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Search Bar Removed (Moved to Top Level) */}

      {/* Secure Storage Card */}
      <View style={[styles.storageCard, { backgroundColor: colors.primary, shadowColor: colors.primary, borderRadius: radius.card }]}>
        <View style={styles.storageContent}>
          <View style={[styles.shieldIcon, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.card }]}>
            <Shield size={28} color={colors.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.storageTitle, { color: colors.primaryForeground }]}>Secure Storage</Text>
            <Text style={[styles.storageDesc, { color: colors.primaryForeground, opacity: 0.8 }]}>{allDocs.length} documents • {storageUsed}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.alertCount, { color: colors.primaryForeground }]}>{liveAlerts.length}</Text>
            <Text style={[styles.alertLabel, { color: colors.primaryForeground, opacity: 0.7 }]}>Alerts</Text>
          </View>
        </View>
      </View>

      {/* Alerts */}
      {liveAlerts.length > 0 && (
        <View style={styles.alertSection}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Bell size={16} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alerts & Reminders</Text>
            </View>
            <Pressable onPress={() => setShowNotifications(true)}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
            </Pressable>
          </View>

          {liveAlerts.map(alert => (
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
              onPress={() => handleCategoryClick(cat.id)}
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
            Recent Vault Items
          </Text>
          <Pressable onPress={handleSeeAll}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>See All</Text>
          </Pressable>
        </View>

        {recentDocs.length > 0 ? (
          recentDocs.map(doc => {
            const docDateLabel = getDocumentDateLabel(doc);
            return (
              <Pressable
                key={doc.id}
                style={[styles.docRow, { backgroundColor: colors.card, borderRadius: radius.md }]}
                onPress={() => {
                  setSelectedDocument(doc);
                  setShowDetailsModal(true);
                }}
              >
                <View style={[styles.docIconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                  <Text style={{ fontSize: 20 }}>{doc.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docName, { color: colors.foreground }]}>{doc.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={[styles.docBadge, { backgroundColor: colors.muted, borderRadius: radius.xs }]}>
                      <Text style={[styles.docBadgeText, { color: colors.mutedForeground }]}>{doc.type}</Text>
                    </View>
                    {docDateLabel ? (
                      <Text style={[styles.docDate, { color: colors.mutedForeground }]}>{docDateLabel}</Text>
                    ) : null}
                  </View>
                  {renderDocMeta(doc)}
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          })
        ) : (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No documents found</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>

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
    </ScrollView>
  );

  const handleScan = () => {
    setShowScanner(true);
  };

  const handleUpload = () => {
    setShowScanner(true);
  };

  return (
    <AppLayout showNav={false} showAddButton={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {currentView === 'main' && (
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

              <Pressable style={[styles.iconBtn, { borderColor: colors.border, borderRadius: radius.sm }]} onPress={handleUpload}>
                <Upload size={20} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
        )}

        {currentView === 'category' && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable onPress={handleBackToMain} style={[styles.menuBtn, { backgroundColor: colors.card, borderRadius: radius.md }]}>
                <ArrowLeft size={24} color={colors.foreground} />
              </Pressable>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>
                  {categories.find(c => c.id === viewCategory)?.name || 'Category'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{categoryDocs.length} items</Text>
              </View>
            </View>
          </View>
        )}

        {currentView === 'all' && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable onPress={handleBackToMain} style={[styles.menuBtn, { backgroundColor: colors.card, borderRadius: radius.md }]}>
                <ArrowLeft size={24} color={colors.foreground} />
              </Pressable>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>All Documents</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Grouped by category</Text>
              </View>
            </View>
          </View>
        )}

        {/* Persistent Search Bar */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <View style={[styles.searchContainer, { backgroundColor: colors.muted, borderRadius: radius.md, marginBottom: 0 }]}>
            <Search size={16} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search vault, warranties..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            <TouchableOpacity
              style={[styles.filterBtn, { padding: 8, zIndex: 10 }]}
              onPress={() => setShowFilterModal(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Filter size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {currentView === 'main' ? renderMainView() :
          currentView === 'category' ? renderCategoryView() :
            renderAllView()}

        {/* Floating Add Button */}
        <Pressable style={[styles.fab, { backgroundColor: colors.primary, borderRadius: radius.full }]} onPress={handleScan}>
          <Plus size={24} color={colors.primaryForeground} />
        </Pressable>

        <DocumentScanner
          open={showScanner}
          onOpenChange={setShowScanner}
          onDocumentSaved={handleDocumentSaved}
        />

        <ImageViewerModal
          visible={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUri={selectedImageUri}
        />

        <DocumentDetailsModal
          visible={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          document={selectedDocument}
          onUpdate={updateDocument}
          onViewImage={(uri) => {
            setSelectedImageUri(uri);
            setShowImageModal(true);
          }}
        />

        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={setFilters}
          currentFilters={filters}
        />

        <NotificationPanel
          open={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={liveAlerts.map(a => ({
            id: a.id,
            title: a.name,
            detail: a.message,
            tone: a.type === 'warning' ? colors.warning + '20' : colors.info + '20',
            textColor: a.type === 'warning' ? colors.warning : colors.info,
            icon: 'bell', // Use a standard icon string here, mapping required if NotificationPanel expects specific strings
            time: 'Now',
            read: false
          })) as any}
          onClearAll={handleClearAllNotifications}
          onMarkAllRead={handleMarkAllAsRead}
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
  docMetaText: {
    fontSize: 10,
    lineHeight: 14,
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
