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
import { AppState } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useAuth } from './AuthContext';
import { appLockService, hashPin } from '../services/AppLockService';
import AppLock from '../database/models/AppLock';
import { database } from '../database';

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

export const AppLockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState === 'active' && record?.enabled && isAuthenticated) {
                setSessionUnlocked(false);
                setIsLocked(true);
            }
        });
        return () => subscription.remove();
    }, [record?.enabled, isAuthenticated]);

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
        if (!isReady) return;
        if (!isAuthenticated) {
            setIsLocked(false);
            setSessionUnlocked(false);
            return;
        }
        if (record?.enabled && !sessionUnlocked) {
            setIsLocked(true);
        } else {
            setIsLocked(false);
        }
    }, [isReady, record?.enabled, isAuthenticated, sessionUnlocked]);

    const hasPin = Boolean(record?.pinHash);

    const handleUnlockSuccess = useCallback(() => {
        setSessionUnlocked(true);
        setIsLocked(false);
    }, []);

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
            setIsLocked(false);
            setSessionUnlocked(true);
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
    }), [appLockEnabled, biometricLockEnabled, biometricAvailable, biometryType, disableAppLock, enableAppLock, hasPin, isLocked, isReady, setPin, toggleAppLock, toggleBiometric, unlockWithBiometrics, unlockWithPin]);

    return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
};

export const useAppLock = () => {
    const context = useContext(AppLockContext);
    if (!context) {
        throw new Error('useAppLock must be used within an AppLockProvider');
    }
    return context;
};
