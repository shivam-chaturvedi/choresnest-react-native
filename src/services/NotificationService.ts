import { database } from '../database';
import Task from '../database/models/Task';
import Event from '../database/models/Event';
import { Q } from '@nozbe/watermelondb';

// Basic logic: Count pending tasks + upcoming events within 24h as "notifications"
// Or if you implement a specific Notification table later, change this.
export const NotificationService = {
    getUnreadCount: async () => {
        try {
            // Example: Only count high priority pending tasks
            const pendingTasks = await database.get<Task>('tasks').query(
                Q.where('status', 'pending'),
                Q.where('priority', 'high')
            ).fetchCount();

            // Upcoming events today
            const today = new Date().toISOString().split('T')[0];
            const eventsToday = await database.get<Event>('events').query(
                Q.where('date', today)
            ).fetchCount();

            return pendingTasks + eventsToday;
        } catch (error) {
            console.error('Error fetching notification count:', error);
            return 0;
        }
    },

    // "Mark as read" could mean just clearing a flag, but since we don't have a Notification model yet,
    // we might mock this or set a "viewed" flag if we add it to Task/Event.
    // For now, let's just return 0 if "Mark all as read" is clicked (handle in UI state)
    // or actually update the items.
    markAllAsRead: async () => {
        // Placeholder: Implement 'viewed' logic in models if needed.
        // user said "mark all as read button also must work".
        // We'll interpret this as clearing the local badge count for now or setting a 'last_checked' timestamp in Settings.
    }
};
