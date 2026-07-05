import { getDatabase } from '../../database';
import {
  coerceAuthProfileId,
  isUuid,
  isWatermelonLocalId,
} from '../../utils/uuid';
import { SYNC_TABLES } from './TableRegistry';

const GLOBAL_FIELD_MAPPINGS: Record<string, string> = {
  profileId: 'profile_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const TABLE_FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  events: {
    dateString: 'date',
    memberId: 'member_id',
    endTime: 'end_time',
    endDate: 'end_date',
    timeZone: 'time_zone',
    isRecurring: 'is_recurring',
    recurrenceRule: 'recurrence_rule',
    recurrenceEndDate: 'recurrence_end_date',
    notificationId: 'notification_id',
    reminderOffsetMinutes: 'reminder_offset_minutes',
  },
  tasks: {
    dateString: 'date',
    dueDisplay: 'due_display',
    assigneeId: 'assignee_id',
    reminderEnabled: 'reminder_enabled',
    notificationId: 'notification_id',
    isRecurring: 'is_recurring',
    recurrenceRule: 'recurrence_rule',
    recurrenceInterval: 'recurrence_interval',
    recurrenceDaysOfWeek: 'recurrence_days_of_week',
    recurrenceEndDate: 'recurrence_end_date',
    recurrenceOccurrenceLimit: 'recurrence_occurrence_limit',
    recurrenceCompletedCount: 'recurrence_completed_count',
    recurrenceAnchorDate: 'recurrence_anchor_date',
    recurrenceSkippedDates: 'recurrence_skipped_dates',
  },
  list_items: {
    listId: 'list_id',
    isCompleted: 'is_completed',
    addedById: 'added_by_id',
    purchasedAt: 'purchased_at',
  },
  notes: {
    isStarred: 'is_starred',
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
    metadataVersion: 'metadata_version',
    memberId: 'member_id',
    expiryDate: 'expiry_date',
    sharedWithJson: 'shared_with_json',
    remoteDeletePending: 'remote_delete_pending',
  },
  members: {
    isActive: 'is_active',
  },
  recipes: {
    cookTime: 'cook_time',
    prepTime: 'prep_time',
    imagePath: 'image_path',
    isSaved: 'is_saved',
    ingredientsJson: 'ingredients_json',
    instructionsJson: 'instructions_json',
    tagsJson: 'tags_json',
    nutritionJson: 'nutrition_json',
    audioPath: 'audio_path',
    imagesJson: 'images_json',
    localImageUris: 'local_image_uris',
    localAudioUri: 'local_audio_uri',
    remoteImagePaths: 'remote_image_paths',
    remoteAudioPath: 'remote_audio_path',
    uploadStatus: 'upload_status',
    uploadAttempts: 'upload_attempts',
    lastUploadError: 'last_upload_error',
    imageChecksumsJson: 'image_checksums_json',
    audioChecksum: 'audio_checksum',
  },
  collection_recipes: {
    collectionId: 'collection_id',
    recipeId: 'recipe_id',
  },
  meal_plans: {
    recipeId: 'recipe_id',
    isCooked: 'is_cooked',
    notificationId: 'notification_id',
    reminderMinutesBefore: 'reminder_minutes_before',
  },
  app_settings: {
    hasCompletedOnboarding: 'has_completed_onboarding',
  },
  app_lock: {
    biometricEnabled: 'biometric_enabled',
    pinHash: 'pin_hash',
  },
  user_preferences: {
    countryCode: 'country_code',
  },
  notification_preferences: {
    reminderOffsetMinutes: 'reminder_offset_minutes',
  },
  quiet_hours: {
    startHour: 'start_hour',
    startMinute: 'start_minute',
    endHour: 'end_hour',
    endMinute: 'end_minute',
  },
};

const SYNC_METADATA = new Set(['id', 'profile_id', 'created_at', 'updated_at', 'deleted', 'version']);

