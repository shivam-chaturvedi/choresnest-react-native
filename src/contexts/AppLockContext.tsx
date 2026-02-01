import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { appLockService, hashPin } from '../services/AppLockService';
import AppLock from '../database/models/AppLock';
import { database } from '../database';
import { appLockManager } from '../services/AppLockManager';

export interface AppLockContextType {
    isReady: boolean;
    isLocked: boolean;
    isAppLockEnabled: boolean;
    hasPin: boolean;
    enableAppLock: () => Promise<void>;
    disableAppLock: () => Promise<void>;
    setPin: (pin: string) => Promise<void>;
    toggleAppLock: () => Promise<void>;
    unlockWithPin: (pin: string) => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

type AppLockProviderProps = {
    children: ReactNode;
    shouldRequireAuthOnStartup?: boolean;
};

export const AppLockProvider: React.FC<AppLockProviderProps> = ({
    children,
    shouldRequireAuthOnStartup = true,
}) => {
    const { isAuthenticated } = useAuth();
    type AppLockSnapshot = {
        id: string;
        enabled: boolean;
        pinHash: string;
        createdAt: number;
        updatedAt: number;
    } | null;

    const [record, setRecord] = useState<AppLockSnapshot>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [sessionUnlocked, setSessionUnlocked] = useState(false);

    const mapToSnapshot = useCallback((lock: AppLock | null): AppLockSnapshot => {
        if (!lock) {
            return null;
        }
        return {
            id: lock.id,
            enabled: lock.enabled,
            pinHash: lock.pinHash,
            createdAt: lock.createdAt,
            updatedAt: lock.updatedAt,
        };
    }, []);

    const refreshRecord = useCallback(async () => {
        const next = await appLockService.getRecord();
        setRecord(mapToSnapshot(next));
    }, [mapToSnapshot]);

    useEffect(() => {
        const collection = database.get<AppLock>('app_lock');
        const subscription = collection.query().observe().subscribe(records => {
            setRecord(mapToSnapshot(records[0] || null));
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [mapToSnapshot]);

    useEffect(() => {
        appLockManager.updateSettings({
            enabled: !!record?.enabled,
            hasPin: !!record?.pinHash,
        });
    }, [record?.enabled, record?.pinHash]);

    useEffect(() => {
        (async () => {
            try {
                await refreshRecord();
            } catch (error) {
                console.warn('Failed to load app lock record', error);
            } finally {
                setIsReady(true);
            }
        })();
    }, [refreshRecord]);

    const prevEnabledRef = useRef<boolean | null>(null);
    useEffect(() => {
        if (record?.enabled) {
            if (prevEnabledRef.current !== true) {
                setSessionUnlocked(false);
            }
        } else {
            setSessionUnlocked(true);
        }
        prevEnabledRef.current = record?.enabled ?? null;
    }, [record?.enabled]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // App came to foreground
            } else if (nextAppState === 'background') {
                // App went to background
            }
        });

        return () => {
            subscription.remove();
        };
    }, [record?.enabled]);

    const handleUnlockSuccess = useCallback(() => {
        setSessionUnlocked(true);
        setIsLocked(false);
        appLockManager.markAuthenticated();
    }, []);

    // Startup Lock Effect
    useEffect(() => {
        if (!isReady) return;
        if (!isAuthenticated) {
            setIsLocked(false);
            setSessionUnlocked(false);
            return;
        }
        const requiresStartupLock =
            shouldRequireAuthOnStartup &&
            !!record?.enabled &&
            !sessionUnlocked &&
            appLockManager.shouldRequireAuth();
        setIsLocked(!!requiresStartupLock);
    }, [isReady, record?.enabled, isAuthenticated, sessionUnlocked, shouldRequireAuthOnStartup]);

    const hasPin = Boolean(record?.pinHash);

    const enableAppLock = useCallback(async () => {
        if (!hasPin) {
            throw new Error('PIN required before enabling app lock');
        }
        await appLockService.enableAppLock();
        await refreshRecord();
    }, [hasPin, refreshRecord]);

    const disableAppLock = useCallback(async () => {
        await appLockService.disableAppLock();
        await refreshRecord();
        setIsLocked(false);
        setSessionUnlocked(true);
    }, [refreshRecord]);

    const setPin = useCallback(async (pin: string) => {
        await appLockService.setPin(pin);
        await refreshRecord();
    }, [refreshRecord]);

    const toggleAppLock = useCallback(async () => {
        if (record?.enabled) {
            await disableAppLock();
        } else {
            await enableAppLock();
        }
    }, [disableAppLock, enableAppLock, record?.enabled]);

    const unlockWithPin = useCallback(async (pin: string) => {
        if (!record?.pinHash) {
            return false;
        }
        if (hashPin(pin) === record.pinHash) {
            handleUnlockSuccess();
            return true;
        }
        return false;
    }, [handleUnlockSuccess, record?.pinHash]);

    const appLockEnabled = !!record?.enabled;

    const value = useMemo<AppLockContextType>(() => ({
        isReady,
        isLocked,
        isAppLockEnabled: appLockEnabled,
        hasPin,
        enableAppLock,
        disableAppLock,
        setPin,
        toggleAppLock,
        unlockWithPin,
    }), [
        isReady,
        isLocked,
        appLockEnabled,
        hasPin,
        enableAppLock,
        disableAppLock,
        setPin,
        toggleAppLock,
        unlockWithPin,
    ]);

    return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
};

export const useAppLock = () => {
    const context = useContext(AppLockContext);
    if (!context) {
        throw new Error('useAppLock must be used within an AppLockProvider');
    }
    return context;
};
