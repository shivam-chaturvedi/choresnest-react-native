import { ConflictHook, ConflictRecord } from './types';

const MAX_CONFLICT_HISTORY = 200;

let conflictHistory: ConflictRecord[] = [];
const conflictHooks = new Set<ConflictHook>();

export const recordConflict = (conflict: Omit<ConflictRecord, 'timestamp' | 'resolved'>): ConflictRecord => {
    const entry: ConflictRecord = {
        ...conflict,
        timestamp: Date.now(),
        resolved: false,
    };
    console.warn(`Sync conflict (${entry.severity}): ${entry.table} - ${entry.type} @ ${entry.recordId}`);
    conflictHistory.push(entry);
    if (conflictHistory.length > MAX_CONFLICT_HISTORY) {
        conflictHistory.shift();
    }
    conflictHooks.forEach(hook => {
        try {
            hook(entry);
        } catch {}
    });
    return entry;
};

export const getConflictHistory = (opts?: { unresolvedOnly?: boolean }): ConflictRecord[] => {
    const entries = opts?.unresolvedOnly
        ? conflictHistory.filter(entry => !entry.resolved)
        : conflictHistory;
    return [...entries].reverse();
};

export const clearConflictHistory = (): void => {
    conflictHistory = [];
};

export const markConflictResolved = (recordId: string, table?: string): void => {
    conflictHistory = conflictHistory.map(entry => {
        if (entry.recordId === recordId && (!table || entry.table === table)) {
            return { ...entry, resolved: true };
        }
        return entry;
    });
};

export const onConflictLogged = (hook: ConflictHook): () => void => {
    conflictHooks.add(hook);
    return () => {
        conflictHooks.delete(hook);
    };
};
