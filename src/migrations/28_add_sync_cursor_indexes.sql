-- Migration 28: Add composite indexes for Sync Cursor Stability
-- WatermelonDB PullCursorEngine relies heavily on querying records by `profile_id`
-- and ordering/filtering by `updated_at`. Adding indexing on `(profile_id, updated_at)`
-- drastically improves the performance and stability of sync pulls.

-- App Settings & Configuration
CREATE INDEX IF NOT EXISTS idx_app_settings_sync_cursor ON app_settings(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_sync_cursor ON user_preferences(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_sync_cursor ON notification_preferences(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_sync_cursor ON quiet_hours(profile_id, updated_at);

-- Family Members
CREATE INDEX IF NOT EXISTS idx_members_sync_cursor ON members(profile_id, updated_at);

-- Lists & Categories
CREATE INDEX IF NOT EXISTS idx_list_categories_sync_cursor ON list_categories(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_lists_sync_cursor ON lists(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_list_items_sync_cursor ON list_items(profile_id, updated_at);

-- Recipes & Meal Plans
CREATE INDEX IF NOT EXISTS idx_recipes_sync_cursor ON recipes(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_collections_sync_cursor ON collections(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_sync_cursor ON collection_recipes(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_meal_plans_sync_cursor ON meal_plans(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_folders_sync_cursor ON folders(profile_id, updated_at);

-- Events & Tasks
CREATE INDEX IF NOT EXISTS idx_events_sync_cursor ON events(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_sync_cursor ON tasks(profile_id, updated_at);

-- Finance
CREATE INDEX IF NOT EXISTS idx_transactions_sync_cursor ON transactions(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_budgets_sync_cursor ON budgets(profile_id, updated_at);

-- Vault & Notes
CREATE INDEX IF NOT EXISTS idx_documents_sync_cursor ON documents(profile_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_sync_cursor ON notes(profile_id, updated_at);

-- Also add a comment confirming execution
-- Replaced invalid COMMENT ON MIGRATION with a standard SQL comment
