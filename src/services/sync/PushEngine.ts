import Config from 'react-native-config';
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from '../../database';
import {
  isValidRecordForTable,
  mapLocalFieldToServer,
  transformRecordForSupabase,
} from './TransformationEngine';
import { stripToRemoteColumns } from './SyncPayloadUtils';
import { isUuid } from '../../utils/uuid';
import { recordConflict } from './ConflictEngine';
import { ConflictSeverity, ConflictType, TableChangeSet } from './types';
import { supabase } from '../../config/supabase';

const SYNC_UPSERT_BATCH_SIZE = Number.parseInt(
  Config.SUPABASE_SYNC_UPSERT_BATCH ?? '100',
  10,
);
const SYNC_DELETE_BATCH_SIZE = Number.parseInt(
  Config.SUPABASE_SYNC_DELETE_BATCH ?? '100',
  10,
);
const FETCH_CHUNK_SIZE = 200;
const LOG_SYNC_NETWORK =
  Config.LOG_SYNC_NETWORK && Config.LOG_SYNC_NETWORK.toLowerCase() === 'false'
    ? false
    : true;

const logPushDebug = (
  message: string,
  details?: Record<string, unknown>,
): void => {
  if (!LOG_SYNC_NETWORK) {
    return;
  }
  console.log(`[Sync][Push] ${message}`, details ?? {});
};

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const IGNORED_FIELDS = new Set([
  'updated_at',
  'created_at',
  'version',
  'deleted',
  'deleted_at',
]);

const mapChangedFields = (table: string, record: any): string[] => {
  const rawFields: string[] = Array.isArray(record._changed)
    ? record._changed
    : Object.keys(record).filter(key => !key.startsWith('_'));

  return Array.from(
    new Set(
      rawFields
        .filter(field => !IGNORED_FIELDS.has(field))
        .map(field => mapLocalFieldToServer(table, field)),
    ),
  );
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

/** Pure helper: whether a local soft-delete should be pushed to Supabase. */
export const shouldPushSoftDelete = (
  id: string,
  serverRows: Map<string, { version?: number | string | null }>,
  localVersion: number,
): boolean => {
  if (!serverRows.has(id)) {
    return false;
  }
  const serverVersion = coerceVersion(serverRows.get(id)?.version);
  return serverVersion < localVersion;
};

/** Pure helper: soft-delete upsert rows that include profile_id when scoped. */
export const buildSoftDeleteUpsertRows = (
  ids: string[],
  versions: Map<string, number>,
  userId: string,
  addProfileId: boolean,
  nowIso: string = new Date().toISOString(),
): Record<string, any>[] =>
  ids.map(id => {
    const base: Record<string, any> = {
      id,
      deleted: true,
      version: Math.max(versions.get(id) ?? 0, 1),
      updated_at: nowIso,
    };
    if (addProfileId && isUuid(userId)) {
      base.profile_id = userId;
    }
    return base;
  });

class SchemaMismatchError extends Error {
  constructor(public readonly table: string, message: string) {
    super(message);
  }
}

const isVersionMissingError = (error: any): boolean => {
  const message = (error?.message ?? '').toString().toLowerCase();
  return (
    message.includes("could not find the 'version' column") ||
    error?.code === 'PGRST204'
  );
};

const determineSeverity = (type: ConflictType): ConflictSeverity => {
  if (type === 'delete' || type === 'server_newer') {
    return 'medium';
  }
  return 'high';
};

const buildConflictPayload = (
  table: string,
  recordId: string,
  localVersion: number,
  serverVersion: number,
  conflictingFields: string[],
  type: ConflictType,
) =>
  recordConflict({
    table,
    recordId,
    localVersion,
    serverVersion,
    conflictingFields,
    resolutionStrategy: 'manual',
    severity: determineSeverity(type),
    type,
  });

const fetchServerRows = async (
  table: string,
  ids: string[],
): Promise<Map<string, any>> => {
  const serverMap = new Map<string, any>();
  if (ids.length === 0) {
    return serverMap;
  }

  const idChunks = chunkArray(ids, FETCH_CHUNK_SIZE);
  for (const chunk of idChunks) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .in('id', chunk);
      if (error) {
        if (isVersionMissingError(error)) {
          throw new SchemaMismatchError(
            table,
            error.message ?? error.toString(),
          );
        }
        console.error(`Failed to fetch server rows for ${table}:`, error);
        continue;
      }
      data?.forEach(row => {
        if (row?.id) {
          serverMap.set(row.id, row);
        }
      });
    } catch (err) {
      if (err instanceof SchemaMismatchError) {
        throw err;
      }
      console.error(`Exception while fetching ${table} from Supabase:`, err);
    }
  }

  return serverMap;
};

