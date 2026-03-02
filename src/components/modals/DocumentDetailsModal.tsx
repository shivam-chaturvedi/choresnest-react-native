import React, { useState, useEffect, useRef } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,
    Image,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Linking,
} from "react-native";
import { X, Edit2, Save } from "lucide-react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { VaultDocument } from "../../contexts/FamilyContext";
import { NotificationCenter } from "../../services/NotificationCenter";
import { VaultStorageService } from "../../services/VaultStorageService";
import { VaultService } from "../../services/VaultService";
import { DateTimePicker } from "../ui/SimpleDatePicker";
import {
    formatReminderRuleSummary,
    getPrimaryReminderField,
    normalizeReminderOffsets,
    normalizeReminderTime,
    REMINDER_OFFSET_OPTIONS,
    VaultReminderRule,
} from "../../utils/VaultReminderUtils";
import FileViewer from 'react-native-file-viewer';
import NetInfo from '@react-native-community/netinfo';
import { AppIcon } from "../ui/AppIcon";

interface DocumentDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    document: VaultDocument | null;
    onUpdate: (docId: string, updates: Partial<Omit<VaultDocument, "id">>) => Promise<any>;
    onViewImage?: (uri: string) => void;
}

const CATEGORIES = [
    { id: 'warranty', name: 'Warranty', icon: '🛡️' },
    { id: 'bill', name: 'Bill', icon: '🧾' },
    { id: 'insurance', name: 'Insurance', icon: '📋' },
    { id: 'service', name: 'Service', icon: '🔧' },
    { id: 'certificate', name: 'Certificate', icon: '📜' },
    { id: 'receipt', name: 'Receipt', icon: '🧾' },
    { id: 'other', name: 'Other', icon: '📄' },
];

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
    visible,
    onClose,
    document,
    onUpdate,
    onViewImage,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const pushNotification = (title: string, detail: string, severity: "success" | "warning" | "default" = "default") => {
        NotificationCenter.addNotification({
            title,
            detail,
            tone:
                severity === "success"
                    ? colors.success + "20"
                    : severity === "warning"
                        ? colors.warning + "20"
                        : colors.muted + "50",
            textColor:
                severity === "success"
                    ? colors.success
                    : severity === "warning"
                        ? colors.warning
                        : colors.foreground,
            icon: severity === "warning" ? "alertCircle" : "file",
            route: { tab: "home", screen: "Vault" },
        });
    };
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [resolvedLocalUri, setResolvedLocalUri] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showViewerModal, setShowViewerModal] = useState(false);
    const [viewerErrorMessage, setViewerErrorMessage] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [downloadStatus, setDownloadStatus] = useState<'idle' | 'pending' | 'error'>('idle');
    const [downloadError, setDownloadError] = useState<string | null>(null);
    // Priority: resolved+verified local file > Supabase signed URL
    const viewUri = resolvedLocalUri ?? signedUrl ?? undefined;

    // Form fields
    const [documentName, setDocumentName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [warrantyTillDate, setWarrantyTillDate] = useState('');
    const [billAmount, setBillAmount] = useState('');
    const [billDate, setBillDate] = useState('');
    const [provider, setProvider] = useState('');
    const [policyNumber, setPolicyNumber] = useState('');
    const [premiumAmount, setPremiumAmount] = useState('');
    const [serviceDate, setServiceDate] = useState('');
    const [nextServiceDate, setNextServiceDate] = useState('');
    const [cost, setCost] = useState('');
    const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [nameError, setNameError] = useState('');

    const createDateSetter = (fieldName: string, setter: (value: string) => void) => (value: string) => {
        console.log(`[DocumentDetailsModal] ${fieldName} changed to`, value);
        setter(value);
    };

    const handlePurchaseDateChange = createDateSetter('purchaseDate', setPurchaseDate);
    const handleWarrantyTillDateChange = createDateSetter('warrantyTillDate', setWarrantyTillDate);
    const handleBillDateChange = createDateSetter('billDate', setBillDate);
    const handleServiceDateChange = createDateSetter('serviceDate', setServiceDate);
    const handleNextServiceDateChange = createDateSetter('nextServiceDate', setNextServiceDate);

    const hydrateForm = (doc: VaultDocument) => {
        setDocumentName(doc.name || '');
        setSelectedCategory(doc.type || '');
        setPurchaseDate(doc.purchaseDate || '');
        setWarrantyTillDate(doc.warrantyTillDate || '');
        setBillAmount(doc.billAmount || '');
        setBillDate(doc.billDate || '');
        setProvider(doc.provider || '');
        setPolicyNumber(doc.policyNumber || '');
        setPremiumAmount(doc.premiumAmount || '');
        setServiceDate(doc.serviceDate || '');
        setNextServiceDate(doc.nextServiceDate || '');
        setCost(doc.cost || '');
        const reminderField = getPrimaryReminderField(doc.type);
        const reminderRule = reminderField ? (doc.reminderRules || []).find(rule => rule.field === reminderField) : undefined;
        setReminderOffsets(reminderRule?.offsets ? normalizeReminderOffsets(reminderRule.offsets) : [1]);
        setReminderTime(reminderRule?.timeOfDay || '09:00');
    };

    const lastHydratedIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!visible || !document) {
            lastHydratedIdRef.current = null;
            return;
        }
        if (lastHydratedIdRef.current === document.id) {
            return;
        }
        hydrateForm(document);
        lastHydratedIdRef.current = document.id;
    }, [visible, document?.id]);

    useEffect(() => {
        if (visible) {
            setIsEditMode(false);
            setNameError('');
        }
    }, [visible]);

    useEffect(() => {
        if (!visible || !document) {
            setResolvedLocalUri(null);
            setSignedUrl(null);
            setDownloadStatus('idle');
            setDownloadProgress(null);
            setDownloadError(null);
            return;
        }

        let active = true;
        const resolve = async () => {
            if (resolvedLocalUri) {
                setDownloadStatus('idle');
                setDownloadProgress(null);
                setSignedUrl(null);
                return;
            }

            const canDownload = Boolean(document.remotePath && document.uploadStatus === 'uploaded');
            if (canDownload) {
                setDownloadError(null);
                setDownloadStatus('pending');
                setDownloadProgress(0);
                try {
                    const localUri = await VaultService.ensureLocalUri(document, (bytesWritten, contentLength) => {
                        if (!active || contentLength <= 0) {
                            return;
                        }
                        const ratio = Math.min(Math.max(bytesWritten / contentLength, 0), 1);
                        setDownloadProgress(ratio);
                    });
                    if (!active) {
                        return;
                    }
                    if (localUri) {
                        setResolvedLocalUri(localUri);
                        setSignedUrl(null);
                        setDownloadStatus('idle');
                        setDownloadProgress(null);
                        return;
                    }
                    setDownloadStatus('error');
                    setDownloadError('Unable to download this file at the moment.');
                } catch (error) {
                    if (!active) {
                        return;
                    }
                    console.error('DocumentDetailsModal: failed to download document', error);
                    setDownloadStatus('error');
                    setDownloadError(extractErrorMessage(error));
                } finally {
                    if (active) {
                        setDownloadProgress(null);
                        setDownloadStatus(prev => (prev === 'error' ? 'error' : 'idle'));
                    }
                }
            }

            if (!active) {
                return;
            }

            if (!document.remotePath) {
                setSignedUrl(null);
                return;
            }

            try {
                const url = await VaultStorageService.getSignedUrl(document.remotePath, 3600);
                if (active) {
                    setSignedUrl(url);
                }
            } catch (err) {
                console.error('Failed to fetch signed URL for document modal:', err);
                if (active) setSignedUrl(null);
            }
        };

        resolve();
        return () => { active = false; };
    }, [visible, document?.id, document?.localUri, document?.remotePath, document?.uploadStatus, resolvedLocalUri]);

    if (!document) return null;

    const handleSave = async () => {
        if (!documentName.trim()) {
            setNameError('Document Name is required');
            return;
        }

        const categoryIcons: Record<string, string> = {
            warranty: '🛡️',
            bill: '🧾',
            insurance: '📋',
            service: '🔧',
            certificate: '📜',
            receipt: '🧾',
            other: '📄',
        };

        setIsSaving(true);
        try {
            await onUpdate(document.id, {
                name: documentName,
                type: selectedCategory as any,
                icon: categoryIcons[selectedCategory] || '📄',
                purchaseDate,
                warrantyTillDate,
                billAmount,
                billDate,
                provider,
                policyNumber,
                premiumAmount,
                serviceDate,
                nextServiceDate,
                cost,
                reminderRules: buildReminderRules(),
            });

            pushNotification("Document updated", `${documentName} details saved successfully.`, "success");
            setIsEditMode(false);
        } catch (error) {
            console.error("Failed to update document:", error);
            pushNotification("Error", "Failed to update document.", "warning");
        } finally {
            setIsSaving(false);
        }

    };

    const buildReminderRules = (): VaultReminderRule[] => {
        const field = getPrimaryReminderField(selectedCategory);
        const normalizedOffsets = normalizeReminderOffsets(reminderOffsets);
        if (!field || normalizedOffsets.length === 0) {
            return [];
        }
        return [{
            field,
            offsets: normalizedOffsets,
            timeOfDay: normalizeReminderTime(reminderTime),
        }];
    };

    const toggleReminderOffset = (value: number) => {
        setReminderOffsets(prev => {
            if (prev.includes(value)) {
                return prev.filter(offset => offset !== value);
            }
            return normalizeReminderOffsets([...prev, value]);
        });
    };

    const renderReminderSettings = () => {
        const rules = buildReminderRules();
        const summary = formatReminderRuleSummary(rules[0]);
        return (
            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground, marginBottom: 8 }]}>Reminder preferences</Text>
                <View style={styles.reminderSlider}>
                    {REMINDER_OFFSET_OPTIONS.map(offset => {
                        const selected = reminderOffsets.includes(offset);
                        return (
                            <Pressable
                                key={offset}
                                onPress={() => toggleReminderOffset(offset)}
                                style={[
                                    styles.reminderOption,
                                    {
                                        borderColor: selected ? colors.primary : colors.border,
                                        backgroundColor: selected ? colors.primary + "20" : colors.background,
                                        borderRadius: radius.md,
                                    },
                                ]}
                            >
                                <Text style={{ color: selected ? colors.primary : colors.foreground }}>{offset}d</Text>
                            </Pressable>
                        );
                    })}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                    <Text style={{ color: colors.foreground }}>Time</Text>
                    <TextInput
                        style={[styles.input, { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background }]}
                        value={reminderTime}
                        onChangeText={setReminderTime}
                        placeholder="HH:MM"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numbers-and-punctuation"
                    />
                </View>
                <Text style={[styles.reminderSummary, { color: colors.mutedForeground }]}>{summary}</Text>
            </View>
        );
    };

    const stripUri = (uri: string): string => {
        return uri.split(/[?#]/)[0];
    };

    const isImageUri = (uri: string): boolean => {
        const candidate = stripUri(uri).toLowerCase();
        return /\.(jpg|jpeg|png|webp|heic)$/i.test(candidate);
    };

    const handleViewFile = async () => {
        if (!document) return;

        let uriToOpen = viewUri;

        if (!uriToOpen && document.remotePath && document.uploadStatus === 'uploaded') {
            setDownloadProgress(0);
            setIsDownloading(true);
            setDownloadStatus('pending');
            setDownloadError(null);
            try {
                const netState = await NetInfo.fetch();
                const connected = Boolean(netState.isConnected && netState.isInternetReachable !== false);
                if (!connected) {
                    setDownloadStatus('error');
                    setDownloadError("No internet connection");
                    setIsDownloading(false);
                    setDownloadProgress(null);
                    return;
                }
                uriToOpen = await VaultService.ensureLocalUri(document, (bytesWritten, contentLength) => {
                    if (contentLength > 0) {
                        setDownloadProgress(Math.min(bytesWritten / contentLength, 1));
                    }
                });
                if (uriToOpen) {
                    setResolvedLocalUri(uriToOpen);
                    setSignedUrl(null);
                }
            } catch (error) {
                console.error('Error downloading remote file to view:', error);
                const message = extractErrorMessage(error) || "Could not download file for viewing.";
                setDownloadStatus('error');
                setDownloadError(message);
                pushNotification("Error", message, "warning");
            } finally {
                setIsDownloading(false);
                setDownloadProgress(null);
                setDownloadStatus(prev => (prev === 'error' ? 'error' : 'idle'));
            }
        }

        if (!uriToOpen) {
            pushNotification("Error", "No file available to show.", "warning");
            return;
        }

        if (!isImageUri(uriToOpen)) {
            try {
                await FileViewer.open(uriToOpen, { showOpenWithDialog: true });
            } catch (e) {
                console.log('Error opening file:', e);
                handleViewerError(e);
                pushNotification("Error", "Could not open this file.", "warning");
            }
        } else {
            if (onViewImage) {
                onViewImage(uriToOpen);
            } else {
                try {
                    await FileViewer.open(uriToOpen);
                } catch (e) {
                    console.log('Error opening image:', e);
                    handleViewerError(e);
                }
            }
        }
    };

    const extractErrorMessage = (error: unknown): string => {
        if (!error) return '';
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        if (typeof error === 'object') {
            return JSON.stringify(error);
        }
        return String(error);
    };

    const handleViewerError = (error: unknown) => {
        const message = extractErrorMessage(error).toLowerCase();
        if (message.includes('no app associated')) {
            setViewerErrorMessage(
                "Looks like your device doesn't have an app that can open this file type."
            );
            setShowViewerModal(true);
        }
    };

    const handleOpenPlayStore = () => {
        const url = 'https://play.google.com/store/search?q=file+viewer';
        Linking.openURL(url).catch(() => {
            pushNotification("Error", "Unable to open the Play Store.", "warning");
        });
        setShowViewerModal(false);
    };

    const handleDismissViewerModal = () => {
        setShowViewerModal(false);
    };

    const getViewButtonLabel = () => {
        if (downloadProgress !== null) {
            const percent = Math.min(100, Math.max(0, Math.round(downloadProgress * 100)));
            return `Downloading ${percent}%`;
        }
        const sourceForLabel = viewUri ?? document?.remotePath ?? '';
        if (!sourceForLabel) return 'View File';
        const clean = stripUri(sourceForLabel).toLowerCase();
        if (clean.endsWith('.pdf')) return 'View PDF';
        if (clean.match(/\.(jpg|jpeg|png|webp|heic)$/i)) return 'View Image';
        return 'View File';
    };

    const renderCategoryFields = () => {
        if (isEditMode) {
            let editableFields: React.ReactNode = null;
            switch (selectedCategory) {
                case 'warranty':
                    editableFields = (
                        <>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Purchase Date</Text>
                                <DateTimePicker
                                    value={purchaseDate}
                                    onChange={handlePurchaseDateChange}
                                    placeholder="Select purchase date"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Warranty Valid Till</Text>
                                <DateTimePicker
                                    value={warrantyTillDate}
                                    onChange={handleWarrantyTillDateChange}
                                    placeholder="Select warranty expiry date"
                                />
                            </View>
                        </>
                    );
                    break;
                case 'bill':
                    editableFields = (
                        <>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Bill Date</Text>
                                <DateTimePicker
                                    value={billDate}
                                    onChange={handleBillDateChange}
                                    placeholder="Select bill date"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Amount</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                                    value={billAmount}
                                    onChangeText={setBillAmount}
                                    placeholder="Enter bill amount"
                                    placeholderTextColor={colors.mutedForeground}
                                    keyboardType="numeric"
                                />
                            </View>
                        </>
                    );
                    break;
                case 'insurance':
                    editableFields = (
                        <>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Insurance Provider</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                                    value={provider}
                                    onChangeText={setProvider}
                                    placeholder="Enter provider name"
                                    placeholderTextColor={colors.mutedForeground}
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Policy Number</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                                    value={policyNumber}
                                    onChangeText={setPolicyNumber}
                                    placeholder="Enter policy number"
                                    placeholderTextColor={colors.mutedForeground}
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Premium Amount</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                                    value={premiumAmount}
                                    onChangeText={setPremiumAmount}
                                    placeholder="Enter premium amount"
                                    placeholderTextColor={colors.mutedForeground}
                                    keyboardType="numeric"
                                />
                            </View>
                        </>
                    );
                    break;
                case 'service':
                    editableFields = (
                        <>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Service Date</Text>
                                <DateTimePicker
                                    value={serviceDate}
                                    onChange={handleServiceDateChange}
                                    placeholder="Select service date"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Next Service Date</Text>
                                <DateTimePicker
                                    value={nextServiceDate}
                                    onChange={handleNextServiceDateChange}
                                    placeholder="Select next service date"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Service Cost</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                                    value={cost}
                                    onChangeText={setCost}
                                    placeholder="Enter service cost"
                                    placeholderTextColor={colors.mutedForeground}
                                    keyboardType="numeric"
                                />
                            </View>
                        </>
                    );
                    break;
                default:
                    editableFields = null;
            }
            return (
                <>
                    {editableFields}
                    {renderReminderSettings()}
                </>
            );
        }
        const fields: Array<{ label: string; value: string | undefined }> = [];

        if (selectedCategory === 'warranty') {
            if (purchaseDate) fields.push({ label: 'Purchase Date', value: new Date(purchaseDate).toLocaleDateString() });
            if (warrantyTillDate) fields.push({ label: 'Warranty Valid Till', value: new Date(warrantyTillDate).toLocaleDateString() });
        } else if (selectedCategory === 'bill') {
            if (billDate) fields.push({ label: 'Bill Date', value: new Date(billDate).toLocaleDateString() });
            if (billAmount) fields.push({ label: 'Amount', value: `$${billAmount}` });
        } else if (selectedCategory === 'insurance') {
            if (provider) fields.push({ label: 'Provider', value: provider });
            if (policyNumber) fields.push({ label: 'Policy Number', value: policyNumber });
            if (premiumAmount) fields.push({ label: 'Premium', value: `$${premiumAmount}` });
        } else if (selectedCategory === 'service') {
            if (serviceDate) fields.push({ label: 'Service Date', value: new Date(serviceDate).toLocaleDateString() });
            if (nextServiceDate) fields.push({ label: 'Next Service', value: new Date(nextServiceDate).toLocaleDateString() });
            if (cost) fields.push({ label: 'Cost', value: `$${cost}` });
        }

        const reminderField = getPrimaryReminderField(selectedCategory);
        const reminderRule = reminderField ? (document.reminderRules || []).find(rule => rule.field === reminderField) : undefined;
        if (reminderRule) {
            fields.push({
                label: 'Reminders',
                value: formatReminderRuleSummary(reminderRule),
            });
        }

        return fields.map((field, index) => (
            <View key={index} style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{field.value}</Text>
            </View>
        ));
    };

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
            <View style={styles.modalContainer}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                <View style={[styles.contentContainer, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                            {isEditMode ? 'Edit Document' : 'Document Details'}
                        </Text>
                        <View style={styles.headerButtons}>
                            {!isEditMode && (
                                <Pressable
                                    onPress={() => setIsEditMode(true)}
                                    style={styles.editBtn}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Edit2 size={20} color={colors.primary} />
                                </Pressable>
                            )}
                            <TouchableOpacity
                                onPress={() => {
                                    console.log('[DocumentDetailsModal] X button pressed');
                                    onClose();
                                }}
                                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                style={styles.closeButton}
                                activeOpacity={0.6}
                            >
                                <X size={24} color={colors.mutedForeground} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                        {isEditMode ? (
                            <>
                                <View style={styles.formGroup}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={[styles.label, { color: colors.foreground, marginBottom: 0 }]}>Document Name *</Text>
                                        {nameError ? <Text style={{ color: colors.danger, fontSize: 12 }}>{nameError}</Text> : null}
                                    </View>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                                        value={documentName}
                                        onChangeText={(text) => {
                                            setDocumentName(text);
                                            if (text.trim()) setNameError('');
                                        }}
                                        placeholder="Enter document name"
                                        placeholderTextColor={colors.mutedForeground}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={[styles.label, { color: colors.foreground }]}>Category *</Text>
                                    <View style={styles.categoryGrid}>
                                        {CATEGORIES.map(cat => (
                                            <Pressable
                                                key={cat.id}
                                                style={[
                                                    styles.categoryChip,
                                                    {
                                                        backgroundColor: selectedCategory === cat.id ? colors.primary : colors.background,
                                                        borderColor: selectedCategory === cat.id ? colors.primary : colors.border,
                                                        borderRadius: radius.md,
                                                    }
                                                ]}
                                                onPress={() => setSelectedCategory(cat.id)}
                                            >
                                                <Text style={{ fontSize: 16, marginRight: 4 }}>{cat.icon}</Text>
                                                <Text style={[
                                                    styles.categoryChipText,
                                                    { color: selectedCategory === cat.id ? colors.primaryForeground : colors.foreground }
                                                ]}>
                                                    {cat.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {renderCategoryFields()}

                                <View style={styles.buttonGroup}>
                                    <Pressable
                                        style={[styles.cancelButton, { backgroundColor: colors.muted, borderRadius: radius.md }]}
                                        onPress={() => setIsEditMode(false)}
                                    >
                                        <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        disabled={isSaving}
                                        style={[
                                            styles.saveButton,
                                            {
                                                backgroundColor: colors.primary,
                                                borderRadius: radius.md,
                                                opacity: isSaving ? 0.7 : 1,
                                            },
                                        ]}
                                        onPress={handleSave}
                                    >
                                        <Save size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                                        <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save Changes</Text>
                                    </Pressable>
                                </View>
                            </>
                        ) : (
                            <>
                    <View style={styles.detailSection}>
                        <View style={styles.documentTitleRow}>
                            <View style={[styles.documentIcon, { backgroundColor: colors.muted + '20', borderRadius: radius.md }]}>
                                <AppIcon source={document.icon || 'file'} size={28} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.documentTitle, { color: colors.foreground }]}>{document.name}</Text>
                                <Text style={[styles.documentType, { color: colors.mutedForeground }]}>
                                    {CATEGORIES.find(c => c.id === document.type)?.name || document.type}
                                </Text>
                            </View>
                        </View>
                    </View>

                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Added On</Text>
                                    <Text style={[styles.detailValue, { color: colors.foreground }]}>{new Date(document.date).toLocaleDateString()}</Text>
                                </View>

                                {renderCategoryFields()}

                    {viewUri && (
                        <Pressable
                            disabled={isDownloading}
                            style={[
                                            styles.viewFileButton,
                                            {
                                                backgroundColor: isDownloading ? colors.muted : colors.primary,
                                                borderRadius: radius.md
                                            }
                                        ]}
                                        onPress={handleViewFile}
                                    >
                                <Text style={[
                                    styles.viewFileButtonText,
                        { color: isDownloading ? colors.mutedForeground : colors.primaryForeground }
                    ]}>
                                {getViewButtonLabel()}
                            </Text>
                        </Pressable>
                    )}
                    {!viewUri && (
                        <View style={[styles.viewUnavailableBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            <View style={styles.viewUnavailableRow}>
                                {downloadStatus === 'pending' && downloadProgress !== null ? (
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.viewUnavailableText, { color: colors.mutedForeground }]}>
                                            Downloading document… ({Math.min(100, Math.max(0, Math.round(downloadProgress * 100)))}%)
                                        </Text>
                                        <View style={styles.downloadProgressBar}>
                                            <View
                                                style={[
                                                    styles.downloadProgressFill,
                                                    {
                                                        width: `${Math.min(100, Math.max(0, Math.round(downloadProgress * 100)))}%`,
                                                        backgroundColor: colors.primary,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                ) : downloadStatus === 'error' ? (
                                    <Text style={[styles.viewUnavailableText, { color: colors.warning }]}>
                                        {downloadError ?? "Unable to download this file at the moment."}
                                    </Text>
                                ) : (
                                    <Text style={[styles.viewUnavailableText, { color: colors.mutedForeground }]}>
                                        {(() => {
                                            if (document.uploadStatus && ['pending_upload', 'uploading'].includes(document.uploadStatus)) {
                                                return 'Document is still uploading. Please try again after the upload finishes.';
                                            }
                                            if (document.uploadStatus === 'failed') {
                                                return 'Upload failed. Please retry the document upload before viewing.';
                                            }
                                            if (!document.remotePath && !document.localUri) {
                                                return 'No file has been attached to this document yet.';
                                            }
                                            return 'Unable to load this file at the moment.';
                                        })()}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
            <Modal
                visible={showViewerModal}
                transparent
                animationType="fade"
                onRequestClose={handleDismissViewerModal}
            >
                <View style={styles.viewerModalOverlay}>
                    <View style={[styles.viewerModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.viewerModalTitle, { color: colors.foreground }]}>No viewer installed</Text>
                        <Text style={[styles.viewerModalBody, { color: colors.mutedForeground }]}>
                            {viewerErrorMessage || "Install a document viewer from the Play Store to open this attachment."}
                        </Text>
                        <View style={styles.viewerModalActions}>
                            <Pressable
                                onPress={handleDismissViewerModal}
                                style={[
                                    styles.viewerModalAction,
                                    { borderColor: colors.primary, backgroundColor: colors.background },
                                ]}
                            >
                                <Text style={[styles.viewerModalActionText, { color: colors.primary }]}>Dismiss</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleOpenPlayStore}
                                style={[
                                    styles.viewerModalAction,
                                    { borderColor: colors.primary, backgroundColor: colors.primary },
                                ]}
                            >
                                <Text style={[styles.viewerModalActionText, { color: colors.primaryForeground }]}>Open Play Store</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    contentContainer: {
        width: "100%",
        maxWidth: 500,
        maxHeight: '90%',
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 1, // Ensure modal content is above overlay
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        zIndex: 100, // Ensure buttons are above other elements
        elevation: 100,
    },
    editBtn: {
        padding: 12,
        zIndex: 100,
    },
    closeButton: {
        padding: 12,
        backgroundColor: 'transparent', // Ensure touch capture
        zIndex: 100,
        elevation: 100,
    },
    scrollContainer: {
        maxHeight: 500,
    },
    detailSection: {
        marginBottom: 20,
    },
    documentTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    documentType: {
        fontSize: 13,
        fontWeight: '500',
    },
    documentTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    documentIcon: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    viewFileButton: {
        marginTop: 20,
        paddingVertical: 14,
        alignItems: 'center',
    },
    viewFileButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    viewUnavailableBox: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
    },
    viewUnavailableRow: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    viewUnavailableText: {
        fontSize: 13,
        lineHeight: 18,
    },
    downloadProgressBar: {
        marginTop: 8,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.06)',
        width: '100%',
        overflow: 'hidden',
    },
    downloadProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    viewerModalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 10,
    },
    viewerModal: {
        width: '100%',
        maxWidth: 360,
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
    },
    viewerModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    viewerModalBody: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    viewerModalActions: {
        width: '100%',
        flexDirection: 'column',
    },
    viewerModalAction: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    viewerModalActionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        marginBottom: 8,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    reminderSlider: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    reminderOption: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
    },
    reminderSummary: {
        fontSize: 12,
        marginTop: 8,
    },
});
