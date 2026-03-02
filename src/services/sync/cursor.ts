import { getDatabase } from '../../database';

const CURSOR_KEYS = ['__watermelon_last_pulled_at', '__watermelon_last_pulled_schema_version'];

const removeLocalKey = (key: string): Promise<void> =>
    new Promise((resolve, reject) => {
        const adapter: any = getDatabase().adapter;
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

export const resetWatermelonCursor = async (): Promise<void> => {
    try {
        await Promise.all(CURSOR_KEYS.map(key => removeLocalKey(key)));
        console.log('[Sync] Watermelon sync cursor cleared');
    } catch (error) {
        console.warn('[Sync] Failed to reset Watermelon cursor:', error);
    }
};
