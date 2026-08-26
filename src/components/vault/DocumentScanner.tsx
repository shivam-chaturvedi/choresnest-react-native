import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Camera, Upload, X } from 'lucide-react-native';
import { useThemeColors, useThemeRadius } from '../../contexts/ThemeContext';
import {
  captureImage,
  pickDocument,
  SavedDocument,
} from '../../utils/DocumentUtils';
import { NotificationCenter } from '../../services/NotificationCenter';
import { DateTimePicker } from '../ui/SimpleDatePicker';
import {
  getPrimaryReminderField,
  VaultReminderRule,
} from '../../utils/VaultReminderUtils';
import { IconGlyph } from '../ui/IconGlyph';

type ScannerStep = 'upload' | 'form';

interface ScannerSession {
  step: ScannerStep;
  file: SavedDocument | null;
}

interface DocumentScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentSaved?: (
    doc: SavedDocument & {
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
      reminderRules?: VaultReminderRule[];
    },
  ) => void | Promise<void>;
  persistedState?: ScannerSession | null;
  onPersistedStateChange?: (state: ScannerSession | null) => void;
  profileId?: string | null;
}

const CATEGORIES = [
  { id: 'warranty', name: 'Warranty', icon: 'shield-check' },
  { id: 'bill', name: 'Bill', icon: 'file-document-outline' },
  { id: 'insurance', name: 'Insurance', icon: 'shield-account' },
  { id: 'service', name: 'Service', icon: 'tools' },
  { id: 'certificate', name: 'Certificate', icon: 'certificate' },
  { id: 'receipt', name: 'Receipt', icon: 'receipt' },
  { id: 'other', name: 'Other', icon: 'dots-horizontal' },
];

