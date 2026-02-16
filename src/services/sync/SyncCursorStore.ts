import { database } from '../../database';

const LAST_PULLED_AT_KEY = '__watermelon_last_pulled_at';
const LAST_PULLED_SCHEMA_VERSION_KEY = '__watermelon_last_pulled_schema_version';

const removeLocalKey = (key: string): Promise<void> =>
    new Promise((resolve, reject) => {
        const adapter: any = database.adapter;
        if (typeof adapter.removeLocal !== 'function') {
            resolve();
            return;
        }
        adapter.removeLocal(key, (error: Error | null) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });

export const resetSyncCursorState = async (): Promise<void> => {
    try {
        await Promise.all([removeLocalKey(LAST_PULLED_AT_KEY), removeLocalKey(LAST_PULLED_SCHEMA_VERSION_KEY)]);
        console.log('Sync cursors reset');
    } catch (error) {
        console.warn('Failed to reset sync cursors:', error);
    }
};
