import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { AppLayout } from '../components/layout';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { AppIcon } from '../components/ui/AppIcon';
import { useThemeColors } from '../contexts/ThemeContext';
import { useFamily } from '../contexts/FamilyContext';
import { shoppingCategories } from '../constants/shoppingCategories';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { ListsStackParamList } from '../navigation/ListsStackParams';
import { useToast } from '../hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shoppingUnits } from '../constants/units';

type FlowStep = 'category' | 'items';

type RapidEntryRow = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
};

const createEmptyRow = (): RapidEntryRow => ({
  id: `rapid-row-${Date.now()}-${Math.random()}`,
  name: '',
  quantity: '1',
  unit: 'pcs',
});

export const CreateListFlowScreen: React.FC = () => {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp<ListsStackParamList>>();
  const { addGroceryItem, activeMember } = useFamily();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<FlowStep>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<RapidEntryRow[]>([createEmptyRow()]);
  const [unitPickerRowId, setUnitPickerRowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNavigatedBack = useRef(false);
  const isMountedRef = useRef(true);

  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const pendingFocus = useRef<string | null>(null);
  const previousStep = useRef<FlowStep>(step);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  const selectedCategory = useMemo(
    () =>
      shoppingCategories.find(category => category.id === selectedCategoryId) ||
      shoppingCategories[0],
    [selectedCategoryId],
  );

  const addNewRow = useCallback(() => {
    const newRow = createEmptyRow();
    setItems(prev => [...prev, newRow]);
    pendingFocus.current = newRow.id;
  }, []);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const targetId = pendingFocus.current;
    pendingFocus.current = null;
    const timer = setTimeout(() => {
      inputRefs.current[targetId]?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [items]);

  useEffect(() => {
    if (step === 'items' && previousStep.current !== 'items' && items[0]) {
      const timer = setTimeout(() => {
        inputRefs.current[items[0].id]?.focus();
      }, 120);
      previousStep.current = step;
      return () => clearTimeout(timer);
    }
    previousStep.current = step;
    return undefined;
  }, [step, items]);

  const updateRow = useCallback((id: string, updates: Partial<RapidEntryRow>) => {
    setItems(prev => prev.map(row => (row.id === id ? { ...row, ...updates } : row)));
  }, []);

  const handleRowSubmit = (rowId: string) => {
    const index = items.findIndex(row => row.id === rowId);
    if (index === -1) return;
    const nextRow = items[index + 1];
    if (nextRow) {
      inputRefs.current[nextRow.id]?.focus();
      return;
    }
    addNewRow();
  };

  const handleQuantityChange = (id: string, value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    updateRow(id, { quantity: sanitized });
  };

  const handleUnitChange = (id: string, value: string) => {
    updateRow(id, { unit: value });
    if (unitPickerRowId === id) {
      setUnitPickerRowId(null);
    }
  };

  const openUnitPicker = (id: string) => {
    setUnitPickerRowId(id);
  };

  const closeUnitPicker = () => {
    setUnitPickerRowId(null);
  };

  const handleUnitSelect = (unit: string) => {
    if (!unitPickerRowId) return;
    updateRow(unitPickerRowId, { unit });
    pendingFocus.current = unitPickerRowId;
    setUnitPickerRowId(null);
  };

  const isUnitPickerVisible = Boolean(unitPickerRowId);
  const activeUnitRow = unitPickerRowId
    ? items.find(row => row.id === unitPickerRowId)
    : null;

  const scheduleNavigationBack = useCallback(() => {
    if (hasNavigatedBack.current) return;
    hasNavigatedBack.current = true;
    navigation.goBack();
  }, [navigation]);

  const startSavingOverlay = () => {
    setIsSaving(true);
    hasNavigatedBack.current = false;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      if (isMountedRef.current) {
        setIsSaving(false);
      }
      scheduleNavigationBack();
    }, 1100);
  };

  const persistItemsInBackground = async (rows: RapidEntryRow[]) => {
    try {
      await Promise.all(
        rows.map(row => {
          const parsedQuantity = parseFloat(row.quantity);
          const quantity =
            Number.isNaN(parsedQuantity) || parsedQuantity <= 0 ? 1 : parsedQuantity;
          return addGroceryItem({
            name: row.name.trim(),
            quantity,
            unit: (row.unit || 'pcs').trim() || 'pcs',
            category: selectedCategoryId!,
            addedBy: activeMember?.id || '1',
            completed: false,
          });
        }),
      );
      showToast({
        title: 'Items added to your list',
        type: 'success',
      });
    } catch (error) {
      console.error('CreateListFlow: Failed to save items', error);
      showToast({
        title: 'Failed to add items',
        type: 'error',
      });
    }
  };

  const handleSave = () => {
    if (!selectedCategoryId) return;
    const validItems = items.filter(row => row.name.trim());
    if (validItems.length === 0) {
      showToast({
        title: 'Add at least one item',
        type: 'warning',
      });
      return;
    }

    startSavingOverlay();
    void persistItemsInBackground(validItems);
  };

  const hasValidItems = items.some(row => row.name.trim());

  const handleBack = () => {
    setStep('category');
  };

  const renderCategoryRow = ({
    id,
    name,
    icon,
    library,
    color,
  }: typeof shoppingCategories[number]) => {
    const isActive = selectedCategoryId === id;
    return (
    <Pressable
      key={id}
      onPress={() => {
        setSelectedCategoryId(id);
        setStep('items');
      }}
        style={[
          styles.categoryRow,
          {
            backgroundColor: isActive ? colors.primary + '10' : colors.card,
            borderColor: isActive ? colors.primary : colors.border,
          },
        ]}
      >
        <CategoryIcon
          icon={icon}
          library={library}
          size={22}
          color={isActive ? colors.primary : color || colors.foreground}
          style={styles.categoryIcon}
        />
        <Text
          style={[
            styles.categoryName,
            { color: colors.foreground },
          ]}
        >
          {name}
        </Text>
        <AppIcon
          name="chevronRight"
          size={20}
          color={isActive ? colors.primary : colors.mutedForeground}
        />
      </Pressable>
    );
  };

  const renderStepOne = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select a category</Text>
      <ScrollView
        style={styles.categoryList}
        contentContainerStyle={styles.categoryListContent}
        showsVerticalScrollIndicator={false}
      >
        {shoppingCategories.map(renderCategoryRow)}
      </ScrollView>
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [
          styles.nextButton,
          {
            backgroundColor: colors.muted,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <AppIcon name="arrowLeft" size={18} color={colors.foreground} />
        <Text style={[styles.nextButtonText, { color: colors.foreground }]}>Back</Text>
      </Pressable>
    </View>
  );

  const renderStepTwo = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <AppIcon name="arrowLeft" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.stepHeaderContent}>
          <CategoryIcon
            icon={selectedCategory?.icon || 'tag'}
            library={selectedCategory?.library}
            size={24}
            color={selectedCategory?.color || colors.foreground}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.stepHeaderTitle, { color: colors.foreground }]}>
            {selectedCategory?.name ?? 'Category'}
          </Text>
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.entryContainer}
          contentContainerStyle={styles.entryContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {items.map(row => (
            <View key={row.id} style={styles.entryRow}>
              <TextInput
                ref={ref => {
                  inputRefs.current[row.id] = ref;
                }}
                placeholder="Item name"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.entryNameInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    color: colors.foreground,
                  },
                ]}
                value={row.name}
                onChangeText={text => updateRow(row.id, { name: text })}
                onSubmitEditing={() => handleRowSubmit(row.id)}
                blurOnSubmit={false}
                returnKeyType="next"
              />
              <View style={styles.entryMeta}>
                <TextInput
                  style={[
                    styles.numberInput,
                    {
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  value={row.quantity}
                  onChangeText={value => handleQuantityChange(row.id, value)}
                  placeholder="Qty"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
                <Pressable
                  style={[
                    styles.unitSelector,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                  onPress={() => openUnitPicker(row.id)}
                >
                  <Text style={{ color: colors.foreground, fontSize: 14 }}>
                    {(row.unit || 'pcs').toUpperCase()}
                  </Text>
                  <AppIcon
                    name="chevronDown"
                    size={14}
                    color={colors.mutedForeground}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable
            style={[
              styles.addRowButton,
              { borderColor: colors.border },
            ]}
            onPress={addNewRow}
          >
            <AppIcon
              name="plus"
              size={18}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.addRowText, { color: colors.foreground }]}>Add item</Text>
          </Pressable>
        </ScrollView>
        <View
          style={[
            styles.saveContainer,
            { marginBottom: insets.bottom + 12 },
          ]}
        >
          <Pressable
            onPress={handleSave}
            disabled={!hasValidItems}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: hasValidItems ? colors.primary : colors.muted,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Save list</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <AppLayout
      showNav={false}
      showAddButton={false}
      disableScroll
      style={{ paddingHorizontal: 0 }}
    >
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {step === 'category' ? renderStepOne() : renderStepTwo()}
      </View>
      {isUnitPickerVisible && (
        <Modal
          visible={isUnitPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={closeUnitPicker}
        >
          <Pressable style={styles.unitModalOverlay} onPress={closeUnitPicker}>
            <Pressable
              style={[
                styles.unitPickerCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {}}
            >
              <Text style={[styles.unitPickerTitle, { color: colors.foreground }]}>
                Select unit
              </Text>
              <ScrollView
                contentContainerStyle={styles.unitPickerList}
                showsVerticalScrollIndicator={false}
              >
                {shoppingUnits.map(unit => (
                  <Pressable
                    key={unit}
                    style={[
                      styles.unitOption,
                      {
                        backgroundColor:
                          activeUnitRow?.unit === unit ? colors.primary + '10' : 'transparent',
                      },
                    ]}
                    onPress={() => handleUnitSelect(unit)}
                  >
                    <Text
                      style={[
                        styles.unitOptionText,
                        {
                          color:
                            activeUnitRow?.unit === unit
                              ? colors.primary
                              : colors.foreground,
                        },
                      ]}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
          </Modal>
        )}
      {isSaving && (
        <View style={styles.savingOverlay} pointerEvents="none">
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.savingText, { color: colors.foreground }]}>
              Saving items…
            </Text>
          </View>
        </View>
      )}
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryList: {
    flex: 1,
  },
  categoryListContent: {
    paddingBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  categoryIcon: {
    marginRight: 14,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  stepHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  entryContainer: {
    flex: 1,
  },
  entryContent: {
    paddingBottom: 32,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  numberInput: {
    width: 72,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 14,
    marginRight: 8,
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  addRowText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  saveContainer: {
    marginTop: 12,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 88,
  },
  unitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unitPickerCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  unitPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  unitPickerList: {
    paddingBottom: 4,
    maxHeight: 220,
  },
  unitOption: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  unitOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingIndicator: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  savingText: {
    marginTop: 12,
    fontWeight: '600',
  },
});
