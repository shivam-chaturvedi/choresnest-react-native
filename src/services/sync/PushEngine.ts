import Config from 'react-native-config';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import { isValidRecordForTable, mapLocalFieldToServer, transformRecordForSupabase } from './TransformationEngine';
import { recordConflict } from './ConflictEngine';
import { ConflictSeverity, ConflictType, TableChangeSet } from './types';
import { supabase } from '../../config/supabase';

const SYNC_UPSERT_BATCH_SIZE = Number.parseInt(Config.SUPABASE_SYNC_UPSERT_BATCH ?? '100', 10);
const SYNC_DELETE_BATCH_SIZE = Number.parseInt(Config.SUPABASE_SYNC_DELETE_BATCH ?? '100', 10);
const FETCH_CHUNK_SIZE = 200;

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
};

const IGNORED_FIELDS = new Set(['updated_at', 'created_at', 'version', 'deleted', 'deleted_at']);

const mapChangedFields = (table: string, record: any): string[] => {
    const rawFields: string[] = Array.isArray(record._changed)
        ? record._changed
        : Object.keys(record).filter(key => !key.startsWith('_'));

    return Array.from(
        new Set(
            rawFields
                .filter(field => !IGNORED_FIELDS.has(field))
                .map(field => mapLocalFieldToServer(table, field))
        )
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

class SchemaMismatchError extends Error {
    constructor(public readonly table: string, message: string) {
        super(message);
    }
}

const isVersionMissingError = (error: any): boolean => {
    const message = (error?.message ?? '').toString().toLowerCase();
    return message.includes("could not find the 'version' column") || error?.code === 'PGRST204';
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
    type: ConflictType
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

const fetchServerRows = async (table: string, ids: string[]): Promise<Map<string, any>> => {
    const serverMap = new Map<string, any>();
    if (ids.length === 0) {
        return serverMap;
    }

    const idChunks = chunkArray(ids, FETCH_CHUNK_SIZE);
    for (const chunk of idChunks) {
        try {
            const { data, error } = await supabase.from(table).select('*').in('id', chunk);
            if (error) {
                if (isVersionMissingError(error)) {
                    throw new SchemaMismatchError(table, error.message ?? error.toString());
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

const fetchLocalVersions = async (table: string, ids: string[]): Promise<Map<string, number>> => {
    const versions = new Map<string, number>();
    if (ids.length === 0) {
        return versions;
    }
    try {
        const collection = database.collections.get(table);
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

const mergeWithServer = (serverRow: any, payload: Record<string, any>): Record<string, any> => {
    if (!serverRow) {
        return payload;
    }
    return { ...serverRow, ...payload };
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
    const created = Array.isArray(tableChanges.created) ? tableChanges.created : [];
    const updated = Array.isArray(tableChanges.updated) ? tableChanges.updated : [];
    const deleted = Array.isArray(tableChanges.deleted) ? tableChanges.deleted : [];

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

    const prepareRecords = async (records: any[], type: ConflictType): Promise<void> => {
        for (const record of records) {
            if (!isValidRecordForTable(record, table)) {
                continue;
            }
            const changedFields = mapChangedFields(table, record);
            const { payload, localVersion } = transformRecordForSupabase(table, record, userId, addProfileId, changedFields);
            const serverRow = serverRows.get(record.id);
            const serverVersion = coerceVersion(serverRow?.version);

            if (serverRow) {
                if (localVersion <= serverVersion) {
                    console.warn(
                        `[PushEngine] Skipping ${table} record ${record.id} because local version ${localVersion} <= server version ${serverVersion}.`
                    );
                    if (localVersion < serverVersion) {
                        buildConflictPayload(table, record.id, localVersion, serverVersion, ['version'], 'server_newer');
                        conflictCount += 1;
                    }
                    continue;
                }
            }

            const merged = mergeWithServer(serverRow, payload);
            merged.version = localVersion > 0 ? localVersion : 1;

            recordsToUpsert.push(merged);
        }
    };

    await prepareRecords(created, 'create');
    await prepareRecords(updated, 'update');

    const upsertChunks = chunkArray(recordsToUpsert, SYNC_UPSERT_BATCH_SIZE);
    for (const chunk of upsertChunks) {
        try {
            const { error } = await supabase.from(targetTable).upsert(chunk, { onConflict: conflictKey });
            if (error) {
                console.error(`Failed to upsert ${targetTable} (${chunk.length} records):`, error);
                errors += chunk.length;
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

    const validDeletedIds = deleted.filter(id => typeof id === 'string' && id.trim() !== '');
    const localDeleteVersions = await fetchLocalVersions(table, validDeletedIds);

    const deletionsToApply = validDeletedIds.filter(id => {
        const localVersion = localDeleteVersions.get(id) ?? 0;
        const serverVersion = coerceVersion(serverRows.get(id)?.version);
        if (serverVersion >= localVersion) {
            console.warn(
                `[PushEngine] Skipping delete for ${table} record ${id} because server version ${serverVersion} >= local version ${localVersion}.`
            );
            if (serverVersion > localVersion) {
                buildConflictPayload(table, id, localVersion, serverVersion, ['version'], 'server_newer');
                conflictCount += 1;
            }
            return false;
        }
        return true;
    });

    const deleteChunks = chunkArray(deletionsToApply, SYNC_DELETE_BATCH_SIZE);
    for (const chunk of deleteChunks) {
        try {
            const payload = chunk.map(id => ({
                id,
                deleted: true,
                version: Math.max(localDeleteVersions.get(id) ?? 0, 1),
            }));
            const { error } = await supabase.from(targetTable).upsert(payload, { onConflict: 'id' });
            if (error) {
                console.error(`Failed to mark ${targetTable} deletions (${chunk.length} ids):`, error);
                errors += chunk.length;
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
