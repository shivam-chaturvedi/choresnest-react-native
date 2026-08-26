/**
 * Pure filter helpers for Expenses History.
 * Kept free of React so search/category/period logic is unit-testable and fast.
 */

export type HistoryPeriodFilter = 'month' | 'week' | 'year' | 'custom';

export type HistoryTransactionLike = {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: 'income' | 'expense' | string;
  category: string;
  icon?: string;
  dateObj?: Date;
};

export type HistoryFilterInput = {
  period: HistoryPeriodFilter;
  monthKey: string; // YYYY-MM
  weekStartIso: string; // YYYY-MM-DD
  year: string; // YYYY
  customStart?: string;
  customEnd?: string;
  searchQuery: string;
  selectedCategories: string[]; // normalized category keys; empty = all
};

const KNOWN_CATEGORY_LABELS: Record<string, string> = {
  groceries: 'Groceries',
  utilities: 'Utilities',
  transport: 'Transport',
  food: 'Food & Dining',
  shopping: 'Shopping',
  healthcare: 'Healthcare',
  entertainment: 'Entertainment',
  education: 'Education',
  bills: 'Bills',
  maintenance: 'Maintenance',
  insurance: 'Insurance',
  subscriptions: 'Subscriptions',
  travel: 'Travel',
  gifts: 'Gifts',
  savings: 'Savings',
  rent: 'Rent',
  home: 'Home',
  kids: 'Kids',
  pets: 'Pets',
  salary: 'Salary',
  freelance: 'Freelance',
  other: 'Other',
};

export const normalizeCategoryKey = (
  value: string | null | undefined,
): string => {
  if (!value) return 'other';
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'other';
};

export const formatCategoryLabel = (raw: string): string => {
  const key = normalizeCategoryKey(raw);
  if (KNOWN_CATEGORY_LABELS[key]) return KNOWN_CATEGORY_LABELS[key];
  if (!raw) return 'Other';
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export const getKnownCategoryLabels = (): Record<string, string> => ({
  ...KNOWN_CATEGORY_LABELS,
});

/** Collapse whitespace + lowercase for matching. */
export const normalizeSearchText = (value: unknown): string => {
  if (value == null) return '';
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[₹$€£,\s]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

/** Strip punctuation so "bjjsdc!" still matches "bjjsdc". */
const compactAlnum = (value: string): string =>
  value.replace(/[^a-z0-9.]/g, '');

const parseLocalDate = (value?: string | number | Date | null): Date | null => {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const normalized = String(value).trim();
  if (!normalized) return null;

  // YYYY only
  if (/^\d{4}$/.test(normalized)) {
    const year = Number(normalized);
    return new Date(year, 0, 1);
  }

  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(normalized)) {
    const [y, m] = normalized.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }

  // YYYY-MM-DD or YYYY-MM-DDTHH:mm...
  const ymd = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }

  const direct = new Date(normalized);
  return Number.isNaN(direct.getTime()) ? null : direct;
};

export const resolveTransactionDate = (
  tx: HistoryTransactionLike,
): Date | null => {
  if (tx.dateObj instanceof Date && !Number.isNaN(tx.dateObj.getTime())) {
    return tx.dateObj;
  }
  return parseLocalDate(tx.date);
};

