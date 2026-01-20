import React, { useState, useEffect } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableWithoutFeedback,
    TextInput,
    ScrollView,
    Image,
} from "react-native";
import { X, Edit2, Save } from "lucide-react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { VaultDocument } from "../../contexts/FamilyContext";
import { useToast } from "../ui/Toast";
import { DateTimePicker } from "../ui/SimpleDatePicker";
import FileViewer from 'react-native-file-viewer';

interface DocumentDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    document: VaultDocument | null;
    onUpdate: (docId: string, memberId: string, updates: Partial<Omit<VaultDocument, "id">>) => void;
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
    const { showToast } = useToast();
    const [isEditMode, setIsEditMode] = useState(false);

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
    const [nameError, setNameError] = useState('');

    useEffect(() => {
        if (document) {
            setDocumentName(document.name || '');
            setSelectedCategory(document.type || '');
            setPurchaseDate(document.purchaseDate || '');
            setWarrantyTillDate(document.warrantyTillDate || '');
            setBillAmount(document.billAmount || '');
            setBillDate(document.billDate || '');
            setProvider(document.provider || '');
            setPolicyNumber(document.policyNumber || '');
            setPremiumAmount(document.premiumAmount || '');
            setServiceDate(document.serviceDate || '');
            setNextServiceDate(document.nextServiceDate || '');
            setCost(document.cost || '');
        }
    }, [document]);

    useEffect(() => {
        if (visible) {
            setIsEditMode(false);
            setNameError('');
        }
    }, [visible]);

    if (!document) return null;

    const handleSave = () => {
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

        try {
            onUpdate(document.id, document.memberId, {
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
            });

            showToast({ title: "Success", description: "Document updated successfully.", type: "success" });
            setIsEditMode(false);
        } catch (error) {
            console.error("Failed to update document:", error);
            showToast({ title: "Error", description: "Failed to update document.", type: "warning" });
        }

    };

    const handleViewFile = async () => {
        if (!document.uri) return;

        const isImage = (uri: string) => {
            const lower = uri.toLowerCase();
            return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.heic');
        };

        if (!isImage(document.uri)) {
            try {
                await FileViewer.open(document.uri, { showOpenWithDialog: true });
            } catch (e) {
                console.log('Error opening file:', e);
                showToast({ title: "Error", description: "Could not open this file.", type: "warning" });
            }
        } else {
            // It is an image
            if (onViewImage) {
                onViewImage(document.uri);
            } else {
                // Fallback to FileViewer if no handler provided
                try {
                    await FileViewer.open(document.uri);
                } catch (e) {
                    console.log('Error opening image:', e);
                }
            }
        }
    };

    const renderCategoryFields = () => {
        if (isEditMode) {
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
        } else {
            // View mode - show data
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

            return fields.map((field, index) => (
                <View key={index} style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>{field.value}</Text>
                </View>
            ));
        }
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
                                <Pressable onPress={() => setIsEditMode(true)} style={styles.editBtn} hitSlop={8}>
                                    <Edit2 size={20} color={colors.primary} />
                                </Pressable>
                            )}
                            <Pressable onPress={onClose} hitSlop={8}>
                                <X size={20} color={colors.mutedForeground} />
                            </Pressable>
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
                                        style={[styles.saveButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
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

                                {document.uri && (
                                    <Pressable
                                        style={[styles.viewFileButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                                        onPress={handleViewFile}
                                    >
                                        <Text style={[styles.viewFileButtonText, { color: colors.primaryForeground }]}>
                                            {document.uri.toLowerCase().endsWith('.pdf') ? 'View PDF' :
                                                document.uri.match(/\.(jpg|jpeg|png|webp|heic)$/i) ? 'View Image' :
                                                    'View File'}
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
        gap: 12,
        alignItems: 'center',
    },
    editBtn: {
        padding: 4,
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
});
