/**
 * Expenses-specific sync/push contract tests.
 * These must pass for Finance (transactions + budgets) to sync safely under RLS.
 */
jest.mock('../../src/config/supabase', () => ({
  supabase: { from: jest.fn() },
  supabaseUrl: 'https://example.supabase.co',
  supabaseKey: 'anon',
}));

jest.mock('react-native-config', () => ({
  SUPABASE_SYNC_UPSERT_BATCH: '100',
  SUPABASE_SYNC_DELETE_BATCH: '100',
  LOG_SYNC_NETWORK: 'false',
}));

import { SYNC_TABLES } from '../../src/services/sync/TableRegistry';
import {
  isValidRecordForTable,
  transformRecordForSupabase,
} from '../../src/services/sync/TransformationEngine';
import {
  buildSoftDeleteUpsertRows,
  shouldPushSoftDelete,
} from '../../src/services/sync/PushEngine';
import {
  AUTH_USER_ID,
  expenseTransaction,
  budgetRecord,
} from '../../src/test-utils/syncFixtures';

describe('Expenses sync — transactions', () => {
  const config = SYNC_TABLES.find(t => t.key === 'transactions');

  test('transactions table is registered for sync push', () => {
    expect(config).toBeDefined();
    expect(config!.addProfileId).toBe(true);
    expect(config!.hasProfileId).toBe(true);
  });

  test('create expense push payload includes RLS-safe profile_id', () => {
    const { payload, localVersion } = transformRecordForSupabase(
      'transactions',
      expenseTransaction({
        name: 'Uber',
        amount: 18.75,
        type: 'expense',
        category: 'transport',
        date: '2026-08-26',
        version: 2,
      }),
      AUTH_USER_ID,
      true,
    );

    expect(localVersion).toBe(2);
    expect(payload).toEqual(
      expect.objectContaining({
        id: '22222222-2222-4222-8222-222222222222',
        profile_id: AUTH_USER_ID,
        name: 'Uber',
        amount: 18.75,
        type: 'expense',
        category: 'transport',
        date: '2026-08-26',
        deleted: false,
        version: 2,
      }),
    );
  });

  test('income entries also force profile_id', () => {
    const { payload } = transformRecordForSupabase(
      'transactions',
      expenseTransaction({
        name: 'Salary',
        amount: 5000,
        type: 'income',
        category: 'salary',
      }),
      AUTH_USER_ID,
      true,
    );

    expect(payload.type).toBe('income');
    expect(payload.profile_id).toBe(AUTH_USER_ID);
  });

  test('guest expense records are not pushable', () => {
    expect(
      isValidRecordForTable(
        expenseTransaction({ profileId: 'guest' }),
        'transactions',
      ),
    ).toBe(false);
  });

  test('soft-delete expense includes profile_id for RLS WITH CHECK', () => {
    const rows = buildSoftDeleteUpsertRows(
      ['22222222-2222-4222-8222-222222222222'],
      new Map([['22222222-2222-4222-8222-222222222222', 3]]),
      AUTH_USER_ID,
      true,
      '2026-08-26T15:00:00.000Z',
    );

    expect(rows[0]).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      deleted: true,
      version: 3,
      updated_at: '2026-08-26T15:00:00.000Z',
      profile_id: AUTH_USER_ID,
    });
  });

  test('does not push expense delete if remote row is missing', () => {
    expect(
      shouldPushSoftDelete(
        '22222222-2222-4222-8222-222222222222',
        new Map(),
        3,
      ),
    ).toBe(false);
  });
});

describe('Expenses sync — budgets', () => {
  test('budget push payload includes profile_id and month', () => {
    const { payload } = transformRecordForSupabase(
      'budgets',
      budgetRecord({ category: 'utilities', amount: 5000, month: '2026-09' }),
      AUTH_USER_ID,
      true,
    );

    expect(payload).toEqual(
      expect.objectContaining({
        profile_id: AUTH_USER_ID,
        category: 'utilities',
        amount: 5000,
        month: '2026-09',
      }),
    );
  });

  test('budget soft-delete is profile-scoped', () => {
    const rows = buildSoftDeleteUpsertRows(
      ['budget-1'],
      new Map([['budget-1', 1]]),
      AUTH_USER_ID,
      true,
      '2026-08-26T15:00:00.000Z',
    );
    expect(rows[0].profile_id).toBe(AUTH_USER_ID);
    expect(rows[0].deleted).toBe(true);
  });
});
