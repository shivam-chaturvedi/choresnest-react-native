BEGIN;

-- Remove redundant onboarding flag from profiles (app_settings is now the single source of truth)
ALTER TABLE profiles DROP COLUMN IF EXISTS has_completed_onboarding;

-- Ensure finance tables have enforced timestamps, tombstones, and versioning
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE transactions SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE transactions SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE transactions ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE transactions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE transactions ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE transactions ALTER COLUMN deleted SET NOT NULL;

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE budgets SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE budgets SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE budgets ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE budgets ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE budgets ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE budgets ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE budgets ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE budgets ALTER COLUMN deleted SET NOT NULL;

-- Harden notes/folders schema
UPDATE notes SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE notes SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE notes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE notes ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE notes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE notes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE notes ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE notes ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE notes ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

UPDATE folders SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE folders SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE folders ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE folders ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE folders ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE folders ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE folders ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE folders ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE folders ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Add profile_id to list_items and collection_recipes (backfill from parents)
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
UPDATE list_items
SET profile_id = lists.profile_id
FROM lists
WHERE list_items.profile_id IS NULL
  AND list_items.list_id = lists.id;
ALTER TABLE list_items ALTER COLUMN profile_id SET NOT NULL;
UPDATE list_items SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE list_items SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE list_items ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE list_items ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE list_items ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE list_items ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE list_items ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE list_items ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
UPDATE collection_recipes
SET profile_id = collections.profile_id
FROM collections
WHERE collection_recipes.profile_id IS NULL
  AND collection_recipes.collection_id = collections.id;
