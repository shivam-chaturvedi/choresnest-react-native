import { database } from '../../database';
import { Q } from '@nozbe/watermelondb';
import { TableChangeSet } from './types';

const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
    events: {
        dateString: 'date',
    },
    tasks: {
        dateString: 'date',
        dueDisplay: 'due_display',
        assigneeId: 'assignee_id',
        reminderEnabled: 'reminder_enabled',
    },
    list_items: {
        isCompleted: 'is_completed',
        addedById: 'added_by_id',
        purchasedAt: 'purchased_at',
        updatedAt: 'updated_at',
    },
    notes: {
        isStarred: 'is_starred',
        updatedAt: 'updated_at',
        folderId: 'folder_id',
        blocks: 'blocks_json',
    },
    documents: {
        filePath: 'file_path',
        localUri: 'local_uri',
        remotePath: 'remote_path',
        uploadStatus: 'upload_status',
        uploadAttempts: 'upload_attempts',
        lastUploadError: 'last_upload_error',
        contentType: 'content_type',
        fileSize: 'file_size',
        checksum: 'checksum',
    },
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
        const watermelonTable = database.get(table);
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
    const mappings = FIELD_MAPPINGS[table];
    return mappings?.[field] ?? field;
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
    serverSnapshot?: Record<string, any>
): { payload: Record<string, any>; changedFields: string[]; localVersion: number } => {
    const existingPid = record.profile_id || record.profileId;
    const payload = addProfileId ? { ...record, profile_id: existingPid || userId } : { ...record };
    const { _changed, _status, ...cleaned } = payload;
    const transformed: any = { ...cleaned };

    const mappings = FIELD_MAPPINGS[table];
    if (mappings) {
        Object.keys(mappings).forEach(wmField => {
            if (transformed[wmField] !== undefined) {
                transformed[mappings[wmField]] = transformed[wmField];
                delete transformed[wmField];
            }
        });
    }

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
        if (transformed.meta_json === undefined && transformed.meta !== undefined) {
            transformed.meta_json = transformed.meta;
            delete transformed.meta;
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
    const normalizedUpdatedAt = ensureIsoTimestamp(transformed.updated_at ?? transformed.updatedAt) ?? now;
    const normalizedCreatedAt = ensureIsoTimestamp(transformed.created_at ?? transformed.createdAt) ?? normalizedUpdatedAt ?? now;

    transformed.updated_at = normalizedUpdatedAt;
    transformed.created_at = normalizedCreatedAt;

    if (table === 'list_items') {
        transformed.purchased_at = normalizePurchasedAt(transformed.purchased_at ?? transformed.purchasedAt);
        if (transformed.purchasedAt !== undefined) {
            delete transformed.purchasedAt;
        }
    }

    const localVersion = coerceVersion(transformed.version ?? record.version ?? 0);
    transformed.version = localVersion;

    if (table === 'members') {
        delete transformed.is_active;
        delete transformed.isActive;
        const memberFieldsToRemove = ['is_active', 'isActive'];
        changedFields = changedFields.filter(field => !memberFieldsToRemove.includes(field));
    }

    if (table === 'users') {
        const {
            is_guest,
            has_completed_onboarding,
            active_profile_id,
            isGuest,
            activeProfileId,
            ...profilesPayload
        } = transformed;
        return {
            payload: profilesPayload,
            changedFields,
            localVersion,
        };
    }

    return {
        payload: transformed,
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
