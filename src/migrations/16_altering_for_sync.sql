BEGIN;

-- Add version column to every sync-safe table (default 0, never null).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE app_lock ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE quiet_hours ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE list_categories ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- Ensure updated_at exists and is maintained (PostgreSQL default + trigger if desired).
-- (Optional) create trigger to auto-update 'updated_at' on writes if missing in existing schema.

-- Backfill profile_id for events/tasks so RLS continues to work cleanly.
ALTER TABLE events ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

UPDATE events
SET profile_id = m.profile_id
FROM members m
WHERE events.profile_id IS NULL AND events.member_id IS NOT NULL
  AND m.id = events.member_id;

UPDATE tasks
SET profile_id = m.profile_id
FROM members m
WHERE tasks.profile_id IS NULL AND tasks.assignee_id IS NOT NULL
  AND m.id = tasks.assignee_id;

ALTER TABLE events ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN profile_id SET NOT NULL;

-- Composite indexes for profile-scoped tables. These improve cursor pagination performance.
CREATE INDEX IF NOT EXISTS idx_members_profile_updated_id ON members(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_settings_profile_updated_id ON settings(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_lock_profile_updated_id ON app_lock(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_profile_updated_id ON user_preferences(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_profile_updated_id ON notification_preferences(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_quiet_hours_profile_updated_id ON quiet_hours(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_app_settings_profile_updated_id ON app_settings(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_events_profile_updated_id ON events(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_tasks_profile_updated_id ON tasks(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_lists_profile_updated_id ON lists(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_list_categories_profile_updated_id ON list_categories(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_recipes_profile_updated_id ON recipes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_collections_profile_updated_id ON collections(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile_updated_id ON meal_plans(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_updated_id ON transactions(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_budgets_profile_updated_id ON budgets(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_folders_profile_updated_id ON folders(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_notes_profile_updated_id ON notes(profile_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_documents_profile_updated_id ON documents(profile_id, updated_at, id);

-- Global index for profiles so cursor pagination stays deterministic.
CREATE INDEX IF NOT EXISTS idx_profiles_updated_id ON profiles(updated_at, id);

COMMIT;

NOTIFY pgrst, 'reload schema';
