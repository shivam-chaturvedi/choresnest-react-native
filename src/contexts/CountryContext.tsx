import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from 'react';
import { CountryConfiguration } from '../config/countries';
import { CountryPreferenceService } from '../services/CountryPreferenceService';
import { NotificationScheduler } from '../services/NotificationScheduler';
import { formatCurrency, formatDateTime } from '../utils/countryFormatting';

interface CountryContextValue {
    currentCountry: CountryConfiguration;
    setCountry: (code: string) => Promise<void>;
    formatCurrency: (value: number) => string;
    formatDateTime: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
}

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

export const CountryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentCountry, setCurrentCountry] = useState<CountryConfiguration>(
        CountryPreferenceService.getCurrentCountry()
    );

    useEffect(() => {
        CountryPreferenceService.loadPreferences();
        const unsubscribe = CountryPreferenceService.subscribe(config => {
            setCurrentCountry(config);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const handleSetCountry = useCallback(async (code: string) => {
        await CountryPreferenceService.setCountry(code);
        setCurrentCountry(CountryPreferenceService.getCurrentCountry());
    }, []);

    useEffect(() => {
        NotificationScheduler.rescheduleAllMissing().catch(error => {
            console.warn('Failed to reschedule vault notifications after country change:', error);
        });
    }, [currentCountry.code]);

    const value = useMemo<CountryContextValue>(() => ({
        currentCountry,
        setCountry: handleSetCountry,
        formatCurrency: value => formatCurrency(value, currentCountry),
        formatDateTime: (value, options) => formatDateTime(value, currentCountry, options),
    }), [currentCountry, handleSetCountry]);

    return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
};

export const useCountry = () => {
    const context = useContext(CountryContext);
    if (!context) {
        throw new Error('useCountry must be used within a CountryProvider');
    }
    return context;
};
