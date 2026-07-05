import { getDatabase } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { TableChangeSet } from './types';
import {
    buildRemoteRecordPayload,
    finalizeProfileScopedPayload,
    pickRemotePayload,
    TABLE_FIELD_MAPPINGS,
} from './SyncPayloadUtils';
import { isUuid } from '../../utils/uuid';

const GLOBAL_FIELD_MAPPINGS: Record<string, string> = {
    profileId: 'profile_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
};

export const coerceTimestamp = (value: string | number | Date | undefined | null): number => {
    if (value === undefined || value === null) {
        return 0;
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
        return 0;
    }
    if (value instanceof Date) {
        return value.getTime();
    }
    return 0;
};

export const dedupeById = (rows: any[]): any[] => {
    const map = new Map<string, any>();
    for (const row of rows) {
        if (!row || !row.id) {
            continue;
        }
        const existing = map.get(row.id);
        if (!existing) {
            map.set(row.id, row);
            continue;
        }
        const incomingTs = coerceTimestamp(row.updated_at ?? row.updatedAt);
        const existingTs = coerceTimestamp(existing.updated_at ?? existing.updatedAt);
        if (incomingTs >= existingTs) {
            map.set(row.id, row);
        }
    }
    return Array.from(map.values());
};

const safeWarn = (...args: any[]) => {
    console.warn(...args);
};

const stripActiveFlags = (row: any): void => {
    delete row.is_active;
    delete row.isActive;
};

const attachLocalActiveDefault = (row: any): void => {
    row.isActive = false;
    row.is_active = false;
};

export const classifyPullRows = async (table: string, rows: any[], lastPulledDate: Date): Promise<TableChangeSet> => {
    const created: any[] = [];
    const updated: any[] = [];
    const deleted: string[] = [];
    const uniqueRows = dedupeById(rows);

    const validIncomingRows = uniqueRows.filter((row) => {
        if (!row?.id) return false;
        if (row.deleted === true) {
            deleted.push(row.id);
            return false;
        }

        const createdAtValue = row.created_at ?? row.createdAt;
        if (!createdAtValue) {
            safeWarn(`Record ${row.id} in ${table} missing created_at, skipping`);
            return false;
        }
        const createdAt = new Date(createdAtValue);
        if (Number.isNaN(createdAt.getTime())) {
            safeWarn(`Record ${row.id} in ${table} has invalid created_at format, skipping`);
            return false;
        }
        row.__parsedCreatedAt = createdAt;
        return true;
    });

    if (validIncomingRows.length === 0) {
        return { created, updated, deleted };
    }

    const incomingIds = validIncomingRows.map(r => r.id);
    const existingIds = new Set<string>();

    try {
        const watermelonTable = getDatabase().get(table);
        // SQLite has a limit of 999 variables per query. Chunk IDs into smaller batches.
        const chunkArray = <T>(arr: T[], size: number): T[][] =>
            Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
                arr.slice(i * size, i * size + size)
            );

        for (const idChunk of chunkArray(incomingIds, 500)) {
            const existingRecords = await watermelonTable.query(Q.where('id', Q.oneOf(idChunk))).fetch();
            existingRecords.forEach(r => existingIds.add(r.id));
        }
    } catch (e) {
        safeWarn(`classifyPullRows: Failed to query existing records for table ${table}. Error:`, e);
    }

    validIncomingRows.forEach(row => {
        delete row.__parsedCreatedAt;
        const isExisting = existingIds.has(row.id);
        const sanitizedRow = { ...row };
        stripActiveFlags(sanitizedRow);
        if (!isExisting) {
            attachLocalActiveDefault(sanitizedRow);
        }

        if (isExisting) {
            // Record ALREADY exists on this device → update it in place without toggling active flag.
            updated.push(sanitizedRow);
        } else {
            // Record is NOT on this device yet, regardless of its created_at.
            // It may have been written by another device before lastPulledAt
            // (e.g. settings written during initial onboarding on another phone).
            // Always put it in `created` so WatermelonDB can insert it.
            created.push(sanitizedRow);
        }
    });

    return { created, updated, deleted };
};

const ensureIsoTimestamp = (value: any): string | null => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    return null;
};

