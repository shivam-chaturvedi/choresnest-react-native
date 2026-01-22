import { schemaMigrations, addColumns, createTable } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
    migrations: [
        {
            toVersion: 2,
            steps: [
                // Add notification fields to events
                addColumns({
                    table: 'events',
                    columns: [
                        { name: 'notification_id', type: 'string', isOptional: true },
                        { name: 'reminder_offset_minutes', type: 'number', isOptional: true },
                    ],
                }),
                // Add notification fields to tasks
                addColumns({
                    table: 'tasks',
                    columns: [
                        { name: 'notification_id', type: 'string', isOptional: true },
                        { name: 'reminder_enabled', type: 'boolean' },
                    ],
                }),
                // Add notification fields to meal_plans
                addColumns({
                    table: 'meal_plans',
                    columns: [
                        { name: 'notification_id', type: 'string', isOptional: true },
                        { name: 'reminder_minutes_before', type: 'number', isOptional: true },
                    ],
                }),
                // Add notification fields to documents
                addColumns({
                    table: 'documents',
                    columns: [
                        { name: 'notification_ids_json', type: 'string', isOptional: true },
                        { name: 'reminder_days_before', type: 'number', isOptional: true },
                    ],
                }),
                // Add notification fields to budgets
                addColumns({
                    table: 'budgets',
                    columns: [
                        { name: 'notification_id', type: 'string', isOptional: true },
                        { name: 'alert_threshold_percent', type: 'number', isOptional: true },
                    ],
                }),
                // Create notification_preferences table
                createTable({
                    name: 'notification_preferences',
                    columns: [
                        { name: 'category', type: 'string', isIndexed: true },
                        { name: 'enabled', type: 'boolean' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
                // Create quiet_hours table
                createTable({
                    name: 'quiet_hours',
                    columns: [
                        { name: 'enabled', type: 'boolean' },
                        { name: 'start_hour', type: 'number' },
                        { name: 'start_minute', type: 'number' },
                        { name: 'end_hour', type: 'number' },
                        { name: 'end_minute', type: 'number' },
                    ],
                }),
            ],
        },
    ],
});
