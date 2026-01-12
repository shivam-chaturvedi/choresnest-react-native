import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, Alert } from 'react-native';
import { theme } from '../../theme';
import { Calendar as CalendarIcon, DollarSign, Tag, FileText, AlertTriangle, X } from 'lucide-react-native';
import { Button } from '../ui/Button';
import DateTimePicker from '@react-native-community/datetimepicker';

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
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
    visible,
    onClose,
    onAdd,
    budgets,
    currentSpending,
}) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('groceries');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const selectedCategory = categories.find(c => c.id === category);
    const currentCategorySpending = currentSpending[category] || 0;
    const categoryBudget = budgets[category] || 0;
    const newAmount = parseFloat(amount) || 0;
    const willExceedBudget = type === 'expense' && categoryBudget > 0 && (currentCategorySpending + newAmount) > categoryBudget;
    const percentOfBudget = categoryBudget > 0 ? ((currentCategorySpending + newAmount) / categoryBudget) * 100 : 0;

    const handleSubmit = () => {
        if (!name.trim() || !amount) return;

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
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        onClose();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            setDate(selectedDate.toISOString().split('T')[0]);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.titleContainer}>
                            <View style={styles.iconContainer}>
                                <DollarSign size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.title}>Add Transaction</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={theme.colors.mutedForeground} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Type Toggle */}
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    type === 'expense' && styles.activeExpense
                                ]}
                                onPress={() => setType('expense')}
                            >
                                <Text style={[
                                    styles.toggleText,
                                    type === 'expense' && styles.activeToggleText
                                ]}>💸 Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    type === 'income' && styles.activeIncome
                                ]}
                                onPress={() => setType('income')}
                            >
                                <Text style={[
                                    styles.toggleText,
                                    type === 'income' && styles.activeToggleText
                                ]}>💰 Income</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Description Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelContainer}>
                                <FileText size={16} color={theme.colors.mutedForeground} />
                                <Text style={styles.label}>Description</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Grocery shopping, Salary..."
                                placeholderTextColor={theme.colors.mutedForeground}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Amount Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelContainer}>
                                <DollarSign size={16} color={theme.colors.mutedForeground} />
                                <Text style={styles.label}>Amount</Text>
                            </View>
                            <View style={styles.amountContainer}>
                                <Text style={styles.currencySymbol}>₹</Text>
                                <TextInput
                                    style={[styles.input, styles.amountInput]}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.mutedForeground}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                            </View>
                        </View>

                        {/* Category Selection */}
                        {type === 'expense' && (
                            <View style={styles.inputGroup}>
                                <View style={styles.labelContainer}>
                                    <Tag size={16} color={theme.colors.mutedForeground} />
                                    <Text style={styles.label}>Category</Text>
                                </View>
                                <View style={styles.categoriesGrid}>
                                    {categories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.categoryItem,
                                                category === cat.id && styles.selectedCategory
                                            ]}
                                            onPress={() => setCategory(cat.id)}
                                        >
                                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                            <Text
                                                style={[
                                                    styles.categoryName,
                                                    category === cat.id && styles.selectedCategoryText
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {cat.name.split(' ')[0]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Budget Alert */}
                        {type === 'expense' && willExceedBudget && (
                            <View style={styles.alertContainer}>
                                <View style={styles.alertHeader}>
                                    <AlertTriangle size={20} color={theme.colors.danger} />
                                    <View style={styles.alertTexts}>
                                        <Text style={styles.alertTitle}>Budget Alert!</Text>
                                        <Text style={styles.alertDescription}>
                                            This will exceed your {selectedCategory?.name} budget by ₹{((currentCategorySpending + newAmount) - categoryBudget).toFixed(0)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.budgetProgressBg}>
                                    <View
                                        style={[
                                            styles.budgetProgressFill,
                                            { width: `${Math.min(percentOfBudget, 100)}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.budgetPercentText}>
                                    {percentOfBudget.toFixed(0)}% of budget used
                                </Text>
                            </View>
                        )}

                        {/* Date Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelContainer}>
                                <CalendarIcon size={16} color={theme.colors.mutedForeground} />
                                <Text style={styles.label}>Date</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.input, { justifyContent: 'center' }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: theme.colors.foreground, fontSize: 16 }}>
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
                            {/* iOS Done button helper if needed for inline/spinner, but standard spinner needs wrapping.
                                For simplicity and reliability in this update, sticking to conditional render.
                                If on iOS it stays open, we'd need a button to close.
                                Let's add a quick "Done" button if on iOS and showDatePicker is true.
                            */}
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
                            <Text style={styles.label}>Notes (optional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Add any notes..."
                                placeholderTextColor={theme.colors.mutedForeground}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <Button
                            onPress={handleSubmit}
                            disabled={!name.trim() || !amount}
                            style={styles.submitButton}
                        >
                            {type === 'expense' ? '💸 Add Expense' : '💰 Add Income'}
                        </Button>

                        {/* Bottom spacer for keyboard */}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
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
        backgroundColor: theme.colors.background,
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
        borderBottomColor: theme.colors.border,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.foreground,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.muted,
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
    activeExpense: {
        backgroundColor: theme.colors.danger,
        shadowColor: theme.colors.danger,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    activeIncome: {
        backgroundColor: theme.colors.success || '#22c55e',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.mutedForeground,
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
        color: theme.colors.foreground,
        marginLeft: 8,
    },
    input: {
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: theme.colors.foreground,
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
        color: theme.colors.mutedForeground,
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
        backgroundColor: theme.colors.muted,
        borderRadius: 12,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedCategory: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: theme.colors.primary,
    },
    categoryIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    categoryName: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.colors.foreground,
    },
    selectedCategoryText: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    alertContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
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
        color: theme.colors.danger,
        marginBottom: 2,
    },
    alertDescription: {
        fontSize: 12,
        color: theme.colors.danger,
        opacity: 0.8,
    },
    budgetProgressBg: {
        height: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    budgetProgressFill: {
        height: '100%',
        backgroundColor: theme.colors.danger,
        borderRadius: 4,
    },
    budgetPercentText: {
        fontSize: 11,
        color: theme.colors.danger,
        opacity: 0.7,
    },
    submitButton: {
        marginTop: 8,
    },
});
