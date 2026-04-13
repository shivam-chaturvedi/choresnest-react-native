import { schemaMigrations, addColumns, createTable, unsafeExecuteSql } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                addColumns({
                    table: 'notification_preferences',
                    columns: [
                        { name: 'reminder_offset_minutes', type: 'number', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 3,
            steps: [
                createTable({
                    name: 'app_lock',
                    columns: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'biometric_enabled', type: 'boolean' },
                        { name: 'pin_hash', type: 'string' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],
        },
        {
            toVersion: 4,
            steps: [
                createTable({
                    name: 'user_preferences',
                    columns: [
                        { name: 'country_code', type: 'string' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],

        },
        {
            toVersion: 5,
            steps: [
                createTable({
                    name: 'app_settings',
                    columns: [
                        { name: 'has_completed_onboarding', type: 'boolean' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],
        },
        {
            toVersion: 6,
            steps: [
                addColumns({
                    table: 'transactions',
                    columns: [
                        { name: 'profile_id', type: 'string' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'budgets',
                    columns: [
                        { name: 'profile_id', type: 'string' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
            ],
        },
        {
            toVersion: 7,
            steps: [
                addColumns({
                    table: 'events',
                    columns: [
                        { name: 'created_at', type: 'number' },
                    ],
                }),
            ],
        },
        {
            toVersion: 8,
            steps: [
                addColumns({
                    table: 'users',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'members',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'events',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'tasks',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'lists',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'list_items',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'list_categories',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'recipes',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'collections',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'collection_recipes',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'meal_plans',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'documents',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'transactions',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'budgets',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'notes',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'folders',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'app_lock',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'settings',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'user_preferences',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'notification_preferences',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'quiet_hours',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
                addColumns({
                    table: 'app_settings',
                    columns: [
                        { name: 'version', type: 'number' },
                    ],
                }),
            ],
        },
        {
            toVersion: 9,
            steps: [
                addColumns({
                    table: 'folders',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'notes',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'lists',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'list_items',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'list_categories',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
            ],
        },
        {
            toVersion: 10,
            steps: [
                addColumns({
                    table: 'collection_recipes',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
        {
            toVersion: 11,
            steps: [],
        },
        {
            toVersion: 12,
            steps: [
                addColumns({
                    table: 'user_preferences',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'app_lock',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'notification_preferences',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'quiet_hours',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'app_settings',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                addColumns({
                    table: 'settings',
                    columns: [
                        { name: 'profile_id', type: 'string', isOptional: true },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
            ],
        },
        {
            toVersion: 13,
            steps: [
                unsafeExecuteSql('UPDATE user_preferences SET deleted = 0 WHERE deleted IS NULL;'),
                unsafeExecuteSql('UPDATE app_lock SET deleted = 0 WHERE deleted IS NULL;'),
                unsafeExecuteSql('UPDATE notification_preferences SET deleted = 0 WHERE deleted IS NULL;'),
                unsafeExecuteSql('UPDATE quiet_hours SET deleted = 0 WHERE deleted IS NULL;'),
                unsafeExecuteSql('UPDATE app_settings SET deleted = 0 WHERE deleted IS NULL;'),
                unsafeExecuteSql('UPDATE settings SET deleted = 0 WHERE deleted IS NULL;'),
            ],
        },
        {
            toVersion: 14,
            steps: [],
        },
        {
            toVersion: 15,
            steps: [
                addColumns({
                    table: 'documents',
                    columns: [
                        { name: 'local_uri', type: 'string', isOptional: true },
                        { name: 'remote_path', type: 'string', isOptional: true },
                        { name: 'upload_status', type: 'string', isOptional: true },
                        { name: 'upload_attempts', type: 'number', isOptional: true },
                        { name: 'last_upload_error', type: 'string', isOptional: true },
                        { name: 'content_type', type: 'string', isOptional: true },
                        { name: 'file_size', type: 'number', isOptional: true },
                        { name: 'checksum', type: 'string', isOptional: true },
                    ],
                }),
                unsafeExecuteSql(`
                    UPDATE documents
                    SET remote_path = COALESCE(remote_path, file_path)
                    WHERE remote_path IS NULL;
                `),
                unsafeExecuteSql(`
                    UPDATE documents
                    SET upload_status = 'uploaded',
                        upload_attempts = CASE
                            WHEN upload_attempts IS NULL OR upload_attempts < 1 THEN 1
                            ELSE upload_attempts
                        END
                    WHERE COALESCE(remote_path, file_path) IS NOT NULL
                      AND (upload_status IS NULL OR upload_status = '');
                `),
                unsafeExecuteSql(`
                    UPDATE documents
                    SET upload_status = 'pending_upload'
                    WHERE upload_status IS NULL;
                `),
                unsafeExecuteSql(`
                    UPDATE documents
                    SET upload_attempts = 0
                    WHERE upload_attempts IS NULL;
                `),
            ],
        },
        {
            toVersion: 16,
            steps: [
                addColumns({
                    table: 'recipes',
                    columns: [
                        { name: 'local_image_uris', type: 'string', isOptional: true },
                        { name: 'local_audio_uri', type: 'string', isOptional: true },
                        { name: 'remote_image_paths', type: 'string', isOptional: true },
                        { name: 'remote_audio_path', type: 'string', isOptional: true },
                        { name: 'upload_status', type: 'string', isOptional: true },
                        { name: 'upload_attempts', type: 'number', isOptional: true },
                        { name: 'last_upload_error', type: 'string', isOptional: true },
                    ],
                }),
                unsafeExecuteSql(`
                    UPDATE recipes
                    SET local_image_uris = COALESCE(local_image_uris, '[]')
                    WHERE local_image_uris IS NULL;
                `),
                unsafeExecuteSql(`
                    UPDATE recipes
                    SET remote_image_paths = COALESCE(remote_image_paths, '[]')
                    WHERE remote_image_paths IS NULL;
                `),
                unsafeExecuteSql(`
                    UPDATE recipes
                    SET upload_status = COALESCE(NULLIF(upload_status, ''), 'uploaded');
                `),
                unsafeExecuteSql(`
                    UPDATE recipes
                    SET upload_attempts = COALESCE(upload_attempts, 0);
                `),
            ],
        },
        {
            toVersion: 17,
            steps: [
                addColumns({
                    table: 'recipes',
                    columns: [
                        { name: 'image_checksums_json', type: 'string', isOptional: true },
                        { name: 'audio_checksum', type: 'string', isOptional: true },
                    ],
                }),
                unsafeExecuteSql(`
                    UPDATE recipes
                    SET image_checksums_json = COALESCE(image_checksums_json, '[]')
                    WHERE image_checksums_json IS NULL;
                `),
            ],
        },
        {
            toVersion: 18,
            steps: [
                createTable({
                    name: 'category_color_mappings',
                    columns: [
                        { name: 'profile_id', type: 'string', isIndexed: true },
                        { name: 'category_key', type: 'string', isIndexed: true },
                        { name: 'color_hex', type: 'string' },
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                        { name: 'version', type: 'number' },
                    ],
                }),
            ],
        },
        {
            toVersion: 19,
            steps: [
                unsafeExecuteSql(`
                    ALTER TABLE category_color_mappings RENAME TO budget_category_color_mappings;
                `),
                unsafeExecuteSql(`
                    DROP INDEX IF EXISTS idx_category_color_mappings_profile_category;
                `),
                unsafeExecuteSql(`
                    DROP INDEX IF EXISTS idx_category_color_mappings_profile_updated_id;
                `),
                unsafeExecuteSql(`
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_category_color_mappings_profile_category
                    ON budget_category_color_mappings(profile_id, category_key);
                `),
                unsafeExecuteSql(`
                    CREATE INDEX IF NOT EXISTS idx_budget_category_color_mappings_profile_updated_id
                    ON budget_category_color_mappings(profile_id, updated_at);
                `),
            ],
        },
        {
            toVersion: 20,
            steps: [
                unsafeExecuteSql(`
                    CREATE TABLE budget_category_color_mappings_new (
                        id TEXT PRIMARY KEY,
                        profile_id TEXT,
                        category_key TEXT,
                        color_hex TEXT,
                        created_at INTEGER,
                        updated_at INTEGER,
                        deleted INTEGER,
                        version INTEGER,
                        _status TEXT,
                        _changed TEXT
                    );
                `),
                unsafeExecuteSql(`
                    INSERT INTO budget_category_color_mappings_new (
                        id,
                        profile_id,
                        category_key,
                        color_hex,
                        created_at,
                        updated_at,
                        deleted,
                        version,
                        _status,
                        _changed
                    )
                    SELECT
                        lower(
                            substr(hex(randomblob(16)), 1, 8) || '-' ||
                            substr(hex(randomblob(16)), 9, 4) || '-' ||
                            substr(hex(randomblob(16)), 13, 4) || '-' ||
                            substr(hex(randomblob(16)), 17, 4) || '-' ||
                            substr(hex(randomblob(16)), 21, 12)
                        ) AS id,
                        profile_id,
                        category_key,
                        color_hex,
                        created_at,
                        updated_at,
                        deleted,
                        version,
                        'synced',
                        ''
                    FROM budget_category_color_mappings;
                `),
                unsafeExecuteSql(`
                    DROP TABLE budget_category_color_mappings;
                `),
                unsafeExecuteSql(`
                    ALTER TABLE budget_category_color_mappings_new RENAME TO budget_category_color_mappings;
                `),
                unsafeExecuteSql(`
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_category_color_mappings_profile_category
                    ON budget_category_color_mappings(profile_id, category_key);
                `),
                unsafeExecuteSql(`
                    CREATE INDEX IF NOT EXISTS idx_budget_category_color_mappings_profile_updated_id
                    ON budget_category_color_mappings(profile_id, updated_at);
                `),
            ],
        },
        {
            toVersion: 21,
            steps: [],
        },
        {
            toVersion: 22,
            steps: [
                unsafeExecuteSql(`
                    CREATE TABLE documents_new (
                        id TEXT PRIMARY KEY,
                        profile_id TEXT,
                        created_at INTEGER,
                        updated_at INTEGER,
                        deleted INTEGER,
                        name TEXT,
                        type TEXT,
                        icon TEXT,
                        date TEXT,
                        expiry_date TEXT,
                        member_id TEXT,
                        shared_with_json TEXT,
                        file_path TEXT,
                        local_uri TEXT,
                        remote_path TEXT,
                        upload_status TEXT,
                        upload_attempts INTEGER,
                        last_upload_error TEXT,
                        content_type TEXT,
                        file_size INTEGER,
                        checksum TEXT,
                        meta_json TEXT,
                        notification_ids_json TEXT,
                        reminder_days_before INTEGER,
                        version INTEGER,
                        metadata_version INTEGER,
                        remote_delete_pending INTEGER,
                        _status TEXT,
                        _changed TEXT
                    );
                `),
                unsafeExecuteSql(`
                    INSERT INTO documents_new (
                        id,
                        profile_id,
                        created_at,
                        updated_at,
                        deleted,
                        name,
                        type,
                        icon,
                        date,
                        expiry_date,
                        member_id,
                        shared_with_json,
                        file_path,
                        local_uri,
                        remote_path,
                        upload_status,
                        upload_attempts,
                        last_upload_error,
                        content_type,
                        file_size,
                        checksum,
                        meta_json,
                        notification_ids_json,
                        reminder_days_before,
                        version,
                        metadata_version,
                        remote_delete_pending,
                        _status,
                        _changed
                    )
                    SELECT
                        id,
                        profile_id,
                        created_at,
                        updated_at,
                        deleted,
                        name,
                        type,
                        icon,
                        date,
                        expiry_date,
                        member_id,
                        shared_with_json,
                        file_path,
                        local_uri,
                        remote_path,
                        upload_status,
                        upload_attempts,
                        last_upload_error,
                        content_type,
                        file_size,
                        checksum,
                        meta_json,
                        notification_ids_json,
                        reminder_days_before,
                        version,
                        0,
                        0,
                        _status,
                        _changed
                    FROM documents;
                `),
                unsafeExecuteSql(`DROP TABLE documents;`),
                unsafeExecuteSql(`ALTER TABLE documents_new RENAME TO documents;`),
            ],
        },
        {
            toVersion: 23,
            steps: [
                addColumns({
                    table: 'users',
                    columns: [
                        { name: 'symbol', type: 'string', isOptional: true },
                        { name: 'color', type: 'string', isOptional: true },
                        { name: 'role', type: 'string', isOptional: true },
                        { name: 'is_active', type: 'boolean', isOptional: true },
                    ],
                }),
                unsafeExecuteSql(`
                    UPDATE users
                    SET symbol = COALESCE(symbol, 'account'),
                        color = COALESCE(color, 'member-blue'),
                        role = COALESCE(role, 'owner'),
                        is_active = COALESCE(is_active, 1)
                    WHERE symbol IS NULL
                       OR color IS NULL
                       OR role IS NULL
                       OR is_active IS NULL;
                `),
            ],
        },
        {
            toVersion: 24,
            steps: [
                addColumns({
                    table: 'users',
                    columns: [
                        { name: 'owner_id', type: 'string', isOptional: true },
                    ],
                }),
                unsafeExecuteSql(`
                    UPDATE users
                    SET owner_id = id
                    WHERE owner_id IS NULL OR owner_id = '';
                `),
            ],
        },
        {
            toVersion: 25,
            steps: [
                addColumns({
                    table: 'users',
                    columns: [
                        { name: 'created_at', type: 'number' },
                        { name: 'updated_at', type: 'number' },
                        { name: 'deleted', type: 'boolean' },
                    ],
                }),
                unsafeExecuteSql(`
                    UPDATE users
                    SET created_at = COALESCE(created_at, strftime('%s','now') * 1000),
                        updated_at = COALESCE(updated_at, strftime('%s','now') * 1000),
                        deleted = COALESCE(deleted, 0)
                    WHERE created_at IS NULL
                       OR updated_at IS NULL
                       OR deleted IS NULL;
                `),
            ],
        },
        {
            toVersion: 26,
            steps: [
                unsafeExecuteSql('DROP TABLE IF EXISTS members;'),
            ],
        },
    ],
});
