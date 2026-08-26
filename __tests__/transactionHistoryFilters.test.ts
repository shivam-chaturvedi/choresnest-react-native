import {
  filterHistoryTransactions,
  formatCategoryLabel,
  matchesTransactionCategories,
  matchesTransactionPeriod,
  matchesTransactionSearch,
  normalizeCategoryKey,
  normalizeSearchText,
  summarizeHistoryTransactions,
  type HistoryTransactionLike,
} from '../src/utils/transactionHistoryFilters';

const tx = (
  overrides: Partial<HistoryTransactionLike> = {},
): HistoryTransactionLike => ({
  id: '1',
  name: 'Bjjsdc',
  amount: 223,
  date: '2026-07-12',
  type: 'expense',
  category: 'groceries',
  ...overrides,
});

describe('transactionHistoryFilters — search', () => {
  test('empty query matches everything', () => {
    expect(matchesTransactionSearch(tx(), '')).toBe(true);
    expect(matchesTransactionSearch(tx(), '   ')).toBe(true);
  });

  test('matches by name substring (case-insensitive)', () => {
    expect(matchesTransactionSearch(tx(), 'c')).toBe(true);
    expect(matchesTransactionSearch(tx(), 'BJJ')).toBe(true);
    expect(matchesTransactionSearch(tx(), 'bjjsdc')).toBe(true);
    expect(matchesTransactionSearch(tx(), 'xyz')).toBe(false);
  });

  test('matches multi-token queries (AND)', () => {
    expect(matchesTransactionSearch(tx(), 'bj groceries')).toBe(true);
    expect(matchesTransactionSearch(tx(), 'bj bills')).toBe(false);
  });

  test('matches category id and friendly label', () => {
    expect(matchesTransactionSearch(tx(), 'groceries')).toBe(true);
    expect(matchesTransactionSearch(tx({ category: 'food' }), 'dining')).toBe(
      true,
    );
  });

  test('matches amount variants', () => {
    expect(matchesTransactionSearch(tx(), '223')).toBe(true);
    expect(matchesTransactionSearch(tx(), '223.00')).toBe(true);
    expect(matchesTransactionSearch(tx({ amount: 19.5 }), '19.5')).toBe(true);
  });

  test('normalizeSearchText strips currency noise', () => {
    expect(normalizeSearchText('₹223.00')).toBe('223.00');
    expect(normalizeSearchText('  Hello   World ')).toBe('hello world');
  });
});

describe('transactionHistoryFilters — categories', () => {
  test('empty selection matches all', () => {
    expect(matchesTransactionCategories(tx(), [])).toBe(true);
  });

  test('multi-select is OR across selected categories', () => {
    expect(matchesTransactionCategories(tx(), ['groceries', 'bills'])).toBe(
      true,
    );
    expect(matchesTransactionCategories(tx(), ['bills', 'food'])).toBe(false);
  });

  test('normalizes category keys', () => {
    expect(normalizeCategoryKey('Food & Dining')).toBe('food_dining');
    expect(formatCategoryLabel('groceries')).toBe('Groceries');
    expect(
      matchesTransactionCategories(tx({ category: 'Groceries' }), [
        'groceries',
      ]),
    ).toBe(true);
  });
});

describe('transactionHistoryFilters — period', () => {
  test('month filter', () => {
    expect(
      matchesTransactionPeriod(tx(), {
        period: 'month',
        monthKey: '2026-07',
        weekStartIso: '2026-07-06',
        year: '2026',
      }),
    ).toBe(true);
    expect(
      matchesTransactionPeriod(tx(), {
        period: 'month',
        monthKey: '2026-08',
        weekStartIso: '2026-08-01',
        year: '2026',
      }),
    ).toBe(false);
  });

  test('year filter uses YYYY string safely', () => {
    expect(
      matchesTransactionPeriod(tx(), {
        period: 'year',
        monthKey: '2026-07',
        weekStartIso: '2026-07-06',
        year: '2026',
      }),
    ).toBe(true);
    expect(
      matchesTransactionPeriod(tx(), {
        period: 'year',
        monthKey: '2026-07',
        weekStartIso: '2026-07-06',
        year: '2025',
      }),
    ).toBe(false);
  });

  test('week filter inclusive range', () => {
    expect(
      matchesTransactionPeriod(tx(), {
        period: 'week',
        monthKey: '2026-07',
        weekStartIso: '2026-07-12',
        year: '2026',
      }),
    ).toBe(true);
    expect(
      matchesTransactionPeriod(tx(), {
        period: 'week',
        monthKey: '2026-07',
        weekStartIso: '2026-07-19',
        year: '2026',
      }),
    ).toBe(false);
  });
});

describe('filterHistoryTransactions — combined', () => {
  const rows: HistoryTransactionLike[] = [
    tx({
      id: '1',
      name: 'Bjjsdc',
      category: 'groceries',
      date: '2026-07-12',
      amount: 223,
    }),
    tx({
      id: '2',
      name: 'Power bill',
      category: 'bills',
      date: '2026-07-05',
      amount: 900,
    }),
    tx({
      id: '3',
      name: 'Salary',
      category: 'salary',
      type: 'income',
      date: '2026-07-01',
      amount: 50000,
    }),
    tx({
      id: '4',
      name: 'Coffee',
      category: 'food',
      date: '2026-08-02',
      amount: 120,
    }),
  ];

  test('filters by month + multi category + name search', () => {
    const result = filterHistoryTransactions(rows, {
      period: 'month',
      monthKey: '2026-07',
      weekStartIso: '2026-07-06',
      year: '2026',
      searchQuery: 'bj',
      selectedCategories: ['groceries', 'bills'],
    });

    expect(result.map(r => r.id)).toEqual(['1']);
    expect(result[0].name).toBe('Bjjsdc');
  });

  test('search alone finds name across selected month', () => {
    const result = filterHistoryTransactions(rows, {
      period: 'month',
      monthKey: '2026-07',
      weekStartIso: '2026-07-06',
      year: '2026',
      searchQuery: 'power',
      selectedCategories: [],
    });
    expect(result.map(r => r.id)).toEqual(['2']);
  });

  test('category multi-select without search returns OR matches in period', () => {
    const result = filterHistoryTransactions(rows, {
      period: 'month',
      monthKey: '2026-07',
      weekStartIso: '2026-07-06',
      year: '2026',
      searchQuery: '',
      selectedCategories: ['groceries', 'bills'],
    });
    expect(result.map(r => r.id)).toEqual(['1', '2']);
  });

  test('summarize income vs expense', () => {
    const filtered = filterHistoryTransactions(rows, {
      period: 'month',
      monthKey: '2026-07',
      weekStartIso: '2026-07-06',
      year: '2026',
      searchQuery: '',
      selectedCategories: [],
    });
    const summary = summarizeHistoryTransactions(filtered);
    expect(summary.count).toBe(3);
    expect(summary.income).toBe(50000);
    expect(summary.expense).toBe(1123);
  });
});