ALTER TABLE collection_recipes ALTER COLUMN profile_id SET NOT NULL;
UPDATE collection_recipes SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE collection_recipes SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE collection_recipes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE collection_recipes ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE collection_recipes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE collection_recipes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE collection_recipes ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE collection_recipes ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Harden remaining profile-scoped tables
ALTER TABLE members ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE members SET version = 0 WHERE version IS NULL;
UPDATE members SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE members SET created_at = NOW() WHERE created_at IS NULL;
UPDATE members SET deleted = false WHERE deleted IS NULL;
ALTER TABLE members ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE members ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE members ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE members ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE members ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE members ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE members ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE events ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE events SET version = 0 WHERE version IS NULL;
UPDATE events SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE events SET created_at = NOW() WHERE created_at IS NULL;
UPDATE events SET deleted = false WHERE deleted IS NULL;
ALTER TABLE events ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE events ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE events ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE events ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE events ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE tasks SET version = 0 WHERE version IS NULL;
UPDATE tasks SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE tasks SET created_at = NOW() WHERE created_at IS NULL;
UPDATE tasks SET deleted = false WHERE deleted IS NULL;
ALTER TABLE tasks ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE tasks ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE tasks ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE tasks ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE lists ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE lists SET version = 0 WHERE version IS NULL;
UPDATE lists SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE lists SET created_at = NOW() WHERE created_at IS NULL;
UPDATE lists SET deleted = false WHERE deleted IS NULL;
ALTER TABLE lists ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE lists ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE lists ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE lists ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE lists ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE lists ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE lists ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE list_categories ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE list_categories SET version = 0 WHERE version IS NULL;
UPDATE list_categories SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE list_categories SET created_at = NOW() WHERE created_at IS NULL;
UPDATE list_categories SET deleted = false WHERE deleted IS NULL;
ALTER TABLE list_categories ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE list_categories ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE list_categories ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE list_categories ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE list_categories ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE list_categories ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE list_categories ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE documents SET version = 0 WHERE version IS NULL;
UPDATE documents SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE documents SET created_at = NOW() WHERE created_at IS NULL;
UPDATE documents SET deleted = false WHERE deleted IS NULL;
ALTER TABLE documents ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE documents ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE documents ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE documents ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE documents ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE documents ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE documents ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE app_lock ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE app_lock SET version = 0 WHERE version IS NULL;
UPDATE app_lock SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE app_lock SET created_at = NOW() WHERE created_at IS NULL;
UPDATE app_lock SET deleted = false WHERE deleted IS NULL;
ALTER TABLE app_lock ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE app_lock ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE app_lock ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE app_lock ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE app_lock ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE app_lock ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE app_lock ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE settings SET version = 0 WHERE version IS NULL;
UPDATE settings SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE settings SET created_at = NOW() WHERE created_at IS NULL;
UPDATE settings SET deleted = false WHERE deleted IS NULL;
ALTER TABLE settings ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE settings ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE settings ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE settings ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE settings ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE settings ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE settings ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE user_preferences SET version = 0 WHERE version IS NULL;
UPDATE user_preferences SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE user_preferences SET created_at = NOW() WHERE created_at IS NULL;
UPDATE user_preferences SET deleted = false WHERE deleted IS NULL;
ALTER TABLE user_preferences ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE user_preferences ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE user_preferences ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE user_preferences ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE user_preferences ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE user_preferences ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE user_preferences ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE notification_preferences SET version = 0 WHERE version IS NULL;
UPDATE notification_preferences SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE notification_preferences SET created_at = NOW() WHERE created_at IS NULL;
UPDATE notification_preferences SET deleted = false WHERE deleted IS NULL;
ALTER TABLE notification_preferences ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE notification_preferences ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE notification_preferences ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE notification_preferences ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE quiet_hours ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE quiet_hours SET version = 0 WHERE version IS NULL;
UPDATE quiet_hours SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE quiet_hours SET created_at = NOW() WHERE created_at IS NULL;
UPDATE quiet_hours SET deleted = false WHERE deleted IS NULL;
ALTER TABLE quiet_hours ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE quiet_hours ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE quiet_hours ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE quiet_hours ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE quiet_hours ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE quiet_hours ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE quiet_hours ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE app_settings SET version = 0 WHERE version IS NULL;
UPDATE app_settings SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE app_settings SET created_at = NOW() WHERE created_at IS NULL;
UPDATE app_settings SET deleted = false WHERE deleted IS NULL;
ALTER TABLE app_settings ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE app_settings ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE app_settings ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE app_settings ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE recipes SET version = 0 WHERE version IS NULL;
UPDATE recipes SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE recipes SET created_at = NOW() WHERE created_at IS NULL;
UPDATE recipes SET deleted = false WHERE deleted IS NULL;
ALTER TABLE recipes ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE recipes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE recipes ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE recipes ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE collections ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE collections SET version = 0 WHERE version IS NULL;
UPDATE collections SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE collections SET created_at = NOW() WHERE created_at IS NULL;
UPDATE collections SET deleted = false WHERE deleted IS NULL;
ALTER TABLE collections ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE collections ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE collections ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE collections ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE collections ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE collections ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE collections ALTER COLUMN profile_id SET NOT NULL;

ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
UPDATE meal_plans SET version = 0 WHERE version IS NULL;
UPDATE meal_plans SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE meal_plans SET created_at = NOW() WHERE created_at IS NULL;
UPDATE meal_plans SET deleted = false WHERE deleted IS NULL;
ALTER TABLE meal_plans ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE meal_plans ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE meal_plans ALTER COLUMN deleted SET DEFAULT false;
ALTER TABLE meal_plans ALTER COLUMN deleted SET NOT NULL;
ALTER TABLE meal_plans ALTER COLUMN profile_id SET NOT NULL;

-- Composite indexes for profile-scoped cardinality
CREATE INDEX IF NOT EXISTS idx_transactions_profile_updated_id ON transactions(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_budgets_profile_updated_id ON budgets(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notes_profile_updated_id ON notes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_folders_profile_updated_id ON folders(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_items_profile_updated_id ON list_items(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_profile_updated_id ON collection_recipes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_members_profile_updated_id ON members(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_events_profile_updated_id ON events(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_tasks_profile_updated_id ON tasks(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_lists_profile_updated_id ON lists(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_categories_profile_updated_id ON list_categories(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_documents_profile_updated_id ON documents(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_lock_profile_updated_id ON app_lock(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_settings_profile_updated_id ON settings(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_profile_updated_id ON user_preferences(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_profile_updated_id ON notification_preferences(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_profile_updated_id ON quiet_hours(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_settings_profile_updated_id ON app_settings(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated_id ON recipes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collections_profile_updated_id ON collections(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile_updated_id ON meal_plans(profile_id, updated_at, id);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Acceptance Checklist:
-- - After applying this migration, confirm Device A's transactions/budgets/notes/folders/list_items/collection_recipes carry profile_id, updated_at, deleted, and version so Device B sees proper tombstone sync.
