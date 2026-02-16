import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { database } from '../database';
import { Transaction as DbTransaction, Budget as DbBudget } from '../database/models/Finance';
import { Q } from '@nozbe/watermelondb';
import { SyncService } from '../services/SyncService';
import { supabase } from '../config/supabase';

export interface Transaction {
    id: string;
    name: string;
    amount: number;
    date: string;
    icon: string;
    type: 'income' | 'expense';
    category: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface Budget {
    [category: string]: number;
}

interface BudgetMeta {
    recordId: string;
    createdAt: number;
}
interface FinanceContextType {
    transactions: Transaction[];
    addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void;
    deleteTransaction: (id: string) => void;
    budgets: Budget;
    updateBudget: (category: string, amount: number) => void;
    deleteBudget: (category: string) => void;
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
    salary: 0,
    freelance: 0,
    other: 2000,
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget>(defaultBudgets);
    const [budgetMeta, setBudgetMeta] = useState<Record<string, BudgetMeta>>({});
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const refreshProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (isMounted) {
                    setProfileId(user?.id ?? null);
                }
            } catch (error) {
                console.warn('Failed to fetch profile id for finance context', error);
            }
        };
        refreshProfile();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isMounted) return;
            setProfileId(session?.user?.id ?? null);
        });
        return () => {
            isMounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!profileId) {
            setTransactions([]);
            return;
        }
        const collection = database.get<DbTransaction>('transactions');
        const subscription = collection
            .query(
                Q.where('profile_id', profileId),
                Q.where('deleted', false),
                Q.sortBy('date', Q.desc)
            )
            .observeWithColumns(['name', 'amount', 'date', 'icon', 'type', 'category', 'created_at', 'updated_at'])
            .subscribe({
                next: records => {
                    const mapped = records.map(record => ({
                        id: record.id,
                        name: record.name,
                        amount: record.amount,
                        date: record.date,
                        icon: record.icon,
                        type: (record.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
                        category: record.category,
                        createdAt: record.createdAt,
                        updatedAt: record.updatedAt,
                    }));
                    setTransactions(mapped);
                },
                error: error => {
                    console.error('Transactions subscription failed', error);
                },
            });

        return () => subscription.unsubscribe();
    }, [profileId]);

    useEffect(() => {
        if (!profileId) {
            setBudgets(defaultBudgets);
            setBudgetMeta({});
            return;
        }
        const collection = database.get<DbBudget>('budgets');
        const currentMonth = new Date().toISOString().slice(0, 7);
        const subscription = collection
            .query(
                Q.where('profile_id', profileId),
                Q.where('deleted', false),
                Q.where('month', currentMonth),
                Q.sortBy('category', Q.asc)
            )
            .observeWithColumns(['category', 'amount', 'created_at', 'updated_at'])
            .subscribe({
                next: records => {
                    const nextBudgets: Budget = { ...defaultBudgets };
                    const latestTimestamps: Record<string, number> = {};
                    const budgetMetaMap: Record<string, BudgetMeta> = {};
                    // NOTE: budgets are month-scoped; latest updated record per category wins
                    records.forEach(record => {
                        const category = record.category || 'other';
                        const updatedAt = record.updatedAt ?? 0;
                        const currentTimestamp = latestTimestamps[category] ?? -Infinity;
                        if (updatedAt >= currentTimestamp) {
                            latestTimestamps[category] = updatedAt;
                            nextBudgets[category] = record.amount;
                            budgetMetaMap[category] = {
                                recordId: record.id,
                                createdAt: record.createdAt ?? Date.now(),
                            };
                        }
                    });
                    setBudgets(nextBudgets);
                    setBudgetMeta(budgetMetaMap);
                },
                error: error => {
                    console.error('Budgets subscription failed', error);
                },
            });

        return () => subscription.unsubscribe();
    }, [profileId]);

    const syncAfterWrite = useCallback(() => {
        void SyncService.requestSyncSoon();
    }, []);

    const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
        const timestamp = Date.now();
        void (async () => {
            try {
                if (!profileId) {
                    console.warn('Skipping transaction write until profile is known');
                    return;
                }
                let createdTransaction: Transaction | null = null;
                await database.write(async () => {
                    const collection = database.get<DbTransaction>('transactions');
                    const record = await collection.create(rec => {
                        rec.profileId = profileId;
                        rec.name = transaction.name;
                        rec.amount = transaction.amount;
                        rec.date = transaction.date;
                        rec.icon = transaction.icon;
                        rec.type = transaction.type;
                        rec.category = transaction.category;
                        rec.createdAt = timestamp;
                        rec.updatedAt = timestamp;
                        rec.deleted = false;
                        rec.version = 1;
                    });
                    createdTransaction = {
                        id: record.id,
                        name: record.name,
                        amount: record.amount,
                        date: record.date,
                        icon: record.icon,
                        type: (record.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
                        category: record.category,
                        createdAt: record.createdAt,
                        updatedAt: record.updatedAt,
                    };
                });

                if (createdTransaction) {
                    syncAfterWrite();
                }
            } catch (error) {
                console.warn('Failed to persist transaction locally', error);
            }
        })();
    };

    const updateTransaction = (id: string, updates: Partial<Omit<Transaction, 'id'>>) => {
        void (async () => {
            try {
                let updatedTransaction: Transaction | null = null;
                await database.write(async () => {
                    const collection = database.get<DbTransaction>('transactions');
                    const record = await collection.find(id);
                    const now = Date.now();
                    await record.update(tx => {
                        tx.name = updates.name ?? tx.name;
                        tx.amount = updates.amount ?? tx.amount;
                        tx.date = updates.date ?? tx.date;
                        tx.icon = updates.icon ?? tx.icon;
                        tx.type = updates.type ?? tx.type;
                        tx.category = updates.category ?? tx.category;
                        tx.updatedAt = now;
                        tx.version = (tx.version ?? 0) + 1;
                    });
                    updatedTransaction = {
                        id: record.id,
                        name: record.name,
                        amount: record.amount,
                        date: record.date,
                        icon: record.icon,
                        type: (record.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
                        category: record.category,
                        createdAt: record.createdAt,
                        updatedAt: record.updatedAt,
                    };
                });
                if (updatedTransaction) {
                    syncAfterWrite();
                }
            } catch (error) {
                console.warn('Failed to update transaction locally', error);
            }
        })();
    };

    const deleteTransaction = (id: string) => {
        void (async () => {
            try {
                await database.write(async () => {
                    const collection = database.get<DbTransaction>('transactions');
                    const record = await collection.find(id);
                    const now = Date.now();
                    await record.update(tx => {
                        tx.deleted = true;
                        tx.updatedAt = now;
                        tx.version = (tx.version ?? 0) + 1;
                    });
                });
                syncAfterWrite();
            } catch (error) {
                console.warn('Failed to mark transaction deleted locally', error);
            }
        })();
    };

    const updateBudget = (category: string, amount: number) => {
        const month = new Date().toISOString().slice(0, 7);
        void (async () => {
            try {
                if (!profileId) {
                    console.warn('Skipping budget write until profile is known');
                    return;
                }

                let budgetRecord: DbBudget | null = null;
                await database.write(async () => {
                    const collection = database.get<DbBudget>('budgets');
                    const matches = await collection
                        .query(
                            Q.where('profile_id', profileId),
                            Q.where('deleted', false),
                            Q.where('category', category),
                            Q.where('month', month),
                            Q.sortBy('updated_at', Q.desc)
                        )
                        .fetch();
                    const now = Date.now();
                    if (matches.length > 0) {
                        budgetRecord = matches[0];
                        await budgetRecord.update(record => {
                            record.amount = amount;
                            record.updatedAt = now;
                            record.deleted = false;
                            record.version = (record.version ?? 0) + 1;
                        });
                    } else {
                        budgetRecord = await collection.create(record => {
                            record.profileId = profileId;
                            record.category = category;
                            record.amount = amount;
                            record.month = month;
                            record.createdAt = now;
                            record.updatedAt = now;
                            record.deleted = false;
                            record.version = 1;
                        });
                    }
                });

                if (budgetRecord) {
                    setBudgetMeta(prev => ({
                        ...prev,
                        [category]: {
                            recordId: budgetRecord!.id,
                            createdAt: budgetRecord!.createdAt,
                        },
                    }));
                }

                syncAfterWrite();
            } catch (error) {
                console.warn('Failed to persist budget locally', error);
            }
        })();
    };

    const deleteBudget = (category: string) => {
        const month = new Date().toISOString().slice(0, 7);
        void (async () => {
            const originalRecordId = budgetMeta[category]?.recordId || '';
            let recordIdToDelete = originalRecordId;
            try {
                if (!profileId) {
                    console.warn('Skipping budget delete until profile is known');
                    return;
                }
                await database.write(async () => {
                    const collection = database.get<DbBudget>('budgets');
                    const matches = await collection
                        .query(
                            Q.where('profile_id', profileId),
                            Q.where('deleted', false),
                            Q.where('category', category),
                            Q.where('month', month)
                        )
                        .fetch();
                    const now = Date.now();
                    if (!recordIdToDelete && matches.length > 0) {
                        recordIdToDelete = matches[0].id;
                    }
                    await Promise.all(
                        matches.map(record =>
                            record.update(r => {
                                r.deleted = true;
                                r.updatedAt = now;
                                r.version = (r.version ?? 0) + 1;
                            })
                        )
                    );
                });
                setBudgetMeta(prev => {
                    const next = { ...prev };
                    delete next[category];
                    return next;
                });
                syncAfterWrite();
            } catch (error) {
                console.warn('Failed to delete budget locally', error);
            }
        })();
    };

    return (
        <FinanceContext.Provider
            value={{
                transactions,
                addTransaction,
                updateTransaction,
                deleteTransaction,
                budgets,
                updateBudget,
                deleteBudget,
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

// Acceptance Checklist:
// - Device A adds/edits/deletes transactions or budgets (profile-aware) and Device B sees the tombstoned change through SyncService.requestSyncSoon().
// - Switch profiles on Device B; only the matching budgets/transactions appear after sync, proving profile isolation and debounced write-only pushes.