const buildSearchIndex = (tx: HistoryTransactionLike, date: Date): string => {
  const amountRaw = Number.isFinite(tx.amount) ? String(tx.amount) : '';
  const amountFixed = Number.isFinite(tx.amount) ? tx.amount.toFixed(2) : '';
  const amountInt = Number.isFinite(tx.amount)
    ? String(Math.trunc(tx.amount))
    : '';

  const monthShort = date
    .toLocaleDateString('en-US', { month: 'short' })
    .toLowerCase();
  const day = String(date.getDate());
  const year = String(date.getFullYear());
  const isoDate = `${year}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;

  const parts = [
    tx.name,
    tx.category,
    formatCategoryLabel(tx.category || ''),
    normalizeCategoryKey(tx.category),
    tx.type,
    amountRaw,
    amountFixed,
    amountInt,
    monthShort,
    day,
    year,
    isoDate,
  ];

  return normalizeSearchText(parts.filter(Boolean).join(' '));
};

/**
 * Google-like: empty query matches all.
 * Full query must match searchable text; multi-word requires every token to match.
 * Also matches compacted alphanumerics so punctuation/spacing differences don't block names.
 */
export const matchesTransactionSearch = (
  tx: HistoryTransactionLike,
  searchQuery: string,
  date?: Date | null,
): boolean => {
  const query = normalizeSearchText(searchQuery);
  if (!query) return true;

  const resolved = date ?? resolveTransactionDate(tx);
  if (!resolved) {
    // Still allow name/category/amount search when date is missing
    const fallbackIndex = normalizeSearchText(
      [
        tx.name,
        tx.category,
        formatCategoryLabel(tx.category || ''),
        tx.type,
        tx.amount,
      ]
        .filter(Boolean)
        .join(' '),
    );
    const compactIndex = compactAlnum(fallbackIndex);
    const tokens = query.split(' ').filter(Boolean);
    return tokens.every(
      token =>
        fallbackIndex.includes(token) ||
        compactIndex.includes(compactAlnum(token)),
    );
  }

  const index = buildSearchIndex(tx, resolved);
  const compactIndex = compactAlnum(index);
  const tokens = query.split(' ').filter(Boolean);

  return tokens.every(
    token =>
      index.includes(token) || compactIndex.includes(compactAlnum(token)),
  );
};

/** Empty selection = all categories. Otherwise match ANY selected (OR). */
export const matchesTransactionCategories = (
  tx: HistoryTransactionLike,
  selectedCategories: string[],
): boolean => {
  if (!selectedCategories.length) return true;
  const key = normalizeCategoryKey(tx.category);
  const selected = new Set(
    selectedCategories.map(c => normalizeCategoryKey(c)),
  );
  return selected.has(key);
};

export const matchesTransactionPeriod = (
  tx: HistoryTransactionLike,
  input: Pick<
    HistoryFilterInput,
    | 'period'
    | 'monthKey'
    | 'weekStartIso'
    | 'year'
    | 'customStart'
    | 'customEnd'
  >,
  date?: Date | null,
): boolean => {
  const txDate = date ?? resolveTransactionDate(tx);
  if (!txDate) return false;

  switch (input.period) {
    case 'month': {
      const monthKey = input.monthKey || '';
      const [year, month] = monthKey.split('-').map(Number);
      if (!year || !month) return true;
      return txDate.getFullYear() === year && txDate.getMonth() + 1 === month;
    }
    case 'week': {
      const start = parseLocalDate(input.weekStartIso);
      if (!start) return true;
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const startDay = new Date(start);
      startDay.setHours(0, 0, 0, 0);
      return txDate >= startDay && txDate <= end;
    }
    case 'year': {
      const yearNum = Number(String(input.year || '').trim());
      if (!Number.isFinite(yearNum)) return true;
      return txDate.getFullYear() === yearNum;
    }
    case 'custom': {
      const start = parseLocalDate(input.customStart);
      const end = parseLocalDate(input.customEnd);
      if (start && end) {
        const endInclusive = new Date(end);
        endInclusive.setHours(23, 59, 59, 999);
        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);
        return txDate >= startDay && txDate <= endInclusive;
      }
      if (start) {
        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);
        return txDate >= startDay;
      }
      if (end) {
        const endInclusive = new Date(end);
        endInclusive.setHours(23, 59, 59, 999);
        return txDate <= endInclusive;
      }
      return true;
    }
    default:
      return true;
  }
};

export type DatedHistoryTransaction<T extends HistoryTransactionLike> = T & {
  dateObj: Date;
};

/**
 * Apply period → category → search in one pass. Sorted newest first.
 */
export function filterHistoryTransactions<T extends HistoryTransactionLike>(
  transactions: T[],
  input: HistoryFilterInput,
): DatedHistoryTransaction<T>[] {
  const selectedCategories = input.selectedCategories || [];
  const searchQuery = input.searchQuery || '';

  const results: DatedHistoryTransaction<T>[] = [];

  for (let i = 0; i < transactions.length; i += 1) {
    const tx = transactions[i];
    const dateObj = resolveTransactionDate(tx);
    if (!dateObj) continue;

    if (!matchesTransactionPeriod(tx, input, dateObj)) continue;
    if (!matchesTransactionCategories(tx, selectedCategories)) continue;
    if (!matchesTransactionSearch(tx, searchQuery, dateObj)) continue;

    results.push({ ...tx, dateObj });
  }

  results.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  return results;
}

export function summarizeHistoryTransactions(
  transactions: Array<{ type: string; amount: number }>,
): { count: number; income: number; expense: number } {
  let income = 0;
  let expense = 0;
  for (let i = 0; i < transactions.length; i += 1) {
    const tx = transactions[i];
    if (tx.type === 'income') income += tx.amount || 0;
    else expense += tx.amount || 0;
  }
  return { count: transactions.length, income, expense };
}
