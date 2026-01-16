import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Transaction {
    id: number;
    name: string;
    amount: number;
    date: string;
    icon: string;
    type: 'income' | 'expense';
    category: string;
}

export interface Budget {
    [category: string]: number;
}

interface FinanceContextType {
    transactions: Transaction[];
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    deleteTransaction: (id: number) => void;
    budgets: Budget;
    updateBudget: (category: string, amount: number) => void;
    categoryColors: Record<string, string>;
    categoryIcons: Record<string, string>;
}

const defaultCategoryColors: Record<string, string> = {
    groceries: '#10b981',
    utilities: '#f59e0b',
    transport: '#3b82f6',
    food: '#f97316',
    shopping: '#ec4899',
    healthcare: '#ef4444',
    entertainment: '#8b5cf6',
    education: '#6366f1',
    other: '#6b7280',
    salary: '#10b981',
    freelance: '#3b82f6',
};

const defaultCategoryIcons: Record<string, string> = {
    groceries: '🛒',
    utilities: '⚡',
    transport: '🚗',
    food: '🍽️',
    shopping: '🛍️',
    healthcare: '🏥',
    entertainment: '🎬',
    education: '📚',
    salary: '💼',
    freelance: '💻',
    other: '📦'
};

const defaultBudgets: Budget = {
    groceries: 10000,
    utilities: 5000,
    transport: 6000,
    food: 8000,
    shopping: 5000,
    healthcare: 3000,
    entertainment: 2000,
    education: 5000,
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget>(defaultBudgets);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        saveData();
    }, [transactions, budgets]);

    const loadData = async () => {
        try {
            const storedTransactions = await AsyncStorage.getItem('FINANCE_TRANSACTIONS');
            const storedBudgets = await AsyncStorage.getItem('FINANCE_BUDGETS');

            if (storedTransactions) {
                setTransactions(JSON.parse(storedTransactions));
            }
            if (storedBudgets) {
                setBudgets(JSON.parse(storedBudgets));
            }
        } catch (e) {
            console.error('Failed to load finance data', e);
        }
    };

    const saveData = async () => {
        try {
            await AsyncStorage.setItem('FINANCE_TRANSACTIONS', JSON.stringify(transactions));
            await AsyncStorage.setItem('FINANCE_BUDGETS', JSON.stringify(budgets));
        } catch (e) {
            console.error('Failed to save finance data', e);
        }
    };

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction = { ...transaction, id: Date.now() };
        setTransactions(prev => [newTransaction, ...prev]);
    };

    const deleteTransaction = (id: number) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const updateBudget = (category: string, amount: number) => {
        setBudgets(prev => ({
            ...prev,
            [category]: amount
        }));
    };

    return (
        <FinanceContext.Provider
            value={{
                transactions,
                addTransaction,
                deleteTransaction,
                budgets,
                updateBudget,
                categoryColors: defaultCategoryColors,
                categoryIcons: defaultCategoryIcons
            }}
        >
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};
