import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, Pressable } from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { Calendar as CalendarIcon, DollarSign, Tag, FileText, AlertTriangle, X } from 'lucide-react-native';
import { Button } from '../ui/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCountry } from '../../contexts/CountryContext';

export interface ExpenseData {
    name: string;
    amount: number;
    category: string;
    date: string;
    notes: string;
    type: 'expense' | 'income';
}

interface AddExpenseModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (expense: ExpenseData) => void;
    budgets: Record<string, number>;
    currentSpending: Record<string, number>;
}

const categories = [
    { id: 'groceries', name: 'Groceries', icon: '🛒' },
    { id: 'utilities', name: 'Utilities', icon: '⚡' },
    { id: 'transport', name: 'Transport', icon: '🚗' },
    { id: 'food', name: 'Food & Dining', icon: '🍽️' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'other', name: 'Other', icon: '📦' },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
    visible,
    onClose,
    onAdd,
    budgets,
    currentSpending,
}) => {
    const colors = useThemeColors();
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
    const [notes, setNotes] = useState('');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const selectedCategory = categories.find(c => c.id === category);
    const currentCategorySpending = currentSpending[category] || 0;
    const categoryBudget = budgets[category] || 0;
    const newAmount = parseFloat(amount) || 0;
    const willExceedBudget = type === 'expense' && categoryBudget > 0 && (currentCategorySpending + newAmount) > categoryBudget;
    const percentOfBudget = categoryBudget > 0 ? ((currentCategorySpending + newAmount) / categoryBudget) * 100 : 0;

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
        onAdd({
            name: name.trim(),
            amount: parseFloat(amount),
            category,
            date,
            notes: notes.trim(),
            type,
        });

        // Reset form
        setName('');
        setAmount('');
        setCategory('groceries');
        setDate(getLocalYYYYMMDD(new Date()));
        setNotes('');
        setErrors({});
        onClose();
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
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
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Type Toggle */}
                        <View style={[styles.toggleContainer, { backgroundColor: colors.muted }]}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    type === 'expense' && { backgroundColor: colors.danger }
                                ]}
                                onPress={() => setType('expense')}
                            >
                                <Text style={[
                                    styles.toggleText,
                                    { color: colors.mutedForeground },
                                    type === 'expense' && styles.activeToggleText
                                ]}>💸 Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    type === 'income' && { backgroundColor: colors.success }
                                ]}
                                onPress={() => setType('income')}
                            >
                                <Text style={[
                                    styles.toggleText,
                                    { color: colors.mutedForeground },
                                    type === 'income' && styles.activeToggleText
                                ]}>💰 Income</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Description Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelContainer}>
                                <FileText size={16} color={colors.mutedForeground} />
                                <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
                                {errors.name && <Text style={[styles.errorText, { color: colors.danger }]}> *</Text>}
                            </View>
                            <TextInput
                                style={[
                                    styles.input,
                                    { backgroundColor: colors.card, borderColor: errors.name ? colors.danger : colors.border, color: colors.foreground }
                                ]}
                                placeholder="e.g., Grocery shopping, Salary..."
                                placeholderTextColor={colors.mutedForeground}
                                value={name}
                                onChangeText={(text) => {
                                    setName(text);
                                    if (errors.name) {
                                        setErrors({ ...errors, name: undefined });
                                    }
                                }}
                            />
                            {errors.name && (
                                <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.name}</Text>
                            )}
                        </View>

                        {/* Amount Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelContainer}>
                                <DollarSign size={16} color={colors.mutedForeground} />
                                <Text style={[styles.label, { color: colors.foreground }]}>Amount</Text>
                                {errors.amount && <Text style={[styles.errorText, { color: colors.danger }]}> *</Text>}
                            </View>
                            <View style={styles.amountContainer}>
                                <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>
                                    {currentCountry.currencySymbol}
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        styles.amountInput,
                                        { backgroundColor: colors.card, borderColor: errors.amount ? colors.danger : colors.border, color: colors.foreground }
                                    ]}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.mutedForeground}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={handleAmountChange}
                                />
                            </View>
                            {errors.amount && (
                                <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.amount}</Text>
                            )}
                        </View>

                        {/* Category Selection */}
                        {type === 'expense' && (
                            <View style={styles.inputGroup}>
                                <View style={styles.labelContainer}>
                                    <Tag size={16} color={colors.mutedForeground} />
                                    <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
                                    {errors.category && <Text style={[styles.errorText, { color: colors.danger }]}> *</Text>}
                                </View>
                                <View style={styles.categoriesGrid}>
                                    {categories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.categoryItem,
                                                { backgroundColor: colors.muted },
                                                category === cat.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                                            ]}
                                            onPress={() => setCategory(cat.id)}
                                        >
                                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                            <Text
                                                style={[
                                                    styles.categoryName,
                                                    { color: colors.foreground },
                                                    category === cat.id && { color: colors.primary, fontWeight: '700' }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {cat.name.split(' ')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {errors.category && (
                                    <Text style={[styles.errorMessage, { color: colors.danger }]}>{errors.category}</Text>
                                )}
                            </View>
                        )}

                        {/* Budget Alert */}
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

                        {/* Date Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelContainer}>
                                <CalendarIcon size={16} color={colors.mutedForeground} />
                                <Text style={[styles.label, { color: colors.foreground }]}>Date</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.input, { justifyContent: 'center', backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: colors.foreground, fontSize: 16 }}>
                                    {date || "Select Date"}
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
                                        Done
                                    </Button>
                                </View>
                            )}
                        </View>

                        {/* Notes Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.foreground }]}>Notes (optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                                placeholder="Add any notes..."
                                placeholderTextColor={colors.mutedForeground}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <Button
                            onPress={handleSubmit}
                            style={[styles.submitButton, { backgroundColor: type === 'expense' ? colors.primary : colors.success }]}
                        >
                            {type === 'expense' ? '💸 Add Expense' : '💰 Add Income'}
                        </Button>

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
    amountContainer: {
        position: 'relative',
    },
    currencySymbol: {
        position: 'absolute',
        left: 12,
        top: 12,
        fontSize: 16,
        fontWeight: '600',
        zIndex: 1,
    },
    amountInput: {
        paddingLeft: 28,
        fontWeight: '600',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    categoryItem: {
        width: '23%',
        margin: '1%',
        borderRadius: 12,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 11,
        fontWeight: '500',
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
    errorText: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorMessage: {
        fontSize: 12,
        marginTop: 4,
        marginLeft: 24,
    },
});
