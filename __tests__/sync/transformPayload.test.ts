jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  },
  supabaseUrl: 'https://example.supabase.co',
  supabaseKey: 'anon',
}));

jest.mock('react-native-config', () => ({
  SUPABASE_SYNC_UPSERT_BATCH: '100',
  SUPABASE_SYNC_DELETE_BATCH: '100',
  LOG_SYNC_NETWORK: 'false',
}));

import {
  isValidRecordForTable,
  transformRecordForSupabase,
  dedupeById,
} from '../../src/services/sync/TransformationEngine';
import {
  AUTH_USER_ID,
  GUEST_PROFILE_ID,
  LOCAL_LIST_ID,
  LOCAL_MEMBER_ID,
  documentRecord,
  eventRecord,
  expenseTransaction,
  budgetRecord,
  listItemRecord,
  listRecord,
  noteRecord,
  taskRecord,
  folderRecord,
} from '../../src/test-utils/syncFixtures';

describe('transformRecordForSupabase — domain push payloads', () => {
  test('expenses/transactions force auth profile_id and keep finance fields', () => {
    const { payload } = transformRecordForSupabase(
      'transactions',
      expenseTransaction({ profileId: 'guest' }),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.name).toBe('Groceries');
    expect(payload.amount).toBe(42.5);
    expect(payload.type).toBe('expense');
    expect(payload.category).toBe('groceries');
    expect(payload.deleted).toBe(false);
    expect(payload.version).toBe(1);
  });

  test('expenses/budgets force auth profile_id', () => {
    const { payload } = transformRecordForSupabase(
      'budgets',
      budgetRecord(),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.category).toBe('groceries');
    expect(payload.amount).toBe(10000);
    expect(payload.month).toBe('2026-08');
  });

  test('notes stringify blocks_json and keep profile_id', () => {
    const { payload } = transformRecordForSupabase(
      'notes',
      noteRecord(),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(typeof payload.blocks_json).toBe('string');
    expect(JSON.parse(payload.blocks_json as string)).toEqual([
      { type: 'paragraph', text: 'Milk' },
    ]);
  });

  test('lists keep shopping list fields', () => {
    const { payload } = transformRecordForSupabase(
      'lists',
      listRecord(),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.name).toBe('Weekly shopping');
    expect(payload.type).toBe('shopping');
  });

  test('list_items require list_id and map completion fields', () => {
    const { payload } = transformRecordForSupabase(
      'list_items',
      listItemRecord(),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.list_id).toBe(LOCAL_LIST_ID);
    expect(payload.is_completed).toBe(false);
    expect(payload.name).toBe('Eggs');
  });

  test('tasks map date/assignee/reminder fields', () => {
    const { payload } = transformRecordForSupabase(
      'tasks',
      taskRecord(),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.date).toBe('2026-08-26');
    expect(payload.due_display).toBe('10:00 AM');
    expect(payload.assignee_id).toBe(LOCAL_MEMBER_ID);
    expect(payload.reminder_enabled).toBe(true);
  });

  test('events (calendar) map date/member/reminder fields', () => {
    const { payload } = transformRecordForSupabase(
      'events',
      eventRecord(),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.date).toBe('2026-08-26');
    expect(payload.time).toBe('03:00 PM');
    expect(payload.member_id).toBe(LOCAL_MEMBER_ID);
    expect(payload.reminder_offset_minutes).toBe(15);
  });

  test('vault documents stringify meta_json', () => {
    const { payload } = transformRecordForSupabase(
      'documents',
      documentRecord(),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.name).toBe('Warranty card');
    expect(payload.upload_status).toBe('pending_upload');
    expect(typeof payload.meta_json).toBe('string');
    expect(JSON.parse(payload.meta_json as string)).toEqual({
      expiryDate: '2027-01-01',
    });
  });

  test('folders map to remote title (not null)', () => {
    const { payload } = transformRecordForSupabase(
      'folders',
      folderRecord(),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.title).toBe('Personal');
    expect(payload.icon).toBe('folder');
    expect(payload.name).toBeUndefined();
  });

  test('folders fill Untitled when title/name missing', () => {
    const { payload } = transformRecordForSupabase(
      'folders',
      folderRecord({ title: '', name: '' }),
      AUTH_USER_ID,
      true,
    );
    expect(payload.title).toBe('Untitled');
  });
});

describe('isValidRecordForTable — guest and invalid guards', () => {
  test('rejects guest profile records for all domain tables', () => {
    const tables = [
      'transactions',
      'notes',
      'lists',
      'list_items',
      'tasks',
      'events',
      'documents',
    ];
    for (const table of tables) {
      expect(
        isValidRecordForTable({ id: 'x', profileId: GUEST_PROFILE_ID }, table),
      ).toBe(false);
      expect(
        isValidRecordForTable(
          { id: GUEST_PROFILE_ID, profileId: AUTH_USER_ID },
          table,
        ),
      ).toBe(false);
    }
  });

  test('rejects list_items without list_id', () => {
    expect(
      isValidRecordForTable(
        { id: 'ok-id', profileId: AUTH_USER_ID, list_id: '' },
        'list_items',
      ),
    ).toBe(false);
  });

  test('accepts normal expense transaction', () => {
    expect(isValidRecordForTable(expenseTransaction(), 'transactions')).toBe(
      true,
    );
  });
});

describe('dedupeById', () => {
  test('keeps newest row by updated_at', () => {
    const rows = [
      { id: '1', updated_at: '2025-01-01T00:00:00Z', value: 'old' },
      { id: '1', updated_at: '2025-01-02T00:00:00Z', value: 'new' },
    ];
    const deduped = dedupeById(rows);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].value).toBe('new');
  });
});
