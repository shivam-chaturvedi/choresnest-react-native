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
    isBiometricEnabled: boolean;
    hasPin: boolean;
    enableAppLock: () => Promise<void>;
    disableAppLock: () => Promise<void>;
    enableBiometric: () => Promise<void>;
    disableBiometric: () => Promise<void>;
    setPin: (pin: string) => Promise<void>;
    toggleAppLock: () => Promise<void>;
    toggleBiometric: () => Promise<void>;
    unlockWithPin: (pin: string) => Promise<boolean>;
    unlockWithBiometric: () => Promise<boolean>;
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
        biometricEnabled: boolean;
        pinHash: string;
        createdAt: number;
        updatedAt: number;
    } | null;

    const [record, setRecord] = useState<AppLockSnapshot>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [sessionUnlocked, setSessionUnlocked] = useState(false);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    const mapToSnapshot = useCallback((lock: AppLock | null): AppLockSnapshot => {
        if (!lock) {
            return null;
        }
        return {
            id: lock.id,
            enabled: lock.enabled,
            biometricEnabled: lock.biometricEnabled,
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
            enabled: !!record?.enabled || !!record?.biometricEnabled,
            hasPin: !!record?.pinHash,
        });
    }, [record?.enabled, record?.biometricEnabled, record?.pinHash]);

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
        const isLockEnabled = record?.enabled || record?.biometricEnabled;
        if (isLockEnabled) {
            if (prevEnabledRef.current !== true) {
                setSessionUnlocked(false);
            }
        } else {
            setSessionUnlocked(true);
        }
        prevEnabledRef.current = isLockEnabled ?? null;
    }, [record?.enabled, record?.biometricEnabled]);

    // Handle app state changes - lock when app goes to background and comes back
    useEffect(() => {
        if (!isReady || !isAuthenticated) return;

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            const wasInBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
            appStateRef.current = nextAppState;

            if (nextAppState === 'active' && wasInBackground) {
                // App came to foreground from background
                const isLockEnabled = record?.enabled || record?.biometricEnabled;
                if (isLockEnabled && !sessionUnlocked) {
                    // Require authentication when coming back from background
                    appLockManager.requestFreshAuth();
                    setIsLocked(true);
                }
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                // App went to background - mark session as needing unlock
                const isLockEnabled = record?.enabled || record?.biometricEnabled;
                if (isLockEnabled) {
                    setSessionUnlocked(false);
                    appLockManager.requestFreshAuth();
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isReady, record?.enabled, isAuthenticated, sessionUnlocked]);

    const handleUnlockSuccess = useCallback(() => {
        setSessionUnlocked(true);
        setIsLocked(false);
        appLockManager.markAuthenticated();
    }, []);

    // Startup Lock Effect - Check on app start and when record changes
    useEffect(() => {
        if (!isReady) return;
        if (!isAuthenticated) {
            setIsLocked(false);
            setSessionUnlocked(false);
            return;
        }
        
        // If app lock or biometric is enabled, check if we need to show lock screen
        const isLockEnabled = record?.enabled || record?.biometricEnabled;
        if (isLockEnabled) {
            // Always require auth on startup if lock is enabled and session is not unlocked
            // This ensures the lock screen shows on every app restart
            const requiresStartupLock = !sessionUnlocked && appLockManager.shouldRequireAuth();
            setIsLocked(requiresStartupLock);
        } else {
            setIsLocked(false);
            setSessionUnlocked(true);
        }
    }, [isReady, record?.enabled, record?.biometricEnabled, isAuthenticated, sessionUnlocked]);

    const hasPin = Boolean(record?.pinHash);

    const enableAppLock = useCallback(async () => {
        if (!hasPin) {
            throw new Error('PIN required before enabling app lock');
        }
        // Disable biometric when enabling app lock (mutually exclusive)
        if (record?.biometricEnabled) {
            await appLockService.disableBiometric();
        }
        await appLockService.enableAppLock();
        await refreshRecord();
        // When enabling, mark that auth will be required next time
        appLockManager.requestFreshAuth();
        setSessionUnlocked(false);
    }, [hasPin, refreshRecord, record?.biometricEnabled]);

    const disableAppLock = useCallback(async () => {
        await appLockService.disableAppLock();
        await refreshRecord();
        setIsLocked(false);
        setSessionUnlocked(true);
    }, [refreshRecord]);

    const enableBiometric = useCallback(async () => {
        // Disable app lock when enabling biometric (mutually exclusive)
        if (record?.enabled) {
            await appLockService.disableAppLock();
        }
        await appLockService.enableBiometric();
        await refreshRecord();
        // When enabling, mark that auth will be required next time
        appLockManager.requestFreshAuth();
        setSessionUnlocked(false);
    }, [refreshRecord, record?.enabled]);

    const disableBiometric = useCallback(async () => {
        await appLockService.disableBiometric();
        await refreshRecord();
        setIsLocked(false);
        setSessionUnlocked(true);
    }, [refreshRecord]);

    const toggleBiometric = useCallback(async () => {
        if (record?.biometricEnabled) {
            await disableBiometric();
        } else {
            await enableBiometric();
        }
    }, [disableBiometric, enableBiometric, record?.biometricEnabled]);

    const setPin = useCallback(async (pin: string) => {
        await appLockService.setPin(pin);
        await refreshRecord();
        // When setting PIN, if app lock gets enabled, mark that auth will be required
        const updatedRecord = await appLockService.getRecord();
        if (updatedRecord?.enabled) {
            appLockManager.requestFreshAuth();
            setSessionUnlocked(false);
        }
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

    const unlockWithBiometric = useCallback(async () => {
        try {
            const ReactNativeBiometrics = require('react-native-biometrics');
            const rnBiometrics = new ReactNativeBiometrics.default();
            
            const { available } = await rnBiometrics.isSensorAvailable();
            if (!available) {
                return false;
            }

            const { success } = await rnBiometrics.simplePrompt({
                promptMessage: 'Authenticate to unlock',
            });

            if (success) {
                handleUnlockSuccess();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Biometric authentication failed:', error);
            return false;
        }
    }, [handleUnlockSuccess]);

    const appLockEnabled = !!record?.enabled;
    const biometricEnabled = !!record?.biometricEnabled;

    const value = useMemo<AppLockContextType>(() => ({
        isReady,
        isLocked,
        isAppLockEnabled: appLockEnabled,
        isBiometricEnabled: biometricEnabled,
        hasPin,
        enableAppLock,
        disableAppLock,
        enableBiometric,
        disableBiometric,
        setPin,
        toggleAppLock,
        toggleBiometric,
        unlockWithPin,
        unlockWithBiometric,
    }), [
        isReady,
        isLocked,
        appLockEnabled,
        biometricEnabled,
        hasPin,
        enableAppLock,
        disableAppLock,
        enableBiometric,
        disableBiometric,
        setPin,
        toggleAppLock,
        toggleBiometric,
        unlockWithPin,
        unlockWithBiometric,
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
