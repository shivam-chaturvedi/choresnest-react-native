import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useThemeColors, useThemeRadius } from '../../contexts/ThemeContext';
import { CategoryColorService } from '../../services/CategoryColorService';
import { CATEGORY_COLOR_FALLBACK } from '../../constants/categoryColors';
import { Transaction } from '../../contexts/FinanceContext';
import { Button } from '../ui/Button';
import { IconGlyph } from '../ui/IconGlyph';

type EditPayload = {
  name: string;
  amount: number;
  category: string;
};

export type EditTransactionModalProps = {
  visible: boolean;
  transaction: Transaction | null;
  categoryIcons: Record<string, string>;
  categoryColors?: Record<string, string>;
  onClose: () => void;
  onSave: (payload: EditPayload) => void;
};

const titleCase = (value: string) =>
  value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeCategory = (value: string) =>
  CategoryColorService.normalizeCategoryKey(value);

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  categoryIcons,
  categoryColors = {},
  onClose,
  onSave,
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    category?: string;
  }>({});

  const categoryOptions = useMemo(() => {
    const keys = new Set<string>(Object.keys(categoryIcons || {}));
    if (transaction?.category) keys.add(normalizeCategory(transaction.category));
    keys.add('other');
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [categoryIcons, transaction?.category]);

  useEffect(() => {
    if (!visible) return;
    if (!transaction) return;
    setName(transaction.name || '');
    setAmount(transaction.amount ? String(transaction.amount) : '');
    setCategory(normalizeCategory(transaction.category || 'other'));
    setErrors({});
  }, [visible, transaction]);

  const handleAmountChange = (text: string) => {
    const numericRegex = /^-?\d*\.?\d*$/;
    if (numericRegex.test(text) || text === '') {
      setAmount(text);
      if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleSubmit = () => {
    const nextErrors: typeof errors = {};
    const trimmedName = name.trim();
    const normalizedCategory = normalizeCategory(category);
    const parsedAmount = Number(amount);

    if (!trimmedName) nextErrors.name = 'Name is required';
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = 'Enter an amount > 0';
    }
    if (!normalizedCategory) nextErrors.category = 'Category is required';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      name: trimmedName,
      amount: parsedAmount,
      category: normalizedCategory,
    });
  };

  const selectedColorKey = normalizeCategory(category);
  const selectedColor =
    categoryColors[selectedColorKey] ?? CATEGORY_COLOR_FALLBACK;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modal,
            {
              backgroundColor: colors.background,
              borderRadius: radius.card,
              borderColor: colors.border,
            },
          ]}
          onPress={e => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: selectedColor + '22' },
                ]}
              >
                <IconGlyph
                  icon={categoryIcons[selectedColorKey] || 'dots-horizontal'}
                  size={18}
                  color={colors.foreground}
                />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>
                  Edit Transaction
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.mutedForeground }]}
                >
                  Update name, amount, and category
                </Text>
              </View>
            </View>
            <Pressable style={styles.close} onPress={onClose}>
              <X size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={text => {
                  setName(text);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g., Uber, Groceries"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: errors.name ? colors.danger : colors.border,
                    color: colors.foreground,
                    borderRadius: radius.md,
                  },
                ]}
              />
              {!!errors.name && (
                <Text style={[styles.error, { color: colors.danger }]}>
                  {errors.name}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Amount
              </Text>
              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: errors.amount ? colors.danger : colors.border,
                    color: colors.foreground,
                    borderRadius: radius.md,
                  },
                ]}
              />
              {!!errors.amount && (
                <Text style={[styles.error, { color: colors.danger }]}>
                  {errors.amount}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Category
              </Text>
              <TextInput
                value={category}
                onChangeText={text => {
                  setCategory(text);
                  if (errors.category) {
                    setErrors(prev => ({ ...prev, category: undefined }));
                  }
                }}
                autoCapitalize="none"
                placeholder="e.g., groceries"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: errors.category ? colors.danger : colors.border,
                    color: colors.foreground,
                    borderRadius: radius.md,
                  },
                ]}
              />
              <View style={styles.chipsWrap}>
                {categoryOptions.map(key => {
                  const active = normalizeCategory(category) === key;
                  const colorKey = normalizeCategory(key);
                  const chipColor =
                    categoryColors[colorKey] ?? CATEGORY_COLOR_FALLBACK;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setCategory(key)}
                      style={[
                        styles.chip,
                        {
                          borderRadius: radius.md,
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active
                            ? colors.primary + '18'
                            : colors.card,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.chipIcon,
                          { backgroundColor: chipColor + '22' },
                        ]}
                      >
                        <IconGlyph
                          icon={categoryIcons[key] || 'dots-horizontal'}
                          size={16}
                          color={colors.foreground}
                        />
                      </View>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active
                              ? colors.foreground
                              : colors.mutedForeground,
                          },
                        ]}
                      >
                        {titleCase(key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!!errors.category && (
                <Text style={[styles.error, { color: colors.danger }]}>
                  {errors.category}
                </Text>
              )}
            </View>

            <View style={styles.footer}>
              <Button variant="ghost" onPress={onClose} style={styles.footerBtn}>
                Cancel
              </Button>
              <Button onPress={handleSubmit} style={styles.footerBtn}>
                Save
              </Button>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  modal: {
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '86%',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  badge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  close: {
    padding: 6,
  },
  content: {
    padding: 16,
    paddingBottom: 22,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  footerBtn: {
    minWidth: 110,
  },
});

