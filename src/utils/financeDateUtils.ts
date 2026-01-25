import { Transaction } from "../contexts/FinanceContext";

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatMonthKey = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

export const formatMonthLabel = (value: string): string => {
  const [year, month] = value.split('-');
  const monthIndex = Number(month) - 1;
  return `${MONTH_NAMES[monthIndex] || 'Unknown'} ${year}`;
};

export const toDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseTransactionDate = (tx: Transaction): Date | null => {
  if (!tx.date) return null;
  if (tx.date.toLowerCase() === 'today') {
    return new Date();
  }
  const direct = new Date(tx.date);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }
  const parts = tx.date.split('-').map(Number);
  if (parts.length === 3 && parts.every(part => !Number.isNaN(part))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null;
};
