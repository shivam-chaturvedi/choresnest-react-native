import Share from "react-native-share";
import RNFS from "react-native-fs";
import * as RNHTMLtoPDF from "react-native-html-to-pdf";
import { database } from "../database";

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
                data[key] = records.map(r => (r as any)._raw);
            } catch (e) {
                console.warn(`Failed to export table ${tableName}`, e);
                data[key] = []; // Ensure key exists even on failure
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

        // Validate that we have some data
        const totalRecords = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
        if (totalRecords === 0) {
            throw new Error('No data to export. Please ensure you have data in the selected categories.');
        }

        const filename = `backup_${new Date().toISOString().split('T')[0]}_${new Date().getTime()}.txt`;

        // 3. Write File
        const path = `${RNFS.CachesDirectoryPath}/${filename}`;
        await RNFS.writeFile(path, content, 'utf8');

        console.log(`Backup created: ${path}, ${totalRecords} records, ${(content.length / 1024).toFixed(1)} KB`);
        return path;
    },

    /**
     * Share the backup file
     */
    async shareBackup(filePath: string): Promise<void> {
        try {
            console.log("Sharing file:", filePath);
            const filename = filePath.split("/").pop();

            // MUST use urls array (Android fix)
            await Share.open({
                title: "Family Backup",
                urls: [`file://${filePath}`],
                type: "text/plain",
                filename: filename, // Force filename for Android
                failOnCancel: false,
            });

        } catch (error: any) {
            console.error("Share failed:", error);

            if (error?.error === "User did not share") return;

            throw error;
        }
    },

    /**
     * Generate styled HTML content for PDF
     */
    generateHTML(data: Record<string, any[]>): string {
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();

        // CSS for a professional, printable look
        const css = `
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #333; line-height: 1.6; }
                h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
                h2 { color: #1e40af; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #1e40af; padding-left: 10px; background: #f3f4f6; padding: 8px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
                th { background-color: #f8fafc; font-weight: bold; color: #475569; }
                tr:nth-child(even) { background-color: #f9fafb; }
                .meta { margin-bottom: 30px; font-size: 14px; color: #666; }
                .empty { font-style: italic; color: #999; padding: 10px; }
                .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
                .badge-high { background: #fee2e2; color: #991b1b; }
                .badge-medium { background: #fef3c7; color: #92400e; }
                .badge-low { background: #d1fae5; color: #065f46; }
            </style>
        `;

        let html = `
            <html>
            <head>${css}</head>
            <body>
                <h1>Family Chores Export</h1>
                <div class="meta">
                    <strong>Generated:</strong> ${date} at ${time}<br/>
                    <strong>Total Items:</strong> ${Object.values(data).reduce((acc, arr) => acc + arr.length, 0)}
                </div>
        `;

        // Helper to generate tables dynamically specifically tuned for each type
        const renderTable = (title: string, items: any[], columns: { header: string, key: string, render?: (item: any) => string }[]) => {
            if (!items || items.length === 0) return `<h2>${title}</h2><div class="empty">No data available</div>`;

            const headers = columns.map(c => `<th>${c.header}</th>`).join('');
            const rows = items.map(item => `
                <tr>
                    ${columns.map(c => `<td>${c.render ? c.render(item) : (item[c.key] || '-')}</td>`).join('')}
                </tr>
            `).join('');

            return `
                <h2>${title} (${items.length})</h2>
                <table>
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        };

        // EVENTS
        if (data.events) {
            html += renderTable('Calendar Events', data.events, [
                {
                    header: 'Title',
                    key: 'title',
                    render: (e) => `${e.icon || '📅'} ${e.title || '-'}`
                },
                {
                    header: 'Date',
                    key: 'date',
                    render: (e) => e.date || '-'
                },
                {
                    header: 'Time',
                    key: 'time',
                    render: (e) => `${e.time || '-'} → ${e.end_time || '-'}`
                },
                {
                    header: 'Recurring',
                    key: 'is_recurring',
                    render: (e) => e.is_recurring ? 'Yes' : 'No'
                }
            ]);
        }

        // TASKS
        if (data.tasks) {
            html += renderTable('Tasks & Chores', data.tasks, [
                {
                    header: 'Task',
                    key: 'name',
                    render: (t) => `${t.icon || '📝'} ${t.name || '-'}`
                },
                {
                    header: 'Status',
                    key: 'status',
                    render: (t) => t.status || '-'
                },
                {
                    header: 'Priority',
                    key: 'priority',
                    render: (t) => {
                        const p = (t.priority || "low").toLowerCase();
                        return `<span class="badge badge-${p}">${p}</span>`;
                    }
                },
                {
                    header: 'Due',
                    key: 'due_display',
                    render: (t) => t.due_display ? `${t.date} at ${t.due_display}` : (t.date || '-')
                }
            ]);
        }

        // MEMBERS
        if (data.members) {
            html += renderTable('Family Members', data.members, [
                {
                    header: 'Name',
                    key: 'name',
                    render: (m) => `${m.symbol || '👤'} ${m.name}`
                },
                {
                    header: 'Color',
                    key: 'color',
                    render: (m) => m.color || '-'
                },
                {
                    header: 'Active',
                    key: 'is_active',
                    render: (m) => m.is_active ? 'Yes' : 'No'
                }
            ]);
        }

        // SHOPPING LISTS
        if (data.lists && data.lists.length > 0) {
            html += renderTable('Shopping Lists', data.lists, [
                { header: 'Name', key: 'name' },
                { header: 'Icon', key: 'icon' },
                {
                    header: 'Items',
                    key: 'id',
                    render: (list) => {
                        const items = data.list_items?.filter(item => item.list_id === list.id) || [];
                        return items.length > 0
                            ? items.map(item => `• ${item.name} (${item.quantity || 1})`).join('<br/>')
                            : '<i>No items</i>';
                    }
                }
            ]);
        }

        // RECIPES
        if (data.recipes && data.recipes.length > 0) {
            html += renderTable('Recipes', data.recipes, [
                { header: 'Name', key: 'name' },
                { header: 'Prep Time', key: 'prep_time', render: (i) => i.prep_time ? `${i.prep_time} min` : '-' },
                { header: 'Servings', key: 'servings' },
                { header: 'Category', key: 'category' }
            ]);
        }

        // TRANSACTIONS (Expenses)
        if (data.transactions && data.transactions.length > 0) {
            html += renderTable('Expenses', data.transactions, [
                { header: 'Description', key: 'description' },
                { header: 'Amount', key: 'amount', render: (i) => `$${Number(i.amount).toFixed(2)}` },
                { header: 'Category', key: 'category' },
                {
                    header: 'Date',
                    key: 'date',
                    render: (i) => i.date ? new Date(i.date).toLocaleDateString() : '-'
                }
            ]);
        }

        // BUDGETS
        if (data.budgets && data.budgets.length > 0) {
            html += renderTable('Budgets', data.budgets, [
                { header: 'Name', key: 'name' },
                { header: 'Limit', key: 'limit', render: (b) => `$${Number(b.limit).toFixed(2)}` }
            ]);
        }

        // SETTINGS
        if (data.settings && data.settings.length > 0) {
            html += renderTable('App Settings', data.settings, [
                { header: 'Key', key: 'key' },
                { header: 'Value', key: 'value' }
            ]);
        }

        // NOTIFICATION PREFERENCES
        if (data.notification_preferences && data.notification_preferences.length > 0) {
            html += renderTable('Notification Preferences', data.notification_preferences, [
                { header: 'Category', key: 'category' },
                {
                    header: 'Enabled',
                    key: 'enabled',
                    render: (n) => n.enabled ? 'Yes' : 'No'
                },
                {
                    header: 'Reminder',
                    key: 'reminder_offset_minutes',
                    render: (n) => `${n.reminder_offset_minutes} min before`
                }
            ]);
        }

        // QUIET HOURS
        if (data.quiet_hours && data.quiet_hours.length > 0) {
            html += renderTable('Quiet Hours', data.quiet_hours, [
                {
                    header: 'Enabled',
                    key: 'enabled',
                    render: (q) => q.enabled ? 'Yes' : 'No'
                },
                {
                    header: 'Start',
                    key: 'start_hour',
                    render: (q) => `${q.start_hour}:${String(q.start_minute).padStart(2, '0')}`
                },
                {
                    header: 'End',
                    key: 'end_hour',
                    render: (q) => `${q.end_hour}:${String(q.end_minute).padStart(2, '0')}`
                }
            ]);
        }

        // APP LOCK
        if (data.app_lock && data.app_lock.length > 0) {
            html += renderTable('App Lock', data.app_lock, [
                {
                    header: 'Enabled',
                    key: 'enabled',
                    render: (a) => a.enabled ? 'Yes' : 'No'
                },
                {
                    header: 'Biometric',
                    key: 'biometric_enabled',
                    render: (a) => a.biometric_enabled ? 'Yes' : 'No'
                },
                {
                    header: 'Updated',
                    key: 'updated_at',
                    render: (a) => a.updated_at ? new Date(a.updated_at).toLocaleString() : '-'
                }
            ]);
        }

        // USER PREFERENCES
        if (data.user_preferences && data.user_preferences.length > 0) {
            html += renderTable('User Preferences', data.user_preferences, [
                { header: 'Country', key: 'country_code' },
                {
                    header: 'Updated',
                    key: 'updated_at',
                    render: (u) => u.updated_at ? new Date(u.updated_at).toLocaleString() : '-'
                }
            ]);
        }

        html += `</body></html>`;
        return html;
    },

    /**
     * Generate PDF and share it
     */
    async exportAsPDF(selectedData: string[]): Promise<void> {
        try {
            const data: Record<string, any[]> = {};

            // Clean WatermelonDB internal fields
            const cleanRow = (row: any) => {
                const copy = { ...row };
                delete copy._status;
                delete copy._changed;
                return copy;
            };

            // Fetch table data
            const fetchTable = async (tableName: string, key: string) => {
                try {
                    const records = await database.collections.get(tableName).query().fetch();
                    data[key] = records.map(r => cleanRow((r as any)._raw));
                } catch {
                    data[key] = [];
                }
            };

            // Fetch based on selection - MATCHING JSON EXPORT LOGIC
            if (selectedData.includes('events')) {
                await fetchTable('events', 'events');
            }
            if (selectedData.includes('tasks')) {
                await fetchTable('tasks', 'tasks');
            }
            if (selectedData.includes('lists')) {
                await fetchTable('lists', 'lists');
                await fetchTable('list_items', 'list_items');
                await fetchTable('list_categories', 'list_categories');
            }
            if (selectedData.includes('recipes')) {
                await fetchTable('recipes', 'recipes');
                await fetchTable('collections', 'collections');
                await fetchTable('collection_recipes', 'collection_recipes');
                await fetchTable('meal_plans', 'meal_plans');
            }
            if (selectedData.includes('documents')) {
                await fetchTable('documents', 'documents');
            }
            if (selectedData.includes('expenses')) {
                await fetchTable('transactions', 'transactions');
                await fetchTable('budgets', 'budgets');
            }
            if (selectedData.includes('system')) {
                await fetchTable('users', 'users');
                await fetchTable('members', 'members');
                await fetchTable('settings', 'settings');
                await fetchTable('notification_preferences', 'notification_preferences');
                await fetchTable('quiet_hours', 'quiet_hours');
                await fetchTable('app_lock', 'app_lock');
                await fetchTable('user_preferences', 'user_preferences');
            }

            const html = this.generateHTML(data);

            const fileName = `FamilyExport_${Date.now()}`;
            const options = {
                html,
                fileName,
                directory: 'Documents',
                base64: false
            };

            // Generate PDF using the imported library
            const file = await RNHTMLtoPDF.generatePDF(options);

            if (!file || !file.filePath) throw new Error('PDF generation failed');

            console.log('PDF Generated:', file.filePath);

            // Copy to Downloads folder so social apps can access it
            const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}.pdf`;
            await RNFS.copyFile(file.filePath, destPath);

            console.log('Copied to Downloads:', destPath);

            // Share from Downloads directory
            await Share.open({
                title: "Family Chores PDF Export",
                message: "Family Chores Data Export",
                urls: [`file://${destPath}`],
                type: "application/pdf",
                subject: "Family Chores Export",
                failOnCancel: false,
            });

        } catch (error) {
            console.error('PDF Export failed:', error);
            throw error;
        }
    }
};
