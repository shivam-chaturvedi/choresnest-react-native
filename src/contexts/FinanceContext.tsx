import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { getDatabase } from '../database';
import {
  Transaction as DbTransaction,
  Budget as DbBudget,
} from '../database/models/Finance';
import { Q } from '@nozbe/watermelondb';
import { SyncService } from '../services/SyncService';
import { CategoryColorService } from '../services/CategoryColorService';
import { useActiveProfileId } from '../hooks/useActiveProfileId';

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
  addTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
  ) => void;
  updateTransaction: (
    id: string,
    updates: Partial<Omit<Transaction, 'id'>>,
  ) => void;
  deleteTransaction: (id: string) => void;
  budgets: Budget;
  updateBudget: (category: string, amount: number) => void;
  deleteBudget: (category: string) => void;
  categoryColors: Record<string, string>;
  categoryIcons: Record<string, string>;
  setCategoryColor: (category: string, colorHex: string) => Promise<void>;
}

const defaultCategoryIcons: Record<string, string> = {
  groceries: 'cart-outline',
  utilities: 'flash',
  transport: 'car',
  food: 'silverware-fork-knife',
  shopping: 'tshirt-crew',
  healthcare: 'hospital-box',
  entertainment: 'ticket-confirmation',
  education: 'school',
  bills: 'file-document',
  maintenance: 'tools',
  alimony: 'hand-heart',
  insurance: 'shield-check',
  subscriptions: 'bookmark-outline',
  travel: 'airplane',
  gifts: 'gift-outline',
  savings: 'piggy-bank',
  rent: 'home-outline',
  home: 'home-city-outline',
  kids: 'baby-face-outline',
  pets: 'paw',
  other: 'dots-horizontal',
  salary: 'briefcase',
  freelance: 'laptop',
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
  bills: 12000,
  maintenance: 4000,
  insurance: 3000,
  service: 3500,
  salary: 0,
  freelance: 0,
  other: 2000,
};