const normalizePurchasedAt = (value: any): number | null => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    if (value instanceof Date) {
        return value.getTime();
    }
    const coerced = Number(value);
    return Number.isNaN(coerced) ? null : coerced;
};

export const mapLocalFieldToServer = (table: string, field: string): string => {
    const mappings = {
        ...GLOBAL_FIELD_MAPPINGS,
        ...(TABLE_FIELD_MAPPINGS[table] ?? {}),
    };
    return mappings[field] ?? field;
};

const coerceVersion = (value: any): number => {
    if (value === undefined || value === null) {
        return 0;
    }
    if (typeof value === 'number') {
        return value;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};

export const transformRecordForSupabase = (
    table: string,
    record: any,
    userId: string,
    addProfileId: boolean,
    changedFields: string[] = [],
    remoteTable?: string,
): { payload: Record<string, any>; changedFields: string[]; localVersion: number } => {
    const targetRemoteTable = remoteTable ?? table;

    if (table === 'users') {
        const localVersion = coerceVersion(record.version ?? 0);
        const payload = buildRemoteRecordPayload(
            'users',
            targetRemoteTable,
            record,
            userId,
            false,
        );
        return {
            payload,
            changedFields,
            localVersion,
        };
    }

    let transformed = buildRemoteRecordPayload(
        table,
        targetRemoteTable,
        record,
        userId,
        addProfileId,
    );

    if (table === 'notes' && transformed.blocks_json !== undefined) {
        if (Array.isArray(transformed.blocks_json)) {
            transformed.blocks_json = JSON.stringify(transformed.blocks_json);
        } else if (typeof transformed.blocks_json !== 'string') {
            try {
                transformed.blocks_json = JSON.stringify(transformed.blocks_json ?? []);
            } catch (jsonError) {
                console.warn('Failed to stringify note blocks before pushing to Supabase:', jsonError);
                transformed.blocks_json = '[]';
            }
        }
    }

    if (table === 'documents') {
        if (transformed.meta_json === undefined && record.meta !== undefined) {
            transformed.meta_json = record.meta;
        }
        if (transformed.meta_json !== undefined && typeof transformed.meta_json !== 'string') {
            try {
                transformed.meta_json = JSON.stringify(transformed.meta_json ?? {});
            } catch (jsonMetaError) {
                console.warn('Failed to stringify document meta_json for Supabase push:', jsonMetaError);
                transformed.meta_json = JSON.stringify({});
            }
        }
    }

    const now = new Date().toISOString();
    const normalizedUpdatedAt =
        ensureIsoTimestamp(record.updated_at ?? record.updatedAt) ?? now;
    const normalizedCreatedAt =
        ensureIsoTimestamp(record.created_at ?? record.createdAt) ??
        normalizedUpdatedAt ??
        now;

    transformed.updated_at = normalizedUpdatedAt;
    transformed.created_at = normalizedCreatedAt;

    if (table === 'list_items') {
        transformed.purchased_at = normalizePurchasedAt(
            transformed.purchased_at ?? record.purchasedAt,
        );
    }

    const localVersion = coerceVersion(record.version ?? transformed.version ?? 0);
    transformed.version = localVersion;

    if (table === 'members') {
        changedFields = changedFields.filter(
            field => field !== 'is_active' && field !== 'isActive',
        );
    }

    if (addProfileId && isUuid(userId)) {
        transformed.profile_id = userId;
    }

    transformed = pickRemotePayload(table, targetRemoteTable, transformed);
    const finalized = finalizeProfileScopedPayload(
        table,
        targetRemoteTable,
        transformed,
        userId,
        addProfileId,
    );
    if (!finalized) {
        return {
            payload: {},
            changedFields,
            localVersion,
        };
    }

    return {
        payload: finalized,
        changedFields,
        localVersion,
    };
};

export const isValidRecordForTable = (record: any, table: string): boolean => {
    if (!record?.id) {
        return false;
    }
    if (record.id === 'guest' || record.profile_id === 'guest' || record.profileId === 'guest') {
        safeWarn(`[TransformationEngine] Skipping guest record ${record.id} in ${table} - guest data is local only`);
        return false;
    }
    if (table === 'list_items' && (!record.list_id || String(record.list_id).trim() === '')) {
        safeWarn(`Skipping invalid list_items record ${record.id} (empty or missing list_id)`);
        return false;
    }
    return true;
};
