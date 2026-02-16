export type TableChangeSet = {
    created: any[];
    updated: any[];
    deleted: string[];
};

export type TableFetchDescriptor = {
    key: string;
    fetcher: () => Promise<TableChangeSet>;
};

export type ConflictSeverity = 'low' | 'medium' | 'high';
export type ConflictType =
    | 'create'
    | 'update'
    | 'delete'
    | 'merge'
    | 'schema_mismatch'
    | 'server_newer';
export type ConflictResolutionStrategy = 'reject' | 'merge' | 'manual';

export type ConflictRecord = {
    table: string;
    recordId: string;
    localVersion: number;
    serverVersion?: number;
    conflictingFields: string[];
    resolutionStrategy: ConflictResolutionStrategy;
    severity: ConflictSeverity;
    type: ConflictType;
    timestamp: number;
    resolved: boolean;
};

export type ConflictHook = (conflict: ConflictRecord) => void;

export type PullCursor = {
    updatedAt: string;
};

export type PullCursorEngineOptions = {
    table: string;
    remoteTable?: string;
    userId: string;
    lastPulled: string;
    selectFields?: string;
    hasProfileId?: boolean;
    pageSize?: number;
    maxRecords?: number;
    lastCursor?: PullCursor;
};

export type PullCursorResult = {
    rows: any[];
    totalFetched: number;
    nextCursor: PullCursor;
};

export type BackoffFailureType =
    | 'network'
    | 'server'
    | 'rateLimit'
    | 'auth'
    | 'rls'
    | 'validation'
    | 'schema_mismatch'
    | 'concurrency'
    | 'duplicate_create'
    | 'unknown';

export type BackoffStatus = {
    canSync: boolean;
    nextAttemptAt: number;
};
