import { database } from '../database';
import Task from '../database/models/Task';
import Event from '../database/models/Event';
import { List, ListItem, ListCategory } from '../database/models/List';
import { Q } from '@nozbe/watermelondb';
import { NotificationScheduler } from './NotificationScheduler';
import { NotificationPreferencesService } from './NotificationPreferencesService';

const parseDateTime = (dateStr: string, timeStr?: string): Date | null => {
    try {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;

        if (timeStr && timeStr !== 'All Day') {
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (match) {
                let hours = parseInt(match[1]);
                const minutes = parseInt(match[2]);
                const period = match[3].toUpperCase();

                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;

                date.setHours(hours);
                date.setMinutes(minutes);
            } else {
                // Default to 9 AM if time format not matched but time exists
                date.setHours(9);
                date.setMinutes(0);
            }
        } else {
            // All day or no time -> 9 AM default
            date.setHours(9);
            date.setMinutes(0);
        }
        return date;
    } catch (e) {
        console.error('Error parsing date/time:', e);
        return null;
    }
};

export const TaskService = {
    // --- Tasks ---
    observeTasks: () => database.get<Task>('tasks').query().observe(),

    addTask: async (data: Partial<Task>) => {
        try {
            return await database.write(async () => {
                const task = await database.get<Task>('tasks').create(t => {
                    t.name = data.name || 'Untitled';
                    t.status = data.status || 'pending';
                    t.priority = data.priority || 'medium';
                    t.dateString = data.dateString || new Date().toISOString().split('T')[0];
                    t.dueDisplay = data.dueDisplay || '';
                    t.assigneeId = data.assigneeId || '';
                    t.tab = data.tab || 'My Tasks';
                    t.icon = data.icon || '📝';
                    t.reminderEnabled = data.reminderEnabled ?? true;
                });

                // Schedule notification if pending and enabled
                if (task.status !== 'done' && task.reminderEnabled) {
                    const triggerDate = parseDateTime(task.dateString, task.dueDisplay);
                    if (triggerDate && triggerDate > new Date()) {
                        // Get reminder time from preferences
                        const reminderMinutes = await NotificationPreferencesService.getReminderTime('tasks');
                        const notificationTrigger = new Date(triggerDate.getTime() - reminderMinutes * 60000);

                        const notificationId = await NotificationScheduler.scheduleNotification(
                            'tasks',
                            {
                                title: `Task: ${task.name}`,
                                body: `Due ${task.dueDisplay || 'today'}! Priority: ${task.priority}`,
                                data: { taskId: task.id }
                            },
                            notificationTrigger
                        );
                        if (notificationId) {
                            await task.update(t => {
                                t.notificationId = notificationId;
                            });
                        }
                    }
                }

                return task;
            });
        } catch (error) {
            console.error('Error adding task:', error);
            return null;
        }
    },

    updateTask: async (id: string, updates: Partial<Task>) => {
        await database.write(async () => {
            const task = await database.get<Task>('tasks').find(id);
            const oldNotificationId = task.notificationId;

            await task.update(t => {
                if (updates.name !== undefined) t.name = updates.name;
                if (updates.status !== undefined) t.status = updates.status;
                if (updates.priority !== undefined) t.priority = updates.priority;
                if (updates.dateString !== undefined) t.dateString = updates.dateString;
                if (updates.dueDisplay !== undefined) t.dueDisplay = updates.dueDisplay;
                if (updates.assigneeId !== undefined) t.assigneeId = updates.assigneeId;
                if (updates.tab !== undefined) t.tab = updates.tab;
                if (updates.icon !== undefined) t.icon = updates.icon;
                if (updates.reminderEnabled !== undefined) t.reminderEnabled = updates.reminderEnabled;
            });

            // Handle notification changes
            const shouldNotify = (updates.status !== 'done' && task.status !== 'done') &&
                (task.reminderEnabled);

            if (shouldNotify) {
                const triggerDate = parseDateTime(task.dateString, task.dueDisplay);
                // Only reschedule if date/time/name changed or enabled toggled
                if (triggerDate && triggerDate > new Date()) {
                    // Get reminder time from preferences
                    const reminderMinutes = await NotificationPreferencesService.getReminderTime('tasks');
                    const notificationTrigger = new Date(triggerDate.getTime() - reminderMinutes * 60000);

                    const newId = await NotificationScheduler.updateNotification(
                        oldNotificationId || null,
                        'tasks',
                        {
                            title: `Task: ${task.name}`,
                            body: `Due ${task.dueDisplay || 'today'}! Priority: ${task.priority}`,
                            data: { taskId: task.id }
                        },
                        notificationTrigger
                    );
                    if (newId) {
                        await task.update(t => { t.notificationId = newId; });
                    }
                }
            } else if (oldNotificationId && (task.status === 'done' || !task.reminderEnabled)) {
                // Cancel if done or disabled
                await NotificationScheduler.cancelNotification(oldNotificationId);
                await task.update(t => { t.notificationId = undefined; });
            }
        });
    },

    deleteTask: async (id: string) => {
        await database.write(async () => {
            try {
                const task = await database.get<Task>('tasks').find(id);
                if (task.notificationId) {
                    await NotificationScheduler.cancelNotification(task.notificationId);
                }
                await task.markAsDeleted(); // or destroyPermanently()
            } catch (e) {
                console.error('Error deleting task:', e);
            }
        });
    },

    // --- Events ---
    observeEvents: () => database.get<Event>('events').query().observe(),

    addEvent: async (data: Partial<Event>) => {
        return await database.write(async () => {
            const event = await database.get<Event>('events').create(e => {
                e.title = data.title || 'Untitled';
                e.dateString = data.dateString || '';
                e.time = data.time || '';
                e.endTime = data.endTime;
                e.endDate = data.endDate;
                e.memberId = data.memberId || '';
                e.icon = data.icon || '📅';
                e.description = data.description;
                e.notes = data.notes;
                e.location = data.location;
                e.isRecurring = data.isRecurring ?? false;
                e.recurrenceRule = data.recurrenceRule;
                e.recurrenceEndDate = data.recurrenceEndDate;
                e.reminderOffsetMinutes = data.reminderOffsetMinutes ?? 15; // Default 15 min reminder
            });

            // Schedule notification
            const eventDate = parseDateTime(event.dateString, event.time);
            if (eventDate) {
                // Get reminder time from preferences (use event.reminderOffsetMinutes if set, otherwise use preference)
                const preferredReminderMinutes = await NotificationPreferencesService.getReminderTime('events');
                const reminderMinutes = event.reminderOffsetMinutes ?? preferredReminderMinutes;

                // Apply offset
                const triggerDate = new Date(eventDate.getTime() - reminderMinutes * 60000);

                if (triggerDate > new Date()) {
                    const notificationId = await NotificationScheduler.scheduleNotification(
                        'events',
                        {
                            title: `Event: ${event.title}`,
                            body: event.location ? `at ${event.location}` : `Starting soon`,
                            data: { eventId: event.id }
                        },
                        triggerDate
                    );

                    if (notificationId) {
                        await event.update(e => { e.notificationId = notificationId; });
                    }
                }
            }

            return event;
        });
    },

    updateEvent: async (id: string, updates: Partial<Event>) => {
        await database.write(async () => {
            const event = await database.get<Event>('events').find(id);
            const oldNotificationId = event.notificationId;

            await event.update(e => {
                if (updates.title !== undefined) e.title = updates.title;
                if (updates.dateString !== undefined) e.dateString = updates.dateString;
                if (updates.time !== undefined) e.time = updates.time;
                if (updates.endTime !== undefined) e.endTime = updates.endTime;
                if (updates.endDate !== undefined) e.endDate = updates.endDate;
                if (updates.location !== undefined) e.location = updates.location;
                if (updates.description !== undefined) e.description = updates.description;
                if (updates.notes !== undefined) e.notes = updates.notes;
                if (updates.icon !== undefined) e.icon = updates.icon;
                if (updates.memberId !== undefined) e.memberId = updates.memberId;
                if (updates.isRecurring !== undefined) e.isRecurring = updates.isRecurring;
                if (updates.recurrenceRule !== undefined) e.recurrenceRule = updates.recurrenceRule;
                if (updates.recurrenceEndDate !== undefined) e.recurrenceEndDate = updates.recurrenceEndDate;
                if (updates.reminderOffsetMinutes !== undefined) e.reminderOffsetMinutes = updates.reminderOffsetMinutes;
            });

            // Reschedule
            const eventDate = parseDateTime(event.dateString, event.time);
            if (eventDate) {
                // Get reminder time from preferences (use event.reminderOffsetMinutes if set, otherwise use preference)
                const preferredReminderMinutes = await NotificationPreferencesService.getReminderTime('events');
                const reminderMinutes = event.reminderOffsetMinutes ?? preferredReminderMinutes;

                const triggerDate = new Date(eventDate.getTime() - reminderMinutes * 60000);

                if (triggerDate > new Date()) {
                    const newId = await NotificationScheduler.updateNotification(
                        oldNotificationId || null,
                        'events',
                        {
                            title: `Event: ${event.title}`,
                            body: event.location ? `at ${event.location}` : `Starting soon`,
                            data: { eventId: event.id }
                        },
                        triggerDate
                    );

                    if (newId) {
                        await event.update(e => { e.notificationId = newId; });
                    }
                } else if (oldNotificationId) {
                    // If now in past, cancel old
                    await NotificationScheduler.cancelNotification(oldNotificationId);
                    await event.update(e => { e.notificationId = undefined; });
                }
            }
        });
    },

    deleteEvent: async (id: string) => {
        await database.write(async () => {
            try {
                const event = await database.get<Event>('events').find(id);
                if (event.notificationId) {
                    await NotificationScheduler.cancelNotification(event.notificationId);
                }
                await event.markAsDeleted();
            } catch (e) {
                console.error('Error deleting event:', e);
            }
        });
    },

    // --- Lists (Groceries/Todos) ---
    observeLists: () => database.get<List>('lists').query().observe(),

    observeShoppingListItems: () => {
        return database.get<ListItem>('list_items').query().observe();
    },

    addGroceryItem: async (data: Partial<ListItem>) => {
        await database.write(async () => {
            await database.get<ListItem>('list_items').create(i => {
                i.name = data.name || 'Item';
                i.quantity = data.quantity || 1;
                i.unit = data.unit || 'pcs';
                i.isCompleted = false;
            });
        });
    },

    toggleGroceryItem: async (id: string) => {
        await database.write(async () => {
            const item = await database.get<ListItem>('list_items').find(id);
            await item.update(i => {
                i.isCompleted = !i.isCompleted;
            });
        });
    }
};
