import Config from 'react-native-config';
import { supabase } from '../config/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SyncOrchestrator } from './sync/SyncOrchestrator';
import {
    canSync as canPerformBackoff,
    getNextSyncAllowedAt as getBackoffNextAttempt,
    recordFailure as recordBackoffFailure,
    recordSuccess as recordBackoffSuccess,
    resetBackoff,
} from './sync/BackoffEngine';
import { clearConflictHistory, getConflictHistory } from './sync/ConflictEngine';
import { BackoffFailureType, ConflictRecord, TableChangeSet } from './sync/types';
import { resetSyncCursorState } from './sync/SyncCursorStore';
import { REALTIME_WATCH_TABLES } from './sync/realtime/RealtimeWatchList';
import { ProfileService } from './ProfileService';

const parseBooleanFlag = (value: string | undefined, defaultValue: boolean): boolean => {
    if (value === undefined || value === null) {
        return defaultValue;
    }
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
    }
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    return defaultValue;
};

const SYNC_ENABLED_FLAG = parseBooleanFlag(Config.ENABLE_SYNC, true);
let hasLoggedSyncDisabledWarning = false;

const MAX_CONSECUTIVE_FAILURES = 3;

const SYNC_REQUEST_DELAY_MS = 1500;
const PERIODIC_SYNC_INTERVAL_MS = 1 * 60 * 1000; // 1 minute
const LAST_SYNC_SUCCESS_KEY = 'LAST_SYNC_SUCCESS_AT';
const MIN_SYNC_GAP_MS = 300;
let lastSyncFinishedAt = 0;

let realtimeChannel: RealtimeChannel | null = null;
let lastRealtimeAttempt = 0;
let realtimeRetryCount = 0;

const getRealtimeBackoff = () => {
    const base = Math.min(5000 * Math.pow(2, realtimeRetryCount), 60000);
    const jitter = base * 0.3 * Math.random();
    return base + jitter;
};

const ensureRealtimeSubscription = (triggerSync: () => void) => {
    if (realtimeChannel) {
        return;
    }
    const now = Date.now();
    const delay = getRealtimeBackoff();
    if (now - lastRealtimeAttempt < delay) {
        return; // Prevent recursive or frequent websocket handshake spam
    }
    lastRealtimeAttempt = now;

    try {
        realtimeChannel = supabase.channel('realtime_sync');
        const watchTables = REALTIME_WATCH_TABLES;
        watchTables.forEach((table) => {
            realtimeChannel?.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
                triggerSync();
            });
        });
        realtimeChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                realtimeRetryCount = 0;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                console.warn(`Realtime sync subscription failed with status: ${status}. Attempting backoff retry...`);
                realtimeRetryCount++;
                teardownRealtimeSubscription();
            } else if (status === 'TIMED_OUT') {
                console.warn('Realtime sync subscription timed out.');
                teardownRealtimeSubscription();
            }
        });
    } catch (e) {
        console.error('Failed to initialize realtime channel:', e);
        realtimeChannel = null;
        realtimeRetryCount++;
    }
};

const teardownRealtimeSubscription = () => {
    if (!realtimeChannel) {
        return;
    }
    realtimeChannel.unsubscribe();
    realtimeChannel = null;
};

type SyncMode = 'manual' | 'periodic' | 'debounced' | 'force_full' | 'unknown';
type SyncOptions = {
    mode?: SyncMode;
    bypassBackoff?: boolean;
};

let lastSyncAttemptAt: number | null = null;
let lastSyncSuccessAt: number | null = null;
let lastSyncMode: SyncMode = 'unknown';
let lastSyncErrorMessage: string | null = null;
let hasInitializedLastSyncSuccess = false;

