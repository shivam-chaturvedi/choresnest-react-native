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
  console.warn(
    `Sync performance improves when Supabase tables (${tableList}) index profile_id, updated_at, id; please add those indexes for cursor stability.`
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

const getRecordId = (row: unknown): string | undefined => {
  if (!row || typeof row !== 'object') {
    return undefined;
  }
  return (row as { id?: string }).id;
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
  let cursor: PullCursor = opts.lastCursor ?? { updatedAt: normalizedLastPulled };
  let totalFetched = 0;

  while (totalFetched < maxRecords) {
    let query: any = supabase.from(targetTable).select(selectFields);
    if (hasProfileId) {
      query = query.eq('profile_id', userId);
    }
    const { data, error } = await query
      .gt('updated_at', cursor.updatedAt)
      .order('updated_at', { ascending: true })
      .limit(pageSize);

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }

    let lastCursorAt: string | undefined;
    for (const row of data) {
      if (totalFetched >= maxRecords) {
        break;
      }
      const normalized = normalizeUpdatedAtValue(row.updated_at ?? row.updatedAt);
      if (!normalized) {
        recordSchemaMismatch(table, targetTable, row);
        continue;
      }
      rows.push(row);
      lastCursorAt = normalized;
      totalFetched += 1;
    }

    if (!lastCursorAt) {
      break;
    }

    cursor = { updatedAt: lastCursorAt };

    if (totalFetched >= maxRecords) {
      break;
    }

    if (data.length < pageSize) {
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
