jest.mock('../src/config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ data: [], error: null }),
      eq: () => ({ data: [], error: null }),
      in: () => ({ data: [], error: null }),
      upsert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null }),
    }),
    auth: { getUser: async () => ({ data: { user: { id: 'test-user' } }, error: null }) },
  },
}));

import { collectTableFetchResults, dedupeById, isLocalChangeNewer, TableFetchDescriptor } from '../src/services/SyncService';

describe('SyncService helpers', () => {
  test('dedupeById prefers the newest row even when timestamps are equal', () => {
    const rows = [
      { id: '1', updated_at: '2025-01-01T00:00:00Z', value: 'first' },
      { id: '1', updated_at: '2025-01-01T00:00:00Z', value: 'second' },
    ];

    const deduped = dedupeById(rows);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].value).toBe('second');
  });

  test('isLocalChangeNewer enforces strict newest-wins semantics', () => {
    expect(isLocalChangeNewer(2000, 2000)).toBe(false);
    expect(isLocalChangeNewer(1999, 2000)).toBe(false);
    expect(isLocalChangeNewer(2001, 2000)).toBe(true);
    expect(isLocalChangeNewer(1500)).toBe(true);
  });

  test('collectTableFetchResults continues syncing when one table fails', async () => {
    const descriptors: TableFetchDescriptor[] = [
      {
        key: 'alpha',
        fetcher: async () => ({ created: [{ id: 'a' }], updated: [], deleted: [] }),
      },
      {
        key: 'beta',
        fetcher: async () => {
          throw new Error('boom');
        },
      },
    ];

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await collectTableFetchResults(descriptors);
    consoleSpy.mockRestore();
    expect(result.alpha.created).toEqual([{ id: 'a' }]);
    expect(result.beta).toEqual({ created: [], updated: [], deleted: [] });
  });
});
