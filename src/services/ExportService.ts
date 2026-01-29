import { database } from '../database';
import RNFS from 'react-native-fs';
import { Share } from 'react-native';

export type ExportFormat = 'json' | 'csv';

export interface ExportStats {
    events: number;
    tasks: number;
    lists: number;
    recipes: number;
    documents: number;
    expenses: number;
}

export const exportService = {
    /**
     * Get live counts of items in the database
     */
    async getStats(): Promise<ExportStats> {
        try {
            const [events, tasks, lists, recipes, documents, expenses] = await Promise.all([
                database.collections.get('events').query().fetchCount(),
                database.collections.get('tasks').query().fetchCount(),
                database.collections.get('lists').query().fetchCount(),
                database.collections.get('recipes').query().fetchCount(),
                database.collections.get('documents').query().fetchCount(),
                database.collections.get('transactions').query().fetchCount(),
            ]);

            return {
                events,
                tasks,
                lists,
                recipes,
                documents,
                expenses,
            };
        } catch (error) {
            console.warn('Failed to fetch export stats:', error);
            return { events: 0, tasks: 0, lists: 0, recipes: 0, documents: 0, expenses: 0 };
        }
    },

    /**
     * Calculate estimated size of the JSON export
     */
    async calculateEstimatedSize(stats: ExportStats, format: ExportFormat): Promise<string> {
        // Rough estimation based on average record size
        // JSON is verbose. CSV is tighter but we only export core fields.
        const avgJsonSize = 500; // bytes per record
        const avgCsvSize = 150; // bytes per record

        const totalItems = Object.values(stats).reduce((a, b) => a + b, 0);
        const multiplier = format === 'json' ? avgJsonSize : avgCsvSize;
        const totalBytes = totalItems * multiplier;

        if (totalBytes < 1024) return '< 1 KB';
        if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
        return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    },

    /**
     * Generate backup file and return the path
     */
    async generateBackup(type: ExportFormat, selectedData: string[]): Promise<string> {
        const data: Record<string, any[]> = {};

        // 1. Fetch Data
        if (selectedData.includes('events')) {
            const records = await database.collections.get('events').query().fetch();
            data.events = records.map(r => (r as any)._raw);
        }
        if (selectedData.includes('tasks')) {
            const records = await database.collections.get('tasks').query().fetch();
            data.tasks = records.map(r => (r as any)._raw);
        }
        if (selectedData.includes('lists')) {
            const records = await database.collections.get('lists').query().fetch();
            data.lists = records.map(r => (r as any)._raw);
        }
        if (selectedData.includes('recipes')) {
            const records = await database.collections.get('recipes').query().fetch();
            data.recipes = records.map(r => (r as any)._raw);
        }
        if (selectedData.includes('documents')) {
            const records = await database.collections.get('documents').query().fetch();
            data.documents = records.map(r => (r as any)._raw);
        }
        if (selectedData.includes('expenses')) {
            const records = await database.collections.get('transactions').query().fetch();
            data.expenses = records.map(r => (r as any)._raw);
        }

        // 2. Format Data
        let content = '';
        let filename = `backup_${new Date().toISOString().split('T')[0]}_${new Date().getTime()}`;

        if (type === 'json') {
            content = JSON.stringify(data, null, 2);
            filename += '.json';
        } else {
            // Flatten generic CSV: "Type, ID, Name/Title, Date"
            // This is a simplified CSV for user readability
            const lines = ['Type,ID,Title,Details'];
            Object.entries(data).forEach(([key, records]) => {
                records.forEach((r: any) => {
                    // Try to guess common title fields
                    const title = r.title || r.name || r.id;
                    const date = r.date || r.created_at || '';
                    // Escape commas
                    const safeTitle = `"${String(title).replace(/"/g, '""')}"`;
                    lines.push(`${key},${r.id},${safeTitle},${date}`);
                });
            });
            content = lines.join('\n');
            filename += '.csv';
        }

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
