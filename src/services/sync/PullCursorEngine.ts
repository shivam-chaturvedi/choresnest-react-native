import Config from 'react-native-config';
import { supabase } from '../../config/supabase';
import { classifyPullRows } from './TransformationEngine';
import { recordConflict } from './ConflictEngine';
import { SYNC_TABLES } from './TableRegistry';
import { PullCursor, PullCursorEngineOptions, TableChangeSet } from './types';

const SYNC_PAGE_SIZE = Math.min(1000, Math.max(50, Number.parseInt(Config.SUPABASE_SYNC_PAGE_SIZE ?? '250', 10)));
const MAX_PULL_RECORDS = Number.parseInt(Config.SUPABASE_SYNC_MAX_PULL_RECORDS ?? '5000', 10);
const LOG_INDEX_HINT = Config.LOG_SYNC_INDEX_HINTS ? Config.LOG_SYNC_INDEX_HINTS.toLowerCase() : 'true';
const LOG_SYNC_NETWORK =
    Config.LOG_SYNC_NETWORK && Config.LOG_SYNC_NETWORK.toLowerCase() === 'false'
        ? false
        : true;

const logPullDebug = (message: string, details?: Record<string, unknown>): void => {
    if (!LOG_SYNC_NETWORK) {
        return;
    }
    console.log(`[Sync][Pull] ${message}`, details ?? {});
};
let hasLoggedIndexHint = false;

const logIndexHint = () => {
  if (hasLoggedIndexHint || LOG_INDEX_HINT === 'false') {
    return;
  }
  hasLoggedIndexHint = true;
  const tableList = SYNC_TABLES.map(config => config.remoteTable ?? config.key).join(', ');
  console.warn(
    `Sync performance improves when Supabase tables (${tableList}) index profile_id and updated_at; please add those indexes for cursor stability.`
  );
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

const parseUpdatedAtMs = (value: any): number => {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  return 0;
};

const getRecordId = (row: unknown): string | undefined => {
  if (!row || typeof row !== 'object') {
    return undefined;
  }
  const typedRow = row as Record<string, unknown>;
  if (typeof typedRow.id === 'string') {
    return typedRow.id;
  }
  if (typeof typedRow.document_id === 'string') {
    return typedRow.document_id;
  }
  if (typeof typedRow.uuid === 'string') {
    return typedRow.uuid;
  }
  return undefined;
};

const recordSchemaMismatch = (table: string, targetTable: string, row: unknown) => {
  recordConflict({
    table,
    recordId: getRecordId(row) ?? targetTable,
    localVersion: 0,
    serverVersion: undefined,
    conflictingFields: ['updated_at'],
    resolutionStrategy: 'manual',
    severity: 'high',
    type: 'schema_mismatch',
  });
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
    const defaultCursorId = `${targetTable}-init`;
    let cursor: PullCursor = opts.lastCursor ?? { updatedAt: normalizedLastPulled, id: defaultCursorId };
    let totalFetched = 0;
    let latestUpdatedAtMs = 0;
    let pageIndex = 0;

    logPullDebug('Starting pull loop', {
        table: targetTable,
        lastPulled: normalizedLastPulled,
        pageSize,
        maxRecords,
        hasProfileId,
    });

    while (totalFetched < maxRecords) {
        pageIndex += 1;
        logPullDebug('Query iteration', {
            table: targetTable,
            pageIndex,
            cursor,
            pageSize,
            totalFetched,
        });
        let query: any = supabase.from(targetTable).select(selectFields);
    if (hasProfileId) {
      query = query.eq('profile_id', userId);
    }
    const { data, error } = await query
      .gt('updated_at', cursor.updatedAt)
      .order('updated_at', { ascending: true })
      .limit(pageSize);

    if (error) {
      logPullDebug('Supabase query error', {
          table: targetTable,
          pageIndex,
          cursor,
          pageSize,
          error: {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              status: error.status,
          },
      });
      throw error;
    }
    if (!data || data.length === 0) {
      logPullDebug('No rows returned from Supabase (cursor unchanged)', {
          table: targetTable,
          pageIndex,
          cursor,
          totalFetched,
      });
      break;
    }

    rows.push(...data);
    totalFetched += data.length;
    logPullDebug('Received rows from Supabase', {
        table: targetTable,
        pageIndex,
        rowsFetched: data.length,
        totalFetched,
        lastRow: getRecordId(data[data.length - 1]),
    });

    data.forEach((row: any) => {
      const rawUpdatedAt = row.updated_at ?? row.updatedAt;
      const updatedAtMs = parseUpdatedAtMs(rawUpdatedAt);
      if (updatedAtMs > latestUpdatedAtMs) {
        latestUpdatedAtMs = updatedAtMs;
      }
    });

    const lastRow = data[data.length - 1];
    const lastUpdatedAt = normalizeUpdatedAtValue(lastRow.updated_at ?? lastRow.updatedAt);
    if (!lastUpdatedAt) {
      recordSchemaMismatch(table, targetTable, lastRow);
      break;
    }

    const nextCursorId = getRecordId(lastRow);
    if (!nextCursorId) {
      recordSchemaMismatch(table, targetTable, lastRow);
      break;
    }

    cursor = {
      updatedAt: lastUpdatedAt,
      id: nextCursorId,
    };

    if (data.length < pageSize) {
      break;
    }
  }

  if (totalFetched >= maxRecords) {
    console.warn(`Reached max pull limit (${maxRecords}) for ${table}; results may be partial.`);
  }

  const lastPulledDate = new Date(normalizedLastPulled);
  const changeSet = await classifyPullRows(table, rows, lastPulledDate);
  return {
    ...changeSet,
    latestUpdatedAt: latestUpdatedAtMs,
  };
};
