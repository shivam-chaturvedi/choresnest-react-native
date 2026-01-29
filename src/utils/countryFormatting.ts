import { CountryConfiguration } from '../config/countries';

/**
 * Format a numeric value as currency using the provided country's locale and currency code.
 */
export const formatCurrency = (value: number, country: CountryConfiguration): string => {
    return new Intl.NumberFormat(country.locale, {
        style: 'currency',
        currency: country.currencyCode,
        maximumFractionDigits: 2,
    }).format(value);
};

/**
 * Format a date/time string or Date instance using the country's locale and timezone.
 */
export const formatDateTime = (
    value: Date | string | number,
    country: CountryConfiguration,
    options?: Intl.DateTimeFormatOptions
): string => {
    const target = typeof value === 'number' ? new Date(value) : new Date(value);
    return new Intl.DateTimeFormat(country.locale, {
        timeZone: country.timeZone,
        ...options,
    }).format(target);
};
