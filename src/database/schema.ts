import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
    version: 14,
    tables: [
        tableSchema({
            name: 'users',
            columns: [
                { name: 'email', type: 'string' },
                { name: 'name', type: 'string', isOptional: true },
                { name: 'is_guest', type: 'boolean' },
                { name: 'has_completed_onboarding', type: 'boolean' },
                { name: 'active_profile_id', type: 'string', isOptional: true },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'members', // Family Members
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'name', type: 'string' },
                { name: 'symbol', type: 'string' },
                { name: 'color', type: 'string' },
                { name: 'role', type: 'string', isOptional: true },
                { name: 'is_active', type: 'boolean' },
                { name: 'version', type: 'number' },
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
                { name: 'profile_id', type: 'string', isOptional: true, isIndexed: true },
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
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' }, // ✅ CRITICAL for reactivity
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
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
                { name: 'profile_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'tab', type: 'string' }, // "My Tasks", "Family Tasks"
                { name: 'notification_id', type: 'string', isOptional: true },
                { name: 'reminder_enabled', type: 'boolean' }, // default true
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' }, // ✅ CRITICAL for reactivity
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'lists', // Grocery/Todo Lists
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string' }, // grocery, todo
                { name: 'icon', type: 'string', isOptional: true },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'list_items', // Grocery/Todo Items
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'list_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'quantity', type: 'number' },
                { name: 'unit', type: 'string' },
                { name: 'category_id', type: 'string', isOptional: true },
                { name: 'added_by_id', type: 'string' },
                { name: 'is_completed', type: 'boolean' },
                { name: 'purchased_at', type: 'number', isOptional: true },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'list_categories', // Grocery Categories
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'name', type: 'string' },
                { name: 'icon', type: 'string' },
                { name: 'color', type: 'string' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'recipes',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
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
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'collections', // Recipe Collections
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'color', type: 'string' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'collection_recipes', // Many-to-Many link
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true, isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'collection_id', type: 'string', isIndexed: true },
                { name: 'recipe_id', type: 'string', isIndexed: true },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'meal_plans',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'date', type: 'string', isIndexed: true },
                { name: 'type', type: 'string' }, // breakfast, lunch, dinner, snack
                { name: 'recipe_id', type: 'string' },
                { name: 'is_cooked', type: 'boolean' },
                { name: 'notification_id', type: 'string', isOptional: true },
                { name: 'reminder_minutes_before', type: 'number', isOptional: true }, // 30, 60
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'documents', // Vault Documents
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'name', type: 'string' },
                { name: 'type', type: 'string' },
                { name: 'icon', type: 'string', isOptional: true },
                { name: 'date', type: 'string' },
                { name: 'expiry_date', type: 'string', isOptional: true },
                { name: 'member_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'shared_with_json', type: 'string', isOptional: true },
                { name: 'file_path', type: 'string', isOptional: true },
                { name: 'meta_json', type: 'string', isOptional: true },
                { name: 'notification_ids_json', type: 'string', isOptional: true },
                { name: 'reminder_days_before', type: 'number', isOptional: true },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'transactions', // Finance
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'date', type: 'string', isIndexed: true },
                { name: 'icon', type: 'string' },
                { name: 'type', type: 'string' }, // income, expense
                { name: 'category', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'budgets', // Finance Budgets
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'category', type: 'string' },
                { name: 'amount', type: 'number' },
                { name: 'month', type: 'string', isIndexed: true }, // YYYY-MM
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'notes',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'title', type: 'string' },
                { name: 'preview', type: 'string' },
                { name: 'tag', type: 'string', isOptional: true },
                { name: 'color', type: 'string' },
                { name: 'is_starred', type: 'boolean' },
                { name: 'updated_at', type: 'number' },
                { name: 'folder_id', type: 'string', isIndexed: true },
                { name: 'blocks_json', type: 'string' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'folders', // Note Folders
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'title', type: 'string' },
                { name: 'icon', type: 'string' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'app_lock',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'enabled', type: 'boolean' },
                { name: 'biometric_enabled', type: 'boolean' },
                { name: 'pin_hash', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'settings', // App Settings key-value
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'key', type: 'string', isIndexed: true },
                { name: 'value', type: 'string' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'user_preferences',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'country_code', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'notification_preferences',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'category', type: 'string', isIndexed: true }, // events, tasks, documents, meals, budgets
                { name: 'enabled', type: 'boolean' },
                { name: 'reminder_offset_minutes', type: 'number', isOptional: true },
                { name: 'updated_at', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'quiet_hours',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'enabled', type: 'boolean' },
                { name: 'start_hour', type: 'number' }, // 0-23
                { name: 'start_minute', type: 'number' }, // 0-59
                { name: 'end_hour', type: 'number' },
                { name: 'end_minute', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'app_settings',
            columns: [
                { name: 'profile_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'deleted', type: 'boolean' },
                { name: 'has_completed_onboarding', type: 'boolean' },
                { name: 'version', type: 'number' },
            ],
        }),
    ],
});

// Acceptance Checklist:
// - Confirm local Watermelon tables (notes, folders, lists, etc.) now include profile_id/updated_at/deleted/version so SyncService/tombstones stay consistent across Device A and Device B.