const REMOTE_COLUMNS_BY_TABLE: Record<string, ReadonlySet<string>> = {
  users: new Set([
    ...SYNC_METADATA,
    'email',
    'name',
    'is_guest',
    'active_profile_id',
  ]),
  profiles: new Set([
    ...SYNC_METADATA,
    'email',
    'name',
    'is_guest',
    'active_profile_id',
  ]),
  members: new Set([
    ...SYNC_METADATA,
    'name',
    'symbol',
    'color',
    'role',
  ]),
  settings: new Set([...SYNC_METADATA, 'key', 'value']),
  user_preferences: new Set([...SYNC_METADATA, 'country_code']),
  notification_preferences: new Set([
    ...SYNC_METADATA,
    'category',
    'enabled',
    'reminder_offset_minutes',
  ]),
  quiet_hours: new Set([
    ...SYNC_METADATA,
    'enabled',
    'start_hour',
    'start_minute',
    'end_hour',
    'end_minute',
  ]),
  app_settings: new Set([...SYNC_METADATA, 'has_completed_onboarding']),
  app_lock: new Set([
    ...SYNC_METADATA,
    'enabled',
    'biometric_enabled',
    'pin_hash',
    'metadata_version',
    'remote_delete_pending',
  ]),
  folders: new Set([...SYNC_METADATA, 'name', 'icon', 'color']),
  lists: new Set([...SYNC_METADATA, 'name', 'type', 'icon']),
  list_items: new Set([
    ...SYNC_METADATA,
    'list_id',
    'name',
    'quantity',
    'unit',
    'category',
    'added_by_id',
    'is_completed',
    'purchased_at',
  ]),
  events: new Set([
    ...SYNC_METADATA,
    'title',
    'icon',
    'date',
    'time',
    'end_time',
    'end_date',
    'member_id',
    'location',
    'description',
    'notes',
    'visibility',
    'time_zone',
    'is_recurring',
    'recurrence_rule',
    'recurrence_end_date',
    'notification_id',
    'reminder_offset_minutes',
  ]),
  tasks: new Set([
    ...SYNC_METADATA,
    'name',
    'icon',
    'status',
    'priority',
    'due_display',
    'date',
    'assignee_id',
    'tab',
    'notification_id',
    'reminder_enabled',
    'is_recurring',
    'recurrence_rule',
    'recurrence_interval',
    'recurrence_days_of_week',
    'recurrence_end_date',
    'recurrence_occurrence_limit',
    'recurrence_completed_count',
    'recurrence_anchor_date',
    'recurrence_skipped_dates',
  ]),
  notes: new Set([
    ...SYNC_METADATA,
    'title',
    'preview',
    'tag',
    'color',
    'is_starred',
    'folder_id',
    'blocks_json',
  ]),
  documents: new Set([
    ...SYNC_METADATA,
    'name',
    'type',
    'icon',
    'date',
    'expiry_date',
    'member_id',
    'shared_with_json',
    'file_path',
    'meta_json',
    'notification_ids_json',
    'reminder_days_before',
    'local_uri',
    'remote_path',
    'upload_status',
    'upload_attempts',
    'last_upload_error',
    'content_type',
    'file_size',
    'checksum',
    'metadata_version',
    'remote_delete_pending',
  ]),
  recipes: new Set([
    ...SYNC_METADATA,
    'name',
    'description',
    'prep_time',
    'cook_time',
    'servings',
    'difficulty',
    'calories',
    'image_path',
    'is_saved',
    'rating',
    'author',
    'ingredients_json',
    'instructions_json',
    'tags_json',
    'nutrition_json',
    'audio_path',
    'duration',
    'url',
    'images_json',
    'local_image_uris',
    'local_audio_uri',
    'remote_image_paths',
    'remote_audio_path',
    'upload_status',
    'upload_attempts',
    'last_upload_error',
    'image_checksums_json',
    'audio_checksum',
  ]),
  collections: new Set([
    ...SYNC_METADATA,
    'name',
    'description',
    'color',
  ]),
  collection_recipes: new Set([
    ...SYNC_METADATA,
    'collection_id',
    'recipe_id',
  ]),
  meal_plans: new Set([
    ...SYNC_METADATA,
    'date',
    'type',
    'recipe_id',
    'is_cooked',
    'notification_id',
    'reminder_minutes_before',
  ]),
  transactions: new Set([
    ...SYNC_METADATA,
    'name',
    'amount',
    'date',
    'icon',
    'type',
    'category',
  ]),
  budgets: new Set([
    ...SYNC_METADATA,
    'category',
    'amount',
    'month',
    'notification_id',
    'alert_threshold_percent',
  ]),
};

