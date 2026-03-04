import { Q } from '@nozbe/watermelondb';
import { getDatabase } from '../database';
import CategoryColorMapping from '../database/models/CategoryColorMapping';
import { uuidv4 } from '../utils/uuid';
import { CATEGORY_COLOR_PALETTE, pickDefaultColor } from '../constants/categoryColors';

export type EnsureMappingsResult = {
    map: Map<string, string>;
    created: number;
};

const DEFAULT_CATEGORY_KEY = 'other';

export const normalizeCategoryKey = (value: string | null | undefined): string => {
    if (!value) {
        return DEFAULT_CATEGORY_KEY;
    }
    const normalized = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return normalized || DEFAULT_CATEGORY_KEY;
};

const ensureDatabaseReady = (profileId: string): void => {
    if (!profileId) {
        throw new Error('CategoryColorService requires a profileId');
    }
};

const collectNormalizedKeys = (input: string[]): string[] => {
    const seen = new Set<string>();
    for (const raw of input) {
        const key = normalizeCategoryKey(raw);
        if (!seen.has(key)) {
            seen.add(key);
        }
    }

    if (!seen.has(DEFAULT_CATEGORY_KEY)) {
        seen.add(DEFAULT_CATEGORY_KEY);
    }

    return Array.from(seen);
};

const initializeNewMapping = (
    record: CategoryColorMapping,
    profileId: string,
    categoryKey: string,
    colorHex: string,
    now: number
) => {
    record._raw.id = uuidv4();
    record.profileId = profileId;
    record.categoryKey = categoryKey;
    record.colorHex = colorHex;
    record.createdAt = now;
    record.updatedAt = now;
    record.deleted = false;
    record.version = 0;
};

export const ensureMappingsForCategories = async (
    profileId: string,
    categoryKeys: string[] = []
): Promise<EnsureMappingsResult> => {
    ensureDatabaseReady(profileId);

    const normalizedKeys = collectNormalizedKeys(categoryKeys);
    if (normalizedKeys.length === 0) {
        return { map: new Map(), created: 0 };
    }

    const database = getDatabase();
    const collection = database.get<CategoryColorMapping>('budget_category_color_mappings');

    const existingRecords = await collection.query(Q.where('profile_id', profileId)).fetch();
    const map = new Map<string, string>();
    const usageCounts: Record<string, number> = {};
    const usedColors = new Set<string>();

    existingRecords.forEach(record => {
        map.set(record.categoryKey, record.colorHex);
        usedColors.add(record.colorHex);
        usageCounts[record.colorHex] = (usageCounts[record.colorHex] ?? 0) + 1;
    });

    const missingKeys = normalizedKeys.filter(key => !map.has(key));

    if (missingKeys.length > 0) {
        await database.write(async () => {
            const now = Date.now();
            for (const key of missingKeys) {
                const colorHex = pickDefaultColor(usedColors, usageCounts);
                const createdRecord = await collection.create(record => {
                    initializeNewMapping(record, profileId, key, colorHex, now);
                });
                map.set(key, createdRecord.colorHex);
                usedColors.add(colorHex);
                usageCounts[colorHex] = (usageCounts[colorHex] ?? 0) + 1;
            }
        });
    }

    return { map, created: missingKeys.length };
};

export const setCategoryColor = async (profileId: string, categoryKey: string, colorHex: string): Promise<void> => {
    ensureDatabaseReady(profileId);
    const normalizedKey = normalizeCategoryKey(categoryKey);
    const database = getDatabase();
    const collection = database.get<CategoryColorMapping>('budget_category_color_mappings');
    const allRecords = await collection.query(Q.where('profile_id', profileId)).fetch();
    const matches = allRecords.filter(record => record.categoryKey === normalizedKey);
    const conflict = allRecords.find(record => record.colorHex === colorHex && record.categoryKey !== normalizedKey);
    if (conflict) {
        throw new Error('Color is already assigned to another category');
    }

    const now = Date.now();
    await database.write(async () => {
        if (matches.length > 0) {
            await matches[0].update(record => {
                record.colorHex = colorHex;
                record.updatedAt = now;
                record.version = record.version + 1;
                record.deleted = false;
            });
            return;
        }

        await collection.create(record => {
            initializeNewMapping(record, profileId, normalizedKey, colorHex, now);
        });
    });
};

export const CategoryColorService = {
    normalizeCategoryKey,
    ensureMappingsForCategories,
    setCategoryColor,
};
