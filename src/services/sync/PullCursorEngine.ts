import Config from 'react-native-config';
import { supabase } from '../../config/supabase';
import { classifyPullRows } from './TransformationEngine';
import { recordConflict } from './ConflictEngine';
import { SYNC_TABLES } from './TableRegistry';
import { PullCursor, PullCursorEngineOptions, TableChangeSet } from './types';

const SYNC_PAGE_SIZE = Math.min(1000, Math.max(50, Number.parseInt(Config.SUPABASE_SYNC_PAGE_SIZE ?? '250', 10)));
const MAX_PULL_RECORDS = Number.parseInt(Config.SUPABASE_SYNC_MAX_PULL_RECORDS ?? '5000', 10);
const LOG_INDEX_HINT = Config.LOG_SYNC_INDEX_HINTS ? Config.LOG_SYNC_INDEX_HINTS.toLowerCase() : 'true';
let hasLoggedIndexHint = false;

const logIndexHint = () => {
    if (hasLoggedIndexHint || LOG_INDEX_HINT === 'false') {
        return;
    }
    hasLoggedIndexHint = true;
    const tableList = SYNC_TABLES.map(config => config.remoteTable ?? config.key).join(', ');
    console.warn(`Sync performance improves when Supabase tables (${tableList}) index profile_id, updated_at, id; please add those indexes for cursor stability.`);
};

const normalizeUpdatedAtValue = (value: any): string => {
    if (!value) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const isAfterCursor = (row: any, cursor: PullCursor): boolean => {
    if (!row) {
        return false;
    }
    const updatedAt = normalizeUpdatedAtValue(row.updated_at ?? row.updatedAt);
    if (!updatedAt) {
        return true;
    }
    if (updatedAt > cursor.updatedAt) {
        return true;
    }
    if (updatedAt === cursor.updatedAt) {
        const rowId = row.id ?? '';
        return rowId > cursor.id;
    }
    return false;
};

const buildCursor = (row: any, fallback: PullCursor): PullCursor => {
    if (!row) {
        return fallback;
    }
    const updatedAt = normalizeUpdatedAtValue(row.updated_at ?? row.updatedAt) || fallback.updatedAt;
    const id = row.id ?? fallback.id;
    return { updatedAt, id };
};

export const pullTableChangesWithCursor = async (opts: PullCursorEngineOptions): Promise<TableChangeSet> => {
    logIndexHint();

    const {
        table,
        remoteTable,
        userId,
        lastPulled,
        hasProfileId = true,
        selectFields = '*',
        pageSize = SYNC_PAGE_SIZE,
        maxRecords = MAX_PULL_RECORDS,
    } = opts;

    const targetTable = remoteTable ?? table;
    const normalizedLastPulled = lastPulled ? new Date(lastPulled).toISOString() : new Date(0).toISOString();
    const rows: any[] = [];
    let cursor: PullCursor = opts.lastCursor ?? { updatedAt: normalizedLastPulled, id: '' };
    let totalFetched = 0;
    let previousCursorKey = '';
    const advanceCursor = (nextCursor: PullCursor): boolean => {
        const key = `${nextCursor.updatedAt}:${nextCursor.id}`;
        if (!previousCursorKey) {
            previousCursorKey = key;
            cursor = nextCursor;
            return true;
        }
        if (key === previousCursorKey) {
            console.warn(`Cursor for ${table} is stuck at ${key}; stopping pagination to avoid infinite loop.`);
            return false;
        }
        previousCursorKey = key;
        cursor = nextCursor;
        return true;
    };

    while (totalFetched < maxRecords) {
        let query: any = supabase.from(targetTable).select(selectFields);
        if (hasProfileId) {
            query = query.eq('profile_id', userId);
        }
        query = query
            .gte('updated_at', cursor.updatedAt)
            .order('updated_at', { ascending: true })
            .order('id', { ascending: true })
            .range(0, pageSize - 1);

        const { data, error } = await query;
        if (error) {
            throw error;
        }
        if (!data || data.length === 0) {
            break;
        }

        const window = data.filter((row: any) => isAfterCursor(row, cursor));
        const schemaSafeWindow: any[] = [];
        window.forEach((row: any) => {
            const normalized: string = normalizeUpdatedAtValue(row.updated_at ?? row.updatedAt);
            if (!normalized) {
            recordConflict({
                table: table,
                recordId: row.id ?? targetTable,
                localVersion: 0,
                serverVersion: undefined,
                conflictingFields: ['updated_at'],
                resolutionStrategy: 'manual',
                severity: 'high',
                type: 'schema_mismatch',
            });
            return;
            }
            schemaSafeWindow.push(row);
        });

        if (window.length === 0) {
            const nextCursor = buildCursor(data[data.length - 1], cursor);
            if (!advanceCursor(nextCursor)) {
                break;
            }
            continue;
        }

        if (schemaSafeWindow.length === 0) {
            const nextCursor = buildCursor(window[window.length - 1], cursor);
            if (!advanceCursor(nextCursor)) {
                break;
            }
            continue;
        }

        rows.push(...schemaSafeWindow);
        totalFetched += schemaSafeWindow.length;
        const nextCursor = buildCursor(schemaSafeWindow[schemaSafeWindow.length - 1], cursor);
        if (!advanceCursor(nextCursor)) {
            break;
        }

        if (window.length < pageSize) {
            break;
        }
    }

    if (totalFetched >= maxRecords) {
        console.warn(`Reached max pull limit (${maxRecords}) for ${table}; results may be partial.`);
    }

    const lastPulledDate = new Date(normalizedLastPulled);
    return classifyPullRows(table, rows, lastPulledDate);
};

// Acceptance Checklist:
// - Simulate a row without updated_at on Device A; PullCursorEngine should record a schema_mismatch conflict and skip it, allowing pagination to finish without looping.