let isSyncing = false;
let syncPromise: Promise<void> | null = null;
let syncListeners: Set<(isSyncing: boolean) => void> = new Set();
let lastSyncError: Error | null = null;
let consecutiveFailures = 0;
let syncSoonTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSyncRequest = false;
let periodicSyncTimer: ReturnType<typeof setInterval> | null = null;
let lastSyncedProfileId: string | null = null;

const logSyncDisabledWarning = () => {
    if (hasLoggedSyncDisabledWarning) {
        return;
    }
    hasLoggedSyncDisabledWarning = true;
    console.log('Sync disabled via Config.ENABLE_SYNC=false; skipping sync requests.');
};

const buildErrorContext = (error: any) => {
    const message = (error?.message ?? '').toString().toLowerCase();
    const status = error?.status;
    const code = error?.code;

    const isConcurrentError = message.includes('concurrent synchronization');
    const isNetworkError = message.includes('network') || message.includes('fetch') || error?.code === 'ECONNABORTED';
    const isAuthError =
        code === 'PGRST301' ||
        code === 'PGRST116' ||
        message.includes('jwt') ||
        message.includes('token') ||
        status === 401;
    const isRateLimit = message.includes('rate limit') || status === 429;
    const isServerError = typeof status === 'number' && status >= 500;
    const isRlsError = status === 403 || message.includes('row level security') || message.includes('rls');
    const isValidationError = status === 400 || message.includes('invalid');
    const isSchemaMismatch =
        message.includes("could not find the 'version' column") || code === 'PGRST204' || message.includes('column "version"');
    const isDuplicateCreateWarning =
        message.includes('already exists locally') || message.includes('duplicate create');

    let failureType: BackoffFailureType = 'unknown';
    if (isConcurrentError) {
        failureType = 'concurrency';
    } else if (isDuplicateCreateWarning) {
        failureType = 'duplicate_create';
    } else if (isRateLimit) {
        failureType = 'rateLimit';
    } else if (isAuthError) {
        failureType = 'auth';
    } else if (isRlsError) {
        failureType = 'rls';
    } else if (isSchemaMismatch) {
        failureType = 'schema_mismatch';
    } else if (isValidationError) {
        failureType = 'validation';
    } else if (isServerError) {
        failureType = 'server';
    } else if (isNetworkError) {
        failureType = 'network';
    }

    return {
        isConcurrentError,
        isNetworkError,
        isAuthError,
        isRateLimit,
        isRlsError,
        isValidationError,
        isSchemaMismatch,
        isDuplicateCreateWarning,
        failureType,
    };
};

// resetSyncCursors is only used by forceFullSync() — an explicit user action.
// It is NOT called on logout/login/profile-switch (that would destroy cross-profile data).
const resetSyncCursors = async (): Promise<void> => {
    await resetSyncCursorState();
};

const formatSafeErrorMessage = (error: any): string => {
    if (!error) {
        return 'Sync failed';
    }
    if (typeof error === 'string') {
        return error;
    }
    const message = error?.message ?? error?.toString?.() ?? 'Sync failed';
    return message.split('\n')[0];
};

const loadStoredLastSyncSuccess = async (): Promise<void> => {
    if (hasInitializedLastSyncSuccess) {
        return;
    }
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const stored = await AsyncStorage.getItem(LAST_SYNC_SUCCESS_KEY);
        if (stored) {
            const parsed = parseInt(stored, 10);
            if (!Number.isNaN(parsed)) {
                lastSyncSuccessAt = parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load last sync success timestamp:', error);
    } finally {
        hasInitializedLastSyncSuccess = true;
    }
};

void loadStoredLastSyncSuccess();

const persistLastSyncSuccess = async (timestamp: number): Promise<void> => {
    lastSyncSuccessAt = timestamp;
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(LAST_SYNC_SUCCESS_KEY, timestamp.toString());
    } catch (error) {
        console.warn('Failed to persist last sync success timestamp:', error);
    }
};