const DocumentScannerInner: React.FC<DocumentScannerProps> = ({
  open,
  onOpenChange,
  onDocumentSaved,
  persistedState,
  onPersistedStateChange,
  profileId,
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'form'>('upload');
  const [selectedFile, setSelectedFile] = useState<SavedDocument | null>(null);

  // Form fields
  const [documentName, setDocumentName] = useState('');
  const [nameError, setNameError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('other');

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
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const createDateSetter =
    (fieldName: string, setter: (value: string) => void) => (value: string) => {
      console.log(`[DocumentScanner] ${fieldName} changed to`, value);
      setter(value);
    };

  const handlePurchaseDateChange = createDateSetter(
    'purchaseDate',
    setPurchaseDate,
  );
  const handleWarrantyTillDateChange = createDateSetter(
    'warrantyTillDate',
    setWarrantyTillDate,
  );
  const handleBillDateChange = createDateSetter('billDate', setBillDate);
  const handleServiceDateChange = createDateSetter(
    'serviceDate',
    setServiceDate,
  );
  const handleNextServiceDateChange = createDateSetter(
    'nextServiceDate',
    setNextServiceDate,
  );

  const prevOpenRef = useRef(false);

  const resetForm = useCallback(() => {
    setStep('upload');
    setSelectedFile(null);
    setDocumentName('');
    setNameError('');
    setCategoryError('');
    setSelectedCategory('other');
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
    setReminderEnabled(true);
    onPersistedStateChange?.(null);
  }, [onPersistedStateChange]);

  const handleExplicitClose = useCallback(() => {
    console.log('[DocumentScanner] Explicit close requested - resetting state');
    resetForm();
    onOpenChange(false);
  }, [onOpenChange, resetForm]);

  const pushNotification = (
    title: string,
    detail: string,
    severity: 'success' | 'warning' | 'default',
  ) => {
    NotificationCenter.addNotification(
      {
        title,
        detail,
        tone:
          severity === 'success'
            ? colors.success + '20'
            : severity === 'warning'
            ? colors.warning + '20'
            : colors.muted + '50',
        textColor:
          severity === 'success'
            ? colors.success
            : severity === 'warning'
            ? colors.warning
            : colors.foreground,
        icon: severity === 'warning' ? 'alertCircle' : 'file',
        route: { tab: 'home', screen: 'Vault' },
      },
      profileId,
    );
  };

  useEffect(() => {
    const prevOpen = prevOpenRef.current;
    if (!prevOpen && open && !persistedState) {
      resetForm();
    }
    prevOpenRef.current = open;
  }, [open, resetForm, persistedState]);

  useEffect(() => {
    if (!open || !persistedState) return;
    const { file, step: persistedStep } = persistedState;
    if (file && (!selectedFile || selectedFile.uri !== file.uri)) {
      setSelectedFile(file);
    }
    if (step !== persistedStep) {
      setStep(persistedStep);
    }
  }, [open, persistedState, selectedFile, step]);

  useEffect(() => {
    console.log('[DocumentScanner] mounted');
    return () => {
      console.log('[DocumentScanner] unmounted');
    };
  }, []);

  // if (!open) return null; // Logic handled by wrapper

  const handleCamera = async () => {
    console.log('[DocumentScanner] handleCamera called');
    if (loading) {
      console.log('[DocumentScanner] Already loading, returning');
      return;
    }
    setLoading(true);
    try {
      console.log('[DocumentScanner] Calling captureImage()');
      const doc = await captureImage();
      console.log(
        '[DocumentScanner] captureImage returned:',
        doc ? 'Document received' : 'null',
      );
      if (doc) {
        console.log('[DocumentScanner] Setting selectedFile and step to form');
        setSelectedFile(doc);
        setStep('form');
        onPersistedStateChange?.({ step: 'form', file: doc });
      } else {
        console.log('[DocumentScanner] No document returned from captureImage');
      }
    } catch (error) {
      console.error('[DocumentScanner] Error in handleCamera:', error);
      pushNotification('Error', 'Failed to capture image.', 'warning');
    } finally {
      setLoading(false);
      console.log(
        '[DocumentScanner] handleCamera completed, loading set to false',
      );
    }
  };

  const handleUpload = async () => {
    console.log('[DocumentScanner] handleUpload called');
    if (loading) {
      console.log('[DocumentScanner] Already loading, returning');
      return;
    }
    setLoading(true);
    try {
      console.log('[DocumentScanner] Calling pickDocument()');
      const doc = await pickDocument();
      console.log(
        '[DocumentScanner] pickDocument returned:',
        doc ? 'Document received' : 'null',
      );
      if (doc) {
        console.log('[DocumentScanner] Setting selectedFile and step to form');
        setSelectedFile(doc);
        setStep('form');
        onPersistedStateChange?.({ step: 'form', file: doc });
      } else {
        console.log('[DocumentScanner] No document returned from pickDocument');
      }
    } catch (error) {
      console.error('[DocumentScanner] Error in handleUpload:', error);
      pushNotification('Error', 'Failed to upload document.', 'warning');
    } finally {
      setLoading(false);
      console.log(
        '[DocumentScanner] handleUpload completed, loading set to false',
      );
    }
  };

  const handleSave = async () => {
    let hasError = false;

    if (!documentName.trim()) {
      setNameError('Document name is required');
      hasError = true;
    } else {
      setNameError('');
    }

    if (!selectedCategory) {
      setCategoryError('Please select a category');
      hasError = true;
    } else {
      setCategoryError('');
    }

    if (hasError) return;

    if (selectedFile) {
      try {
        setLoading(true);
        await Promise.resolve(
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
          }),
        );
        pushNotification(
          'Document saved',
          `${documentName} added to the vault.`,
          'success',
        );
        resetForm();
        onOpenChange(false);
      } catch (error) {
        console.error('[DocumentScanner] Failed to save document:', error);
        pushNotification(
          'Error',
          error instanceof Error ? error.message : 'Failed to save document.',
          'warning',
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    console.log(
      '[DocumentScanner] handleClose requested - current step:',
      step,
    );
    // Prevent dismissing the modal via backdrop or system close while the user edits the form
    if (step === 'form') {
      console.log('[DocumentScanner] Close request ignored during form step');
      return;
    }
    resetForm();
    onOpenChange(false);
  };

  const buildReminderRules = (): VaultReminderRule[] => {
    if (!reminderEnabled) {
      return [];
    }
    const field = getPrimaryReminderField(selectedCategory);
    if (!field) {
      return [];
    }
    return [
      {
        field,
        offsets: [1],
        timeOfDay: '09:00',
      },
    ];
  };

  const shouldShowReminderControl = ['warranty', 'bill', 'service'].includes(
    selectedCategory,
  );

  const renderCategoryFields = () => {
    switch (selectedCategory) {
      case 'warranty':
        return (
          <>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Purchase Date
              </Text>
              <DateTimePicker
                value={purchaseDate}
                onChange={handlePurchaseDateChange}
                placeholder="Select purchase date"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Warranty Valid Till
              </Text>
              <DateTimePicker
                value={warrantyTillDate}
                onChange={handleWarrantyTillDateChange}
                placeholder="Select warranty expiry date"
              />
            </View>
          </>
        );
      case 'bill':
        return (
          <>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Bill Date
              </Text>
              <DateTimePicker
                value={billDate}
                onChange={handleBillDateChange}
                placeholder="Select bill date"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Amount
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
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
              <Text style={[styles.label, { color: colors.foreground }]}>
                Insurance Provider
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
                value={provider}
                onChangeText={setProvider}
                placeholder="Enter provider name"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Policy Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
                value={policyNumber}
                onChangeText={setPolicyNumber}
                placeholder="Enter policy number"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Premium Amount
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
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
              <Text style={[styles.label, { color: colors.foreground }]}>
                Service Date
              </Text>
              <DateTimePicker
                value={serviceDate}
                onChange={handleServiceDateChange}
                placeholder="Select service date"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Next Service Date
              </Text>
              <DateTimePicker
                value={nextServiceDate}
                onChange={handleNextServiceDateChange}
                placeholder="Select next service date"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Service Cost
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
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
    const summary = reminderEnabled
      ? 'Reminders fire 1 day before the selected date.'
      : 'Reminders disabled.';
    return (
      <View style={styles.formGroup}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={[
              styles.label,
              { color: colors.foreground, marginBottom: 0 },
            ]}
          >
            Reminder preferences
          </Text>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ true: colors.primary, false: colors.muted }}
            thumbColor={
              reminderEnabled ? colors.primaryForeground : colors.card
            }
          />
        </View>
        <Text
          style={[styles.reminderSummary, { color: colors.mutedForeground }]}
        >
          {summary}
        </Text>
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
        <TouchableWithoutFeedback>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.contentContainer,
            { backgroundColor: colors.card, borderRadius: radius.card },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {step === 'upload' ? 'Upload Document' : 'Document Details'}
            </Text>
          </View>

          {/* Absolute Close Button */}
          <TouchableOpacity
            onPress={() => {
              console.log(
                '[DocumentScanner] X button pressed - requesting explicit close',
              );
              handleExplicitClose();
            }}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={styles.absoluteCloseBtn}
            activeOpacity={0.6}
          >
            <X size={24} color={colors.mutedForeground} />
          </TouchableOpacity>

          {step === 'upload' ? (
            <View
              style={[
                styles.dashedContainer,
                { borderColor: colors.border, backgroundColor: colors.muted },
              ]}
            >
              <Text style={[styles.captureTitle, { color: colors.foreground }]}>
                Capture or Upload
              </Text>
              <Text
                style={[styles.captureDesc, { color: colors.mutedForeground }]}
              >
                Take a photo of your document or upload an existing file
              </Text>

              {loading ? (
                <View style={{ padding: 20 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text
                    style={{
                      textAlign: 'center',
                      marginTop: 10,
                      color: colors.mutedForeground,
                    }}
                  >
                    Processing...
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonsRow}>
                  <Pressable
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                      },
                    ]}
                    onPress={handleCamera}
                  >
                    <Camera
                      size={24}
                      color={colors.foreground}
                      style={{ marginBottom: 8 }}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: colors.foreground },
                      ]}
                    >
                      Camera
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderRadius: radius.md,
                      },
                    ]}
                    onPress={handleUpload}
                  >
                    <Upload
                      size={24}
                      color={colors.foreground}
                      style={{ marginBottom: 8 }}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: colors.foreground },
                      ]}
                    >
                      Upload
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <ScrollView
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={[
                      styles.label,
                      { color: colors.foreground, marginBottom: 0 },
                    ]}
                  >
                    Document Name *
                  </Text>
                  {nameError ? (
                    <Text style={{ color: colors.danger, fontSize: 12 }}>
                      {nameError}
                    </Text>
                  ) : null}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                  value={documentName}
                  onChangeText={text => {
                    setDocumentName(text);
                    if (text.trim()) setNameError('');
                  }}
                  placeholder="Enter document name"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.formGroup}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={[
                      styles.label,
                      { color: colors.foreground, marginBottom: 0 },
                    ]}
                  >
                    Category *
                  </Text>
                  {categoryError ? (
                    <Text style={{ color: colors.danger, fontSize: 12 }}>
                      {categoryError}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.categoryGrid,
                    categoryError
                      ? {
                          borderWidth: 1,
                          borderColor: colors.danger,
                          borderRadius: radius.md,
                          padding: 4,
                        }
                      : null,
                  ]}
                >
                  {CATEGORIES.map(cat => (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor:
                            selectedCategory === cat.id
                              ? colors.primary
                              : colors.background,
                          borderColor:
                            selectedCategory === cat.id
                              ? colors.primary
                              : colors.border,
                          borderRadius: radius.md,
                        },
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat.id);
                        setCategoryError('');
                      }}
                    >
                      <IconGlyph
                        icon={cat.icon}
                        size={18}
                        color={
                          selectedCategory === cat.id
                            ? colors.primaryForeground
                            : colors.foreground
                        }
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color:
                              selectedCategory === cat.id
                                ? colors.primaryForeground
                                : colors.foreground,
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {selectedFile && (
                <Text
                  style={[
                    styles.selectedFileLabel,
                    { color: colors.success, marginTop: 12 },
                  ]}
                >
                  Attached file: {selectedFile.name}
                </Text>
              )}

              {renderCategoryFields()}
              {shouldShowReminderControl && renderReminderSettings()}

              <View style={styles.buttonGroup}>
                <Pressable
                  style={[
                    styles.cancelButton,
                    { backgroundColor: colors.muted, borderRadius: radius.md },
                  ]}
                  onPress={() => {
                    console.log('[DocumentScanner] Cancel button pressed');
                    resetForm();
                    onOpenChange(false);
                  }}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: colors.foreground },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={handleSave}
                >
                  <Text
                    style={[
                      styles.saveButtonText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Save Document
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const DocumentScanner: React.FC<DocumentScannerProps> =
  DocumentScannerInner;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative', // For absolute positioning children
  },
  absoluteCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    zIndex: 100,
    elevation: 100,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dashedContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  captureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  captureDesc: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnText: {
    fontWeight: '600',
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
    fontWeight: '600',
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
  selectedFileLabel: {
    fontSize: 13,
    fontWeight: '600',
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
