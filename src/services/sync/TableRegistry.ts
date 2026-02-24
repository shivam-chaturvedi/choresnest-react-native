export type TableSyncConfig = {
    key: string;
    remoteTable?: string;
    hasProfileId?: boolean;
    addProfileId?: boolean;
    phase: 1 | 2 | 3;
    /** Override the Supabase `onConflict` target column(s) for upsert. Defaults to 'id'. */
    conflictKey?: string;
};

export const SYNC_TABLES: TableSyncConfig[] = [
    { key: 'users', remoteTable: 'profiles', hasProfileId: false, addProfileId: false, phase: 1 },
    { key: 'members', phase: 1 },
    // settings uses (profile_id, key) as its natural unique key — not just id
    { key: 'settings', phase: 1, conflictKey: 'profile_id,key', hasProfileId: true, addProfileId: true },
    { key: 'user_preferences', phase: 1 },
    { key: 'notification_preferences', phase: 1 },
    { key: 'quiet_hours', phase: 1 },
    { key: 'app_settings', phase: 1, hasProfileId: true, addProfileId: true },
    { key: 'recipes', remoteTable: 'recipes', phase: 2, hasProfileId: true, addProfileId: true },
    { key: 'collections', remoteTable: 'collections', phase: 2, hasProfileId: true, addProfileId: true },
    { key: 'collection_recipes', remoteTable: 'collection_recipes', phase: 3, hasProfileId: true, addProfileId: true },
    { key: 'folders', phase: 1 },
    { key: 'events', phase: 2 },
    { key: 'tasks', phase: 2 },
    { key: 'lists', remoteTable: 'lists', phase: 1, hasProfileId: true, addProfileId: true },
    { key: 'transactions', phase: 2 },
    { key: 'budgets', phase: 2 },
    { key: 'meal_plans', hasProfileId: false, phase: 2 },
    { key: 'list_items', remoteTable: 'list_items', hasProfileId: true, addProfileId: true, phase: 2 },
    { key: 'documents', remoteTable: 'documents', hasProfileId: true, addProfileId: true, phase: 2 },
    { key: 'notes', hasProfileId: true, addProfileId: true, phase: 3 },
];

// Acceptance Checklist:
// - Device A writes to profile-scoped tables (notes, budgets, list_items, app_settings) for profile X while Device B stays on profile Y; verify Device B never sees X's rows because TableRegistry drives the profile filter.
// - Device A and Device B observe global tables (recipes, collections, meal_plans) and confirm those sync entries appear for both devices without unnecessary profile filtering.
