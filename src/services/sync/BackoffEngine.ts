import { BackoffFailureType, BackoffStatus } from './types';

const BASE_DELAY = 2000;
const MAX_DELAY = 5 * 60 * 1000;
const MAX_MULTIPLIER = 6;

let multiplier = 0;
let nextAllowedSync = 0;

const shouldBackoff = (failureType: BackoffFailureType): boolean => {
    return !['concurrency', 'duplicate_create'].includes(failureType);
};

export const canSync = (): boolean => {
    return Date.now() >= nextAllowedSync;
};

export const getNextSyncAllowedAt = (): number => nextAllowedSync;

export const resetBackoff = (): void => {
    multiplier = 0;
    nextAllowedSync = 0;
};

export const recordSuccess = (): void => {
    multiplier = 0;
    nextAllowedSync = 0;
};

export const recordFailure = (failureType: BackoffFailureType = 'unknown'): void => {
    if (!shouldBackoff(failureType)) {
        return;
    }
    multiplier = Math.min(multiplier + 1, MAX_MULTIPLIER);
    const base = Math.min(BASE_DELAY * Math.pow(2, multiplier), MAX_DELAY);
    const jitter = base * 0.4 * Math.random();
    const delay = Math.min(base + jitter, MAX_DELAY);
    nextAllowedSync = Date.now() + delay;
};

export const getBackoffStatus = (): BackoffStatus => ({
    canSync: canSync(),
    nextAttemptAt: nextAllowedSync,
});