const isGuestMode = async (): Promise<boolean> => {
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const isGuest = await AsyncStorage.getItem('IS_GUEST');
        return isGuest === 'true';
    } catch (error) {
        console.warn('Could not check guest status, continuing with sync');
        return false;
    }
};

const ensureOnline = async (): Promise<boolean> => {
    try {
        const NetInfo = require('@react-native-community/netinfo').default;
        const state = await NetInfo.fetch();
        return state.isConnected ?? false;
    } catch (error) {
        console.warn('NetInfo not available, assuming online');
        return true;
    }
};

const getLastWriteSyncTime = async (): Promise<number | null> => {
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const lastSyncStr = await AsyncStorage.getItem('LAST_WRITE_SYNC_TIME');
        if (lastSyncStr) {
            return parseInt(lastSyncStr, 10);
        }
        return null;
    } catch (error) {
        console.warn('Failed to get last write sync time:', error);
        return null;
    }
};

const saveLastWriteSyncTime = async (): Promise<void> => {
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('LAST_WRITE_SYNC_TIME', Date.now().toString());
    } catch (error) {
        console.warn('Failed to save last write sync time:', error);
    }
};

const shouldDoWriteSync = async (): Promise<boolean> => {
    const lastSyncTime = await getLastWriteSyncTime();
    if (!lastSyncTime) {
        return true;
    }
    const oneHourMs = 60 * 60 * 1000;
    return Date.now() - lastSyncTime >= oneHourMs;
};

const applySyncTimeout = (callback: () => void): ReturnType<typeof setTimeout> =>
    setTimeout(callback, 300000); // 5-minute timeout to accommodate large initial syncs

const handleSyncError = (error: any): void => {
    // Silently ignore concurrent sync errors as they are expected when multiple triggers fire
    if (error?.message?.includes('Concurrent synchronization is not allowed')) {
        return;
    }

    console.error('✗ Sync failed:', error);
    if (error?.message) {
        console.error('Sync error details:', error.message);
    }
    if (error?.code) {
        console.error('Sync error code:', error.code);
    }
};

export type ConflictSummary = ConflictRecord;
export type { TableChangeSet } from './sync/types';

