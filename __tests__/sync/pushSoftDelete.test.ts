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
  buildSoftDeleteUpsertRows,
  shouldPushSoftDelete,
} from '../../src/services/sync/PushEngine';
import { finalizeProfileScopedPayload } from '../../src/services/sync/SyncPayloadUtils';
import { AUTH_USER_ID, OTHER_USER_ID } from '../../src/test-utils/syncFixtures';

describe('soft-delete push helpers', () => {
  test('skips deletes for IDs missing on the server (project switch leftovers)', () => {
    const serverRows = new Map();
    expect(shouldPushSoftDelete('missing-id', serverRows, 2)).toBe(false);
  });

  test('skips deletes when server version is newer or equal', () => {
    const serverRows = new Map([['id-1', { version: 3 }]]);
    expect(shouldPushSoftDelete('id-1', serverRows, 3)).toBe(false);
    expect(shouldPushSoftDelete('id-1', serverRows, 2)).toBe(false);
  });

  test('allows deletes when local version is newer than server', () => {
    const serverRows = new Map([['id-1', { version: 1 }]]);
    expect(shouldPushSoftDelete('id-1', serverRows, 2)).toBe(true);
  });

  test('soft-delete rows for expenses include profile_id + deleted flag', () => {
    const versions = new Map([
      ['tx-1', 4],
      ['tx-2', 0],
    ]);
    const rows = buildSoftDeleteUpsertRows(
      ['tx-1', 'tx-2'],
      versions,
      AUTH_USER_ID,
      true,
      '2026-08-26T12:00:00.000Z',
    );

    expect(rows).toEqual([
      {
        id: 'tx-1',
        deleted: true,
        version: 4,
        updated_at: '2026-08-26T12:00:00.000Z',
        profile_id: AUTH_USER_ID,
      },
      {
        id: 'tx-2',
        deleted: true,
        version: 1,
        updated_at: '2026-08-26T12:00:00.000Z',
        profile_id: AUTH_USER_ID,
      },
    ]);
  });

  test('soft-delete rows omit profile_id when table is not profile-scoped', () => {
    const rows = buildSoftDeleteUpsertRows(
      ['users-1'],
      new Map([['users-1', 1]]),
      AUTH_USER_ID,
      false,
      '2026-08-26T12:00:00.000Z',
    );
    expect(rows[0].profile_id).toBeUndefined();
    expect(rows[0].deleted).toBe(true);
  });

  test('soft-delete rows omit profile_id for non-UUID auth ids', () => {
    const rows = buildSoftDeleteUpsertRows(
      ['tx-1'],
      new Map([['tx-1', 1]]),
      'guest',
      true,
      '2026-08-26T12:00:00.000Z',
    );
    expect(rows[0].profile_id).toBeUndefined();
  });
});

describe('finalizeProfileScopedPayload', () => {
  test('expenses payload always ends with auth profile_id', () => {
    const result = finalizeProfileScopedPayload(
      'transactions',
      'transactions',
      {
        id: 'tx-1',
        name: 'Coffee',
        amount: 5,
        date: '2026-08-26',
        type: 'expense',
        category: 'food',
        profile_id: OTHER_USER_ID,
        version: 1,
        deleted: false,
        created_at: '2026-08-26T00:00:00.000Z',
        updated_at: '2026-08-26T00:00:00.000Z',
      },
      AUTH_USER_ID,
      true,
    );

    expect(result).not.toBeNull();
    expect(result!.profile_id).toBe(AUTH_USER_ID);
    expect(result!.name).toBe('Coffee');
  });

  test('drops payload when auth user id is not a UUID', () => {
    const result = finalizeProfileScopedPayload(
      'transactions',
      'transactions',
      {
        id: 'tx-1',
        name: 'Coffee',
        amount: 5,
        profile_id: 'guest',
      },
      'guest',
      true,
    );
    expect(result).toBeNull();
  });
});