const OPTIONAL_TEXT_FOREIGN_KEYS = new Set([
  'assignee_id',
  'member_id',
  'added_by_id',
  'folder_id',
  'list_id',
  'recipe_id',
  'collection_id',
]);

const LOCAL_ONLY_FIELDS = new Set([
  '_changed',
  '_status',
  'is_active',
  'isActive',
  'is_guest',
  'has_completed_onboarding',
  'active_profile_id',
  'isGuest',
  'activeProfileId',
]);

const PROFILE_SCOPED_TABLES = SYNC_TABLES.filter(
  config => config.hasProfileId !== false && !config.localOnly,
).map(config => config.key);

const CAMEL_CASE_PATTERN = /[A-Z]/;

const resolveAllowedColumns = (
  table: string,
  remoteTable: string,
): ReadonlySet<string> | undefined =>
  REMOTE_COLUMNS_BY_TABLE[table] ?? REMOTE_COLUMNS_BY_TABLE[remoteTable];

const applyFieldMappings = (
  table: string,
  record: Record<string, unknown>,
): Record<string, unknown> => {
  const transformed: Record<string, unknown> = { ...record };
  const mappings = {
    ...GLOBAL_FIELD_MAPPINGS,
    ...(TABLE_FIELD_MAPPINGS[table] ?? {}),
  };

  Object.entries(mappings).forEach(([localField, remoteField]) => {
    if (transformed[localField] !== undefined) {
      transformed[remoteField] = transformed[localField];
      delete transformed[localField];
    }
  });

  Object.keys(transformed).forEach(key => {
    if (CAMEL_CASE_PATTERN.test(key)) {
      delete transformed[key];
    }
  });

  return transformed;
};

const normalizeOptionalForeignKeys = (
  payload: Record<string, unknown>,
  allowed: ReadonlySet<string>,
) => {
  OPTIONAL_TEXT_FOREIGN_KEYS.forEach(field => {
    if (!allowed.has(field)) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      return;
    }
    const value = payload[field];
    if (value === '' || value === null || value === undefined) {
      payload[field] = null;
    }
  });
};

const sanitizeMemberReferenceValue = (value: unknown): string | null => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  if (isUuid(value)) {
    return null;
  }
  if (!isWatermelonLocalId(value)) {
    return null;
  }
  return value;
};

export const getRemoteColumnAllowlist = (
  table: string,
  remoteTable: string,
): ReadonlySet<string> | undefined => resolveAllowedColumns(table, remoteTable);

export const stripToRemoteColumns = (
  table: string,
  remoteTable: string,
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const allowed = resolveAllowedColumns(table, remoteTable);
  if (!allowed) {
    console.warn(
      `[SyncPayload] Missing remote column whitelist for ${table} -> ${remoteTable}; dropping payload keys outside sync metadata.`,
    );
    const cleaned: Record<string, unknown> = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (SYNC_METADATA.has(key)) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }

  const stripped: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (!allowed.has(key)) {
      return;
    }
    if (OPTIONAL_TEXT_FOREIGN_KEYS.has(key)) {
      const sanitizedValue = sanitizeMemberReferenceValue(value);
      if (sanitizedValue !== null) {
        stripped[key] = sanitizedValue;
      } else if (Object.prototype.hasOwnProperty.call(payload, key)) {
        stripped[key] = null;
      }
      return;
    }
    stripped[key] = value;
  });

  normalizeOptionalForeignKeys(stripped, allowed);
  return stripped;
};

