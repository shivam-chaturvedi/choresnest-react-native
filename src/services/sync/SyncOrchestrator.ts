import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import Config from 'react-native-config';
import { pullTableChangesWithCursor } from './PullCursorEngine';
import { pushTableChanges } from './PushEngine';
import { SYNC_TABLES, TableSyncConfig } from './TableRegistry';
import { TableChangeSet, TableFetchDescriptor } from './types';

console.warn('🔥 SyncOrchestrator module loaded (build marker = 2026-02-26-1)');

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
            console.error(`Error fetching ${key}:`, result.reason);
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

// TableSyncConfig is imported from TableRegistry above

const syncPhases = Array.from(new Set(SYNC_TABLES.map(config => config.phase))).sort();

// Tables that participate in the primary (blocking) sync
const PRIMARY_TABLES = SYNC_TABLES.filter(t => !t.deferred);
// Tables deferred to an async background sync after the primary completes
const DEFERRED_TABLES = SYNC_TABLES.filter(t => t.deferred);

export class SyncOrchestrator {
    private readonly userId: string;

    constructor(userId: string) {
        console.warn('🔥 SyncOrchestrator constructed for', userId);
        this.userId = userId;
    }

    async run(readOnly: boolean): Promise<void> {
        // PRIMARY SYNC: fetch all tables except deferred ones (e.g. documents).
        // This completes quickly so the user can see their data immediately.
        await this.executeSync(readOnly, 'primary', PRIMARY_TABLES);

        // DEFERRED SYNC: run documents (and any other deferred tables) async in
        // the background. Do NOT await — we want the app to be usable right away.
        if (DEFERRED_TABLES.length > 0) {
            setTimeout(() => {
                this.executeSync(readOnly, 'deferred', DEFERRED_TABLES).catch(err => {
                    console.warn('[SyncOrchestrator] Deferred sync (documents) failed:', err);
                });
            }, 2000); // 2s delay so primary sync cursor write settles first
        }
    }

    private async executeSync(readOnly: boolean, label: string, tablesToSync: TableSyncConfig[]): Promise<void> {
        console.warn('🔥 executeSync entered');
        try {
            const { getProfileLastPulledAt, setProfileLastPulledAt } = await import('./SyncCursorStore');
            console.warn('🔥 SyncCursorStore imported');
            const profileLastPulledAt = await getProfileLastPulledAt(this.userId);
            console.warn('🔥 Cursor read complete:', profileLastPulledAt);

            // For deferred syncs, use the same cursor so we only fetch what's new
            let pendingCursorTimestamp: number | null = null;

            await synchronize({
                database,
                pullChanges: async ({ schemaVersion, migration }) =>
                    this.pullChanges({
                        lastPulledAt: profileLastPulledAt,
                        schemaVersion,
                        migration,
                        readOnly,
                        label,
                        tablesToSync,
                    }),
                onDidPullChanges: async (pullResult: any) => {
                    const timestamp = pullResult?.timestamp;
                    if (timestamp) {
                        pendingCursorTimestamp = timestamp;
                    }
                },
                pushChanges: readOnly
                    ? undefined
                    : async ({ changes }) => {
                        console.log(`PUSH_START (${label}) for user ${this.userId}`);
                        await this.pushToServer(changes as Record<string, TableChangeSet | undefined>, tablesToSync);
                    },
                migrationsEnabledAtVersion: 5,
            });

            if (pendingCursorTimestamp) {
                // Advance the shared profile cursor ONLY AFTER synchronize successfully commits
                // to the local WatermelonDB database. If `synchronize` threw an error during
                // local apply, this won't run, preventing the cursor from silently skipping data.
                await setProfileLastPulledAt(this.userId, pendingCursorTimestamp);
                console.log(`[SyncOrchestrator] (${label}) Saved cursor for ${this.userId} at ${pendingCursorTimestamp}`);
            }
        } catch (e) {
            console.error('🔥 executeSync crashed:', e);
            throw e;
        }
    }

