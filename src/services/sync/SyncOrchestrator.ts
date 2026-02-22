import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../database';
import Config from 'react-native-config';
import { pullTableChangesWithCursor } from './PullCursorEngine';
import { pushTableChanges } from './PushEngine';
import { SYNC_TABLES } from './TableRegistry';
import { TableChangeSet, TableFetchDescriptor } from './types';

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
            output[key] = { created: [], updated: [], deleted: [] };
        }
    });
    return output;
};

type TableSyncConfig = {
    key: string;
    remoteTable?: string;
    hasProfileId?: boolean;
};

const syncPhases = Array.from(new Set(SYNC_TABLES.map(config => config.phase))).sort();

export class SyncOrchestrator {
    private readonly userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    async run(readOnly: boolean): Promise<void> {
        await this.executeSync(readOnly, 'primary');
    }

    private async executeSync(readOnly: boolean, label: string): Promise<void> {
        await synchronize({
            database,
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
        const timestamp = Date.now();
        const lastPulled = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString();
        console.log(`PULL_START${label ? ` (${label})` : ''} for user ${this.userId}; readOnly=${readOnly}; since=${lastPulled}`);

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

        const descriptors: TableFetchDescriptor[] = [];
        for (const phase of syncPhases) {
            const tablesInPhase = SYNC_TABLES.filter(config => config.phase === phase);
            tablesInPhase.forEach(config => descriptors.push(buildDescriptor(config)));
        }

        const tableChangesMap = await collectTableFetchResults(descriptors);
        Object.entries(tableChangesMap).forEach(([table, changeSet]) => logChangeSetSummary(table, changeSet));
        return {
            changes: SYNC_TABLES.reduce<Record<string, TableChangeSet>>((acc, config) => {
                acc[config.key] = tableChangesMap[config.key] ?? { created: [], updated: [], deleted: [] };
                return acc;
            }, {}),
            timestamp,
        };
    }

    private async pushToServer(changes: Record<string, TableChangeSet | undefined>): Promise<void> {
        const hasChanges = Object.values(changes).some(tableChanges => {
            if (!tableChanges) {
                return false;
            }
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

        const phaseResults = [] as PromiseSettledResult<{ success: boolean; errors: number }>[][];
        for (const phase of syncPhases) {
            const tablesInPhase = SYNC_TABLES.filter(config => config.phase === phase);
            const tasks = tablesInPhase.map(config =>
                pushTableChanges({
                    table: config.key,
                    remoteTable: config.remoteTable,
                    tableChanges: changes[config.key],
                    userId: this.userId,
                    addProfileId: config.addProfileId ?? true,
                    conflictKey: config.conflictKey ?? 'id',
                })
            );
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
            console.warn(`Sync completed with ${totalErrors} errors during push operations`);
        }
    }
}
