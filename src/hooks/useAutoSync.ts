import { useEffect } from 'react';
import { SyncService } from '../services/SyncService';
import { database } from '../database';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to automatically trigger sync after database changes
 */
export const useAutoSync = () => {
    const { isAuthenticated, isGuest } = useAuth();

    useEffect(() => {
        if (!isAuthenticated || isGuest) {
            return;
        }

        // Debounce sync calls to avoid too frequent syncing
        let syncTimeout: ReturnType<typeof setTimeout> | null = null;
        const DEBOUNCE_MS = 2000; // 2 seconds

        const triggerSync = () => {
            if (syncTimeout) {
                clearTimeout(syncTimeout);
            }
            syncTimeout = setTimeout(() => {
                SyncService.sync().catch(err => {
                    console.error('Auto-sync failed:', err);
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
            'app_lock',
            'notification_preferences',
            'quiet_hours',
            'app_settings',
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
        };
    }, [isAuthenticated, isGuest]);
};
