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

export const toDate = (value?: string | number | Date): Date | null => {
  if (value === undefined || value === null) return null;

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.toLowerCase() === 'today') {
    return new Date();
  }

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const parts = normalized.split('-').map(Number);
  if (parts.length === 3 && parts.every(part => !Number.isNaN(part))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  return null;
};

export const normalizeTransactionDateValue = (value?: string | number | Date): string => {
  const fallback = new Date();
  const date = toDate(value) || fallback;
  return date.toISOString().split('T')[0];
};

export const parseTransactionDate = (tx: Transaction): Date | null => {
  return toDate(tx.date);
};
