import Share from "react-native-share";
import RNFS from "react-native-fs";
import { generatePDF } from 'react-native-html-to-pdf';
import { database } from "../database";
import { Platform } from "react-native";

export type ExportFormat = 'json';

export interface ExportStats {
    events: number;
    tasks: number;
    lists: number;
    recipes: number;
    documents: number;
    notes: number;
    expenses: number;
    system: number;
}

export const exportService = {
    isPdfGenerating: false,

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
                documents: documents,
                notes: notes + folders,
                expenses: transactions + budgets,
                system: users + members + settings + notificationPreferences + quietHours + appLock + userPreferences,
            };
        } catch (error) {
            console.warn('Failed to fetch export stats:', error);
            return { events: 0, tasks: 0, lists: 0, recipes: 0, documents: 0, notes: 0, expenses: 0, system: 0 };
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
    /**
     * Collect data for export
     */
    async collectExportData(selectedData: string[]): Promise<Record<string, any[]>> {
        const data: Record<string, any[]> = {};

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
        }
        if (selectedData.includes('notes')) {
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

        return data;
    },

    /**
     * Generate backup file and return the path
     */
    async generateBackup(selectedData: string[]): Promise<string> {
        const data = await this.collectExportData(selectedData);
        const meta = {
            version: 1,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            app: 'Family Chores',
            format: 'json'
        };

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
     * Export data as PDF
     */
    async exportAsPDF(selectedData: string[]): Promise<string> {
        if (this.isPdfGenerating) {
            throw new Error('A PDF export is already in progress. Please wait.');
        }

        this.isPdfGenerating = true;
        console.log('Starting PDF Export with categories:', selectedData);

        try {
            // 1. Fetch Data
            const data = await this.collectExportData(selectedData);

            // 2. Generate HTML
            const html = this.generateHTML(data);

            // 3. Create PDF
            // Note: react-native-html-to-pdf typically saves to Documents/ or Cache depending on OS
            // We'll let it save where it wants, then move it if needed.
            const options = {
                html,
                fileName: `FamilyChores_Export_${new Date().getTime()}`,
                directory: 'Documents',
            };

            const file = await generatePDF(options);
            console.log('PDF Generated initially at:', file.filePath);

            if (!file.filePath) throw new Error('PDF generation failed: No file path returned');

            // 4. Move to Cache Directory (Crucial for consistent sharing on Android)
            const filename = file.filePath.split('/').pop();
            const destPath = `${RNFS.CachesDirectoryPath}/${filename}`;

            // On Android, the file might already be in a cache-like area or Documents.
            // Explicitly move/copy it to our app's safe cache directory.
            if (file.filePath !== destPath) {
                // Remove destination if exists
                if (await RNFS.exists(destPath)) {
                    await RNFS.unlink(destPath);
                }
                // Copy file
                await RNFS.copyFile(file.filePath, destPath);
                console.log('PDF copied to cache:', destPath);
            }

            return destPath;
        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw error;
        } finally {
            // Add a small delay to allow native cleanup
            setTimeout(() => {
                this.isPdfGenerating = false;
            }, 1000);
        }
    },

    /**
     * Share the backup file
     */
    async shareBackup(filePath: string): Promise<void> {
        try {
            console.log("=== SHARE DEBUG START ===");
            console.log("Original filePath:", filePath);

            const exists = await RNFS.exists(filePath);
            if (!exists) {
                throw new Error(`File not found at path: ${filePath}`);
            }

            const filename = filePath.split("/").pop();
            const isPdf = filename?.toLowerCase().endsWith('.pdf');
            const mimeType = isPdf ? 'application/pdf' : 'text/plain';
            const title = isPdf ? "Family Chores PDF Export" : "Family Backup";

            // Ensure path has file:// prefix for proper file sharing
            let shareUrl = filePath;
            if (!filePath.startsWith('file://') && !filePath.startsWith('content://')) {
                shareUrl = `file://${filePath}`;
            }

            console.log("Final Share URL:", shareUrl);
            console.log("MIME type:", mimeType);

            // Prepare share options
            // Use 'url' for single file sharing. This is the most standard way to trigger 
            // the "Share 1 file" sheet on Android.
            const shareOptions: any = {
                title: title,
                url: shareUrl,
                type: mimeType,
                failOnCancel: false,
                subject: title,
            };

            // Only add message if it's NOT a PDF/File share, or if we want to be safe.
            // Often adding a message converts it to a "text share" with attachment, 
            // rather than a "file share". For backups, we want clean file sharing.
            if (!isPdf) {
                shareOptions.message = "Family Chores Data Backup";
            }

            console.log("Share options prepared");
            await Share.open(shareOptions);

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
                { header: 'Cook Time', key: 'cook_time', render: (i) => i.cook_time ? `${i.cook_time} min` : '-' },
                { header: 'Servings', key: 'servings' },
                { header: 'Difficulty', key: 'difficulty', render: (i) => i.difficulty || '-' }
            ]);
        }

        // RECIPE COLLECTIONS
        if (data.collections && data.collections.length > 0) {
            html += renderTable('Recipe Collections', data.collections, [
                { header: 'Name', key: 'name' },
                { header: 'Description', key: 'description', render: (c) => c.description || '-' },
                { header: 'Color', key: 'color' }
            ]);
        }

        // MEAL PLANS
        if (data.meal_plans && data.meal_plans.length > 0) {
            html += renderTable('Meal Plans', data.meal_plans, [
                { header: 'Date', key: 'date' },
                { header: 'Type', key: 'type' },
                { header: 'Recipe ID', key: 'recipe_id' },
                { header: 'Cooked', key: 'is_cooked', render: (m) => m.is_cooked ? 'Yes' : 'No' }
            ]);
        }

        // TRANSACTIONS (Expenses)
        if (data.transactions && data.transactions.length > 0) {
            html += renderTable('Expenses', data.transactions, [
                { header: 'Name', key: 'name' },
                { header: 'Amount', key: 'amount', render: (i) => `$${Number(i.amount).toFixed(2)}` },
                { header: 'Type', key: 'type' },
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
                { header: 'Category', key: 'category' },
                { header: 'Amount', key: 'amount', render: (b) => `$${Number(b.amount).toFixed(2)}` },
                { header: 'Month', key: 'month' }
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

        // FOLDERS (Note Folders)
        if (data.folders && data.folders.length > 0) {
            html += renderTable('Note Folders', data.folders, [
                {
                    header: 'Title',
                    key: 'title',
                    render: (f) => `${f.icon || '📁'} ${f.title || '-'}`
                },
                {
                    header: 'Notes Count',
                    key: 'id',
                    render: (f) => {
                        const count = data.notes?.filter(n => n.folder_id === f.id).length || 0;
                        return count.toString();
                    }
                }
            ]);
        }

        // NOTES
        if (data.notes && data.notes.length > 0) {
            html += renderTable('Notes', data.notes, [
                {
                    header: 'Title',
                    key: 'title',
                    render: (n) => {
                        const starred = n.is_starred ? '⭐ ' : '';
                        return `${starred}${n.title || 'Untitled'}`;
                    }
                },
                {
                    header: 'Preview',
                    key: 'preview',
                    render: (n) => n.preview || 'No content'
                },
                {
                    header: 'Folder',
                    key: 'folder_id',
                    render: (n) => {
                        const folder = data.folders?.find(f => f.id === n.folder_id);
                        return folder ? folder.title : '-';
                    }
                },
                {
                    header: 'Updated',
                    key: 'updated_at',
                    render: (n) => n.updated_at ? new Date(n.updated_at).toLocaleDateString() : '-'
                }
            ]);
        }

        html += `</body></html>`;
        return html;
    }
};