export const pickRemotePayload = (
  table: string,
  remoteTable: string,
  payload: Record<string, unknown>,
): Record<string, unknown> => stripToRemoteColumns(table, remoteTable, payload);

export const buildRemoteRecordPayload = (
  table: string,
  remoteTable: string,
  record: Record<string, unknown>,
  userId: string,
  addProfileId: boolean,
): Record<string, unknown> => {
  const { _changed, _status, ...raw } = record;
  let transformed = applyFieldMappings(table, raw as Record<string, unknown>);

  LOCAL_ONLY_FIELDS.forEach(field => {
    delete transformed[field];
  });

  if (table === 'members') {
    delete transformed.is_active;
    delete transformed.isActive;
  }

  if (addProfileId) {
    const resolvedProfileId = coerceAuthProfileId(
      transformed.profile_id ?? transformed.profileId,
      userId,
    );
    if (resolvedProfileId) {
      transformed.profile_id = resolvedProfileId;
    } else {
      delete transformed.profile_id;
    }
    delete transformed.profileId;
  }

  return pickRemotePayload(table, remoteTable, transformed);
};

const readLocalProfileId = (record: {
  profileId?: string;
  profile_id?: string;
  _raw?: { profile_id?: string };
}): string | undefined =>
  record.profileId ?? record.profile_id ?? record._raw?.profile_id;

export const finalizeProfileScopedPayload = (
  table: string,
  remoteTable: string,
  payload: Record<string, unknown>,
  authUserId: string,
  addProfileId: boolean,
): Record<string, unknown> | null => {
  if (!addProfileId) {
    return payload;
  }

  const resolvedProfileId = coerceAuthProfileId(payload.profile_id, authUserId);
  if (!resolvedProfileId) {
    console.warn(
      `[SyncPayload] Dropping ${table} record ${payload.id ?? 'unknown'} — auth profile UUID unavailable.`,
    );
    return null;
  }

  payload.profile_id = resolvedProfileId;
  return stripToRemoteColumns(table, remoteTable, payload);
};

export const repairProfileScopedRecords = async (
  authUserId: string,
): Promise<number> => {
  if (!isUuid(authUserId)) {
    return 0;
  }

  let repairedCount = 0;
  const now = Date.now();

  await getDatabase().write(async () => {
    for (const tableName of PROFILE_SCOPED_TABLES) {
      try {
        const collection = getDatabase().get(tableName);
        const records = await collection.query().fetch();

        for (const record of records) {
          const currentProfileId = readLocalProfileId(record as any);
          if (currentProfileId === authUserId) {
            continue;
          }

          const needsRepair =
            !currentProfileId ||
            !isUuid(currentProfileId) ||
            isWatermelonLocalId(currentProfileId) ||
            currentProfileId !== authUserId;

          if (needsRepair) {
            await record.update((mutable: any) => {
              mutable.profileId = authUserId;
              mutable.updatedAt = now;
              mutable.version = (mutable.version ?? 0) + 1;
            });
            repairedCount += 1;
          }
        }
      } catch (error) {
        console.warn(`[SyncRepair] Failed to inspect ${tableName}:`, error);
      }
    }
  });

  if (repairedCount > 0) {
    console.log(
      `[SyncRepair] Repaired ${repairedCount} local records with invalid profile_id values.`,
    );
  }

  return repairedCount;
};

export const findRecordsNeedingProfileRepair = async (
  authUserId: string,
): Promise<number> => {
  if (!isUuid(authUserId)) {
    return 0;
  }

  let invalidCount = 0;

  for (const tableName of PROFILE_SCOPED_TABLES) {
    try {
      const collection = getDatabase().get(tableName);
      const records = await collection.query().fetch();
      invalidCount += records.filter(record => {
        const profileId = (record as { profileId?: string }).profileId;
        return !profileId || !isUuid(profileId) || profileId !== authUserId;
      }).length;
    } catch {
      // Ignore tables that are unavailable in the current schema.
    }
  }

  return invalidCount;
};
