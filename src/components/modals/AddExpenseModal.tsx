import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, Pressable } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { Calendar as CalendarIcon, DollarSign, FileText, AlertTriangle, X } from 'lucide-react-native';
import { Button } from '../ui/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCountry } from '../../contexts/CountryContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CategoryColorService } from '../../services/CategoryColorService';
import { CATEGORY_COLOR_FALLBACK } from '../../constants/categoryColors';
import { useToast } from '../ui/Toast';

export interface ExpenseData {
    name: string;
    amount: number;
    category: string;
    date: string;
    type: 'expense' | 'income';
}

interface AddExpenseModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (expense: ExpenseData) => void;
    budgets: Record<string, number>;
    currentSpending: Record<string, number>;
    categoryColors?: Record<string, string>;
}

const categories = [
    { id: 'groceries', name: 'Groceries', icon: 'cart' },
    { id: 'utilities', name: 'Utilities', icon: 'lightning-bolt' },
    { id: 'transport', name: 'Transport', icon: 'car' },
    { id: 'food', name: 'Food & Dining', icon: 'silverware' },
    { id: 'shopping', name: 'Shopping', icon: 'shopping' },
    { id: 'healthcare', name: 'Healthcare', icon: 'hospital-building' },
    { id: 'entertainment', name: 'Entertainment', icon: 'movie-open' },
    { id: 'education', name: 'Education', icon: 'book' },
    { id: 'other', name: 'Other', icon: 'package-variant' },
];

