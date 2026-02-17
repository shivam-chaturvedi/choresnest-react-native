# Recipe Screen Stabilization Prompt

## Purpose
Capture the current recipe-related failures (UI crashes, double uploads, concurrency races, missing state, etc.) so we can hand this prompt to a code model/engine that will perform the full architecture refactor described earlier. This file should stand alone: it lists every observable symptom, identifies the underlying root causes, and breaks the work into discrete, traceable tasks.

## Step 0 – Understand the current failures
1. Opening a recipe sometimes shows nothing or errors because `recipe` objects are missing the upload metadata (`uploadStatus`, `uploadAttempts`, `lastUploadError`) when mapped in `RecipeContext`. The UI then dereferences `recipe.uploadStatus` or uses remote paths that might not yet exist.
2. Recipe images/audio are uploaded twice: once immediately via `RecipeContext` (which calls `saveRecipeImage`/`saveRecipeAudio`) and again in `RecipeUploadWorker`. This leads to checksum drift, duplicated uploads, and a mismatch between what `UploadStatusIndicator` shows and what the worker records.
3. The worker itself lacks concurrency limits (spawned per recipe with `void this.uploadRecipe`), deletes local files before DB persistence succeeds, and retries linearly without a true exponential backoff or max attempts guard.
4. Scheduler restarts both document and recipe workers without waiting for the previous session to finish, so rapid network changes can lead to overlapping sessions and lost `sessionToken` validation.
5. The recipe creation/edit modal duplicates `localToast` state, renders a NaN width for the audio progress bar when `recordingTime === 0`, and removes preview images without touching `localImageUris`, leaving stale entries for the worker.
6. Media state is scattered across `images`, `imagePath`, `localImageUris`, `remoteImagePaths`, `localAudioUri`, `remoteAudioPath`, etc. No single `RecipeMediaState` model exists, so context updates can inconsistently clear/overwrite metadata and checksums.
7. `addRecipe`/`updateRecipe` upload before saving, so a failure prevents draft persistence and breaks offline flows.
8. There’s no atomic transition between upload → DB persistence → cleanup, so crashes between those phases can leave local files deleted and remote paths missing.

## Step 1 – Design clarity & modeling
- **Define a lean media model** (`RecipeMediaState`) that tracks local/remote images/audio, checksums, upload status/attempts, and last errors. Store this directly on the recipe record (where the current DB schema already has upload fields). Replace derived arrays (imagePaths, audioPaths) with this unified shape in both `Recipe` type and the context mapper.
- **Ensure UI mapping** always includes `uploadStatus`, `uploadAttempts`, `lastUploadError`, `localMedia`, `remoteMedia`, and `checksums` so screens never read `undefined` metadata.
- **Plan data migration** if needed (existing records may rely on the older fields). Provide fallback logic while reading from the DB.

## Step 2 – Worker-first upload flow
1. **Remove all direct uploads from `RecipeContext` (`resolveImageUrls`, `resolveAudioUrl`, `addRecipe`, `updateRecipe`)**. Context should only sanitize inputs, copy them to the local media directory (`RecipeMediaStorage` already handles this), write the recipe record with `localMedia` URIs, and set `uploadStatus='pending_upload'` plus `uploadAttempts=0`.
2. **Refactor `RecipeUploadWorker`** to:
   - Fetch only recipes with `uploadStatus` in `['pending_upload','uploading','failed']` but capped attempts.
   - Maintain a bounded concurrency queue (max 3 recipes in flight) using `p-limit` or custom semaphore.
   - For each recipe: stage 1 compute checksums, stage 2 upload missing assets (images/audio), stage 3 persist remote paths, stage 4 delete local files only after persistence.
   - Ensure checksum idempotency: skip uploading if local checksum matches stored value and remote path already exists.
   - Apply exponential backoff, capping attempts at `MAX_UPLOAD_ATTEMPTS`, and store `lastUploadError` in the record.
   - Clear `nextAttemptAt` and `uploadLocks` appropriately. Support worker restart by comparing `sessionToken` before each async stage.
3. **Scheduling & retries**: ensure `DocumentUploadScheduler` stops workers, waits for them to idle, and only restarts when NetInfo reports stable connectivity. Track `sessionToken` to abort stale uploads.

## Step 3 – UI fixes & stability
- **Fix duplicate state** by removing the redundant `localToast` definition and ensure `showLocalToast` updates the single set of hooks.
- **Guard audio progress width** by checking `recordingTime > 0 ? playbackTime / recordingTime : 0` before computing the percentage to prevent `NaN%` widths.
- **Image removal** must remove both `images` (preview) and `localImageUris` (worker input) when the user deletes an image.
- **Expose upload metadata** through context so `UploadStatusIndicator` and modals can react to the worker state.

## Step 4 – De-risking & production readiness
- **Worker resilience**: uploads should gracefully abort if the session token changes or the profile ID is cleared (user logs out) and should not delete local files until remote paths persist.
- **Scheduler race**: when the network state toggles, ensure `stop()` completes before calling `start()` to avoid double sessions and to keep `sessionToken` consistent.
- **Crash protection**: uploads must persist remote paths before deleting local files; consider a transactional update sequence (persist remote path → set uploadStatus `uploaded` → delete local file). If the app crashes before cleanup, the worker should detect the remote path on the next run and avoid re-uploading.
- **UI resilience**: `RecipeDetailModal` and other screens should guard against missing `recipe` props, empty arrays, or `undefined` upload statuses to prevent crashes when the DB record is still syncing.

## Step 5 – Task breakdown (divisible)
1. **Audit current schema + context mapping** (files: `src/database/models/Recipe.ts`, `src/types/recipes.ts`, `src/contexts/RecipeContext.tsx`, `src/services/StorageService.ts`, `src/services/RecipeMediaStorage.ts`). Document what fields exist and how UI uses them.
2. **Define `RecipeMediaState` & update types** (`src/types/recipes.ts`, `src/database/models/Recipe.ts`). Ensure new fields map to existing DB columns or migrations. Keep intense typing.
3. **Refactor `RecipeContext`**:
   - Remove `resolveImageUrls`/`resolveAudioUrl`.
   - Store only local URIs and the new media state (`localImages`, `localAudio`).
   - Set upload metadata (`uploadStatus`, `uploadAttempts`, `lastUploadError`).
   - Update recipe mapping to expose all worker-visible fields.
4. **Rewrite `RecipeUploadWorker`** as described above with concurrency control, stage persistence, exponential backoff, and atomic cleanup.
5. **Stabilize `DocumentUploadScheduler`** to stop/start safely with `sessionToken` awareness and network debouncing.
6. **Fix UI bugs**:
   - Remove duplicate `localToast` state and ensure toast logic uses the single state.
   - Protect playback width from division by zero (`AddNewRecipeModal.tsx`).
   - Update image removal handler to mutate both preview and `localImageUris`.
   - Ensure `UploadStatusIndicator` receives consistent metadata via context.
7. **Testing & verification**: add unit/integration tests covering worker retry behavior, recipe context immutability, audio progress rendering, and scheduler restart sequencing.

## Deliverables for this prompt
- A refactor plan (above + additional details as needed) stored in this repo (you can update `recipe-screen-prompt.md`).
- A testable implementation across `RecipeContext`, `RecipeUploadWorker`, `DocumentUploadScheduler`, and the UI components mentioned earlier.
- Documented assumptions, especially around worker concurrency, checksum dedupe, and data migration needs.

## Notes
- The worker rewrite should mimic Vault’s architecture: background-only uploads, worker-managed retries, and only the worker touching remote storage.
- The prompt above is intentionally granular so future runs can execute its steps incrementally.
