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
    ],
});
