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
import { useDocumentModalSnapshot } from "../documents/DocumentModalSnapshot";
import RNFS from "react-native-fs";

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
    const [isDownloading, setIsDownloading] = useState(false);
    const { snapshot: documentSnapshot } = useDocumentModalSnapshot(document);

    // On Device B, localUri is synced from Device A (its local path), so it's usually invalid there.
    // However, on the uploading device, localUri is perfectly valid and should be used instantly!
    // Priority: 1. RNFS local cache -> 2. The uploading device's own local file -> 3. Signed URL
    const cachedUri = document ? VaultService.getCachedLocalUri(document.id) : undefined;
    const viewUri = cachedUri ?? document?.localUri ?? signedUrl ?? undefined;

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

    useEffect(() => {
        if (!visible) {
            return;
        }
        if (!documentSnapshot || isEditMode) {
            return;
        }
        hydrateForm(documentSnapshot);
    }, [documentSnapshot, visible, isEditMode]);

    useEffect(() => {
        if (visible) {
            setIsEditMode(false);
            setNameError('');
        }
    }, [visible]);

    useEffect(() => {
        if (!document) {
            setSignedUrl(null);
            return;
        }

        // 🚀 Prioritize the verified local cache or the uploading device's original local file.
        // If we already have the file perfectly viewable on this device, NO network needed!
        if (VaultService.getCachedLocalUri(document.id) || document.localUri) {
            setSignedUrl(null);
            return;
        }

        // If it's a new draft with no remote path yet, we can't fetch a signed URL anyway.
        if (!document.remotePath) {
            setSignedUrl(null);
            return;
        }
        let active = true;
        VaultStorageService.getSignedUrl(document.remotePath, 60)
            .then(url => {
                if (active) {
                    setSignedUrl(url);
                }
            })
            .catch(error => {
                console.error('Failed to fetch signed URL for document modal:', error);
                if (active) {
                    setSignedUrl(null);
                }
            });
        return () => {
            active = false;
        };
    }, [document?.localUri, document?.remotePath, document?.uploadStatus]);

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
        if (!uriToOpen && document.remotePath) {
            try {
                uriToOpen = await VaultStorageService.getSignedUrl(document.remotePath, 60);
                setSignedUrl(uriToOpen);
            } catch (error) {
                console.error('Error fetching signed URL for document:', error);
                pushNotification("Error", "Could not load this file. Please try again.", "warning");
                return;
            }
        }

        if (!uriToOpen) {
            pushNotification("Error", "No file available to show.", "warning");
            return;
        }

        // react-native-file-viewer requires local file paths.
        // If the URL is remote (like a Supabase signed URL), we must download it to the cache first.
        if (uriToOpen.startsWith('http')) {
            setIsDownloading(true);
            try {
                const isImage = isImageUri(uriToOpen);
                const extensionMatch = uriToOpen.match(/\.([a-zA-Z0-9]+)(\?|$)/);
                let ext = extensionMatch ? extensionMatch[1] : (isImage ? 'jpg' : 'pdf');

                const localPath = `${RNFS.CachesDirectoryPath}/vault_temp_${document.id}_${Date.now()}.${ext}`;

                await RNFS.downloadFile({
                    fromUrl: uriToOpen,
                    toFile: localPath,
                }).promise;

                uriToOpen = `file://${localPath}`;
            } catch (e) {
                console.error('Error downloading remote file to view:', e);
                pushNotification("Error", "Could not download file for viewing.", "warning");
                setIsDownloading(false);
                return;
            }
            setIsDownloading(false);
        }

        if (!isImageUri(uriToOpen)) {
            try {
                await FileViewer.open(uriToOpen, { showOpenWithDialog: true });
            } catch (e) {
                console.log('Error opening file:', e);
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
                }
            }
        }
    };

    const getViewButtonLabel = () => {
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
                                    onChange={setPurchaseDate}
                                    placeholder="Select purchase date"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Warranty Valid Till</Text>
                                <DateTimePicker
                                    value={warrantyTillDate}
                                    onChange={setWarrantyTillDate}
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
                                    onChange={setBillDate}
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
                                    onChange={setServiceDate}
                                    placeholder="Select service date"
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Next Service Date</Text>
                                <DateTimePicker
                                    value={nextServiceDate}
                                    onChange={setNextServiceDate}
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
                                    <Text style={[styles.documentTitle, { color: colors.foreground }]}>{document.icon} {document.name}</Text>
                                    <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20', borderRadius: radius.sm }]}>
                                        <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
                                            {CATEGORIES.find(c => c.id === document.type)?.name || document.type}
                                        </Text>
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
                                            {isDownloading ? 'Downloading...' : getViewButtonLabel()}
                                        </Text>
                                    </Pressable>
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
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
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    categoryBadgeText: {
        fontSize: 13,
        fontWeight: '600',
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
