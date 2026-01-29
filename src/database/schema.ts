import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
    version: 4,
    tables: [
        tableSchema({
            name: 'users',
            columns: [
                { name: 'email', type: 'string' },
                { name: 'name', type: 'string', isOptional: true },
                { name: 'is_guest', type: 'boolean' },
                { name: 'has_completed_onboarding', type: 'boolean' },
                { name: 'active_profile_id', type: 'string', isOptional: true },
            ],
        }),
        tableSchema({
            name: 'members', // Family Members
            columns: [
                { name: 'name', type: 'string' },
                { name: 'symbol', type: 'string' },
                { name: 'color', type: 'string' },
                { name: 'role', type: 'string', isOptional: true },
                { name: 'is_active', type: 'boolean' },
            ],
        }),
        tableSchema({
            name: 'events', // Calendar Events
            columns: [
                { name: 'title', type: 'string' },
                { name: 'icon', type: 'string' },
                { name: 'date', type: 'string' }, // ISO Date YYYY-MM-DD
                { name: 'time', type: 'string' },
                { name: 'end_time', type: 'string', isOptional: true },
                { name: 'end_date', type: 'string', isOptional: true },
                { name: 'member_id', type: 'string' },
                { name: 'location', type: 'string', isOptional: true },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'notes', type: 'string', isOptional: true },
                { name: 'visibility', type: 'string' }, // default, public, private
                { name: 'time_zone', type: 'string', isOptional: true },
                { name: 'is_recurring', type: 'boolean' },
                { name: 'recurrence_rule', type: 'string', isOptional: true },
                { name: 'recurrence_end_date', type: 'string', isOptional: true },
                { name: 'notification_id', type: 'string', isOptional: true },
                { name: 'reminder_offset_minutes', type: 'number', isOptional: true }, // 15, 30, 60, etc.
                { name: 'updated_at', type: 'number' }, // ✅ CRITICAL for reactivity
            ],
        }),
        tableSchema({
            name: 'tasks',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'icon', type: 'string' },
                { name: 'status', type: 'string' }, // pending, done
                { name: 'priority', type: 'string' }, // high, medium, low
                { name: 'due_display', type: 'string' }, // "Today", "Tomorrow" etc
                { name: 'date', type: 'string' }, // YYYY-MM-DD
                { name: 'assignee_id', type: 'string' },
                { name: 'tab', type: 'string' }, // "My Tasks", "Family Tasks"
                { name: 'notification_id', type: 'string', isOptional: true },
                { name: 'reminder_enabled', type: 'boolean' }, // default true
                { name: 'updated_at', type: 'number' }, // ✅ CRITICAL for reactivity
            ],
        }),
        tableSchema({
            name: 'lists', // Grocery/Todo Lists
            columns: [
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string' }, // grocery, todo
                { name: 'icon', type: 'string', isOptional: true },
            ],
        }),
        tableSchema({
            name: 'list_items', // Grocery/Todo Items
            columns: [
                { name: 'list_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'quantity', type: 'number' },
                { name: 'unit', type: 'string' },
                { name: 'category_id', type: 'string', isOptional: true },
                { name: 'added_by_id', type: 'string' },
                { name: 'is_completed', type: 'boolean' },
                { name: 'purchased_at', type: 'number', isOptional: true },
            ],
        }),
        tableSchema({
            name: 'list_categories', // Grocery Categories
            columns: [
                { name: 'name', type: 'string' },
                { name: 'icon', type: 'string' },
                { name: 'color', type: 'string' },
            ],
        }),
        tableSchema({
            name: 'recipes',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'prep_time', type: 'string' },
                { name: 'cook_time', type: 'string' }, // mapped from 'time'
                { name: 'servings', type: 'number' },
                { name: 'difficulty', type: 'string', isOptional: true },
                { name: 'calories', type: 'string', isOptional: true }, // mapped from nutrition.kcal
                { name: 'image_path', type: 'string' },
                { name: 'is_saved', type: 'boolean' },
                { name: 'rating', type: 'number', isOptional: true },
                { name: 'author', type: 'string', isOptional: true },
                { name: 'ingredients_json', type: 'string' },
                { name: 'instructions_json', type: 'string', isOptional: true },
                { name: 'tags_json', type: 'string' },
                { name: 'nutrition_json', type: 'string', isOptional: true }, // Store full object
                { name: 'audio_path', type: 'string', isOptional: true },
                { name: 'duration', type: 'number', isOptional: true },
                { name: 'url', type: 'string', isOptional: true },
                { name: 'images_json', type: 'string', isOptional: true }, // Store array of additional images
            ],
        }),
        tableSchema({
            name: 'collections', // Recipe Collections
            columns: [
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'color', type: 'string' },
            ],
        }),
        tableSchema({
            name: 'collection_recipes', // Many-to-Many link
            columns: [
                { name: 'collection_id', type: 'string', isIndexed: true },
                { name: 'recipe_id', type: 'string', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'meal_plans',
            columns: [
                { name: 'date', type: 'string', isIndexed: true },
                { name: 'type', type: 'string' }, // breakfast, lunch, dinner, snack
                { name: 'recipe_id', type: 'string' },
                { name: 'is_cooked', type: 'boolean' },
                { name: 'notification_id', type: 'string', isOptional: true },
                { name: 'reminder_minutes_before', type: 'number', isOptional: true }, // 30, 60
            ],
        }),
        tableSchema({
            name: 'documents', // Vault Documents
            columns: [
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string' },
                { name: 'icon', type: 'string' },
                { name: 'date', type: 'string' },
                { name: 'expiry_date', type: 'string', isOptional: true },
                { name: 'member_id', type: 'string', isIndexed: true }, // or 'global'
                { name: 'shared_with_json', type: 'string' },
                { name: 'file_path', type: 'string', isOptional: true }, // Local FS path
                { name: 'meta_json', type: 'string' }, // Flexible metadata for different doc types
                { name: 'notification_ids_json', type: 'string', isOptional: true }, // Array of notification IDs for multiple reminders
                { name: 'reminder_days_before', type: 'number', isOptional: true }, // 7, 14, 30
            ],
        }),
        tableSchema({
            name: 'transactions', // Finance
            columns: [
                { name: 'name', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'date', type: 'string', isIndexed: true },
                { name: 'icon', type: 'string' },
                { name: 'type', type: 'string' }, // income, expense
                { name: 'category', type: 'string' },
            ],
        }),
        tableSchema({
            name: 'budgets', // Finance Budgets
            columns: [
                { name: 'category', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'month', type: 'string' }, // YYYY-MM
                { name: 'notification_id', type: 'string', isOptional: true },
                { name: 'alert_threshold_percent', type: 'number', isOptional: true }, // 80, 90, 100
            ],
        }),
        tableSchema({
            name: 'notes',
            columns: [
                { name: 'title', type: 'string' },
                { name: 'preview', type: 'string' },
                { name: 'tag', type: 'string', isOptional: true },
                { name: 'color', type: 'string' },
                { name: 'is_starred', type: 'boolean' },
                { name: 'updated_at', type: 'number' },
                { name: 'folder_id', type: 'string', isIndexed: true },
                { name: 'blocks_json', type: 'string' },
            ],
        }),
        tableSchema({
            name: 'folders', // Note Folders
            columns: [
                { name: 'title', type: 'string' },
                { name: 'icon', type: 'string' },
            ],
        }),
        tableSchema({
            name: 'app_lock',
            columns: [
                { name: 'enabled', type: 'boolean' },
                { name: 'biometric_enabled', type: 'boolean' },
                { name: 'pin_hash', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'settings', // App Settings key-value
            columns: [
                { name: 'key', type: 'string', isIndexed: true },
                { name: 'value', type: 'string' },
            ],
        }),
        tableSchema({
            name: 'user_preferences',
            columns: [
                { name: 'country_code', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'notification_preferences',
            columns: [
                { name: 'category', type: 'string', isIndexed: true }, // events, tasks, documents, meals, budgets
                { name: 'enabled', type: 'boolean' },
                { name: 'reminder_offset_minutes', type: 'number', isOptional: true },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'quiet_hours',
            columns: [
                { name: 'enabled', type: 'boolean' },
                { name: 'start_hour', type: 'number' }, // 0-23
                { name: 'start_minute', type: 'number' }, // 0-59
                { name: 'end_hour', type: 'number' },
                { name: 'end_minute', type: 'number' },
            ],
        }),
    ],
});