const fetchLocalVersions = async (
  table: string,
  ids: string[],
): Promise<Map<string, number>> => {
  const versions = new Map<string, number>();
  if (ids.length === 0) {
    return versions;
  }
  try {
    const collection = getDatabase().collections.get(table);
    if (!collection) {
      return versions;
    }
    const rows = await collection.query(Q.where('id', Q.oneOf(ids))).fetch();
    rows.forEach((row: any) => {
      if (row?.id) {
        versions.set(row.id, coerceVersion(row.version));
      }
    });
  } catch (err) {
    console.warn(`Failed to read local versions for ${table}:`, err);
  }
  return versions;
};

const mergeWithServer = (
  _serverRow: any,
  payload: Record<string, any>,
): Record<string, any> => payload;

const sanitizeUpsertRecord = (
  table: string,
  remoteTable: string,
  record: Record<string, any>,
  userId: string,
  addProfileId: boolean,
): Record<string, any> => {
  const payload: Record<string, any> = { ...record };

  if (addProfileId && isUuid(userId)) {
    payload.profile_id = userId;
  } else if (payload.profile_id && !isUuid(payload.profile_id)) {
    delete payload.profile_id;
  }

  return stripToRemoteColumns(table, remoteTable, payload) as Record<
    string,
    any
  >;
};

const summarizeUpsertPayload = (records: Record<string, any>[]) =>
  records.map(record => ({
    keys: Object.keys(record),
    id: record.id,
    profile_id: record.profile_id,
    assignee_id: record.assignee_id,
    added_by_id: record.added_by_id,
    member_id: record.member_id,
    list_id: record.list_id,
  }));

const dedupeByConflictKey = (
  records: Record<string, any>[],
  conflictKey: string,
): Record<string, any>[] => {
  const trimmed = conflictKey
    .split(',')
    .map(field => field.trim())
    .filter(Boolean);
  if (trimmed.length === 0) {
    return records;
  }

  const seen = new Map<string, Record<string, any>>();
  records.forEach(record => {
    const key = trimmed.map(field => String(record[field] ?? '')).join('|');
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, record);
      return;
    }
    const existingVersion = coerceVersion(existing.version);
    const nextVersion = coerceVersion(record.version);
    if (nextVersion >= existingVersion) {
      seen.set(key, record);
    }
  });
  return Array.from(seen.values());
};