const transactionTypeOptions = [
    { type: 'expense', label: 'Expense', icon: 'cash-minus' },
    { type: 'income', label: 'Income', icon: 'cash-plus' },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
    visible,
    onClose,
    onAdd,
    budgets,
    currentSpending,
    categoryColors = {},
}) => {
    const colors = useThemeColors();
    const nameInputRef = useRef<TextInput>(null);
    const amountInputRef = useRef<TextInput>(null);
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('groceries');
    const [errors, setErrors] = useState<{ name?: string; amount?: string; category?: string }>({});
    const getLocalYYYYMMDD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [date, setDate] = useState(getLocalYYYYMMDD(new Date()));
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [entryStage, setEntryStage] = useState<'category' | 'entry'>('category');
    const [recentEntries, setRecentEntries] = useState<ExpenseData[]>([]);
    const [recentIncomeEntries, setRecentIncomeEntries] = useState<ExpenseData[]>([]);
    const expenseAddedCountRef = useRef(0);
    const incomeAddedCountRef = useRef(0);

    const selectedCategory = categories.find(c => c.id === category);
    const selectedCategoryColorKey = CategoryColorService.normalizeCategoryKey(selectedCategory?.id || 'groceries');
    const selectedCategoryColor = categoryColors[selectedCategoryColorKey] ?? CATEGORY_COLOR_FALLBACK;
    const currentCategorySpending = currentSpending[category] || 0;
    const categoryBudget = budgets[category] || 0;
    const newAmount = parseFloat(amount) || 0;
    const willExceedBudget = type === 'expense' && categoryBudget > 0 && (currentCategorySpending + newAmount) > categoryBudget;
    const percentOfBudget = categoryBudget > 0 ? ((currentCategorySpending + newAmount) / categoryBudget) * 100 : 0;
    const submitIconName = type === 'expense' ? 'cash-minus' : 'cash-plus';
    const submitLabel = type === 'expense' ? 'Add Entry' : 'Add Income';

    const resetDateToToday = () => setDate(getLocalYYYYMMDD(new Date()));
    const resetExpenseEntry = () => {
        setName('');
        setAmount('');
        resetDateToToday();
        setErrors({});
        setShowDatePicker(false);
        nameInputRef.current?.focus();
    };

    const resetAllFields = () => {
        setName('');
        setAmount('');
        setCategory('groceries');
        resetDateToToday();
        setErrors({});
        setShowDatePicker(false);
    };

    const handleClose = () => {
        const expenseCount = expenseAddedCountRef.current;
        const incomeCount = incomeAddedCountRef.current;

        if (expenseCount > 0) {
            showToast({
                title: 'Expenses added',
                description: 'All expenses were added successfully.',
                type: 'success',
            });
        }

        if (incomeCount > 0) {
            showToast({
                title: 'Income recorded',
                description: 'Income entry was saved successfully.',
                type: 'success',
            });
        }

        expenseAddedCountRef.current = 0;
        incomeAddedCountRef.current = 0;

        onClose();
    };

    const handleAmountChange = (text: string) => {
        // Only allow numbers, decimal point, and negative sign
        const numericRegex = /^-?\d*\.?\d*$/;
        if (numericRegex.test(text) || text === '') {
            setAmount(text);
            // Clear amount error when user starts typing
            if (errors.amount) {
                setErrors({ ...errors, amount: undefined });
            }
        }
    };

    const handleSubmit = () => {
        const newErrors: { name?: string; amount?: string; category?: string } = {};
        let isValid = true;

        // Validate name
        if (!name.trim()) {
            newErrors.name = 'Description is required';
            isValid = false;
        }

        // Validate amount
        if (!amount || amount.trim() === '') {
            newErrors.amount = 'Amount is required';
            isValid = false;
        } else {
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                newErrors.amount = 'Please enter a valid amount greater than 0';
                isValid = false;
            }
        }

        // Validate category (only for expenses)
        if (type === 'expense' && !category) {
            newErrors.category = 'Category is required';
            isValid = false;
        }

        if (!isValid) {
            setErrors(newErrors);
            return;
        }

        // Clear errors and submit
        setErrors({});
        const payload: ExpenseData = {
            name: name.trim(),
            amount: parseFloat(amount),
            category,
            date,
            type,
        };
        onAdd(payload);
        if (type === 'expense') {
            expenseAddedCountRef.current += 1;
            setRecentEntries(prev => [payload, ...prev]);
            resetExpenseEntry();
            return;
        }

        incomeAddedCountRef.current += 1;
        setRecentIncomeEntries(prev => [payload, ...prev]);
        resetAllFields();
        handleClose();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            setDate(getLocalYYYYMMDD(selectedDate));
        }
    };

    const { currentCountry } = useCountry();

    useEffect(() => {
        if (visible) {
            setEntryStage(type === 'expense' ? 'category' : 'entry');
        } else {
            setRecentEntries([]);
            setRecentIncomeEntries([]);
        }
    }, [visible, type]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <Pressable
                    style={[styles.modalContainer, { backgroundColor: colors.background }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <View style={styles.titleContainer}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                <DollarSign size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.title, { color: colors.foreground }]}>Add Transaction</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <X size={24} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Type Toggle */}
                        <View style={[styles.toggleContainer, { backgroundColor: colors.muted }]}>
                            {transactionTypeOptions.map((option) => {
                                const isActive = type === option.type;
                                return (
                                    <TouchableOpacity
                                        key={option.type}
                                        style={[
                                            styles.toggleButton,
                                            isActive && {
                                                backgroundColor: option.type === 'expense' ? colors.danger : colors.success,
                                            },
                                        ]}
                                        onPress={() => {
                                            setType(option.type as 'expense' | 'income');
                                            setEntryStage(option.type === 'expense' ? 'category' : 'entry');
                                        }}
                                    >
                                        <View style={styles.toggleContent}>
                                            <MaterialCommunityIcons
                                                name={option.icon}
                                                size={16}
                                                color={isActive ? '#fff' : colors.mutedForeground}
                                                style={styles.toggleIcon}
                                            />
                                            <Text
                                                style={[
                                                    styles.toggleText,
                                                    { color: isActive ? '#fff' : colors.mutedForeground },
                                                    isActive && styles.activeToggleText,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {type === 'expense' && entryStage === 'category' && (
                            <View style={[
                                styles.categoryPanel,
                                { backgroundColor: colors.card, borderColor: colors.border },
                            ]}>
                                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                                    Select a category
                                </Text>
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.categoryList}
                                >
                                    {categories.map((cat) => {
                                        const normalizedKey = CategoryColorService.normalizeCategoryKey(cat.id);
                                        const catColor = categoryColors[normalizedKey] ?? CATEGORY_COLOR_FALLBACK;
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={[
                                                    styles.categoryRow,
                                                    { borderColor: colors.border },
                                                ]}
                                                onPress={() => {
                                                    setCategory(cat.id);
                                                    setEntryStage('entry');
                                                }}
                                            >
                                                <View style={styles.categoryRowInfo}>
                                                    <MaterialCommunityIcons
                                                        name={cat.icon}
                                                        size={20}
                                                        color={catColor}
                                                        style={styles.categoryRowIcon}
                                                    />
                                                    <View>
                                                        <Text
                                                            style={[
                                                                styles.categoryRowName,
                                                                { color: colors.foreground },
                                                            ]}
                                                        >
                                                            {cat.name}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <MaterialCommunityIcons
                                                    name="chevron-right"
                                                    size={20}
                                                    color={colors.mutedForeground}
                                                />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {(type === 'income' || entryStage === 'entry') && (
                            <>
                        {type === 'expense' && willExceedBudget && (
                            <View style={[styles.alertContainer, { backgroundColor: colors.danger + '20', borderColor: colors.danger + '40' }]}>
                                <View style={styles.alertHeader}>
                                    <AlertTriangle size={20} color={colors.danger} />
                                    <View style={styles.alertTexts}>
                                        <Text style={[styles.alertTitle, { color: colors.danger }]}>Budget Alert!</Text>
                                        <Text style={[styles.alertDescription, { color: colors.danger }]}>
                                            This will exceed your {selectedCategory?.name} budget by ₹{((currentCategorySpending + newAmount) - categoryBudget).toFixed(0)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.budgetProgressBg, { backgroundColor: colors.danger + '40' }]}>
                                    <View
                                        style={[
                                            styles.budgetProgressFill,
                                            { width: `${Math.min(percentOfBudget, 100)}%`, backgroundColor: colors.danger }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.budgetPercentText, { color: colors.danger }]}>
                                    {percentOfBudget.toFixed(0)}% of budget used
                                </Text>
                            </View>
                        )}

                                {type === 'expense' && entryStage === 'entry' && (
                                    <View style={[
                                        styles.entryHeader,
                                        { borderColor: colors.border },
                                    ]}>
                                        <TouchableOpacity onPress={() => setEntryStage('category')}>
                                            <MaterialCommunityIcons
                                                name="arrow-left"
                                                size={20}
                                                color={colors.foreground}
                                            />
                                        </TouchableOpacity>
                                        <View style={styles.entryHeaderInfo}>
                                            <MaterialCommunityIcons
                                                name={selectedCategory?.icon || 'cart'}
                                                size={22}
                                                color={selectedCategoryColor}
                                                style={{ marginRight: 6 }}
                                            />
                                            <Text style={[styles.entryHeaderTitle, { color: colors.foreground }]}>
                                                {selectedCategory?.name || 'Category'}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.entryFieldsRow}>
                                    <View style={[styles.entryFieldBlock, { flex: 2 }]}>
                                        <View style={styles.labelContainer}>
                                            <FileText size={16} color={colors.mutedForeground} />
                                            <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
                                            {errors.name && <Text style={[styles.errorText, { color: colors.danger }]}> *</Text>}
                                        </View>
                                        <TextInput
                                            ref={nameInputRef}
                                            autoFocus
                                            style={[
                                                styles.input,
                                                {
                                                    backgroundColor: colors.card,
                                                    borderColor: errors.name ? colors.danger : colors.border,
                                                    color: colors.foreground,
                                                },
                                            ]}
                                            placeholder="e.g., Grocery shopping"
                                            placeholderTextColor={colors.mutedForeground}
                                            value={name}
                                            onChangeText={text => {
                                                setName(text);
                                                if (errors.name) setErrors({ ...errors, name: undefined });
                                            }}
                                            returnKeyType="next"
                                            onSubmitEditing={() => amountInputRef.current?.focus()}
                                        />
                                        {errors.name && (
                                            <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.name}</Text>
                                        )}
                                    </View>
                                    <View style={[styles.entryFieldBlock, { flex: 1, marginLeft: 8 }]}>
                                        <View style={styles.labelContainer}>
                                            <DollarSign size={16} color={colors.mutedForeground} />
                                            <Text style={[styles.label, { color: colors.foreground }]}>Amount</Text>
                                            {errors.amount && <Text style={[styles.errorText, { color: colors.danger }]}> *</Text>}
                                        </View>
                                        <View style={[
                                            styles.amountContainer,
                                            {
                                                borderColor: errors.amount ? colors.danger : colors.border,
                                                backgroundColor: colors.card,
                                            },
                                        ]}>
                                            <Text style={[styles.currencyLabel, { color: colors.mutedForeground }]}>
                                                {currentCountry.currencySymbol}
                                            </Text>
                                            <TextInput
                                                ref={amountInputRef}
                                                style={[
                                                    styles.input,
                                                    styles.flexInput,
                                                    { borderWidth: 0, backgroundColor: 'transparent', color: colors.foreground }
                                                ]}
                                                placeholder="0.00"
                                                placeholderTextColor={colors.mutedForeground}
                                                keyboardType="numeric"
                                                value={amount}
                                                onChangeText={handleAmountChange}
                                                returnKeyType="done"
                                                onSubmitEditing={handleSubmit}
                                            />
                                        </View>
                                        {errors.amount && (
                                            <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.amount}</Text>
                                        )}
                                    </View>
                                </View>
                                <View style={[styles.inputGroup, { marginTop: 12 }]}>
                                    <View style={styles.labelContainer}>
                                        <CalendarIcon size={16} color={colors.mutedForeground} />
                                        <Text style={[styles.label, { color: colors.foreground }]}>Date</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.input,
                                            {
                                                justifyContent: 'center',
                                                backgroundColor: colors.card,
                                                borderColor: colors.border,
                                            },
                                        ]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={{ color: colors.foreground, fontSize: 16 }}>
                                            {date || 'Select Date'}
                                        </Text>
                                    </TouchableOpacity>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={new Date(date)}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={handleDateChange}
                                        />
                                    )}
                                    {Platform.OS === 'ios' && showDatePicker && (
                                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                                            <Button size="sm" variant="ghost" onPress={() => setShowDatePicker(false)}>
                                                <Text>Done</Text>
                                            </Button>
                                        </View>
                                    )}
                                </View>
                                </View>

                                <Button
                                    onPress={handleSubmit}
                                    style={[styles.submitButton, { backgroundColor: type === 'expense' ? colors.primary : colors.success }]}
                                >
                                    <View style={styles.submitButtonContent}>
                                        <MaterialCommunityIcons
                                            name={submitIconName}
                                            size={18}
                                            color="#fff"
                                            style={styles.submitButtonIcon}
                                        />
                                        <Text style={styles.submitButtonText}>{submitLabel}</Text>
                                    </View>
                                </Button>
                                {type === 'expense' && recentEntries.length > 0 && (
                                    <View style={[styles.recentList, { borderColor: colors.border }]}>
                                        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                                            Added this session
                                        </Text>
                                        <ScrollView
                                            style={styles.recentScroll}
                                            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                                            showsVerticalScrollIndicator={true}
                                            nestedScrollEnabled={true}
                                            scrollEnabled={true}
                                            scrollEventThrottle={16}
                                            decelerationRate="fast"
                                        >
                                            {recentEntries.map((entry, index) => (
                                                <View key={`${entry.name}-${index}`} style={styles.recentRow}>
                                                    <View>
                                                        <Text style={[styles.recentName, { color: colors.foreground }]}>
                                                            {entry.name}
                                                        </Text>
                                                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                                                            {entry.date}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                                                        {currentCountry.currencySymbol}
                                                        {entry.amount.toFixed(2)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                                {type === 'income' && recentIncomeEntries.length > 0 && (
                                    <View style={[styles.recentList, { borderColor: colors.border }]}>
                                        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                                            Added this session
                                        </Text>
                                        <ScrollView
                                            style={styles.recentScroll}
                                            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                                            showsVerticalScrollIndicator={true}
                                        >
                                            {recentIncomeEntries.map((entry, index) => (
                                                <View key={`income-${entry.name}-${index}`} style={styles.recentRow}>
                                                    <View>
                                                        <Text style={[styles.recentName, { color: colors.foreground }]}>
                                                            {entry.name || 'Income'}
                                                        </Text>
                                                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                                                            {entry.date}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ color: colors.foreground, fontWeight: '700' }}>
                                                        {currentCountry.currencySymbol}
                                                        {entry.amount.toFixed(2)}
                                                    </Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Bottom spacer for keyboard */}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    toggleContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    toggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleIcon: {
        marginRight: 6,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
    },
    activeToggleText: {
        color: '#fff',
    },
    inputGroup: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    entryFieldsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    entryFieldBlock: {
        flex: 1,
        gap: 6,
    },
    fieldStack: {
        gap: 8,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        gap: 8,
    },
    currencyLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    flexInput: {
        flex: 1,
        fontWeight: '600',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    categoryPanel: {
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    categoryList: {
        paddingBottom: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 10,
    },
    categoryRowInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryRowIcon: {
        marginRight: 4,
    },
    categoryRowName: {
        fontSize: 16,
        fontWeight: '600',
    },
    entryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 18,
        padding: 12,
        marginBottom: 16,
    },
    entryHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    entryHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    entryCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
    },
    alertContainer: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    alertTexts: {
        flex: 1,
        marginLeft: 12,
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    alertDescription: {
        fontSize: 12,
        opacity: 0.8,
    },
    budgetProgressBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    budgetProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    budgetPercentText: {
        fontSize: 11,
        opacity: 0.7,
    },
    submitButton: {
        marginTop: 8,
    },
    submitButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonIcon: {
        marginRight: 6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    errorText: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorMessage: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    recentList: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 12,
        marginTop: 12,
        backgroundColor: 'transparent',
    },
    recentScroll: {
        maxHeight: 180,
    },
    recentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingVertical: 10,
        gap: 8,
    },
    recentName: {
        fontSize: 14,
        fontWeight: '600',
    },
});
