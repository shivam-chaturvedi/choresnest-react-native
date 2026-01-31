import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableWithoutFeedback,
    ActivityIndicator,
    TextInput,
    ScrollView,
} from "react-native";
import { Camera, Upload, X } from "lucide-react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { captureImage, pickDocument, SavedDocument } from "../../utils/DocumentUtils";
import { NotificationCenter } from "../../services/NotificationCenter";
import { DateTimePicker } from "../ui/SimpleDatePicker";
import {
    formatReminderRuleSummary,
    getPrimaryReminderField,
    normalizeReminderOffsets,
    normalizeReminderTime,
    REMINDER_OFFSET_OPTIONS,
    VaultReminderRule,
} from "../../utils/VaultReminderUtils";

interface DocumentScannerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDocumentSaved?: (doc: SavedDocument & {
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
    }) => void;
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

const DocumentScannerInner: React.FC<DocumentScannerProps> = ({
    open,
    onOpenChange,
    onDocumentSaved,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'upload' | 'form'>('upload');
    const [selectedFile, setSelectedFile] = useState<SavedDocument | null>(null);

    // Form fields
    const [documentName, setDocumentName] = useState('');
    const [nameError, setNameError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Warranty fields
    const [purchaseDate, setPurchaseDate] = useState('');
    const [warrantyTillDate, setWarrantyTillDate] = useState('');

    // Bill fields
    const [billAmount, setBillAmount] = useState('');
    const [billDate, setBillDate] = useState('');

    // Insurance fields
    const [provider, setProvider] = useState('');
    const [policyNumber, setPolicyNumber] = useState('');
    const [premiumAmount, setPremiumAmount] = useState('');

    // Service fields
    const [serviceDate, setServiceDate] = useState('');
    const [nextServiceDate, setNextServiceDate] = useState('');
    const [cost, setCost] = useState('');
    const [reminderOffsets, setReminderOffsets] = useState<number[]>([1]);
    const [reminderTime, setReminderTime] = useState('09:00');

    const resetForm = () => {
        setStep('upload');
        setSelectedFile(null);
        setDocumentName('');
        setNameError('');
        setSelectedCategory('');
        setPurchaseDate('');
        setWarrantyTillDate('');
        setBillAmount('');
        setBillDate('');
        setProvider('');
        setPolicyNumber('');
        setPremiumAmount('');
        setServiceDate('');
        setNextServiceDate('');
        setCost('');
        setReminderOffsets([1]);
        setReminderTime('09:00');
    };

    const pushNotification = (title: string, detail: string, severity: "success" | "warning" | "default") => {
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

    // if (!open) return null; // Logic handled by wrapper

    const handleCamera = async () => {
        if (loading) {
            return;
        }
        setLoading(true);
        try {
            const doc = await captureImage();
            if (doc) {
                setSelectedFile(doc);
                // Don't pre-fill document name - let user enter it
                setStep('form');
            }
        } catch (error) {
            console.error(error);
            pushNotification("Error", "Failed to capture image.", "warning");
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (loading) {
            return;
        }
        setLoading(true);
        try {
            const doc = await pickDocument();
            if (doc) {
                setSelectedFile(doc);
                // Don't pre-fill document name - let user enter it
                setStep('form');
            }
        } catch (error) {
            console.error(error);
            pushNotification("Error", "Failed to upload document.", "warning");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        if (!documentName.trim()) {
            setNameError('Document Name is required');
            return;
        }
        if (!selectedCategory) {
            pushNotification("Category Required", "Please select a category for your document.", "warning");
            return;
        }

        if (selectedFile) {
            onDocumentSaved?.({
                ...selectedFile,
                documentName,
                category: selectedCategory,
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
            pushNotification("Document saved", `${documentName} added to the vault.`, "success");
            resetForm();
            onOpenChange(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onOpenChange(false);
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

    const renderCategoryFields = () => {
        switch (selectedCategory) {
            case 'warranty':
                return (
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
            case 'bill':
                return (
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
            case 'insurance':
                return (
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
            case 'service':
                return (
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
            default:
                return null;
        }
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

    return (
        <Modal
            visible={open}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.modalContainer}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                <View style={[styles.contentContainer, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                            {step === 'upload' ? 'Upload Document' : 'Document Details'}
                        </Text>
                        <Pressable onPress={handleClose} hitSlop={8}>
                            <X size={20} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    {step === 'upload' ? (
                        <View style={[styles.dashedContainer, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                            <Text style={[styles.captureTitle, { color: colors.foreground }]}>Capture or Upload</Text>
                            <Text style={[styles.captureDesc, { color: colors.mutedForeground }]}>
                                Take a photo of your document or upload an existing file
                            </Text>

                            {loading ? (
                                <View style={{ padding: 20 }}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={{ textAlign: 'center', marginTop: 10, color: colors.mutedForeground }}>Processing...</Text>
                                </View>
                            ) : (
                                <View style={styles.buttonsRow}>
                                    <Pressable
                                        style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md }]}
                                        onPress={handleCamera}
                                    >
                                        <Camera size={24} color={colors.foreground} style={{ marginBottom: 8 }} />
                                        <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Camera</Text>
                                    </Pressable>

                                    <Pressable
                                        style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md }]}
                                        onPress={handleUpload}
                                    >
                                        <Upload size={24} color={colors.foreground} style={{ marginBottom: 8 }} />
                                        <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Upload</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    ) : (
                        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
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
                            {renderReminderSettings()}

                            <View style={styles.buttonGroup}>
                                <Pressable
                                    style={[styles.cancelButton, { backgroundColor: colors.muted, borderRadius: radius.md }]}
                                    onPress={handleClose}
                                >
                                    <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.saveButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                                    onPress={handleSave}
                                >
                                    <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save Document</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export const DocumentScanner: React.FC<DocumentScannerProps> = (props) => {
    if (!props.open) return null;
    return <DocumentScannerInner {...props} />;
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
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    dashedContainer: {
        borderWidth: 2,
        borderStyle: "dashed",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
    },
    captureTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: 'center',
    },
    captureDesc: {
        textAlign: "center",
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    buttonsRow: {
        flexDirection: "row",
        gap: 16,
        width: "100%",
    },
    actionButton: {
        flex: 1,
        paddingVertical: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    actionBtnText: {
        fontWeight: "600",
        fontSize: 14,
    },
    formContainer: {
        maxHeight: 500,
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
        paddingVertical: 14,
        alignItems: 'center',
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
