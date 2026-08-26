import { SYNC_TABLES } from '../../src/services/sync/TableRegistry';

const byKey = (key: string) => SYNC_TABLES.find(t => t.key === key);

describe('SYNC_TABLES registry — profile scoping', () => {
  const mustPushWithProfile = [
    'transactions',
    'budgets',
    'notes',
    'lists',
    'list_items',
    'tasks',
    'events',
    'documents',
    'folders',
    'meal_plans',
  ];

  test.each(mustPushWithProfile)(
    '%s must be registered and profile-scoped for push',
    tableKey => {
      const config = byKey(tableKey);
      expect(config).toBeDefined();
      expect(config!.localOnly).not.toBe(true);
      expect(config!.hasProfileId).not.toBe(false);
      expect(config!.addProfileId ?? true).toBe(true);
    },
  );

  test('expenses tables (transactions + budgets) are explicitly profile-scoped', () => {
    const transactions = byKey('transactions');
    const budgets = byKey('budgets');
    expect(transactions).toMatchObject({
      hasProfileId: true,
      addProfileId: true,
      phase: 2,
    });
    expect(budgets).toMatchObject({
      hasProfileId: true,
      addProfileId: true,
      phase: 2,
    });
  });

  test('vault documents and notes are profile-scoped', () => {
    expect(byKey('documents')).toMatchObject({
      hasProfileId: true,
      addProfileId: true,
    });
    expect(byKey('notes')).toMatchObject({
      hasProfileId: true,
      addProfileId: true,
      phase: 3,
    });
  });

  test('lists + list_items are profile-scoped', () => {
    expect(byKey('lists')).toMatchObject({
      hasProfileId: true,
      addProfileId: true,
    });
    expect(byKey('list_items')).toMatchObject({
      hasProfileId: true,
      addProfileId: true,
    });
  });

  test('tasks + events (calendar) are profile-scoped', () => {
    expect(byKey('tasks')).toMatchObject({
      hasProfileId: true,
      addProfileId: true,
    });
    expect(byKey('events')).toMatchObject({
      hasProfileId: true,
      addProfileId: true,
    });
  });

  test('local-only budget color mappings are not pushed', () => {
    const colors = byKey('budget_category_color_mappings');
    expect(colors?.localOnly).toBe(true);
  });
});
