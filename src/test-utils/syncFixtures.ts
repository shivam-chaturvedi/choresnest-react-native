/**
 * Shared fixtures for sync/push unit tests.
 * Auth UUID used across domain sync checks.
 *
 * FK fields (listId, assigneeId, memberId, folderId) must use non-UUID
 * Watermelon-style local IDs — SyncPayloadUtils nulls UUID optional FKs on push.
 */
export const AUTH_USER_ID = '6ed7f511-abca-4ad8-8612-e24c62bbd408';
export const OTHER_USER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
export const GUEST_PROFILE_ID = 'guest';

/** Non-UUID Watermelon local IDs preserved by remote FK sanitizer. */
export const LOCAL_MEMBER_ID = 'mbr_local_active_01';
export const LOCAL_LIST_ID = 'list_local_shop_01';
export const LOCAL_FOLDER_ID = 'folder_local_01';

export const nowMs = () => Date.now();

export const baseRecord = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  profileId: AUTH_USER_ID,
  createdAt: nowMs(),
  updatedAt: nowMs(),
  version: 1,
  deleted: false,
  ...overrides,
});

export const expenseTransaction = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Groceries',
    amount: 42.5,
    date: '2026-08-26',
    icon: 'cart',
    type: 'expense',
    category: 'groceries',
    ...overrides,
  });

export const budgetRecord = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: '33333333-3333-4333-8333-333333333333',
    category: 'groceries',
    amount: 10000,
    month: '2026-08',
    ...overrides,
  });

export const noteRecord = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Shopping ideas',
    isStarred: false,
    folderId: LOCAL_FOLDER_ID,
    blocks: [{ type: 'paragraph', text: 'Milk' }],
    ...overrides,
  });

export const listRecord = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: LOCAL_LIST_ID,
    name: 'Weekly shopping',
    type: 'shopping',
    icon: 'cart',
    ...overrides,
  });

export const listItemRecord = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: 'item_local_eggs_01',
    listId: LOCAL_LIST_ID,
    name: 'Eggs',
    quantity: '12',
    unit: 'pcs',
    isCompleted: false,
    ...overrides,
  });

export const taskRecord = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: '77777777-7777-4777-8777-777777777777',
    name: 'Clean kitchen',
    status: 'pending',
    priority: 'medium',
    dateString: '2026-08-26',
    dueDisplay: '10:00 AM',
    assigneeId: LOCAL_MEMBER_ID,
    reminderEnabled: true,
    ...overrides,
  });

export const eventRecord = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: '99999999-9999-4999-8999-999999999999',
    title: 'Doctor visit',
    dateString: '2026-08-26',
    time: '03:00 PM',
    memberId: LOCAL_MEMBER_ID,
    reminderOffsetMinutes: 15,
    ...overrides,
  });

export const documentRecord = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Warranty card',
    type: 'warranty',
    icon: 'shield',
    date: '2026-08-26',
    memberId: 'global',
    localUri: 'file:///tmp/warranty.pdf',
    uploadStatus: 'pending_upload',
    meta: { expiryDate: '2027-01-01' },
    ...overrides,
  });

export const folderRecord = (overrides: Record<string, unknown> = {}) =>
  baseRecord({
    id: LOCAL_FOLDER_ID,
    title: 'Personal',
    icon: 'folder',
    ...overrides,
  });
