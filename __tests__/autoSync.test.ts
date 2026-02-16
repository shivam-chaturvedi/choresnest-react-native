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

import { shouldTriggerAutoSync } from '../src/hooks/useAutoSync';

describe('useAutoSync timing guard', () => {
  test('skips when sync state is busy', () => {
    expect(shouldTriggerAutoSync(true, 0, 5000, 1000)).toBe(false);
  });

  test('skips when minimum interval has not elapsed', () => {
    const now = Date.now();
    expect(shouldTriggerAutoSync(false, now, now + 500, 1000)).toBe(false);
  });

  test('allows when interval has elapsed and sync is idle', () => {
    const now = Date.now();
    expect(shouldTriggerAutoSync(false, now, now + 1500, 1000)).toBe(true);
  });
});
