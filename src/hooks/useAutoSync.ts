import { useEffect, useRef } from 'react';
import { SyncService } from '../services/SyncService';
import { database } from '../database';
import { useAuth } from '../contexts/AuthContext';

export const shouldTriggerAutoSync = (
    isSyncingFlag: boolean,
    lastSync: number,
    now: number,
    minInterval: number
): boolean => {
    if (isSyncingFlag) {
        return false;
    }
    return now - lastSync >= minInterval;
};

/**
 * Hook to automatically trigger sync after database changes
 */
export const useAutoSync = () => {
    const { isAuthenticated, isGuest } = useAuth();
    const syncStateRef = useRef(SyncService.isSyncing());

    useEffect(() => {
        if (!isAuthenticated || isGuest) {
            return;
        }

        if (!SyncService.isEnabled()) {
            console.log('Auto-sync is disabled via Config.ENABLE_SYNC=false; skipping auto-sync observers.');
            return;
        }

        // Debounce sync calls to avoid too frequent syncing
        let syncTimeout: ReturnType<typeof setTimeout> | null = null;
        let lastSyncTime = 0;
        let syncInProgress = false;
        const DEBOUNCE_MS = 5000; // 5 seconds (increased from 2)
        const MIN_SYNC_INTERVAL = 10000; // Minimum 10 seconds between syncs

        const statusUnsubscribe = SyncService.onSyncStatusChange(syncing => {
            syncStateRef.current = syncing;
        });

        syncStateRef.current = SyncService.isSyncing();

        const triggerSync = () => {
            const now = Date.now();
            const isSyncingFlag = syncStateRef.current;

            if (!shouldTriggerAutoSync(isSyncingFlag, lastSyncTime, now, MIN_SYNC_INTERVAL)) {
                return;
            }

            if (syncTimeout) {
                clearTimeout(syncTimeout);
            }
            syncTimeout = setTimeout(() => {
                syncInProgress = true;
                lastSyncTime = Date.now();
                SyncService.sync()
                    .then(() => {
                        syncInProgress = false;
                    })
                    .catch(err => {
                        syncInProgress = false;
                        // Don't log concurrent sync errors - they're expected
                        if (!err?.message?.includes('Concurrent synchronization')) {
                            console.error('Auto-sync failed:', err);
                        }
                    });
            }, DEBOUNCE_MS);
        };

        // Subscribe to database changes
        const subscriptions: Array<{ unsubscribe: () => void }> = [];

        // Subscribe to all collections that need syncing
        const collections = [
            'members',
            'settings',
            'user_preferences',
            'events',
            'tasks',
            'lists',
            'list_items',
            'list_categories',
            'recipes',
            'collections',
            'collection_recipes',
            'meal_plans',
            'documents',
            'transactions',
            'budgets',
            'folders',
            'notes',
            'notification_preferences',
            'quiet_hours',
        ];

        collections.forEach(collectionName => {
            try {
                const collection = database.get(collectionName);
                const subscription = collection.query().observe().subscribe(() => {
                    triggerSync();
                });
                subscriptions.push({ unsubscribe: () => subscription.unsubscribe() });
            } catch (error) {
                console.warn(`Failed to subscribe to ${collectionName}:`, error);
            }
        });

        return () => {
            if (syncTimeout) {
                clearTimeout(syncTimeout);
            }
            subscriptions.forEach(sub => sub.unsubscribe());
            statusUnsubscribe();
        };
    }, [isAuthenticated, isGuest]);
};
