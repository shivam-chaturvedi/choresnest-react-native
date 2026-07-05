import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { getDatabase, GUEST_PROFILE_ID } from '../../database';
import Config from 'react-native-config';
import { pullTableChangesWithCursor } from './PullCursorEngine';
import { pushTableChanges } from './PushEngine';
import { SYNC_TABLES } from './TableRegistry';
import { TableChangeSet, TableFetchDescriptor } from './types';
import { isUuid } from '../../utils/uuid';

const logChangeSetSummary = (table: string, changeSet: TableChangeSet): void => {
    if (Config.NODE_ENV === 'production') {
        return;
    }
    const total = changeSet.created.length + changeSet.updated.length + changeSet.deleted.length;
    console.log(`🧾 ${table} fetched ${total} rows (${changeSet.created.length} created, ${changeSet.updated.length} updated, ${changeSet.deleted.length} deleted)`);
};

const collectTableFetchResults = async (descriptors: TableFetchDescriptor[]): Promise<Record<string, TableChangeSet>> => {
    const results = await Promise.allSettled(descriptors.map(desc => desc.fetcher()));
    const output: Record<string, TableChangeSet> = {};
    results.forEach((result, index) => {
        const key = descriptors[index]?.key;
        if (!key) return;
        if (result.status === 'fulfilled') {
            output[key] = result.value;
        } else {
            console.warn(`Sync pull skipped ${key}:`, result.reason);
            output[key] = { created: [], updated: [], deleted: [], latestUpdatedAt: 0 };
        }
    });
    return output;
};

const getLatestPulledTimestamp = (tableChangesMap: Record<string, TableChangeSet>): number =>
    Object.values(tableChangesMap).reduce((max, changeSet) => {
        const timestamp = changeSet.latestUpdatedAt ?? 0;
        return timestamp > max ? timestamp : max;
    }, 0);

type TableSyncConfig = {
    key: string;
    remoteTable?: string;
    hasProfileId?: boolean;
    localOnly?: boolean;
};

const syncPhases = Array.from(new Set(SYNC_TABLES.map(config => config.phase))).sort();

export class SyncOrchestrator {
    private readonly userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    async run(readOnly: boolean): Promise<void> {
        if (this.userId === GUEST_PROFILE_ID) {
            console.log('Guest profile detected in SyncOrchestrator - skipping synchronize()');
            return;
        }
        await this.executeSync(readOnly, 'primary');
    }

    private async executeSync(readOnly: boolean, label: string): Promise<void> {
        await synchronize({
            database: getDatabase(),
            pullChanges: async ({ lastPulledAt, schemaVersion, migration }) =>
                this.pullChanges({ lastPulledAt, schemaVersion, migration, readOnly, label }),
            pushChanges: readOnly
                ? undefined
                : async ({ changes }) => {
                    console.log(`PUSH_START for user ${this.userId}`);
                    await this.pushToServer(changes as Record<string, TableChangeSet | undefined>);
                },
            migrationsEnabledAtVersion: 5,
        });
    }

    private async pullChanges({
        lastPulledAt,
        schemaVersion,
        migration,
        readOnly,
        label,
    }: {
        lastPulledAt: number | null | undefined;
        schemaVersion: number;
        migration: any;
        readOnly: boolean;
        label: string;
    }): Promise<{ changes: Record<string, TableChangeSet>; timestamp: number }> {
        if (migration) {
            console.log(`Sync migration: ${migration}`);
        }
        const lastPulled = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();
        console.log(`PULL_START${label ? ` (${label})` : ''} for user ${this.userId}; readOnly=${readOnly}; since=${lastPulled}`);

        const buildDescriptor = (config: TableSyncConfig): TableFetchDescriptor | null => {
            if (config.localOnly) {
                return null;
            }
            return {
                key: config.key,
                fetcher: () =>
                    pullTableChangesWithCursor({
                        table: config.key,
                        remoteTable: config.remoteTable,
                        userId: this.userId,
                        lastPulled,
                        hasProfileId: config.hasProfileId ?? true,
                    }),
            };
        };

        const descriptors: TableFetchDescriptor[] = [];
        for (const phase of syncPhases) {
            const tablesInPhase = SYNC_TABLES.filter(config => config.phase === phase && !config.localOnly);
            tablesInPhase.forEach(config => {
                const descriptor = buildDescriptor(config);
                if (descriptor) {
                    descriptors.push(descriptor);
                }
            });
        }

        const tableChangesMap = await collectTableFetchResults(descriptors);
        Object.entries(tableChangesMap).forEach(([table, changeSet]) => logChangeSetSummary(table, changeSet));
        const lastPulledMs = lastPulledAt ? new Date(lastPulledAt).getTime() : 0;
        const aggregatedTimestamp = Math.max(lastPulledMs, getLatestPulledTimestamp(tableChangesMap));
        return {
            changes: SYNC_TABLES.reduce<Record<string, TableChangeSet>>((acc, config) => {
                acc[config.key] = tableChangesMap[config.key] ?? { created: [], updated: [], deleted: [] };
                return acc;
            }, {}),
            timestamp: aggregatedTimestamp,
        };
    }

