export type TableSyncConfig = {
    key: string;
    remoteTable?: string;
    hasProfileId?: boolean;
    addProfileId?: boolean;
    phase: 1 | 2 | 3;
};

export const SYNC_TABLES: TableSyncConfig[] = [
    { key: 'users', remoteTable: 'profiles', hasProfileId: false, addProfileId: false, phase: 1 },
    { key: 'members', phase: 1 },
    { key: 'settings', phase: 1 },
    { key: 'user_preferences', phase: 1 },
    { key: 'notification_preferences', phase: 1 },
    { key: 'quiet_hours', phase: 1 },
    { key: 'app_settings', phase: 1, hasProfileId: true, addProfileId: true },
    { key: 'list_categories', remoteTable: 'list_categories', phase: 1, hasProfileId: true, addProfileId: true },
    { key: 'folders', phase: 1 },
    { key: 'events', phase: 2 },
    { key: 'tasks', phase: 2 },
    { key: 'lists', remoteTable: 'lists', phase: 1, hasProfileId: true, addProfileId: true },
    { key: 'recipes', hasProfileId: false, phase: 2 },
    { key: 'collections', hasProfileId: false, phase: 2 },
    { key: 'transactions', phase: 2 },
    { key: 'budgets', phase: 2 },
    { key: 'meal_plans', hasProfileId: false, phase: 2 },
    { key: 'list_items', remoteTable: 'list_items', hasProfileId: true, addProfileId: true, phase: 2 },
    { key: 'collection_recipes', hasProfileId: true, addProfileId: true, phase: 3 },
    { key: 'notes', hasProfileId: true, addProfileId: true, phase: 3 },
];

// Acceptance Checklist:
// - Device A writes to profile-scoped tables (notes, budgets, list_items, app_settings) for profile X while Device B stays on profile Y; verify Device B never sees X's rows because TableRegistry drives the profile filter.
// - Device A and Device B observe global tables (recipes, collections, meal_plans) and confirm those sync entries appear for both devices without unnecessary profile filtering.
