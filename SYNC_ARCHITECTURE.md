# Sync Architecture & Table Mapping

This project keeps React Native and Supabase data in sync through a layered service stack. The goal is to pull server changes, apply them via WatermelonDB, push local mutations back to Supabase, and keep uploads of large media (documents/recipes) running independently while still respecting profile-scoped isolation.

## 1. Sync Orchestration
| Component | Role |
| --- | --- |
| `SyncService` | Top-level entrypoint. Handles whether sync is enabled, enforces DESPI gating (offline, guest, minimum gap, backoff), tracks `syncPromise`, `isSyncing`, `activeSyncCount`, and notifies listeners. Calls `SyncOrchestrator` and registers Supabase realtime hooks to trigger debounced or manual sync requests. |
| `SyncOrchestrator` | Builds the WatermelonDB `synchronize` call against the active profile database. Watermelon keeps a per-database cursor internally, so we simply switch `database` instances when the active profile changes, run `pullTableChangesWithCursor` per table (`phase` ordering preserved), and push pending local changes via `PushEngine`. Deferred tables (documents, collection_recipes, etc.) run a second pass after a short delay to avoid blocking the main bootstrap path. |

## 2. Pull Path (`PullCursorEngine`)
* Pulls tables page-by-page from Supabase using a cursor tuple `{ updatedAt, id }` derived from the last-pulled timestamp.
* Requests only rows where `updated_at` is greater than the cursor and applies an optional profile filter (`profile_id = userId`).
* Stops when a page returns fewer rows than the page size, runs out of records, or reaches the configured `SUPABASE_SYNC_MAX_PULL_RECORDS`.
* Calls `TransformationEngine.classifyPullRows` to split results into `{ created, updated, deleted }` for WatermelonDB and to dedupe/strip server-only fields before insertion.
* Captures `latestUpdatedAt` so `SyncOrchestrator` can set the next cursor to the newest timestamp observed.
* Emits warnings if schema expectations (required columns, `updated_at`) are missing and logs guidance about indexing (`Config.LOG_SYNC_INDEX_HINTS`).

## 3. Push Path (`PushEngine`)
* Converts WatermelonDB change sets into Supabase payloads. It fetches the latest server rows and compares `version` metadata to avoid dirty writes.
* Fields are remapped through `TransformationEngine.mapLocalFieldToServer` (e.g., `dueDisplay → due_display` or `localUri → local_uri`) before the upsert.
* Handles creates/updates and also soft deletions by setting `deleted = true` and using `upsert` for both.
* Skips records when the server version is newer; records such skips as conflicts via `ConflictEngine.recordConflict`.
* When schema mismatches occur (missing `version` column), it logs a high-severity conflict for later inspection.
* Batches upserts and deletions according to configurable chunk sizes (`SUPABASE_SYNC_UPSERT_BATCH`, `_DELETE_BATCH`) and returns a summary of success/errors.

## 4. Support Modules
* `TransformationEngine` — handles deduplication, timestamp coercion, field mapping, and attaches local defaults (like `isActive`). It classifies incoming rows into created/updated/deleted sets while filtering corrupt or deleted rows.
* `ConflictEngine` — centralizes conflict logging, keeps a bounded history (`MAX_CONFLICT_HISTORY`), and exposes hooks to surface manual reviews.
* `BackoffEngine` — enforces exponential backoff when consecutive syncs fail with server/network errors (skipping concurrency/duplicate creates). `SyncService` consults `canSync()` before starting and records failures/successes.
* `DocumentUploadScheduler` — separate worker that uploads large document/recipe blobs after the profile is established. It listens to connectivity changes, starts `DocumentUploadWorker`/`RecipeUploadWorker`, and can trigger immediate uploads/downloads outside the regular data sync pipeline.
* `resetWatermelonCursor` — thin helper that clears `__watermelon_last_pulled_at`/`__watermelon_last_pulled_schema_version` keys when `SyncService.forceFullSync()` is invoked (or when an admin resets a profile), ensuring we re-fetch everything from Supabase per profile database.

