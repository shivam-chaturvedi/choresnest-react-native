import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  TouchableOpacity,
  BackHandler,
  GestureResponderEvent,
} from "react-native";
import { AppLayout } from "../components/layout";
import { useFamily } from "../contexts/FamilyContext";
import { useAuth } from "../contexts/AuthContext";
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
import { calculateAppStorageUsage, calculateStorageDetails, formatStorageSize } from "../utils/StorageUtils";
import { generateAlerts, getCategoryCounts } from "../utils/VaultUtils";
import { formatReminderRulesSummary, getPrimaryReminderField } from "../utils/VaultReminderUtils";
import { saveFileToStorage, SavedDocument } from "../utils/DocumentUtils";
import RNFS from "react-native-fs";
import { DocumentUploadScheduler } from "../services/sync/DocumentUploadScheduler";
import { VaultService } from "../services/VaultService";
import NetInfo from "@react-native-community/netinfo";
import { Menu, Upload, Search, Plus, Filter, Calendar as CalendarIcon, FileText, ChevronRight, Shield, Bell, AlertTriangle, UploadCloud, X, Check, Lock, Settings, ArrowLeft } from "lucide-react-native";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppIcon } from "../components/ui/AppIcon";

import { GUEST_PROFILE_ID } from "../services/ProfileService";

import { useObservableValue } from "../hooks/useObservableValue";
import { of } from "rxjs";
import { map } from "rxjs/operators";
const PENDING_UPLOAD_STATUSES = new Set(['pending_upload', 'uploading', 'failed']);