const convertColorMap = (map: Map<string, string>): Record<string, string> => {
  const record: Record<string, string> = {};
  map.forEach((value, key) => {
    record[key] = value;
  });
  return record;
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget>(defaultBudgets);
  const [budgetMeta, setBudgetMeta] = useState<Record<string, BudgetMeta>>({});
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
    {},
  );
  const profileId = useActiveProfileId();
  const syncAfterWrite = useCallback(() => {
    void SyncService.requestSyncSoon();
  }, []);

  useEffect(() => {
    if (!profileId) {
      setTransactions([]);
      return;
    }
    const collection = getDatabase().get<DbTransaction>('transactions');
    const subscription = collection
      .query(
        Q.where('profile_id', profileId),
        Q.where('deleted', false),
        Q.sortBy('date', Q.desc),
      )
      .observeWithColumns([
        'name',
        'amount',
        'date',
        'icon',
        'type',
        'category',
        'created_at',
        'updated_at',
      ])
      .subscribe({
        next: records => {
          const mapped = records.map(record => ({
            id: record.id,
            name: record.name,
            amount: record.amount,
            date: record.date,
            icon: record.icon,
            type: (record.type === 'income' ? 'income' : 'expense') as
              | 'income'
              | 'expense',
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
    const collection = getDatabase().get<DbBudget>('budgets');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const subscription = collection
      .query(
        Q.where('profile_id', profileId),
        Q.where('deleted', false),
        Q.where('month', currentMonth),
        Q.sortBy('category', Q.asc),
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

  useEffect(() => {
    let isMounted = true;
    if (!profileId) {
      setCategoryColors({});
      return () => {
        isMounted = false;
      };
    }

    const loadCategoryColors = async () => {
      try {
        const candidates = new Set<string>();
        Object.keys(budgets).forEach(cat => candidates.add(cat));
        transactions.forEach(tx => {
          if (tx.category) {
            candidates.add(tx.category);
          }
        });
        candidates.add('other');

        const result = await CategoryColorService.ensureMappingsForCategories(
          profileId,
          Array.from(candidates),
        );

        if (!isMounted) {
          return;
        }

        setCategoryColors(convertColorMap(result.map));
        if (result.created > 0) {
          syncAfterWrite();
        }
      } catch (error) {
        console.error('CategoryColorService failed to load mappings', error);
      }
    };

    void loadCategoryColors();

    return () => {
      isMounted = false;
    };
  }, [profileId, budgets, transactions, syncAfterWrite]);

  const setCategoryColor = useCallback(
    async (category: string, colorHex: string) => {
      if (!profileId) {
        console.warn('Skipping category color write until profile is known');
        return;
      }

      try {
        await CategoryColorService.setCategoryColor(
          profileId,
          category,
          colorHex,
        );
        setCategoryColors(prev => ({
          ...prev,
          [CategoryColorService.normalizeCategoryKey(category)]: colorHex,
        }));
        syncAfterWrite();
      } catch (error) {
        console.error('Failed to persist category color locally', error);
      }
    },
    [profileId, syncAfterWrite],
  );

  const addTransaction = (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    const timestamp = Date.now();
    void (async () => {
      try {
        if (!profileId) {
          console.warn('Skipping transaction write until profile is known');
          return;
        }
        let createdTransaction: Transaction | null = null;
        await getDatabase().write(async () => {
          const collection = getDatabase().get<DbTransaction>('transactions');
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
            type: (record.type === 'income' ? 'income' : 'expense') as
              | 'income'
              | 'expense',
            category: record.category,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          };
        });

        if (createdTransaction) {
          syncAfterWrite();
          const normalizedCategory = (
            createdTransaction.category || 'other'
          ).toLowerCase();
          const budgetKey =
            budgets[createdTransaction.category] ?? budgets[normalizedCategory];
          const monthKey = (
            createdTransaction.date || new Date().toISOString()
          ).slice(0, 7);
          if (createdTransaction.type === 'expense') {
            const spentThisMonth = transactions
              .filter(
                tx =>
                  tx.type === 'expense' &&
                  (tx.category || '').toLowerCase() === normalizedCategory &&
                  (tx.date || '').slice(0, 7) === monthKey,
              )
              .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            const projectedTotal = spentThisMonth + createdTransaction.amount;
            if (
              budgetKey &&
              spentThisMonth < budgetKey &&
              projectedTotal >= budgetKey
            ) {
            }
          } else {
          }
        }
      } catch (error) {
        console.warn('Failed to persist transaction locally', error);
      }
    })();
  };

  const updateTransaction = (
    id: string,
    updates: Partial<Omit<Transaction, 'id'>>,
  ) => {
    void (async () => {
      try {
        let updatedTransaction: Transaction | null = null;
        await getDatabase().write(async () => {
          const collection = getDatabase().get<DbTransaction>('transactions');
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
            type: (record.type === 'income' ? 'income' : 'expense') as
              | 'income'
              | 'expense',
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
        await getDatabase().write(async () => {
          const collection = getDatabase().get<DbTransaction>('transactions');
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
        let createdNewRecord = false;
        await getDatabase().write(async () => {
          const collection = getDatabase().get<DbBudget>('budgets');
          const matches = await collection
            .query(
              Q.where('profile_id', profileId),
              Q.where('deleted', false),
              Q.where('category', category),
              Q.where('month', month),
              Q.sortBy('updated_at', Q.desc),
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
            createdNewRecord = true;
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
        if (createdNewRecord) {
        }
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
        await getDatabase().write(async () => {
          const collection = getDatabase().get<DbBudget>('budgets');
          const matches = await collection
            .query(
              Q.where('profile_id', profileId),
              Q.where('deleted', false),
              Q.where('category', category),
              Q.where('month', month),
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
              }),
            ),
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
        categoryColors,
        categoryIcons: defaultCategoryIcons,
        setCategoryColor,
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
