# Sync & Calendar UI Overview

This document captures the sync logic and UI hooks that coordinate calendar data, vault uploads, and the global sync experience.

## Calendar & event flow
- **CalendarScreen** (`src/screens/CalendarScreen.tsx:1`) pulls events, recurring rules, and tasks directly from `FamilyContext`, renders Day/Week/Month views, and relies on `AddEventModal` for creates/edits so the shared calendar stays consistent.
- **AddEventModal** (`src/components/modals/AddEventModal.tsx:1`) calls `SyncService` right after saving an event to ensure new/updated events propagate before the sheet closes, so the calendar UI reflects shared devices quickly.
- **TaskService** (`src/services/TaskService.ts:1`) and **FamilyService** (`src/services/FamilyService.ts:1`) both call the shared helper `syncAfterWrite()` (`src/services/TaskService.ts:14`, `src/services/FamilyService.ts:13`) after any DB write, which queues `SyncService.requestSyncSoon()` to let the orchestrator know new calendar/task data exists.

## Core sync orchestration
- **SyncService** (`src/services/SyncService.ts:330`) is the gatekeeper: it prevents overlapping syncs, enforces a minimum gap, honors guest mode, tracks `lastSyncMode`, and runs either read-only or full syncs while wiring in retry backoff, manual triggers, and periodic ticks (`src/services/SyncService.ts:619`). Manual syncs are exposed via `manualSyncNow()` for UI controls (`src/services/SyncService.ts:590`).
- The heavy lifting happens in **SyncOrchestrator** (`src/services/sync/SyncOrchestrator.ts:48`), which wraps `@nozbe/watermelondb/sync` and, for each phase defined in `SYNC_TABLES`, pulls cursor-based changes (`PullCursorEngine`) and pushes by table (`PushEngine`). It logs summaries, respects migrations, and ensures push phases only run when local changes exist.
- `SyncService` also stores timestamps for the last write sync (`shouldDoWriteSync()` at `src/services/SyncService.ts:248`) to decide between read-only vs full runs and persists the last successful sync to avoid unnecessary writes.

## Hooks & UI instrumentation
- **useAutoSync** (`src/hooks/useAutoSync.ts:1`) subscribes to the most critical collections (events, tasks, lists, documents, finances, notifications, etc.) and debounces notifications into `SyncService.sync()` so writes cascade into a sync without needing manual intervention.
- **AppNavigator** (`src/navigation/AppNavigator.tsx:82`) wires `useAutoSync`, listens to app state and network changes, starts/stops periodic ticks, and decides whether the initial sync on app launch should be a read-only pull (when the last write was <1 hour ago) or a full sync (`SyncService.shouldDoWriteSync()`).
- **useSyncStatus** (`src/hooks/useSyncStatus.ts:1`) exposes `isSyncing` plus manual refresh helpers; it feeds the UI components below.
- **AppLayout** (`src/components/layout/AppLayout.tsx:1`) disables pull-to-refresh and reuses the `refreshing` flag from `useSyncStatus` so the user doesn’t try to refresh mid-sync.
- **SyncIndicator** (`src/components/SyncIndicator.tsx:1`) listens to `SyncService.onSyncStatusChange` and briefly displays a floating “Syncing…” badge when `isSyncing` turns true, providing immediate visual feedback.
- **MoreScreen** (`src/screens/MoreScreen.tsx:39`) renders a manual “Sync now” button, disallows it during guest mode or while syncing, and shows the last success/next allowed timestamps so the user understands global sync status.

## Vault & document sync
- **VaultScreen** (`src/screens/VaultScreen.tsx:1`) surfaces any `pending_upload` documents, shows the “Sync now” button for each pending file, and calls `DocumentUploadScheduler.requestUploadNow(user?.id)` when pressed to queue uploads without blocking the modal.
- **DocumentUploadScheduler** (`src/services/sync/DocumentUploadScheduler.ts:1`) keeps a `DocumentUploadWorker` alive per profile, stops uploads when offline, tracks NetInfo connectivity, and ensures a manual sync can be triggered immediately regardless of the normal periodic cycle.
- **DocumentUploadWorker** (`src/services/documents/DocumentUploadWorker.ts:1`) polls WatermelonDB for documents flagged `pending_upload`/`failed`, retries uploads with exponential backoff, persists status updates (multipart metadata, checksum), and integrates with the storage client so vault files stay synced to Supabase buckets.

## Summary
Together, these files keep the calendar data, global tables, and vault attachments aligned: any DB write goes through `FamilyService`/`TaskService` into `SyncService.requestSyncSoon`, while UI components (`AppLayout`, `SyncIndicator`, `MoreScreen`) surface the current sync state and respect guest/offline restrictions, and the vault surface uses `DocumentUploadScheduler` to keep attachments flowing even outside the main orchestrator.
