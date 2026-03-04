export type TableSyncConfig = {
    key: string;
    remoteTable?: string;
    hasProfileId?: boolean;
    addProfileId?: boolean;
    phase: 1 | 2 | 3;
    /** Override the Supabase `onConflict` target column(s) for upsert. Defaults to 'id'. */
    conflictKey?: string;
    /**
     * If true, this table will be excluded from the primary sync and fetched
     * asynchronously in a follow-up sync after the main data is committed.
     * Use for large/binary-heavy tables like `documents`.
     */
    deferred?: boolean;
    /**
     * If true, this table exists in the local WatermelonDB schema but has no
     * corresponding Supabase table. Pull always returns an empty changeset and
     * push is skipped entirely. Required so WatermelonDB's synchronize() receives
     * every schema table in the pullChanges result.
     */
    localOnly?: boolean;
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
    { key: 'events', phase: 2, hasProfileId: true, addProfileId: true },
    { key: 'tasks', phase: 2 },
    { key: 'lists', remoteTable: 'lists', phase: 1, hasProfileId: true, addProfileId: true },
    { key: 'transactions', phase: 2 },
    { key: 'budgets', phase: 2 },
    { key: 'budget_category_color_mappings', phase: 2, hasProfileId: true, addProfileId: true },
    { key: 'meal_plans', hasProfileId: false, phase: 2 },
    { key: 'list_items', remoteTable: 'list_items', hasProfileId: true, addProfileId: true, phase: 2 },
    // list_categories is a deprecated local-only table. It must remain in SYNC_TABLES
    // so WatermelonDB's synchronize() receives it in the pullChanges result (it requires
    // ALL schema tables to be present). localOnly: true prevents any Supabase query.
    // { key: 'list_categories', phase: 1 },
    // app_lock exists in both the local schema and Supabase (with RLS + version column).
    // It MUST be listed here so pullChanges includes it for WatermelonDB.
    { key: 'app_lock', phase: 1, hasProfileId: true, addProfileId: true },
    // Removed `deferred: true` because it shares the same global cursor as the primary sync,
    // which caused it to skip all documents on the initial load.
    { key: 'documents', remoteTable: 'documents', hasProfileId: true, addProfileId: true, phase: 2 },
    { key: 'notes', hasProfileId: true, addProfileId: true, phase: 3 },
];

// Acceptance Checklist:
// - Device A writes to profile-scoped tables (notes, budgets, list_items, app_settings) for profile X while Device B stays on profile Y; verify Device B never sees X's rows because TableRegistry drives the profile filter.
// - Device A and Device B observe global tables (recipes, collections, meal_plans) and confirm those sync entries appear for both devices without unnecessary profile filtering.
