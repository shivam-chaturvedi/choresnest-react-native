import { database } from '../database';
import Task from '../database/models/Task';
import Event from '../database/models/Event';
import { NotificationScheduler, getActiveMemberId } from './NotificationScheduler';
import { NotificationPreferencesService } from './NotificationPreferencesService';
import { parseReminderDateTime } from '../utils/ReminderDateTimeUtils';
import { NotificationCenter, NotificationRoute } from './NotificationCenter';
import { CountryPreferenceService } from './CountryPreferenceService';
import { formatDateTime } from '../utils/countryFormatting';
import { SyncService } from './SyncService';
import { Q } from '@nozbe/watermelondb';
import { map } from 'rxjs/operators';

const syncAfterWrite = () => {
    void SyncService.requestSyncSoon();
};

const formatReminderDateTimeDisplay = (date: Date) =>
    formatDateTime(date, CountryPreferenceService.getCurrentCountry(), {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

const severityMeta: Record<"success" | "warning" | "default", { tone: string; textColor: string }> = {
    success: { tone: 'rgba(34,197,94,0.2)', textColor: '#22C55E' },
    warning: { tone: 'rgba(245,158,11,0.2)', textColor: '#F59E0B' },
    default: { tone: 'rgba(12,17,43,0.08)', textColor: '#0D2440' },
};

const TASKS_ROUTE: NotificationRoute = { tab: "more", screen: "Tasks" };
const EVENTS_ROUTE: NotificationRoute = { tab: "calendar" };

const EVENT_OBSERVE_COLUMNS: string[] = ['updated_at', 'deleted'];
const TASK_OBSERVE_COLUMNS: string[] = ['updated_at', 'deleted'];

const serializeEventRecord = (event: Event) => ({
    id: event.id,
    title: event.title,
    icon: event.icon,
    dateString: event.dateString,
    time: event.time,
    endTime: event.endTime,
    endDate: event.endDate,
    memberId: event.memberId,
    description: event.description,
    notes: event.notes,
    location: event.location,
    visibility: event.visibility,
    timeZone: event.timeZone,
    isRecurring: event.isRecurring,
    recurrenceRule: event.recurrenceRule,
    recurrenceEndDate: event.recurrenceEndDate,
    reminderOffsetMinutes: event.reminderOffsetMinutes,
    notificationId: event.notificationId,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    version: event.version,
    deleted: event.deleted,
});

const serializeTaskRecord = (task: Task) => ({
    id: task.id,
    name: task.name,
    icon: task.icon,
    status: task.status,
    priority: task.priority,
    dueDisplay: task.dueDisplay,
    dateString: task.dateString,
    assigneeId: task.assigneeId,
    tab: task.tab,
    notificationId: task.notificationId,
    reminderEnabled: task.reminderEnabled,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    version: task.version,
    deleted: task.deleted,
});

const pushHomeNotification = (
    title: string,
    detail: string,
    severity: "success" | "warning" | "default" = "default",
    route?: NotificationRoute
) => {
    const { tone, textColor } = severityMeta[severity];
    NotificationCenter.addNotification({
        title,
        detail,
        tone,
        textColor,
        icon: severity === "warning" ? "alertCircle" : "bell",
        route,
    });
};

type TaskNotificationJobOptions = { showFeedback: boolean };
const enqueueTaskNotificationJob = (taskId: string, options: TaskNotificationJobOptions) => {
    NotificationScheduler.enqueueJob(async () => {
        await handleTaskNotificationJob(taskId, options);
    });
};

const handleTaskNotificationJob = async (taskId: string, options: TaskNotificationJobOptions) => {
    try {
        const task = await database.get<Task>('tasks').find(taskId);
        const activeMemberId = await getActiveMemberId();
        const oldNotificationId = task.notificationId;

        if (!activeMemberId || task.assigneeId !== activeMemberId) {
            if (oldNotificationId) {
                await NotificationScheduler.cancelNotification(oldNotificationId);
                await database.write(async () => {
                    await task.update(t => {
                        t.notificationId = undefined;
                    });
                });
            }
            return;
        }

        const shouldNotify = task.status !== 'done' && task.reminderEnabled;
        if (shouldNotify) {
            const triggerDate = parseReminderDateTime(task.dateString, task.dueDisplay);
            if (triggerDate && triggerDate > new Date()) {
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
                    notificationTrigger,
                    {
                        notifyCenter: true,
                        promptForPermission: true,
                        promptForAlarm: true,
                    }
                );

                if (newId) {
                    await database.write(async () => {
                        await task.update(t => {
                            t.notificationId = newId;
                        });
                    });

                    if (options.showFeedback) {
                        const formattedReminder = formatReminderDateTimeDisplay(notificationTrigger);
                        pushHomeNotification(
                            "Task reminder updated",
                            `${task.name} reminder set for ${formattedReminder}.`,
                            "success",
                            TASKS_ROUTE
                        );
                        await NotificationScheduler.notifyImmediateUpdate(
                            'tasks',
                            `Task reminder updated: ${task.name}`,
                            `Reminder scheduled for ${formattedReminder}`,
                            { taskId: task.id }
                        );
                    }
                }
            }
        } else if (oldNotificationId) {
            await NotificationScheduler.cancelNotification(oldNotificationId);
            await database.write(async () => {
                await task.update(t => { t.notificationId = undefined; });
            });

            if (options.showFeedback) {
                pushHomeNotification(
                    "Task reminder cancelled",
                    `${task.name} will no longer trigger reminders.`,
                    "warning",
                    TASKS_ROUTE
                );
                await NotificationScheduler.notifyImmediateUpdate(
                    'tasks',
                    `Task reminder cancelled: ${task.name}`,
                    task.status === 'done'
                        ? "Task completed, reminder cleared."
                        : "Reminder toggled off.",
                    { taskId: task.id }
                );
            }
        }
    } catch (err) {
        console.error('Failed to process task notification job:', err);
    }
};

type EventNotificationJobOptions = { showFeedback: boolean; updates?: Partial<Event> };
const enqueueEventNotificationJob = (eventId: string, options: EventNotificationJobOptions) => {
    NotificationScheduler.enqueueJob(async () => {
        await handleEventNotificationJob(eventId, options);
    });
};

const handleEventNotificationJob = async (eventId: string, options: EventNotificationJobOptions) => {
    try {
        const event = await database.get<Event>('events').find(eventId);
        const oldNotificationId = event.notificationId;
        const eventDate = parseReminderDateTime(event.dateString, event.time);

        if (event.reminderOffsetMinutes !== undefined && event.reminderOffsetMinutes < 0) {
            if (oldNotificationId) {
                await NotificationScheduler.cancelNotification(oldNotificationId);
                await database.write(async () => {
                    await event.update(e => { e.notificationId = undefined; });
                });
                if (options.showFeedback) {
                    pushHomeNotification(
                        "Event reminder cancelled",
                        `${event.title} reminders have been disabled.`,
                        "warning",
                        EVENTS_ROUTE
                    );
                    await NotificationScheduler.notifyImmediateUpdate(
                        'events',
                        `Event reminder cancelled: ${event.title}`,
                        "Reminder removed via settings.",
                        { eventId: event.id }
                    );
                }
            }
            return;
        }

        const activeMemberId = await getActiveMemberId();
        if (!activeMemberId || event.memberId !== activeMemberId) {
            if (oldNotificationId) {
                await NotificationScheduler.cancelNotification(oldNotificationId);
                await database.write(async () => {
                    await event.update(e => { e.notificationId = undefined; });
                });
            }
            return;
        }

        if (!eventDate) {
            return;
        }

        const preferredReminderMinutes = await NotificationPreferencesService.getReminderTime('events');
        const reminderMinutes = event.reminderOffsetMinutes ?? preferredReminderMinutes;
        const triggerDate = new Date(eventDate.getTime() - reminderMinutes * 60000);

        if (options.updates?.isRecurring === false && event.isRecurring) {
            if (oldNotificationId) {
                await NotificationScheduler.cancelNotification(oldNotificationId);
                await database.write(async () => {
                    await event.update(e => { e.notificationId = undefined; });
                });
            }

            if (triggerDate > new Date()) {
                const newId = await NotificationScheduler.scheduleNotification(
                    'events',
                    {
                        title: `Event: ${event.title}`,
                        body: event.location ? `at ${event.location}` : `Starting soon`,
                        data: { eventId: event.id }
                    },
                    triggerDate,
                    {
                        repeatType: 'none',
                        notifyCenter: true,
                        promptForPermission: true,
                        promptForAlarm: true,
                    }
                );
                if (newId) {
                    await database.write(async () => {
                        await event.update(e => { e.notificationId = newId; });
                    });
                    if (options.showFeedback) {
                        const formattedReminder = formatReminderDateTimeDisplay(triggerDate);
                        pushHomeNotification(
                            "Event reminder updated",
                            `${event.title} reminder set for ${formattedReminder}.`,
                            "success",
                            EVENTS_ROUTE
                        );
                        await NotificationScheduler.notifyImmediateUpdate(
                            'events',
                            `Event reminder updated: ${event.title}`,
                            `Reminder scheduled for ${formattedReminder}`,
                            { eventId: event.id }
                        );
                    }
                }
            }
            return;
        }

        if (triggerDate > new Date() || event.isRecurring) {
            if (oldNotificationId) {
                await NotificationScheduler.cancelNotification(oldNotificationId);
            }

            const repeatRule = event.isRecurring ? event.recurrenceRule : undefined;
            const repeatType = NotificationScheduler.normalizeRepeatType(repeatRule);
            const repeatMeta = NotificationScheduler.buildRepeatMetaFromRule(repeatRule);
            const newId = await NotificationScheduler.scheduleNotification(
                'events',
                {
                    title: `Event: ${event.title}`,
                    body: event.location ? `at ${event.location}` : `Starting soon`,
                    data: { eventId: event.id }
                },
                triggerDate,
                {
                    repeatType,
                    repeatMeta,
                    notifyCenter: true,
                    promptForPermission: true,
                    promptForAlarm: true,
                }
            );

            if (newId) {
                await database.write(async () => {
                    await event.update(e => { e.notificationId = newId; });
                });
                if (options.showFeedback) {
                    const formattedReminder = formatReminderDateTimeDisplay(triggerDate);
                    pushHomeNotification(
                        "Event reminder updated",
                        `${event.title} reminder set for ${formattedReminder}.`,
                        "success",
                        EVENTS_ROUTE
                    );
                    await NotificationScheduler.notifyImmediateUpdate(
                        'events',
                        `Event reminder updated: ${event.title}`,
                        `Reminder scheduled for ${formattedReminder}`,
                        { eventId: event.id }
                    );
                }
            }
        } else if (oldNotificationId) {
            await NotificationScheduler.cancelNotification(oldNotificationId);
            await database.write(async () => {
                await event.update(e => { e.notificationId = undefined; });
            });
            if (options.showFeedback) {
                pushHomeNotification(
                    "Event reminder cancelled",
                    `${event.title} reminder cleared because the event is in the past.`,
                    "warning",
                    EVENTS_ROUTE
                );
                await NotificationScheduler.notifyImmediateUpdate(
                    'events',
                    `Event reminder cancelled: ${event.title}`,
                    "Reminder cleared because the event no longer has an upcoming occurrence.",
                    { eventId: event.id }
                );
            }
        }
    } catch (err) {
        console.error('Failed to process event notification job:', err);
    }
};

export const TaskService = {
    // --- Tasks ---
    observeTasks: () => {
        const query = database.get<Task>('tasks').query(
            Q.where('deleted', false),
        );
        return query.observeWithColumns(TASK_OBSERVE_COLUMNS).pipe(
            map(records => records.map(serializeTaskRecord))
        );
    },

    addTask: async (data: Partial<Task>) => {
        const now = Date.now();
        let createdTaskId: string | undefined;

        await database.write(async () => {
            const task = await database.get<Task>('tasks').create(t => {
                t.name = data.name || 'Untitled';
                t.status = data.status || 'pending';
                t.priority = data.priority || 'medium';
                t.dateString = data.dateString || new Date().toISOString().split('T')[0];
                t.dueDisplay = data.dueDisplay || '';
                t.assigneeId = data.assigneeId || '';
                t.tab = data.tab || 'My Tasks';
                t.icon = data.icon || 'format-list-checks';
                t.reminderEnabled = data.reminderEnabled ?? true;
                t.createdAt = now;
                t.updatedAt = now;
                t.version = 1;
                t.deleted = false;
            });
            createdTaskId = task.id;
        });

        if (createdTaskId) {
            enqueueTaskNotificationJob(createdTaskId, { showFeedback: false });
        }
        syncAfterWrite();
    },

    updateTask: async (id: string, updates: Partial<Task>) => {
        const now = Date.now();

        await database.write(async () => {
            const task = await database.get<Task>('tasks').find(id);
            await task.update(tsk => {
                if (updates.name !== undefined) tsk.name = updates.name;
                if (updates.status !== undefined) tsk.status = updates.status;
                if (updates.priority !== undefined) tsk.priority = updates.priority;
                if (updates.dateString !== undefined) tsk.dateString = updates.dateString;
                if (updates.dueDisplay !== undefined) tsk.dueDisplay = updates.dueDisplay;
                if (updates.assigneeId !== undefined) tsk.assigneeId = updates.assigneeId;
                if (updates.tab !== undefined) tsk.tab = updates.tab;
                if (updates.icon !== undefined) tsk.icon = updates.icon;
                if (updates.reminderEnabled !== undefined) tsk.reminderEnabled = updates.reminderEnabled;
                tsk.updatedAt = now;
                tsk.version = (tsk.version ?? 0) + 1;
            });
        });

        enqueueTaskNotificationJob(id, { showFeedback: true });
        syncAfterWrite();
    },

    deleteTask: async (id: string) => {
        let notificationId: string | undefined;
        try {
            const task = await database.get<Task>('tasks').find(id);
            notificationId = task.notificationId;
        } catch { /* ignore */ }

        const now = Date.now();
        await database.write(async () => {
            try {
                const task = await database.get<Task>('tasks').find(id);
                await task.update(tsk => {
                    tsk.deleted = true;
                    tsk.updatedAt = now;
                    tsk.version = (tsk.version ?? 0) + 1;
                });
            } catch (error) {
                console.error('Error soft deleting task:', error);
            }
        });
        syncAfterWrite();

        if (notificationId) {
            NotificationScheduler.cancelNotification(notificationId).catch(err => console.error('Bg cancel failed', err));
        }
    },

    // --- Events ---
    observeEvents: () => {
        const query = database.get<Event>('events').query(
            Q.where('deleted', false),
        );
        return query.observeWithColumns(EVENT_OBSERVE_COLUMNS).pipe(
            map(records => records.map(serializeEventRecord))
        );
    },

    addEvent: async (data: Partial<Event>) => {
        const now = Date.now();
        let createdEventId: string | undefined;

        await database.write(async () => {
            const event = await database.get<Event>('events').create(e => {
                e.title = data.title || 'Untitled';
                e.dateString = data.dateString || '';
                e.time = data.time || '';
                e.endTime = data.endTime;
                e.endDate = data.endDate;
                e.memberId = data.memberId || '';
                e.icon = data.icon || 'calendar-star';
                e.description = data.description;
                e.notes = data.notes;
                e.location = data.location;
                e.visibility = data.visibility || 'default'; // ✅ REQUIRED FIELD
                e.timeZone = data.timeZone;
                e.isRecurring = data.isRecurring ?? false;
                e.recurrenceRule = data.recurrenceRule;
                e.recurrenceEndDate = data.recurrenceEndDate;
                e.reminderOffsetMinutes = data.reminderOffsetMinutes ?? 15;
                e.createdAt = now;
                e.updatedAt = now;
                e.version = 1;
                e.deleted = false;
            });
            createdEventId = event.id;
        });

        if (createdEventId) {
            enqueueEventNotificationJob(createdEventId, { showFeedback: false });
        }
        syncAfterWrite();
    },

    updateEvent: async (id: string, updates: Partial<Event>) => {
        const now = Date.now();

        await database.write(async () => {
            const event = await database.get<Event>('events').find(id);
            await event.update(ev => {
                if (updates.title !== undefined) ev.title = updates.title;
                if (updates.dateString !== undefined) ev.dateString = updates.dateString;
                if (updates.time !== undefined) ev.time = updates.time;
                if (updates.endTime !== undefined) ev.endTime = updates.endTime;
                if (updates.endDate !== undefined) ev.endDate = updates.endDate;
                if (updates.location !== undefined) ev.location = updates.location;
                if (updates.description !== undefined) ev.description = updates.description;
                if (updates.notes !== undefined) ev.notes = updates.notes;
                if (updates.icon !== undefined) ev.icon = updates.icon;
                if (updates.memberId !== undefined) ev.memberId = updates.memberId;
                if (updates.isRecurring !== undefined) ev.isRecurring = updates.isRecurring;
                if (updates.recurrenceRule !== undefined) ev.recurrenceRule = updates.recurrenceRule;
                if (updates.recurrenceEndDate !== undefined) ev.recurrenceEndDate = updates.recurrenceEndDate;
                if (updates.reminderOffsetMinutes !== undefined) ev.reminderOffsetMinutes = updates.reminderOffsetMinutes;
                if (updates.timeZone !== undefined) ev.timeZone = updates.timeZone;
                if (updates.visibility !== undefined) ev.visibility = updates.visibility;
                ev.updatedAt = now;
                ev.version = (ev.version ?? 0) + 1;
            });
        });

        enqueueEventNotificationJob(id, { showFeedback: true, updates });
        syncAfterWrite();
    },

    deleteEvent: async (id: string) => {
        let notificationId: string | undefined;
        try {
            const event = await database.get<Event>('events').find(id);
            notificationId = event.notificationId;
        } catch { /* ignore if not found */ }

        const now = Date.now();
        await database.write(async () => {
            try {
                const event = await database.get<Event>('events').find(id);
                await event.update(ev => {
                    ev.deleted = true;
                    ev.updatedAt = now;
                    ev.version = (ev.version ?? 0) + 1;
                });
            } catch (error) {
                console.error('Error soft deleting event:', error);
            }
        });
        syncAfterWrite();

        if (notificationId) {
            NotificationScheduler.cancelNotification(notificationId).catch(err => console.error('Bg cancel failed', err));
        }
    },

};