export const pushTableChanges = async ({
  table,
  remoteTable,
  tableChanges,
  userId,
  addProfileId = true,
  conflictKey = 'id',
}: {
  table: string;
  remoteTable?: string;
  tableChanges: TableChangeSet | undefined;
  userId: string;
  addProfileId?: boolean;
  /** Column(s) to use for ON CONFLICT in upsert. Defaults to 'id'. */
  conflictKey?: string;
}): Promise<{ success: boolean; errors: number }> => {
  if (!tableChanges) {
    return { success: true, errors: 0 };
  }

  const targetTable = remoteTable ?? table;
  const created = Array.isArray(tableChanges.created)
    ? tableChanges.created
    : [];
  const updated = Array.isArray(tableChanges.updated)
    ? tableChanges.updated
    : [];
  const deleted = Array.isArray(tableChanges.deleted)
    ? tableChanges.deleted
    : [];

  const candidateIds = new Set<string>();
  [...created, ...updated].forEach(record => {
    if (record?.id) {
      candidateIds.add(record.id);
    }
  });
  deleted.forEach(id => {
    if (id) {
      candidateIds.add(id);
    }
  });

  const idsArray = Array.from(candidateIds);
  let serverRows: Map<string, any>;
  logPushDebug('Preparing push batch', {
    table: targetTable,
    created: created.length,
    updated: updated.length,
    deleted: deleted.length,
    uniqueIds: idsArray.length,
  });
  try {
    serverRows = await fetchServerRows(targetTable, idsArray);
  } catch (err) {
    if (err instanceof SchemaMismatchError) {
      recordConflict({
        table,
        recordId: targetTable,
        localVersion: 0,
        serverVersion: undefined,
        conflictingFields: ['version'],
        resolutionStrategy: 'manual',
        severity: 'high',
        type: 'schema_mismatch',
      });
      return { success: false, errors: 1 };
    }
    throw err;
  }

  const recordsToUpsert: any[] = [];
  let errors = 0;
  let conflictCount = 0;

  const prepareRecords = async (
    records: any[],
    type: ConflictType,
  ): Promise<void> => {
    for (const record of records) {
      if (!isValidRecordForTable(record, table)) {
        continue;
      }
      const changedFields = mapChangedFields(table, record);
      const { payload, localVersion } = transformRecordForSupabase(
        table,
        record,
        userId,
        addProfileId,
        changedFields,
        targetTable,
      );
      if (!payload?.id || Object.keys(payload).length === 0) {
        console.warn(
          `[PushEngine] Skipping ${table} record ${record.id} because payload sanitization removed it.`,
        );
        continue;
      }
      if (addProfileId && !isUuid(payload.profile_id)) {
        console.warn(
          `[PushEngine] Skipping ${table} record ${record.id} because profile_id is not a valid auth UUID.`,
        );
        continue;
      }
      const serverRow = serverRows.get(record.id);
      const serverVersion = coerceVersion(serverRow?.version);

      if (serverRow) {
        if (localVersion <= serverVersion) {
          console.warn(
            `[PushEngine] Skipping ${table} record ${record.id} because local version ${localVersion} <= server version ${serverVersion}.`,
          );
          if (localVersion < serverVersion) {
            buildConflictPayload(
              table,
              record.id,
              localVersion,
              serverVersion,
              ['version'],
              'server_newer',
            );
            conflictCount += 1;
          }
          continue;
        }
      }

      const merged = stripToRemoteColumns(table, targetTable, {
        ...mergeWithServer(serverRow, payload),
        version: localVersion > 0 ? localVersion : 1,
      }) as Record<string, any>;

      recordsToUpsert.push(merged);
    }
  };

  await prepareRecords(created, 'create');
  await prepareRecords(updated, 'update');

  const uniqueRecords = dedupeByConflictKey(recordsToUpsert, conflictKey);

  logPushDebug('Records ready to upsert', {
    table: targetTable,
    recordsToUpsert: uniqueRecords.length,
  });

  const upsertChunks = chunkArray(uniqueRecords, SYNC_UPSERT_BATCH_SIZE);
  for (const chunk of upsertChunks) {
    const sanitizedChunk = chunk.map(record =>
      sanitizeUpsertRecord(table, targetTable, record, userId, addProfileId),
    );
    try {
      const { error } = await supabase
        .from(targetTable)
        .upsert(sanitizedChunk, { onConflict: conflictKey });
      if (error) {
        console.error(
          `Failed to upsert ${targetTable} (${sanitizedChunk.length} records):`,
          error,
        );
        console.error(
          `[Sync][Push] Upsert payload summary for ${targetTable}:`,
          summarizeUpsertPayload(sanitizedChunk),
        );
        errors += sanitizedChunk.length;
      } else {
        logPushDebug('Upsert chunk succeeded', {
          table: targetTable,
          chunkSize: chunk.length,
          conflictKey,
        });
      }
    } catch (err) {
      if (isVersionMissingError(err)) {
        recordConflict({
          table,
          recordId: targetTable,
          localVersion: 0,
          serverVersion: undefined,
          conflictingFields: ['version'],
          resolutionStrategy: 'manual',
          severity: 'high',
          type: 'schema_mismatch',
        });
        return { success: false, errors: errors + chunk.length };
      }
      console.error(`Exception while upserting ${targetTable}:`, err);
      errors += chunk.length;
    }
  }

  const validDeletedIds = deleted.filter(
    id => typeof id === 'string' && id.trim() !== '' && id !== 'guest',
  );
  const localDeleteVersions = await fetchLocalVersions(table, validDeletedIds);

  const deletionsToApply = validDeletedIds.filter(id => {
    const localVersion = localDeleteVersions.get(id) ?? 0;
    if (!shouldPushSoftDelete(id, serverRows, localVersion)) {
      if (!serverRows.has(id)) {
        console.warn(
          `[PushEngine] Skipping delete for ${table} record ${id} because it does not exist on the server.`,
        );
      } else {
        const serverVersion = coerceVersion(serverRows.get(id)?.version);
        console.warn(
          `[PushEngine] Skipping delete for ${table} record ${id} because server version ${serverVersion} >= local version ${localVersion}.`,
        );
        if (serverVersion > localVersion) {
          buildConflictPayload(
            table,
            id,
            localVersion,
            serverVersion,
            ['version'],
            'server_newer',
          );
          conflictCount += 1;
        }
      }
      return false;
    }
    return true;
  });

  logPushDebug('Computed deletions to apply', {
    table: targetTable,
    validDeletedIds: validDeletedIds.length,
    deletionsToApply: deletionsToApply.length,
  });

  const deleteChunks = chunkArray(deletionsToApply, SYNC_DELETE_BATCH_SIZE);
  for (const chunk of deleteChunks) {
    try {
      const payload = buildSoftDeleteUpsertRows(
        chunk,
        localDeleteVersions,
        userId,
        addProfileId,
      );
      const { error } = await supabase
        .from(targetTable)
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error(
          `Failed to mark ${targetTable} deletions (${chunk.length} ids):`,
          error.code,
          error.message,
          error.details,
        );
        errors += chunk.length;
      } else {
        logPushDebug('Deletion chunk succeeded', {
          table: targetTable,
          chunkSize: chunk.length,
        });
      }
    } catch (err) {
      if (isVersionMissingError(err)) {
        recordConflict({
          table,
          recordId: targetTable,
          localVersion: 0,
          serverVersion: undefined,
          conflictingFields: ['version'],
          resolutionStrategy: 'manual',
          severity: 'high',
          type: 'schema_mismatch',
        });
        return { success: false, errors: errors + chunk.length };
      }
      console.error(`Exception while deleting ${targetTable} records:`, err);
      errors += chunk.length;
    }
  }

  if (conflictCount > 0) {
    console.warn(`Skipped ${conflictCount} conflicted records for ${table}`);
  }

  return { success: errors === 0, errors };
};