## 5. Media Upload Workers
* `RecipeUploadWorker` (and similarly `DocumentUploadWorker`/`DocumentDownloadWorker`) operate on WatermelonDB recipes/documents outside of the `SyncService`. They read `pending_upload` records, upload media assets via `StorageService`, keep checksum lists, clean up locals, and back off after failures.
* `DocumentUploadScheduler` stops/restarts these workers when the app loses connectivity or the active profile changes.

## 6. Table Registry & Phases
`SYNC_TABLES` defines every WatermelonDB table that participates in sync plus metadata for scoping, conflict resolution, and ordering. Below is the canonical mapping from table → Supabase counterpart:

| Phase | Local Table | Remote Table | Profile Scoped? | Adds `profile_id` on push? | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `users` | `profiles` | ❌ (`hasProfileId=false`) | ❌ | Global user data (no profile_id). |
| 1 | `members` | `members` | ✅ | ✅ | Family member metadata and avatars. |
| 1 | `settings` | `settings` | ✅ | ✅ | Uses composite conflict key `profile_id,key`. |
| 1 | `user_preferences` | `user_preferences` | ✅ | ✅ | Per-profile user prefs. |
| 1 | `notification_preferences` | `notification_preferences` | ✅ | ✅ | Notification toggles. |
| 1 | `quiet_hours` | `quiet_hours` | ✅ | ✅ | Notification quiet periods. |
| 1 | `app_settings` | `app_settings` | ✅ | ✅ | App-level flags (locale, biometric). |
| 1 | `list_categories` | `list_categories` | ✅ | ✅ | Category metadata (profile scoped). |
| 1 | `lists` | `lists` | ✅ | ✅ | Groceries/tasks lists tied to profiles. |
| 1 | `folders` | `folders` | ✅ | ✅ | Document/note folders. |
| 2 | `recipes` | `recipes` | ✅ | ✅ | Shared when meal features enabled. |
| 2 | `collections` | `collections` | ✅ | ✅ | Recipe collections. |
| 3 | `collection_recipes` | `collection_recipes` | ✅ | ✅ | Join table for recipes -> collections. |
| 2 | `events` | `events` | ✅ | ✅ | Calendar events per profile. |
| 2 | `tasks` | `tasks` | ✅ | ✅ | Task list entries. |
| 2 | `transactions` | `transactions` | ✅ | ✅ | Finance history (deprecated?). |
| 2 | `budgets` | `budgets` | ✅ | ✅ | Budget records. |
| 2 | `meal_plans` | `meal_plans` | ❌ | ✅ | Global meal plans (no profile_id on fetch). |
| 2 | `list_items` | `list_items` | ✅ | ✅ | Individual grocery entries. |
| 2 | `documents` | `documents` | ✅ | ✅ | Document metadata; large assets handled by upload worker. |
| 3 | `notes` | `notes` | ✅ | ✅ | Note items, includes rich blocks. |

> Phase ordering controls which tables sync first. Phase 1 tables (profiles/members/settings) finish before phase 2 (events/tasks/documents/recipes), while phase 3 (nested joins like `collection_recipes` and `notes`) run last to avoid dependency issues.

## 7. Observability
* `SyncOrchestrator` logs entry points (`🔥 executeSync entered`, cursor values, etc.) and records change-set summaries by table (unless in production).
* Each engine logs warnings for schema mismatches, conflict detection, offline/guest gating, and repeats `SyncService` status updates.
* `SyncService` exposes `getSyncStatus`, `getLastSyncSummary`, `getNextSyncAllowedAt`, and conflict history to help debugging.

## 8. Media/Document Uploads in Context
* Media upload workers are intentionally decoupled; they don’t rely on Supabase synchronization and can run when `SyncService` is paused (e.g., offline or limited features). Their job is to ensure there are no pending binary assets before `documents` or `recipes` sync—they mark records as `uploaded` so `PushEngine` can treat them as clean.
* Document downloads run separately to fetch binary data pulled from another device.

If you need a diagram or want to capture more tables (archives, sync queue, etc.), let me know and I can expand this doc further.