    private async pushToServer(changes: Record<string, TableChangeSet | undefined>): Promise<void> {
        const pushableChanges: Record<string, TableChangeSet | undefined> = {};
        Object.entries(changes).forEach(([tableName, changeSet]) => {
            const config = SYNC_TABLES.find(c => c.key === tableName);
            if (config?.localOnly) {
                return;
            }
            pushableChanges[tableName] = changeSet;
        });

        const hasChanges = Object.values(pushableChanges).some(tableChanges => {
            if (!tableChanges) return false;
            const { created = [], updated = [], deleted = [] } = tableChanges;
            return created.length > 0 || updated.length > 0 || deleted.length > 0;
        });

        if (!hasChanges) {
            console.log('📤 No local changes to push - sync complete');
            return;
        }

        if (!this.userId) {
            console.warn('Cannot push changes without user context');
            return;
        }

        // ---------------------------------------------------------
        // CRITICAL: Account Isolation Filter
        // ---------------------------------------------------------
        // WatermelonDB tracks changes globally in its getDatabase(). If a user logs out
        // and another logs in on the same device, Watermelon will try to push
        // Account A's pending changes using Account B's auth headers, causing
        // RLS violations (42501).
        // we must fetch ALL members belonging to this user to get the list of 
        // allowed profile IDs.
        const allowedProfiles = new Set<string>();
        try {
            const memberRecords = await getDatabase().get('members').query(
                Q.where('deleted', Q.notEq(true))
            ).fetch();
            // In our system, members table records that exist locally for this 
            // instance are assumed valid for the current account context if they 
            // haven't been wiped. However, more accurately, we only filter for 
            // tables that actually HAVE profile_id.
            memberRecords.forEach((m: any) => allowedProfiles.add(m.profileId));
        } catch (e) {
            console.error('SyncOrchestrator: Failed to fetch allowed profile IDs:', e);
        }

        const filteredChanges: Record<string, TableChangeSet> = {};

        for (const [tableName, changeSet] of Object.entries(pushableChanges)) {
            if (!changeSet) continue;

            const config = SYNC_TABLES.find(c => c.key === tableName);
            if (!config || config.localOnly) {
                continue;
            }

            // If the table doesn't use profile scoping (like Global items), push as-is
            if (config && config.hasProfileId === false) {
                filteredChanges[tableName] = changeSet;
                continue;
            }

            // Otherwise, filter created/updated records to only include allowed profiles or the active profile itself
            const filterByProfile = (record: any) => {
                const pid = record.profile_id || record.profileId;
                if (!pid || !isUuid(pid)) {
                    // Push sanitization overwrites profile_id with the auth UUID.
                    return true;
                }
                return pid === this.userId || allowedProfiles.has(pid);
            };

            filteredChanges[tableName] = {
                created: changeSet.created.filter(filterByProfile),
                updated: changeSet.updated.filter(filterByProfile),
                // Note: Watermelon deleted array is just IDs, we can't easily 
                // filter these without fetching them first. 
                // However, since deletions also require profile_id in RLS, 
                // PushEngine will handle any errors, or we can trust the userId 
                // in the payload.
                deleted: changeSet.deleted
            };
        }

        const phaseResults = [] as PromiseSettledResult<{ success: boolean; errors: number }>[][];
        for (const phase of syncPhases) {
            const tablesInPhase = SYNC_TABLES.filter(config => config.phase === phase);
            const tasks = tablesInPhase.map(config => {
                const changeSet = filteredChanges[config.key];
                const hasWork = (changeSet?.created?.length ?? 0) > 0 ||
                    (changeSet?.updated?.length ?? 0) > 0 ||
                    (changeSet?.deleted?.length ?? 0) > 0;

                if (!hasWork) return Promise.resolve({ success: true, errors: 0 });

                return pushTableChanges({
                    table: config.key,
                    remoteTable: config.remoteTable,
                    tableChanges: changeSet,
                    userId: this.userId,
                    addProfileId: config.addProfileId ?? true,
                    conflictKey: config.conflictKey ?? 'id',
                });
            });
            if (tasks.length > 0) {
                phaseResults.push(await Promise.allSettled(tasks));
            }
        }

        const pushResults = phaseResults.flat();
        const totalErrors = pushResults.reduce((acc, result) => {
            if (result.status === 'fulfilled') {
                return acc + result.value.errors;
            }
            return acc + 1;
        }, 0);

        if (totalErrors > 0) {
            throw new Error(`Sync push failed for ${this.userId}. Total errors: ${totalErrors}. Check device logs for RLS or Validation details.`);
        }
    }
}
