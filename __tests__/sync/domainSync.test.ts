/**
 * Domain sync smoke tests for notes, lists, tasks, vault, calendar events.
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

import {
  isValidRecordForTable,
  transformRecordForSupabase,
} from '../../src/services/sync/TransformationEngine';
import { buildSoftDeleteUpsertRows } from '../../src/services/sync/PushEngine';
import {
  AUTH_USER_ID,
  LOCAL_MEMBER_ID,
  documentRecord,
  eventRecord,
  listItemRecord,
  listRecord,
  noteRecord,
  taskRecord,
} from '../../src/test-utils/syncFixtures';

describe('Notes sync/push', () => {
  test('note create payload is profile-scoped and serializes blocks', () => {
    const { payload } = transformRecordForSupabase(
      'notes',
      noteRecord({ title: 'Ideas', isStarred: true }),
      AUTH_USER_ID,
      true,
    );
    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.is_starred).toBe(true);
    expect(typeof payload.blocks_json).toBe('string');
  });

  test('note soft-delete includes profile_id', () => {
    const [row] = buildSoftDeleteUpsertRows(
      ['note-1'],
      new Map([['note-1', 2]]),
      AUTH_USER_ID,
      true,
      '2026-08-26T12:00:00.000Z',
    );
    expect(row.profile_id).toBe(AUTH_USER_ID);
    expect(row.deleted).toBe(true);
  });
});

describe('Lists sync/push', () => {
  test('list + list_item payloads keep relationship and profile', () => {
    const list = transformRecordForSupabase(
      'lists',
      listRecord(),
      AUTH_USER_ID,
      true,
    ).payload;
    const item = transformRecordForSupabase(
      'list_items',
      listItemRecord(),
      AUTH_USER_ID,
      true,
    ).payload;

    expect(list.profile_id).toBe(AUTH_USER_ID);
    expect(item.profile_id).toBe(AUTH_USER_ID);
    expect(item.list_id).toBe(list.id);
  });

  test('invalid list_item without list_id is rejected', () => {
    expect(
      isValidRecordForTable(
        { id: 'item-1', profileId: AUTH_USER_ID, list_id: '   ' },
        'list_items',
      ),
    ).toBe(false);
  });
});

describe('Tasks + calendar events sync/push', () => {
  test('task payload maps recurrence-safe fields and profile', () => {
    const { payload } = transformRecordForSupabase(
      'tasks',
      taskRecord({
        isRecurring: true,
        recurrenceRule: 'weekly',
        recurrenceInterval: 1,
      }),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.is_recurring).toBe(true);
    expect(payload.recurrence_rule).toBe('weekly');
    expect(payload.recurrence_interval).toBe(1);
  });

  test('event payload maps reminder offset and member', () => {
    const { payload } = transformRecordForSupabase(
      'events',
      eventRecord({ reminderOffsetMinutes: 30 }),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.reminder_offset_minutes).toBe(30);
    expect(payload.member_id).toBe(LOCAL_MEMBER_ID);
  });
});

describe('Vault documents sync/push', () => {
  test('document payload includes upload status and meta_json', () => {
    const { payload } = transformRecordForSupabase(
      'documents',
      documentRecord({ uploadStatus: 'uploaded', remotePath: 'vault/a.pdf' }),
      AUTH_USER_ID,
      true,
    );

    expect(payload.profile_id).toBe(AUTH_USER_ID);
    expect(payload.upload_status).toBe('uploaded');
    expect(payload.remote_path).toBe('vault/a.pdf');
    expect(typeof payload.meta_json).toBe('string');
  });

  test('guest vault docs are local-only and not pushed', () => {
    expect(
      isValidRecordForTable(
        documentRecord({ profileId: 'guest' }),
        'documents',
      ),
    ).toBe(false);
  });
});
