Chores Nest - Sync Architecture
This document explains the real-time, offline-first synchronization architecture used in the Chores Nest app, specifically focusing on how Events and Tasks (and other core models) synchronize instantaneously across multiple devices.

🏗 High-Level Architecture
The app uses WatermelonDB for local offline-first storage and Supabase (Postgres) as the remote source of truth.

The architecture ensures that:

Offline-First: Your app never waits for the network. When you create an Event or Task, it is saved instantly to the local SQLite database.
Instant UI Updates: Because the UI reads directly from the local WatermelonDB through reactive observables (e.g., withObservables), the screen updates instantly.
Background Sync: A background process handles pushing local changes to Supabase and pulling remote changes.
Real-Time Triggers: Supabase's WebSockets instantly notify connected devices when another device changes data.
🔄 The Sync Lifecycle (Step-by-Step)
Let's walk through exactly what happens when you create a new Task on Device A, and how it instantly appears on Device B.

Step 1: Local Write (Device A)
When you add a Task on Device A:

TaskService.createTask(...) is called.
It interacts only with the local WatermelonDB tasks collection.
WatermelonDB saves the Task to local storage and marks it internally with _status = 'created'.
The UI on Device A instantly updates because the list component is "observing" the local DB.
Step 2: The useAutoSync Trigger
The app uses a hook called useAutoSync() inside 
AppNavigator.tsx
.

WatermelonDB fires a global database change event.
useAutoSync catches this event and waits for 5 seconds (debouncing) to gather batches of changes.
It then tells SyncService to start a background push: SyncService.triggerSync().
Step 3: Pushing to Supabase (Device A)
SyncOrchestrator.ts
 starts the PushEngine.
It gathers all local records where _status is 'created', 'updated', or 'deleted'.
It sends an RPC call (or upsert) to Supabase to save the new Task into the remote Postgres database.
Once Supabase confirms the save, WatermelonDB marks the local Task as synced (removing the dirty status).
Step 4: Postgres Trigger & Real-time Broadcasting (Supabase)
The new Task is inserted into the remote Postgres tasks table.
Supabase's Realtime Engine (via PostgreSQL decoding) detects the INSERT event.
It broadcasts this insert event over WebSockets to all subscribed connected clients.
Step 5: Real-time Listener (Device B)
Device B is online and has an active WebSocket connection to Supabase via SyncService.ensureRealtimeSubscription().
The REALTIME_WATCH_TABLES list (which includes 'tasks' and 'events') tells Device B to listen for changes to these tables.
Device B receives the WebSocket packet: "Heads up! The 'tasks' table just changed."
SyncService immediately triggers SyncService.sync(readOnly: true).
Step 6: Pulling from Supabase (Device B)
SyncOrchestrator.ts
 starts the PullEngine.
Device B asks Supabase: "Give me all records that changed since my last sync timestamp."
Supabase returns the new Task created by Device A.
WatermelonDB securely inserts the new Task into Device B's local SQLite database.
Step 7: Instant UI Update (Device B)
The moment WatermelonDB on Device B saves the new Task, it fires its own local database event.
The React UI components (wrapped in withObservables) detect the change.
The UI seamlessly re-renders, displaying the new Task.
Total time elapsed from Device A to Device B: Usually between 0.5s to 2.0s.

🛠 Key Files Responsible for Sync
src/services/SyncService.ts
: The main controller. It manages network state, the 1-hour write limits, debouncing, and initializes the Supabase WebSocket connection (
ensureRealtimeSubscription
).
src/services/sync/SyncOrchestrator.ts
: Manages the Push and Pull engines. Handles conflict resolution if two devices edit the exact same task simultaneously.
src/services/sync/realtime/RealtimeWatchList.ts
: A simple array defining which tables Supabase should notify us about instantly (e.g., events, tasks, lists).
src/hooks/useAutoSync.ts
: The hook that sits in the background, watches for local user actions (like adding a task), and automatically whispers to SyncService to upload the changes.
⚠️ Edge Cases Handled Automatically
Offline Mode: If Device A creates a Task without Wi-Fi, the Task stays marked as created. The UI still shows it. When the device reconnects to Wi-Fi, SyncService wakes up and pushes it.
Concurrent Edits: If Device A and B edit the exact same Event simultaneously, the ConflictEngine resolves it using timestamps (server usually wins) and merges the truth seamlessly.
App Startup: On a fresh launch, 
AppNavigator
 triggers a sync to catch up on any WebSocket events that might have been missed while the app was completely closed.