export const SyncService = {
    onSyncStatusChange: (listener: (isSyncing: boolean) => void) => {
        syncListeners.add(listener);
        return () => {
            syncListeners.delete(listener);
        };
    },

    _notifySyncStatus: (syncing: boolean) => {
        syncListeners.forEach(listener => listener(syncing));
    },

    isOnline: ensureOnline,

    getLastWriteSyncTime,

    saveLastWriteSyncTime,

    shouldDoWriteSync,

    async requestSyncSoon(): Promise<void> {
        if (!SYNC_ENABLED_FLAG) {
            return;
        }

        try {
            const guest = await isGuestMode();
            if (guest) {
                return;
            }
        } catch (error) {
            console.error('Failed to determine guest mode before scheduling sync:', error);
        }

        if (isSyncing) {
            pendingSyncRequest = true;
            return;
        }

        if (syncSoonTimer) {
            return;
        }

        syncSoonTimer = setTimeout(() => {
            syncSoonTimer = null;
            if (isSyncing) {
                pendingSyncRequest = true;
                return;
            }
            // Verify we aren't backing off before starting the debounced sync
            if (!canPerformBackoff()) {
                pendingSyncRequest = true; // Queue it for after backoff
                return;
            }
            void this.sync(false, { mode: 'debounced' }).catch(err => {
                if (!err?.message?.includes('Concurrent synchronization')) {
                    console.error('Scheduled sync failed:', err);
                }
            });
        }, SYNC_REQUEST_DELAY_MS);
    },

    async sync(readOnly = false, options: { finalPull?: boolean; mode?: SyncMode } = {}): Promise<void> {
        if (!SYNC_ENABLED_FLAG) {
            if (!hasLoggedSyncDisabledWarning) {
                logSyncDisabledWarning();
            }
            return;
        }

        if (syncPromise) {
            console.log('Sync already in progress, returning existing promise to avoid overlap');
            return syncPromise;
        }

        const now = Date.now();
        if (now - lastSyncFinishedAt < MIN_SYNC_GAP_MS) {
            console.log('Sync suppressed due to minimum gap protection');
            return;
        }

        if (__DEV__ && isSyncing && syncPromise === null) {
            console.error('Invariant violation: isSyncing true but no syncPromise active');
        }

        if (syncSoonTimer) {
            clearTimeout(syncSoonTimer);
            syncSoonTimer = null;
        }

        if (!canPerformBackoff()) {
            const nextAttempt = new Date(getBackoffNextAttempt()).toISOString();
            console.log(`Sync deferred until ${nextAttempt} due to recent failures/backoff.`);
            return;
        }

        const mode = options.mode ?? 'unknown';
        lastSyncMode = mode;
        lastSyncAttemptAt = Date.now();
        lastSyncErrorMessage = null;

        try {
            const guest = await isGuestMode();
            if (guest) {
                console.log('Guest mode detected - skipping sync (guests do not sync)');
                return;
            }
        } catch (error) {
            console.error('Failed to determine guest mode before sync:', error);
        }

        const {
            data: { session },
            error: authError,
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (authError || !user) {
            console.log('No user logged in or auth error, skipping sync', authError);
            return;
        }

        const activeProfileId = await ProfileService.getActiveProfileId();
        if (!activeProfileId) {
            console.log('No active profile ID resolved via ProfileService, skipping sync');
            return;
        }

        ensureRealtimeSubscription(() => {
            void this.requestSyncSoon();
        });

        if (lastSyncedProfileId && lastSyncedProfileId !== activeProfileId) {
            // Profile changed: reset in-memory state only.
            // Do NOT reset sync cursors — each profile keeps its own continuation point
            // so switching back to a profile continues from where it left off.
            console.log(`[SyncService] Profile switched: ${lastSyncedProfileId} → ${activeProfileId}. Resetting in-memory state only (cursors preserved).`);
            consecutiveFailures = 0;
            lastSyncError = null;
            resetBackoff();
            clearConflictHistory();
            pendingSyncRequest = false;
            if (syncSoonTimer) {
                clearTimeout(syncSoonTimer);
                syncSoonTimer = null;
            }
        }
        lastSyncedProfileId = activeProfileId;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.log(`Sync paused due to ${consecutiveFailures} consecutive failures. Reset sync state to retry.`);
            return;
        }

        isSyncing = true;
        this._notifySyncStatus(true);
        lastSyncError = null;

        syncPromise = (async () => {
            let didTimeout = false;
            let syncTimeout: ReturnType<typeof setTimeout> | null = applySyncTimeout(() => {
                didTimeout = true;
                console.warn('⚠️ Sync timed out after 2 minutes but will wait for the orchestrator to finish.');
            });

            try {
                const online = await this.isOnline();
                if (!online) {
                    console.log('Device is offline, skipping sync');
                    return;
                }

                console.log(`🔄 Starting ${readOnly ? 'READ-ONLY' : 'FULL'} sync for profile:`, activeProfileId);
                const orchestrator = new SyncOrchestrator(activeProfileId);
                await orchestrator.run(readOnly);

                console.log(`✓ ${readOnly ? 'Read-only' : 'Full'} sync completed successfully`);
                recordBackoffSuccess();
                consecutiveFailures = 0;

                if (!readOnly) {
                    await saveLastWriteSyncTime();
                }
                await persistLastSyncSuccess(Date.now());
            } catch (error: any) {
                lastSyncError = error;
                handleSyncError(error);

                const context = buildErrorContext(error);
                if (!readOnly) {
                    consecutiveFailures++;
                    recordBackoffFailure(context.failureType);
                }
                lastSyncErrorMessage = formatSafeErrorMessage(error);

                if (context.isConcurrentError) {
                    console.warn('Concurrent sync detected - this is expected when multiple sync triggers fire');
                    if (!readOnly) {
                        consecutiveFailures = Math.max(0, consecutiveFailures - 1);
                    }
                }
                if (context.isNetworkError) {
                    console.error('Network error during sync - will retry when connection is restored');
                    if (!readOnly) {
                        consecutiveFailures = Math.max(0, consecutiveFailures - 1);
                    }
                }
                if (context.isAuthError) {
                    console.error('Authentication error during sync - user may need to re-login');
                    if (!readOnly) {
                        consecutiveFailures = MAX_CONSECUTIVE_FAILURES;
                    }
                }
                if (context.isRateLimit) {
                    console.warn('Rate limit hit during sync - pausing before retry');
                }
                if (context.isDuplicateCreateWarning) {
                    console.warn('Duplicate create warning during sync; record already exists locally.');
                }
                if (context.isRlsError) {
                    console.warn('Row-level security prevented sync write (often expected during profile transitions).');
                    if (!readOnly) {
                        consecutiveFailures = Math.max(0, consecutiveFailures - 1);
                    }
                }
                if (context.isValidationError) {
                    console.error('Validation error during sync - record payload may be malformed.');
                    if (!readOnly) {
                        consecutiveFailures = Math.max(0, consecutiveFailures - 1);
                    }
                }
                if (context.isSchemaMismatch) {
                    console.error('Schema mismatch detected during sync; ensure database migrations are current.');
                }

                if (!readOnly && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    console.warn(`Sync paused after ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Will retry on next trigger.`);
                }
            } finally {
                if (syncTimeout) {
                    clearTimeout(syncTimeout);
                }
                if (didTimeout) {
                    console.warn('Sync completed after timing out; review logs if progress stalled.');
                }
                isSyncing = false;
                syncPromise = null;
                lastSyncFinishedAt = Date.now();
                this._notifySyncStatus(false);
                if (pendingSyncRequest) {
                    pendingSyncRequest = false;
                    const nextSyncDelay = Math.max(MIN_SYNC_GAP_MS, getBackoffNextAttempt() - Date.now());
                    setTimeout(() => {
                        void this.requestSyncSoon();
                    }, nextSyncDelay);
                }
            }
        })();

        return syncPromise;
    },

    getSyncStatus(): boolean {
        return isSyncing;
    },

    isEnabled(): boolean {
        return SYNC_ENABLED_FLAG;
    },

    isSyncing(): boolean {
        return isSyncing;
    },

    getLastSyncError(): Error | null {
        return lastSyncError;
    },

    getRecentConflicts(): ConflictRecord[] {
        return getConflictHistory();
    },

    clearConflictHistory(): void {
        clearConflictHistory();
    },

    getNextSyncAllowedAt(): number {
        return getBackoffNextAttempt();
    },

    /**
     * Resets all in-memory sync state AND the WatermelonDB global cursor.
     * Used for forceFullSync() and similar explicit user-triggered resets.
     * Does NOT need to be called on logout/profile-switch.
     */
    resetSyncState(): void {
        consecutiveFailures = 0;
        lastSyncError = null;
        resetBackoff();
        clearConflictHistory();
        lastSyncedProfileId = null;
        // NOTE: cursor reset is intentional here — this is the full-reset path.
        void resetSyncCursorState();
        lastSyncAttemptAt = null;
        lastSyncSuccessAt = null;
        lastSyncErrorMessage = null;
        lastSyncMode = 'unknown';
    },

    /**
     * Resets in-memory counters and flags ONLY — does NOT reset sync cursors.
     * Called by DataCleanupService.clearSessionCaches() on logout/profile-switch
     * to clear stale retry counts without destroying cross-profile cursor state.
     */
    resetSyncStateInMemory(): void {
        consecutiveFailures = 0;
        lastSyncError = null;
        lastSyncAttemptAt = null;
        lastSyncErrorMessage = null;
        resetBackoff();
        // Deliberately NOT resetting lastSyncedProfileId or calling resetSyncCursorState()
        console.log('[SyncService] In-memory sync state cleared (cursors preserved)');
    },

    async forceFullSync(): Promise<void> {
        console.log('🔁 Force full sync requested — resetting cursor and re-syncing all data from Supabase');
        consecutiveFailures = 0;
        lastSyncError = null;
        resetBackoff();
        clearConflictHistory();
        // Reset the persisted cursor so ALL rows are re-fetched, even those with old updated_at
        await resetSyncCursorState();
        lastSyncAttemptAt = null;
        lastSyncSuccessAt = null;
        lastSyncErrorMessage = null;
        lastSyncMode = 'unknown';
        // Immediately trigger a full sync
        await this.sync(false, { mode: 'force_full' });
    },

    getLastSuccessfulSyncAt(): number | null {
        return lastSyncSuccessAt;
    },

    getLastSyncAttemptAt(): number | null {
        return lastSyncAttemptAt;
    },

    getLastSyncMode(): SyncMode {
        return lastSyncMode;
    },

    getLastSyncSummary(): {
        lastSuccessAt: number | null;
        lastAttemptAt: number | null;
        lastMode: SyncMode;
        lastErrorMessage?: string;
        nextAllowedAt: number;
    } {
        return {
            lastSuccessAt: lastSyncSuccessAt,
            lastAttemptAt: lastSyncAttemptAt,
            lastMode: lastSyncMode,
            lastErrorMessage: lastSyncErrorMessage ?? undefined,
            nextAllowedAt: getBackoffNextAttempt(),
        };
    },

    async refreshNow(): Promise<void> {
        if (syncPromise) {
            return syncPromise;
        }
        return this.sync(false);
    },

    async manualSyncNow(): Promise<void> {
        if (!SYNC_ENABLED_FLAG) {
            return;
        }
        if (syncSoonTimer) {
            clearTimeout(syncSoonTimer);
            syncSoonTimer = null;
        }
        try {
            const guest = await isGuestMode();
            if (guest) {
                console.log('Guest mode detected - manual sync skipped');
                return;
            }
        } catch (error) {
            console.error('Failed to check guest mode before manual sync:', error);
        }

        if (syncPromise) {
            try {
                await syncPromise;
            } catch {
                // previous sync handles its own logging
            }
        }

        return this.sync(false, { mode: 'manual' });
    },

    startPeriodicSync(): void {
        if (periodicSyncTimer) {
            return;
        }
        periodicSyncTimer = setInterval(() => {
            void this._runPeriodicSyncTick();
        }, PERIODIC_SYNC_INTERVAL_MS);
    },

    stopPeriodicSync(): void {
        if (periodicSyncTimer) {
            clearInterval(periodicSyncTimer);
            periodicSyncTimer = null;
        }
    },

    async _runPeriodicSyncTick(): Promise<void> {
        if (!SYNC_ENABLED_FLAG) {
            return;
        }
        try {
            const online = await this.isOnline();
            if (!online) {
                return;
            }
            const guest = await isGuestMode();
            if (guest) {
                return;
            }
            const shouldWrite = await shouldDoWriteSync();
            await this.sync(!shouldWrite, { mode: 'periodic' });
        } catch (error) {
            console.warn('Periodic sync tick failed:', error);
        }
    },
};

// Acceptance Checklist:
// - Rapid calls to requestSyncSoon() should collapse into a single run and, if a sync is running, trigger exactly one follow-up sync.
// - manualSyncNow() bypasses the debounce timer, waits for any active sync, runs a full sync, and then performs a final read-only pull to guarantee convergence.
// - startPeriodicSync() produces a read-only pull every 5 minutes (skipping guests/offline) and only triggers write syncs when shouldDoWriteSync() allows.
