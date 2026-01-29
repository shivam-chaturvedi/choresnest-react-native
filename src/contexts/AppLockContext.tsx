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
import ReactNativeBiometrics from 'react-native-biometrics';
import { useAuth } from './AuthContext';
import { appLockService, hashPin } from '../services/AppLockService';
import AppLock from '../database/models/AppLock';
import { database } from '../database';
import { markBiometricPromptShown } from '../services/biometricLifecycle';
import { appLockManager } from '../services/AppLockManager';

export interface AppLockContextType {
    isReady: boolean;
    isLocked: boolean;
    isAppLockEnabled: boolean;
    isBiometricEnabled: boolean;
    isBiometricAvailable: boolean;
    biometryType: string | null;
    hasPin: boolean;
    enableAppLock: () => Promise<void>;
    disableAppLock: () => Promise<void>;
    setPin: (pin: string) => Promise<void>;
    toggleAppLock: () => Promise<void>;
    toggleBiometric: (enabled: boolean) => Promise<void>;
    unlockWithPin: (pin: string) => Promise<boolean>;
    unlockWithBiometrics: () => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);
const biometricClient = new ReactNativeBiometrics();

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
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometryType, setBiometryType] = useState<string | null>(null);

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
            enabled: !!record?.enabled,
            biometricEnabled: !!record?.biometricEnabled,
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

    useEffect(() => {
        (async () => {
            try {
                const result = await biometricClient.isSensorAvailable();
                setBiometricAvailable(!!result.available);
                setBiometryType(result.biometryType || null);
            } catch (error) {
                console.warn('Biometric availability check failed', error);
                setBiometricAvailable(false);
                setBiometryType(null);
            }
        })();
    }, []);

    const prevEnabledRef = useRef<boolean | null>(null);
    const biometricPromptRunning = useRef(false);
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
                // The lock check happens in the other useEffect automatically
            } else if (nextAppState === 'background') {
                // App went to background
                // We invalidate the session immediately so next time it's active, it requires auth
                setSessionUnlocked(false);
                appLockManager.requestFreshAuth();

                // Force lock state update immediately to ensure UI covers content
                const shouldLock = record?.enabled || record?.biometricEnabled;
                if (shouldLock) {
                    setIsLocked(true);
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [record?.enabled, record?.biometricEnabled]);

    const handleUnlockSuccess = useCallback(() => {
        setSessionUnlocked(true);
        setIsLocked(false);
        markBiometricPromptShown();
        appLockManager.markAuthenticated();
    }, []);

    const unlockWithBiometrics = useCallback(async () => {
        if (!record?.biometricEnabled) {
            return false;
        }
        try {
            const result = await biometricClient.simplePrompt({ promptMessage: 'Confirm identity' });
            if (result.success) {
                handleUnlockSuccess();
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Biometric unlock failed', error);
            return false;
        }
    }, [handleUnlockSuccess, record?.biometricEnabled]);

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
            (!!record?.enabled || !!record?.biometricEnabled) &&
            !sessionUnlocked &&
            appLockManager.shouldRequireAuth();
        setIsLocked(!!requiresStartupLock);
    }, [isReady, record?.enabled, isAuthenticated, sessionUnlocked, shouldRequireAuthOnStartup, record?.biometricEnabled]);

    // Auto-trigger Biometrics Effect
    useEffect(() => {
        if (!isLocked) return;
        if (!record?.biometricEnabled) return;
        if (biometricPromptRunning.current) return;

        biometricPromptRunning.current = true;

        unlockWithBiometrics().finally(() => {
            biometricPromptRunning.current = false;
        });
    }, [isLocked, record?.biometricEnabled, unlockWithBiometrics]);

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

    const toggleBiometric = useCallback(async (enabled: boolean) => {
        if (enabled && !biometricAvailable) {
            throw new Error('Biometric sensors are not available on this device');
        }
        if (enabled) {
            const result = await biometricClient.simplePrompt({ promptMessage: 'Enable biometric lock' });
            if (!result.success) {
                throw new Error('Biometric setup was cancelled');
            }
        }
        await appLockService.setBiometric(enabled);
        await refreshRecord();

        if (enabled) {
            // User requested behavior: immediately require auth next time (or effectively now if we locked)
            // Invalidating session so next resume/startup requires auth.
            setSessionUnlocked(false);
            appLockManager.requestFreshAuth();
            setIsLocked(true);
        }
    }, [biometricAvailable, refreshRecord]);

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
    const biometricLockEnabled = !!record?.biometricEnabled;

    const value = useMemo<AppLockContextType>(() => ({
        isReady,
        isLocked,
        isAppLockEnabled: appLockEnabled,
        isBiometricEnabled: biometricLockEnabled,
        isBiometricAvailable: biometricAvailable,
        biometryType,
        hasPin,
        enableAppLock,
        disableAppLock,
        setPin,
        toggleAppLock,
        toggleBiometric,
        unlockWithPin,
        unlockWithBiometrics,
    }), [
        isReady,
        isLocked,
        appLockEnabled,
        biometricLockEnabled,
        biometricAvailable,
        biometryType,
        hasPin,
        enableAppLock,
        disableAppLock,
        setPin,
        toggleAppLock,
        toggleBiometric,
        unlockWithPin,
        unlockWithBiometrics
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
