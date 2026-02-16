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
    ],
});