export const VaultScreen: React.FC = () => {
  const { activeMember, addDocument, updateDocument, profileId } = useFamily();
  const { user } = useAuth();
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
  const [modalDocument, setModalDocument] = useState<VaultDocument | null>(null);
  const [scannerSession, setScannerSession] = useState<{ step: 'upload' | 'form'; file: SavedDocument | null } | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    dateFrom: '',
    dateTo: '',
    expiryStatus: [],
  });
  const [storageUsed, setStorageUsed] = useState('0 B');
  const [appStorageUsed, setAppStorageUsed] = useState('0 B');
  const [currentView, setCurrentView] = useState<'main' | 'category' | 'all'>('main');
  const [viewCategory, setViewCategory] = useState<string | null>(null);
  const [docStorageLabels, setDocStorageLabels] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isNetworkReachable, setNetworkReachable] = useState(true);
  const { formatDateTime } = useCountry();
  const nowDate = new Date(currentTime);

  const normalizeDocument = (doc: any): VaultDocument => {
    const meta = doc.meta || {};
    const cachedUri = VaultService.getCachedLocalUri(doc.id);
    const localUri = doc.localUri ?? undefined;
    const docUri = cachedUri ?? localUri ?? doc.filePath ?? undefined;
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      icon: doc.icon,
      date: doc.date,
      memberId: doc.memberId,
      filePath: doc.filePath,
      localUri,
      uri: docUri,
      uploadStatus: doc.uploadStatus,
      remotePath: doc.remotePath,
      fileSize: doc.fileSize,
      ...meta,
    };
  };

  const documents = useObservableValue(
    () => {
      if (!profileId) {
        return of<VaultDocument[]>([]);
      }
      return VaultService.observeAllDocuments(profileId).pipe(
        map(records => records.map(normalizeDocument))
      );
    },
    [profileId],
    []
  );
  const allDocs = documents;

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
    const storageText = docStorageLabels[doc.id];
    if (!statusText && !reminderText && !storageText) return null;
    return (
      <View style={{ marginTop: 4 }}>
        {statusText ? <Text style={[styles.docMetaText, { color: colors.mutedForeground }]}>{statusText}</Text> : null}
        {reminderText ? (
          <Text style={[styles.docMetaText, { color: colors.primary }]} numberOfLines={2}>
            {reminderText}
          </Text>
        ) : null}
        {storageText ? (
          <Text style={[styles.docMetaText, { color: colors.success }]}>
            Stored locally • {storageText}
          </Text>
        ) : null}
      </View>
    );
  };

  const getUploadStatusDotColor = (doc: VaultDocument): string | null => {
    if (doc.uploadStatus === 'uploaded' && doc.remotePath) {
      return colors.success;
    }
    if (doc.uploadStatus === 'pending_upload' || doc.uploadStatus === 'uploading' || doc.uploadStatus === 'failed') {
      return colors.warning;
    }
    return null;
  };

  const renderDocumentIcon = (doc: VaultDocument) => {
    const dotColor = getUploadStatusDotColor(doc);
    return (
      <View
        style={[
          styles.docIconBox,
          { backgroundColor: colors.muted, borderRadius: radius.md },
        ]}
      >
        <MaterialCommunityIcons name={doc.icon || 'file-document'} size={24} color={colors.foreground} />
        {dotColor ? (
          <View
            style={[
              styles.statusDot,
              { backgroundColor: dotColor, borderColor: colors.card },
            ]}
          />
        ) : null}
      </View>
    );
  };

  const shouldShowSyncButton = (doc: VaultDocument): boolean => {
    if (!profileId || profileId === GUEST_PROFILE_ID) {
      return false;
    }
    return Boolean(doc.uploadStatus && PENDING_UPLOAD_STATUSES.has(doc.uploadStatus) && isNetworkReachable);
  };

  const handleSyncNow = useCallback(
    (documentId: string) => {
      void DocumentUploadScheduler.requestUploadNow(profileId || user?.id);
      showToast({
        title: "Document queued",
        description: "Document is in queue.",
        type: "default",
      });
    },
    [showToast, profileId, user?.id]
  );

  const renderDocumentActions = (doc: VaultDocument) => {
    if (!shouldShowSyncButton(doc)) {
      return null;
    }
    return (
      <Pressable
        style={({ pressed }) => [
          styles.syncButton,
          {
            borderColor: colors.border,
            backgroundColor: colors.background,
            zIndex: 10,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        onPress={(event: GestureResponderEvent) => {
          event.stopPropagation();
        handleSyncNow(doc.id);
      }}
    >
      <Text style={[styles.syncButtonText, { color: colors.foreground }]}>Sync now</Text>
    </Pressable>
  );
};

  useEffect(() => {
    if (!showDetailsModal) {
      return;
    }
    if (!modalDocument) {
      console.warn('[VaultScreen] Document modal opened without snapshot');
      setShowDetailsModal(false);
    }
  }, [modalDocument, showDetailsModal]);

  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    let active = true;
    const update = (state: any) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (active) {
        setNetworkReachable(connected);
      }
    };
    NetInfo.fetch()
      .then(update)
      .catch(error => {
        console.warn('VaultScreen: unable to fetch network info', error);
      });
    const unsubscribe = NetInfo.addEventListener(update);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Calculate dynamic values
  const categoryCounts = getCategoryCounts(allDocs);
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
  const baseAlerts = useMemo(() => generateAlerts(allDocs), [alertFingerprint, currentTime]);
  const [hiddenAlertIds, setHiddenAlertIds] = useState<Set<string>>(new Set());
  const [readState, setReadState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setHiddenAlertIds(prev => {
      const ids = new Set(baseAlerts.map(alert => alert.id));
      const next = new Set([...prev].filter(id => ids.has(id)));
      const isSame = next.size === prev.size && [...next].every(id => prev.has(id));
      return isSame ? prev : next;
    });
  }, [baseAlerts]);

  useEffect(() => {
    setReadState(prev => {
      const ids = new Set(baseAlerts.map(alert => alert.id));
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(id => {
        if (!ids.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [baseAlerts]);

  const liveAlerts = useMemo(() => {
    return baseAlerts
      .filter(alert => !hiddenAlertIds.has(alert.id))
      .map(alert => ({
        ...alert,
        read: readState[alert.id] ?? alert.read ?? false,
      }));
  }, [baseAlerts, hiddenAlertIds, readState]);

  const handleClearAllNotifications = useCallback(() => {
    setHiddenAlertIds(new Set(baseAlerts.map(alert => alert.id)));
    setShowNotifications(false);
  }, [baseAlerts]);

  const handleMarkAllAsRead = useCallback(() => {
    setReadState(prev => {
      const next = { ...prev };
      baseAlerts.forEach(alert => {
        next[alert.id] = true;
      });
      return next;
    });
  }, [baseAlerts]);

  const categories = [
    { id: 'warranty', name: 'Warranties', icon: 'shield-check', count: categoryCounts.warranty, color: colors.info + '30' },
    { id: 'bill', name: 'Bills', icon: 'receipt', count: categoryCounts.bill, color: colors.warning + '30' },
    { id: 'insurance', name: 'Insurance', icon: 'clipboard-text', count: categoryCounts.insurance, color: colors.success + '30' },
    { id: 'service', name: 'Service', icon: 'wrench', count: categoryCounts.service, color: colors.muted + '50' },
    { id: 'certificate', name: 'Certificates', icon: 'certificate', count: categoryCounts.certificate, color: colors.border },
    { id: 'receipt', name: 'Receipts', icon: 'receipt', count: categoryCounts.receipt, color: colors.primary + '30' },
    { id: 'other', name: 'Other', icon: 'file-document', count: categoryCounts.other, color: colors.muted + '30' },
  ];

  // Calculate storage on mount and when docs change
  const docFingerprint = useMemo(
    () =>
      allDocs
        .map(doc =>
          [
            doc.id,
            doc.filePath || '',
            doc.remotePath || '',
            doc.localUri || doc.uri || '',
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
    let active = true;
    const computeStorage = async () => {
      try {
        const { totalBytes, detailMap } = await calculateStorageDetails(allDocs);
        if (!active) {
          return;
        }
        setStorageUsed(formatStorageSize(totalBytes));
        const formatted: Record<string, string> = {};
        Object.entries(detailMap).forEach(([docId, bytes]) => {
          formatted[docId] = formatStorageSize(bytes);
        });
        setDocStorageLabels(formatted);
      } catch (error) {
        console.warn('VaultScreen: failed to recalc storage details', error);
      }
    };
    computeStorage();
    return () => {
      active = false;
    };
  }, [docFingerprint]);

  useEffect(() => {
    let active = true;
    const measureAppStorage = async () => {
      try {
        const bytes = await calculateAppStorageUsage();
        if (!active) {
          return;
        }
        setAppStorageUsed(formatStorageSize(bytes));
      } catch (error) {
        console.warn('VaultScreen: failed to measure RNFS storage', error);
      }
    };
    measureAppStorage();
    return () => {
      active = false;
    };
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

  const clearFilters = useCallback(() => {
    setFilters({
      categories: [],
      dateFrom: '',
      dateTo: '',
      expiryStatus: [],
    });
  }, []);

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

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filters.dateFrom ||
      filters.dateTo ||
      filters.categories.length > 0 ||
      filters.expiryStatus.length > 0
    );
  }, [filters]);

  const prevFiltersActiveRef = useRef(false);

  useEffect(() => {
    if (hasActiveFilters && !prevFiltersActiveRef.current && currentView !== 'all') {
      setCurrentView('all');
    }
    prevFiltersActiveRef.current = hasActiveFilters;
  }, [hasActiveFilters, currentView]);

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

  const createSafeFileName = (name: string | undefined, sourceUri: string): string => {
    const sanitized = (name || `vault_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const extensionMatch = sourceUri.match(/(\.[^.#?]+)(?:[?#]|$)/);
    return `${sanitized}${extensionMatch?.[1] ?? ''}`;
  };

  const ensurePermanentLocalUri = async (sourceUri: string, preferredName?: string): Promise<string> => {
    if (!sourceUri) {
      throw new Error('Document URI missing');
    }
    const normalized = sourceUri.replace(/^file:\/\//i, '');
    if (normalized.startsWith(RNFS.DocumentDirectoryPath)) {
      const exists = await RNFS.exists(normalized);
      if (exists) {
        return normalized;
      }
    }
    const fileName = createSafeFileName(preferredName, sourceUri);
    return await saveFileToStorage(sourceUri, fileName);
  };

  const handleDocumentSaved = async (doc: SavedDocument & {
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
      warranty: 'shield-check',
      bill: 'receipt',
      insurance: 'clipboard-text',
      service: 'wrench',
      certificate: 'certificate',
      receipt: 'receipt',
      other: 'file-document',
    };

    const sourceUri = doc.uri ?? doc.originalUri ?? '';
    let permanentPath: string;
    try {
      permanentPath = await ensurePermanentLocalUri(sourceUri, doc.documentName);
    } catch (error) {
      console.error('VaultScreen: failed to persist document locally', error);
      showToast({ title: "Error", description: "Unable to save document locally.", type: "warning" });
      return;
    }

    addDocument({
      name: doc.documentName,
      type: doc.category as any,
      icon: categoryIcons[doc.category] || 'file-document',
      date: new Date().toISOString().split('T')[0],
      memberId: activeMember?.id || 'global',
      sharedWith: [],
      filePath: permanentPath,
      uri: permanentPath,
      localUri: permanentPath,
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
        icon: categoryIcons[doc.category] || 'receipt'
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
              const syncButton = renderDocumentActions(doc);
              return (
                <Pressable
                  key={doc.id}
                  style={[styles.docRow, { backgroundColor: colors.card, borderRadius: radius.md }]}
                  onPress={() => {
                    setModalDocument(doc);
                    setShowDetailsModal(true);
                  }}
                >
                  {renderDocumentIcon(doc)}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docName, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
                      {doc.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {docDateLabel ? (
                        <Text style={[styles.docDate, { color: colors.mutedForeground }]}>{docDateLabel}</Text>
                      ) : null}
                      {VaultService.getCachedLocalUri(doc.id) && (
                        <View style={{ backgroundColor: colors.success + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm }}>
                          <Text style={{ fontSize: 10, color: colors.success, fontWeight: '600' }}>
                            Saved locally {doc.fileSize ? `- ${formatStorageSize(doc.fileSize)}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                    {renderDocMeta(doc)}
                  </View>
                  <View style={styles.docRowControls}>
                    {syncButton && (
                      <View style={styles.syncButtonWrapper}>
                        {syncButton}
                      </View>
                    )}
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </View>
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
        {hasActiveFilters && (
          <View style={styles.clearFiltersRow}>
            <Pressable
              style={[styles.clearFiltersButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearFiltersButtonText, { color: colors.primary }]}>Clear all filters</Text>
            </Pressable>
          </View>
        )}
        {categories.map(cat => {
          const docsInCat = filteredDocs.filter(d => d.type === cat.id);
          if (docsInCat.length === 0) return null;

          return (
            <View key={cat.id} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 8 }]}>{cat.name}</Text>
              {docsInCat.map(doc => {
                const docDateLabel = getDocumentDateLabel(doc);
                const syncButton = renderDocumentActions(doc);
                return (
                  <Pressable
                    key={doc.id}
                    style={[styles.docRow, { backgroundColor: colors.card, borderRadius: radius.md }]}
                    onPress={() => {
                      setModalDocument(doc);
                      setShowDetailsModal(true);
                    }}
                  >
                    {renderDocumentIcon(doc)}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docName, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
                        {doc.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {docDateLabel ? (
                          <Text style={[styles.docDate, { color: colors.mutedForeground }]}>{docDateLabel}</Text>
                        ) : null}
                      </View>
                      {renderDocMeta(doc)}
                    </View>
                    <View style={styles.docRowControls}>
                      {syncButton && (
                        <View style={styles.syncButtonWrapper}>
                          {syncButton}
                        </View>
                      )}
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    </View>
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
            <Text style={[styles.storageDesc, { color: colors.primaryForeground, opacity: 0.6 }]}>
              Local Data Footprint: {appStorageUsed} (documents + metadata)
            </Text>
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
              <MaterialCommunityIcons name={alert.icon || 'file-document'} size={24} color={alert.type === 'danger' ? colors.danger : colors.foreground} style={{ marginRight: 12 }} />
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
                <MaterialCommunityIcons name={cat.icon || 'file-document'} size={24} color={colors.foreground} />
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
          <Pressable
            onPress={handleSeeAll}
            style={({ pressed }) => [
              styles.seeAllButton,
              {
                backgroundColor: colors.muted + '15',
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            <AppIcon name="arrowRight" size={14} color={colors.primary} style={{ marginLeft: 6 }} />
          </Pressable>
        </View>

        {recentDocs.length > 0 ? (
          recentDocs.map(doc => {
            const docDateLabel = getDocumentDateLabel(doc);
            const syncButton = renderDocumentActions(doc);
            return (
              <Pressable
                key={doc.id}
                style={[styles.docRow, { backgroundColor: colors.card, borderRadius: radius.md }]}
                onPress={() => {
                  setModalDocument(doc);
                  setShowDetailsModal(true);
                }}
              >
                {renderDocumentIcon(doc)}
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
                <View style={styles.docRowControls}>
                  {syncButton && (
                    <View style={styles.syncButtonWrapper}>
                      {syncButton}
                    </View>
                  )}
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </View>
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
    console.log('[VaultScreen] Opening scanner via handleScan');
    setShowScanner(true);
  };

  const handleUpload = () => {
    console.log('[VaultScreen] Opening scanner via handleUpload');
    setShowScanner(true);
  };

  const handleScannerOpenChange = (open: boolean) => {
    console.log('[VaultScreen] Scanner onOpenChange called with:', open);
    setShowScanner(open);
    if (!open) {
      setScannerSession(null);
    }
  };

  return (
    <AppLayout showNav={false} showAddButton={true} onAddPress={handleScan}>
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
            <View style={styles.filterBtnWrapper}>
              <TouchableOpacity
                style={[styles.filterBtn, { padding: 8, zIndex: 10 }]}
                onPress={() => setShowFilterModal(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Filter size={20} color={colors.primary} />
                {hasActiveFilters && <View style={[styles.filterDot, { backgroundColor: colors.success }]} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {currentView === 'main' ? renderMainView() :
          currentView === 'category' ? renderCategoryView() :
            renderAllView()}


        <DocumentScanner
          open={showScanner}
          onOpenChange={handleScannerOpenChange}
          onDocumentSaved={handleDocumentSaved}
          persistedState={scannerSession}
          onPersistedStateChange={setScannerSession}
        />

        <ImageViewerModal
          visible={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUri={selectedImageUri}
        />

        <DocumentDetailsModal
          visible={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setModalDocument(null);
          }}
          document={modalDocument}
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
  filterBtnWrapper: {
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
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
  clearFiltersRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  clearFiltersButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  clearFiltersButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    position: 'relative',
  },
  docRowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncButtonWrapper: {
    marginRight: 8,
  },
  docIconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },

  statusDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    top: 2,
    right: 2,
  },
  syncButton: {
    width: 56,
    height: 36,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    fontSize: 11,
    fontWeight: '600',
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
});
