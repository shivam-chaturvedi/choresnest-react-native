export interface CountryConfiguration {
    code: string;
    name: string;
    currencyCode: string;
    currencySymbol: string;
    timeZone: string;
    locale: string;
    flag: string;
    marketShare?: string;
    notes?: string;
}

export const DEFAULT_COUNTRY_CODE = 'US';

export const COUNTRY_CONFIG: Record<string, CountryConfiguration> = {
    US: {
        code: 'US',
        name: 'United States',
        currencyCode: 'USD',
        currencySymbol: '$',
        timeZone: 'America/New_York',
        locale: 'en-US',
        flag: '🇺🇸',
        marketShare: '77%',
        notes: 'Strong downloads + largest user base.',
    },
    GB: {
        code: 'GB',
        name: 'United Kingdom',
        currencyCode: 'GBP',
        currencySymbol: '£',
        timeZone: 'Europe/London',
        locale: 'en-GB',
        flag: '🇬🇧',
        marketShare: '6%',
        notes: 'Mature smartphone market with high spending.',
    },
    CA: {
        code: 'CA',
        name: 'Canada',
        currencyCode: 'CAD',
        currencySymbol: '$',
        timeZone: 'America/Toronto',
        locale: 'en-CA',
        flag: '🇨🇦',
        marketShare: '4%',
        notes: 'High mobile usage and productivity adoption.',
    },
    AU: {
        code: 'AU',
        name: 'Australia',
        currencyCode: 'AUD',
        currencySymbol: '$',
        timeZone: 'Australia/Sydney',
        locale: 'en-AU',
        flag: '🇦🇺',
        marketShare: '4%',
        notes: 'Strong downloads and healthy mobile audience.',
    },
    BR: {
        code: 'BR',
        name: 'Brazil',
        currencyCode: 'BRL',
        currencySymbol: 'R$',
        timeZone: 'America/Sao_Paulo',
        locale: 'pt-BR',
        flag: '🇧🇷',
        notes: 'Heavy mobile downloads and large user base.',
    },
    IN: {
        code: 'IN',
        name: 'India',
        currencyCode: 'INR',
        currencySymbol: '₹',
        timeZone: 'Asia/Kolkata',
        locale: 'en-IN',
        flag: '🇮🇳',
        notes: 'Rapidly growing mobile downloads.',
    },
    ID: {
        code: 'ID',
        name: 'Indonesia',
        currencyCode: 'IDR',
        currencySymbol: 'Rp',
        timeZone: 'Asia/Jakarta',
        locale: 'id-ID',
        flag: '🇮🇩',
        notes: 'Top Android downloads with fast-growing audience.',
    },
    MX: {
        code: 'MX',
        name: 'Mexico',
        currencyCode: 'MXN',
        currencySymbol: '$',
        timeZone: 'America/Mexico_City',
        locale: 'es-MX',
        flag: '🇲🇽',
        notes: 'Fast mobile adoption and significant downloads.',
    },
    CN: {
        code: 'CN',
        name: 'China',
        currencyCode: 'CNY',
        currencySymbol: '¥',
        timeZone: 'Asia/Shanghai',
        locale: 'zh-CN',
        flag: '🇨🇳',
        notes: 'Largest smartphone population (Play Store considerations).',
    },
    PH: {
        code: 'PH',
        name: 'Philippines',
        currencyCode: 'PHP',
        currencySymbol: '₱',
        timeZone: 'Asia/Manila',
        locale: 'en-PH',
        flag: '🇵🇭',
        notes: 'High engagement with growing mobile usage.',
    },
    TR: {
        code: 'TR',
        name: 'Turkey',
        currencyCode: 'TRY',
        currencySymbol: '₺',
        timeZone: 'Europe/Istanbul',
        locale: 'tr-TR',
        flag: '🇹🇷',
        notes: 'Emerging market with strong presence.',
    },
    DE: {
        code: 'DE',
        name: 'Germany',
        currencyCode: 'EUR',
        currencySymbol: '€',
        timeZone: 'Europe/Berlin',
        locale: 'de-DE',
        flag: '🇩🇪',
        notes: 'Stable market with high monetization.',
    },
    JP: {
        code: 'JP',
        name: 'Japan',
        currencyCode: 'JPY',
        currencySymbol: '¥',
        timeZone: 'Asia/Tokyo',
        locale: 'ja-JP',
        flag: '🇯🇵',
        notes: 'Large iOS base and high spending.',
    },
    KR: {
        code: 'KR',
        name: 'South Korea',
        currencyCode: 'KRW',
        currencySymbol: '₩',
        timeZone: 'Asia/Seoul',
        locale: 'ko-KR',
        flag: '🇰🇷',
        notes: 'High engagement and tech-forward users.',
    },
};

export const getCountryConfig = (code: string): CountryConfiguration => {
    return COUNTRY_CONFIG[code] ?? COUNTRY_CONFIG[DEFAULT_COUNTRY_CODE];
};

export const listCountries = (): CountryConfiguration[] => Object.values(COUNTRY_CONFIG);

export const isSupportedCountry = (code: string): boolean =>
    Object.prototype.hasOwnProperty.call(COUNTRY_CONFIG, code);