    private async pullChanges({
        lastPulledAt,
        schemaVersion,
        migration,
        readOnly,
        label,
        tablesToSync,
    }: {
        lastPulledAt: number | null | undefined;
        schemaVersion: number;
        migration: any;
        readOnly: boolean;
        label: string;
        tablesToSync: TableSyncConfig[];
    }): Promise<{ changes: Record<string, TableChangeSet>; timestamp: number }> {
        if (migration) {
            console.log(`Sync migration: ${migration}`);
        }
        console.log('Using cursor:', lastPulledAt);
        const lastPulled = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();
        console.log(`PULL_START (${label}) for user ${this.userId}; readOnly=${readOnly}; since=${lastPulled}`);

        const buildDescriptor = (config: TableSyncConfig): TableFetchDescriptor => ({
            key: config.key,
            fetcher: () =>
                pullTableChangesWithCursor({
                    table: config.key,
                    remoteTable: config.remoteTable,
                    userId: this.userId,
                    lastPulled,
                    hasProfileId: config.hasProfileId ?? true,
                }),
        });

        // Only fetch the tables we've been asked to sync in this pass
        const descriptors: TableFetchDescriptor[] = [];
        for (const phase of syncPhases) {
            const tablesInPhase = tablesToSync.filter(config => config.phase === phase);
            tablesInPhase.forEach(config => descriptors.push(buildDescriptor(config)));
        }

        const tableChangesMap = await collectTableFetchResults(descriptors);
        Object.entries(tableChangesMap).forEach(([table, changeSet]) => logChangeSetSummary(table, changeSet));
        const lastPulledMs = lastPulledAt ? new Date(lastPulledAt).getTime() : 0;
        const aggregatedTimestamp = Math.max(lastPulledMs, getLatestPulledTimestamp(tableChangesMap));

        // WatermelonDB requires ALL tables in the schema to be present in the changes
        // object, even if they weren't fetched in this pass. Return empty sets for
        // tables not included in the current pass so WatermelonDB doesn't complain.
        return {
            changes: SYNC_TABLES.reduce<Record<string, TableChangeSet>>((acc, config) => {
                acc[config.key] = tableChangesMap[config.key] ?? { created: [], updated: [], deleted: [] };
                return acc;
            }, {}),
            timestamp: aggregatedTimestamp,
        };
    }

    private async pushToServer(changes: Record<string, TableChangeSet | undefined>, tablesToSync: TableSyncConfig[] = SYNC_TABLES): Promise<void> {
        const hasChanges = Object.values(changes).some(tableChanges => {
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
        // WatermelonDB tracks changes globally in its database. If a user logs out
        // and another logs in on the same device, Watermelon will try to push
        // Account A's pending changes using Account B's auth headers, causing
        // RLS violations (42501).
        // we must fetch ALL members belonging to this user to get the list of 
        // allowed profile IDs.
        const allowedProfiles = new Set<string>();
        try {
            const memberRecords = await database.get('members').query(
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

        for (const [tableName, changeSet] of Object.entries(changes)) {
            if (!changeSet) continue;

            const config = SYNC_TABLES.find(c => c.key === tableName);

            console.log('Raw Watermelon changes for', tableName, changeSet);

            console.log(`Before filtering ${tableName}`, {
                created: changeSet.created.length,
                updated: changeSet.updated.length,
            });

            // If the table doesn't use profile scoping (like Global items), push as-is
            if (config && config.hasProfileId === false) {
                filteredChanges[tableName] = changeSet;
                console.log(`After filtering ${tableName}`, {
                    created: filteredChanges[tableName].created.length,
                    updated: filteredChanges[tableName].updated.length,
                });
                continue;
            }

            // Otherwise, filter created/updated records to only include allowed profiles or the active profile itself
            const filterByProfile = (record: any) => {
                const pid = record.profile_id || record.profileId;
                if (pid === 'guest') return false;
                return pid === this.userId || (pid && allowedProfiles.has(pid));
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

            console.log(`After filtering ${tableName}`, {
                created: filteredChanges[tableName].created.length,
                updated: filteredChanges[tableName].updated.length,
            });
        }

        const phaseResults = [] as PromiseSettledResult<{ success: boolean; errors: number }>[][];
        for (const phase of syncPhases) {
            const tablesInPhase = tablesToSync.filter(config => config.phase === phase);
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
            console.warn(
                `[SyncOrchestrator] Push completed with ${totalErrors} error(s) for user ${this.userId}.` +
                ' Remote rows may be out of date; check device logs for RLS, validation, or schema details.'
            );
        }
    }
}
