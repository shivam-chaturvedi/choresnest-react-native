import { database } from '../database';
import RNFS from 'react-native-fs';
import { Share } from 'react-native';

export type ExportFormat = 'json';

export interface ExportStats {
    events: number;
    tasks: number;
    lists: number;
    recipes: number;
    documents: number;
    expenses: number;
    system: number;
}

export const exportService = {
    /**
     * Get live counts of items in the database
     */
    async getStats(): Promise<ExportStats> {
        try {
            const [
                events,
                tasks,
                lists,
                listItems,
                recipes,
                collections,
                recipeCollections,
                mealPlans,
                documents,
                folders,
                notes,
                transactions,
                budgets,
                users,
                members,
                settings,
                notificationPreferences,
                quietHours,
                appLock,
                userPreferences
            ] = await Promise.all([
                database.collections.get('events').query().fetchCount(),
                database.collections.get('tasks').query().fetchCount(),
                database.collections.get('lists').query().fetchCount(),
                database.collections.get('list_items').query().fetchCount(),
                database.collections.get('recipes').query().fetchCount(),
                database.collections.get('collections').query().fetchCount(),
                database.collections.get('collection_recipes').query().fetchCount(),
                database.collections.get('meal_plans').query().fetchCount(),
                database.collections.get('documents').query().fetchCount(),
                database.collections.get('folders').query().fetchCount(),
                database.collections.get('notes').query().fetchCount(),
                database.collections.get('transactions').query().fetchCount(),
                database.collections.get('budgets').query().fetchCount(),
                database.collections.get('users').query().fetchCount(),
                database.collections.get('members').query().fetchCount(),
                database.collections.get('settings').query().fetchCount(),
                database.collections.get('notification_preferences').query().fetchCount(),
                database.collections.get('quiet_hours').query().fetchCount(),
                database.collections.get('app_lock').query().fetchCount(),
                database.collections.get('user_preferences').query().fetchCount(),
            ]);

            return {
                events,
                tasks,
                lists: lists + listItems,
                recipes: recipes + collections + recipeCollections + mealPlans,
                documents: documents + folders + notes,
                expenses: transactions + budgets,
                system: users + members + settings + notificationPreferences + quietHours + appLock + userPreferences,
            };
        } catch (error) {
            console.warn('Failed to fetch export stats:', error);
            return { events: 0, tasks: 0, lists: 0, recipes: 0, documents: 0, expenses: 0, system: 0 };
        }
    },

    /**
     * Calculate estimated size of the JSON export
     */
    async calculateEstimatedSize(stats: ExportStats): Promise<string> {
        // Rough estimation based on average record size
        // JSON is verbose.
        const avgJsonSize = 700; // Increased average bytes per record due to richer data

        const totalItems = Object.values(stats).reduce((a, b) => a + b, 0);
        const totalBytes = totalItems * avgJsonSize;

        if (totalBytes < 1024) return '< 1 KB';
        if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
        return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    },

    /**
     * Generate backup file and return the path
     */
    async generateBackup(selectedData: string[]): Promise<string> {
        const data: Record<string, any[]> = {};
        const meta = {
            version: 1,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            app: 'Family Chores',
            format: 'json'
        };

        // Helper to fetch and add table data
        const addTableData = async (tableName: string, key: string) => {
            try {
                const records = await database.collections.get(tableName).query().fetch();
                if (records.length > 0) {
                    data[key] = records.map(r => (r as any)._raw);
                }
            } catch (e) {
                console.warn(`Failed to export table ${tableName}`, e);
            }
        };

        // 1. Fetch Data
        if (selectedData.includes('events')) {
            await addTableData('events', 'events');
        }
        if (selectedData.includes('tasks')) {
            await addTableData('tasks', 'tasks');
        }
        if (selectedData.includes('lists')) {
            await addTableData('lists', 'lists');
            await addTableData('list_items', 'list_items');
            await addTableData('list_categories', 'list_categories');
        }
        if (selectedData.includes('recipes')) {
            await addTableData('recipes', 'recipes');
            await addTableData('collections', 'collections');
            await addTableData('collection_recipes', 'collection_recipes');
            await addTableData('meal_plans', 'meal_plans');
        }
        if (selectedData.includes('documents')) {
            await addTableData('documents', 'documents');
            await addTableData('folders', 'folders');
            await addTableData('notes', 'notes');
        }
        if (selectedData.includes('expenses')) {
            await addTableData('transactions', 'transactions');
            await addTableData('budgets', 'budgets');
        }
        if (selectedData.includes('system')) {
            await addTableData('users', 'users');
            await addTableData('members', 'members');
            await addTableData('settings', 'settings');
            await addTableData('notification_preferences', 'notification_preferences');
            await addTableData('quiet_hours', 'quiet_hours');
            await addTableData('app_lock', 'app_lock');
            await addTableData('user_preferences', 'user_preferences');
        }

        // 2. Format Data
        const content = JSON.stringify({ meta, data }, null, 2);
        const filename = `backup_${new Date().toISOString().split('T')[0]}_${new Date().getTime()}.json`;

        // 3. Write File
        const path = `${RNFS.CachesDirectoryPath}/${filename}`;
        await RNFS.writeFile(path, content, 'utf8');
        return path;
    },

    /**
     * Share the backup file
     */
    async shareBackup(filePath: string): Promise<void> {
        try {
            await Share.share({
                url: `file://${filePath}`,
                title: 'Export Data',
            });
        } catch (error) {
            console.error('Share failed:', error);
            throw error;
        }
    }
};
