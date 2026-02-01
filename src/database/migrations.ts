import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

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
    ],
});
