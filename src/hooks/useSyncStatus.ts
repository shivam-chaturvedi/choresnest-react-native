import { useCallback, useEffect, useRef, useState } from 'react';
import { SyncService } from '../services/SyncService';

export const useSyncStatus = () => {
    const [isSyncing, setIsSyncing] = useState(SyncService.getSyncStatus());
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    const manualRefreshPromise = useRef<Promise<void> | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        const unsubscribe = SyncService.onSyncStatusChange((syncing) => {
            setIsSyncing(syncing);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const refreshNow = useCallback(async () => {
        if (manualRefreshPromise.current) {
            return manualRefreshPromise.current;
        }

        setIsManualRefreshing(true);
        const promise = SyncService.refreshNow();
        manualRefreshPromise.current = promise;
        try {
            await promise;
        } finally {
            manualRefreshPromise.current = null;
            if (isMountedRef.current) {
                setIsManualRefreshing(false);
            }
        }
    }, []);

    const refreshing = isManualRefreshing;

    return { isSyncing, isManualRefreshing, refreshing, refreshNow };
};
