import { GUEST_PROFILE_ID, getDatabase } from '../database';
import Task from '../database/models/Task';
import Event from '../database/models/Event';
import {
  NotificationScheduler,
  getActiveMemberId,
} from './NotificationScheduler';
import { NotificationPreferencesService } from './NotificationPreferencesService';
import {
  parseReminderDateTime,
  resolveNextTaskReminderDateTime,
} from '../utils/ReminderDateTimeUtils';
import { NotificationCenter, NotificationRoute } from './NotificationCenter';
import { CountryPreferenceService } from './CountryPreferenceService';
import { formatDateTime } from '../utils/countryFormatting';
import { SyncService } from './SyncService';
import {
  encodeTaskRecurrenceDays,
  encodeTaskSkippedDates,
  formatTaskDateString,
  getNextRecurringTaskDate,
  isTaskRecurring,
  normalizeTaskRecurrenceDays,
  normalizeTaskRecurrenceRule,
  normalizeTaskSkippedDates,
} from '../utils/taskRecurrence';
import { Q } from '@nozbe/watermelondb';
import { map } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { supabase } from '../config/supabase';
import { ProfileService } from './ProfileService';
import { isUuid, isWatermelonLocalId } from '../utils/uuid';
import Config from 'react-native-config';

const resolveProfileId = ProfileService.getActiveProfileId;

const isWritableProfileId = (value: unknown): value is string =>
  typeof value === 'string' && (isUuid(value) || value === GUEST_PROFILE_ID);

const requireAuthProfileId = async (
  explicitProfileId?: string | null,
): Promise<string | null> => {
  const candidate = explicitProfileId ?? (await resolveProfileId());
  return isWritableProfileId(candidate) ? candidate : null;
};

const assertWritableProfile = (
  recordProfileId: string | undefined,
  authProfileId: string,
  entityLabel: string,
) => {
  if (
    recordProfileId &&
    isUuid(recordProfileId) &&
    recordProfileId !== authProfileId
  ) {
    throw new Error(`${entityLabel} does not belong to active profile`);
  }
};

const shouldRepairProfileId = (
  recordProfileId: string | undefined,
  authProfileId: string,
): boolean =>
  recordProfileId !== authProfileId &&
  (!recordProfileId ||
    !isUuid(recordProfileId) ||
    isWatermelonLocalId(recordProfileId));

const syncAfterWrite = () => {
  void SyncService.requestSyncNow();
};

const formatReminderDateTimeDisplay = (date: Date) =>
  formatDateTime(date, CountryPreferenceService.getCurrentCountry(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const severityMeta: Record<
  'success' | 'warning' | 'default',
  { tone: string; textColor: string }
> = {
  success: { tone: 'rgba(34,197,94,0.2)', textColor: '#22C55E' },
  warning: { tone: 'rgba(245,158,11,0.2)', textColor: '#F59E0B' },
  default: { tone: 'rgba(12,17,43,0.08)', textColor: '#0D2440' },
};

const TASKS_ROUTE: NotificationRoute = { tab: 'more', screen: 'Tasks' };
const EVENTS_ROUTE: NotificationRoute = { tab: 'calendar' };

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
  isRecurring: task.isRecurring,
  recurrenceRule: task.recurrenceRule,
  recurrenceInterval: task.recurrenceInterval,
  recurrenceDaysOfWeek: task.recurrenceDaysOfWeek,
  recurrenceEndDate: task.recurrenceEndDate,
  recurrenceOccurrenceLimit: task.recurrenceOccurrenceLimit,
  recurrenceCompletedCount: task.recurrenceCompletedCount,
  recurrenceAnchorDate: task.recurrenceAnchorDate,
  recurrenceSkippedDates: task.recurrenceSkippedDates,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  version: task.version,
  deleted: task.deleted,
});

type TaskDeleteOptions = {
  mode?: 'series' | 'occurrence';
  occurrenceDate?: string;
};

const applyTaskRecurrenceFields = (task: Task, data: Partial<Task>) => {
  const isRecurringTask = Boolean(data.isRecurring);
  const normalizedRule = isRecurringTask
    ? normalizeTaskRecurrenceRule(data.recurrenceRule) ?? 'weekly'
    : undefined;
  const anchorDate =
    data.recurrenceAnchorDate ?? data.dateString ?? task.dateString;

  task.isRecurring = isRecurringTask;
  task.recurrenceRule = isRecurringTask ? normalizedRule : undefined;
  task.recurrenceInterval = isRecurringTask
    ? data.recurrenceInterval ?? 1
    : undefined;
  task.recurrenceDaysOfWeek = isRecurringTask
    ? encodeTaskRecurrenceDays(
        normalizeTaskRecurrenceDays(data.recurrenceDaysOfWeek),
      )
    : undefined;
  task.recurrenceEndDate = isRecurringTask ? data.recurrenceEndDate : undefined;
  task.recurrenceOccurrenceLimit = isRecurringTask
    ? data.recurrenceOccurrenceLimit
    : undefined;
  task.recurrenceCompletedCount = isRecurringTask
    ? data.recurrenceCompletedCount ?? 0
    : 0;
  task.recurrenceAnchorDate = isRecurringTask ? anchorDate : undefined;
  task.recurrenceSkippedDates = isRecurringTask
    ? encodeTaskSkippedDates(
        normalizeTaskSkippedDates(data.recurrenceSkippedDates),
      )
    : undefined;
};

const maybeAdvanceRecurringTask = (
  task: Task,
  now: number,
  options: {
    markCompleted?: boolean;
    skipOccurrence?: boolean;
    occurrenceDate?: string;
  } = {},
): boolean => {
  if (!isTaskRecurring(task)) {
    return false;
  }

  const nextCompletedCount = options.markCompleted
    ? (task.recurrenceCompletedCount ?? 0) + 1
    : task.recurrenceCompletedCount ?? 0;
  const skippedDates = normalizeTaskSkippedDates(task.recurrenceSkippedDates);

  if (options.skipOccurrence) {
    const occurrenceToSkip = options.occurrenceDate || task.dateString;
    if (!occurrenceToSkip) {
      return false;
    }

    if (!skippedDates.includes(occurrenceToSkip)) {
      skippedDates.push(occurrenceToSkip);
    }
    task.recurrenceSkippedDates = encodeTaskSkippedDates(skippedDates);
    task.recurrenceCompletedCount = nextCompletedCount;

    if (occurrenceToSkip !== task.dateString) {
      task.updatedAt = now;
      task.version = (task.version ?? 0) + 1;
      return true;
    }

    const nextDate = getNextRecurringTaskDate(task.dateString, {
      isRecurring: task.isRecurring,
      recurrenceRule: task.recurrenceRule,
      recurrenceInterval: task.recurrenceInterval,
      recurrenceDaysOfWeek: task.recurrenceDaysOfWeek,
      recurrenceEndDate: task.recurrenceEndDate,
      recurrenceOccurrenceLimit: task.recurrenceOccurrenceLimit,
      recurrenceCompletedCount: nextCompletedCount,
      recurrenceAnchorDate: task.recurrenceAnchorDate,
      recurrenceSkippedDates: skippedDates,
    });

    if (!nextDate) {
      task.status = 'done';
      task.reminderEnabled = false;
      task.updatedAt = now;
      task.version = (task.version ?? 0) + 1;
      return false;
    }

    task.dateString = nextDate;
    task.status = 'pending';
    task.updatedAt = now;
    task.version = (task.version ?? 0) + 1;
    return true;
  }

  const nextDate = getNextRecurringTaskDate(task.dateString, {
    isRecurring: task.isRecurring,
    recurrenceRule: task.recurrenceRule,
    recurrenceInterval: task.recurrenceInterval,
    recurrenceDaysOfWeek: task.recurrenceDaysOfWeek,
    recurrenceEndDate: task.recurrenceEndDate,
    recurrenceOccurrenceLimit: task.recurrenceOccurrenceLimit,
    recurrenceCompletedCount: nextCompletedCount,
    recurrenceAnchorDate: task.recurrenceAnchorDate,
    recurrenceSkippedDates: skippedDates,
  });

  task.recurrenceCompletedCount = nextCompletedCount;
  task.recurrenceSkippedDates = encodeTaskSkippedDates(skippedDates);

  if (!nextDate) {
    task.status = 'done';
    task.reminderEnabled = false;
    task.updatedAt = now;
    task.version = (task.version ?? 0) + 1;
    return false;
  }

  task.dateString = nextDate;
  task.status = 'pending';
  task.updatedAt = now;
  task.version = (task.version ?? 0) + 1;
  return true;
};

const pushHomeNotification = async (
  title: string,
  detail: string,
  severity: 'success' | 'warning' | 'default' = 'default',
  route?: NotificationRoute,
) => {
  const { tone, textColor } = severityMeta[severity];
  const profileId = await ProfileService.getActiveProfileId();
  NotificationCenter.addNotification(
    {
      title,
      detail,
      tone,
      textColor,
      icon: severity === 'warning' ? 'alertCircle' : 'bell',
      route,
    },
    profileId,
  );
};

type TaskNotificationJobOptions = {
  showFeedback: boolean;
  promptForPermission?: boolean;
};
const enqueueTaskNotificationJob = (
  taskId: string,
  options: TaskNotificationJobOptions,
) => {
  NotificationScheduler.enqueueJob(async () => {
    await handleTaskNotificationJob(taskId, options);
  });
};

const handleTaskNotificationJob = async (
  taskId: string,
  options: TaskNotificationJobOptions,
) => {
  try {
    const task = await getDatabase().get<Task>('tasks').find(taskId);
    const activeMemberId = await getActiveMemberId();
    const oldNotificationId = task.notificationId;
    const assigneeId = task.assigneeId || '';

    // Schedule when assigned to active member, unassigned (claim for active), or no active member yet
    const canNotifyForAssignee =
      !assigneeId || !activeMemberId || assigneeId === activeMemberId;

    if (!canNotifyForAssignee) {
      if (oldNotificationId) {
        await NotificationScheduler.cancelNotification(oldNotificationId);
        await getDatabase().write(async () => {
          await task.update(t => {
            t.notificationId = undefined;
          });
        });
      }
      return;
    }

    const shouldNotify = task.status !== 'done' && task.reminderEnabled;
    if (shouldNotify) {
      const triggerDate = resolveNextTaskReminderDateTime({
        dateString: task.dateString,
        dueDisplay: task.dueDisplay,
        isRecurring: task.isRecurring,
        recurrenceRule: task.recurrenceRule,
        recurrenceInterval: task.recurrenceInterval,
        recurrenceDaysOfWeek: task.recurrenceDaysOfWeek,
        recurrenceEndDate: task.recurrenceEndDate,
        recurrenceOccurrenceLimit: task.recurrenceOccurrenceLimit,
        recurrenceCompletedCount: task.recurrenceCompletedCount,
        recurrenceAnchorDate: task.recurrenceAnchorDate,
        recurrenceSkippedDates: task.recurrenceSkippedDates,
      });

      if (triggerDate) {
        const reminderMinutes =
          await NotificationPreferencesService.getReminderTime('tasks');
        const notificationTrigger = new Date(
          triggerDate.getTime() - reminderMinutes * 60000,
        );
        if (notificationTrigger > new Date()) {
          const newId = await NotificationScheduler.updateNotification(
            oldNotificationId || null,
            'tasks',
            {
              title: `Task: ${task.name}`,
              body: `Due ${
                task.dueDisplay || formatReminderDateTimeDisplay(triggerDate)
              }! Priority: ${task.priority}`,
              data: { taskId: task.id },
            },
            notificationTrigger,
            {
              notifyCenter: true,
              promptForPermission: options.promptForPermission ?? false,
              promptForAlarm: options.promptForPermission ?? false,
            },
          );

          if (newId) {
            await getDatabase().write(async () => {
              await task.update(t => {
                t.notificationId = newId;
              });
            });

            if (options.showFeedback) {
              const formattedReminder =
                formatReminderDateTimeDisplay(notificationTrigger);
              void pushHomeNotification(
                'Task reminder updated',
                `${task.name} reminder set for ${formattedReminder}.`,
                'success',
                TASKS_ROUTE,
              );
              await NotificationScheduler.notifyImmediateUpdate(
                'tasks',
                `Task reminder updated: ${task.name}`,
                `Reminder scheduled for ${formattedReminder}`,
                { taskId: task.id },
              );
            }
          }
        } else if (oldNotificationId) {
          await NotificationScheduler.cancelNotification(oldNotificationId);
          await getDatabase().write(async () => {
            await task.update(t => {
              t.notificationId = undefined;
            });
          });
        }
      } else if (oldNotificationId) {
        await NotificationScheduler.cancelNotification(oldNotificationId);
        await getDatabase().write(async () => {
          await task.update(t => {
            t.notificationId = undefined;
          });
        });
      }
    } else if (oldNotificationId) {
      await NotificationScheduler.cancelNotification(oldNotificationId);
      await getDatabase().write(async () => {
        await task.update(t => {
          t.notificationId = undefined;
        });
      });

      if (options.showFeedback) {
        void pushHomeNotification(
          'Task reminder cancelled',
          `${task.name} will no longer trigger reminders.`,
          'warning',
          TASKS_ROUTE,
        );
        await NotificationScheduler.notifyImmediateUpdate(
          'tasks',
          `Task reminder cancelled: ${task.name}`,
          task.status === 'done'
            ? 'Task completed, reminder cleared.'
            : 'Reminder toggled off.',
          { taskId: task.id },
        );
      }
    }
  } catch (err) {
    console.error('Failed to process task notification job:', err);
  }
};

type EventNotificationJobOptions = {
  showFeedback: boolean;
  updates?: Partial<Event>;
  promptForPermission?: boolean;
};
const enqueueEventNotificationJob = (
  eventId: string,
  options: EventNotificationJobOptions,
) => {
  NotificationScheduler.enqueueJob(async () => {
    await handleEventNotificationJob(eventId, options);
  });
};

const parseDelayFromEnv = (value?: string | null): number => {
  if (!value) return 30 * 1000;
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 30 * 1000;
};
const EVENT_SYNC_DELAY_MS = parseDelayFromEnv(Config.EVENT_SYNC_DELAY_MS);
const delayedEventTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingEventSyncs = new Map<string, EventNotificationJobOptions>();

const cancelDelayedEventSync = (eventId: string) => {
  const timer = delayedEventTimers.get(eventId);
  if (timer) {
    clearTimeout(timer);
    delayedEventTimers.delete(eventId);
  }
  pendingEventSyncs.delete(eventId);
};

const flushDelayedEventSync = (eventId: string) => {
  const pending = pendingEventSyncs.get(eventId);
  if (!pending) {
    return;
  }
  pendingEventSyncs.delete(eventId);
  delayedEventTimers.delete(eventId);
  enqueueEventNotificationJob(eventId, pending);
};

const scheduleDelayedEventSync = (
  eventId: string,
  options: EventNotificationJobOptions,
) => {
  const existing = pendingEventSyncs.get(eventId);
  const merged: EventNotificationJobOptions = {
    showFeedback: Boolean(existing?.showFeedback || options.showFeedback),
    updates: options.updates ?? existing?.updates,
    promptForPermission: Boolean(
      existing?.promptForPermission || options.promptForPermission,
    ),
  };
  pendingEventSyncs.set(eventId, merged);

  // Push to Supabase immediately; only delay notification scheduling slightly
  // so permissions prompts don't race the UI close animation.
  syncAfterWrite();

  const existingTimer = delayedEventTimers.get(eventId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    flushDelayedEventSync(eventId);
  }, EVENT_SYNC_DELAY_MS);

  delayedEventTimers.set(eventId, timer);
};

const handleEventNotificationJob = async (
  eventId: string,
  options: EventNotificationJobOptions,
) => {
  try {
    const event = await getDatabase().get<Event>('events').find(eventId);
    const oldNotificationId = event.notificationId;
    const eventDate = parseReminderDateTime(event.dateString, event.time);

    if (
      event.reminderOffsetMinutes !== undefined &&
      event.reminderOffsetMinutes < 0
    ) {
      if (oldNotificationId) {
        await NotificationScheduler.cancelNotification(oldNotificationId);
        await getDatabase().write(async () => {
          await event.update(e => {
            e.notificationId = undefined;
          });
        });
        if (options.showFeedback) {
          void pushHomeNotification(
            'Event reminder cancelled',
            `${event.title} reminders have been disabled.`,
            'warning',
            EVENTS_ROUTE,
          );
          await NotificationScheduler.notifyImmediateUpdate(
            'events',
            `Event reminder cancelled: ${event.title}`,
            'Reminder removed via settings.',
            { eventId: event.id },
          );
        }
      }
      return;
    }

    const activeMemberId = await getActiveMemberId();
    const eventMemberId = event.memberId || '';
    const canNotifyForMember =
      !eventMemberId || !activeMemberId || eventMemberId === activeMemberId;

    if (!canNotifyForMember) {
      if (oldNotificationId) {
        await NotificationScheduler.cancelNotification(oldNotificationId);
        await getDatabase().write(async () => {
          await event.update(e => {
            e.notificationId = undefined;
          });
        });
      }
      return;
    }

    if (!eventDate) {
      return;
    }

    const preferredReminderMinutes =
      await NotificationPreferencesService.getReminderTime('events');
    const reminderMinutes =
      event.reminderOffsetMinutes ?? preferredReminderMinutes;
    const triggerDate = new Date(eventDate.getTime() - reminderMinutes * 60000);

    if (options.updates?.isRecurring === false && event.isRecurring) {
      if (oldNotificationId) {
        await NotificationScheduler.cancelNotification(oldNotificationId);
        await getDatabase().write(async () => {
          await event.update(e => {
            e.notificationId = undefined;
          });
        });
      }

      if (triggerDate > new Date()) {
        const newId = await NotificationScheduler.scheduleNotification(
          'events',
          {
            title: `Event: ${event.title}`,
            body: event.location ? `at ${event.location}` : `Starting soon`,
            data: { eventId: event.id },
          },
          triggerDate,
          {
            repeatType: 'none',
            notifyCenter: true,
            promptForPermission: options.promptForPermission ?? false,
            promptForAlarm: options.promptForPermission ?? false,
          },
        );
        if (newId) {
          await getDatabase().write(async () => {
            await event.update(e => {
              e.notificationId = newId;
            });
          });
          if (options.showFeedback) {
            const formattedReminder =
              formatReminderDateTimeDisplay(triggerDate);
            void pushHomeNotification(
              'Event reminder updated',
              `${event.title} reminder set for ${formattedReminder}.`,
              'success',
              EVENTS_ROUTE,
            );
            await NotificationScheduler.notifyImmediateUpdate(
              'events',
              `Event reminder updated: ${event.title}`,
              `Reminder scheduled for ${formattedReminder}`,
              { eventId: event.id },
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
      const repeatMeta =
        NotificationScheduler.buildRepeatMetaFromRule(repeatRule);
      const newId = await NotificationScheduler.scheduleNotification(
        'events',
        {
          title: `Event: ${event.title}`,
          body: event.location ? `at ${event.location}` : `Starting soon`,
          data: { eventId: event.id },
        },
        triggerDate,
        {
          repeatType,
          repeatMeta,
          notifyCenter: true,
          promptForPermission: options.promptForPermission ?? false,
          promptForAlarm: options.promptForPermission ?? false,
        },
      );

      if (newId) {
        await getDatabase().write(async () => {
          await event.update(e => {
            e.notificationId = newId;
          });
        });
        if (options.showFeedback) {
          const formattedReminder = formatReminderDateTimeDisplay(triggerDate);
          void pushHomeNotification(
            'Event reminder updated',
            `${event.title} reminder set for ${formattedReminder}.`,
            'success',
            EVENTS_ROUTE,
          );
          await NotificationScheduler.notifyImmediateUpdate(
            'events',
            `Event reminder updated: ${event.title}`,
            `Reminder scheduled for ${formattedReminder}`,
            { eventId: event.id },
          );
        }
      }
    } else if (oldNotificationId) {
      await NotificationScheduler.cancelNotification(oldNotificationId);
      await getDatabase().write(async () => {
        await event.update(e => {
          e.notificationId = undefined;
        });
      });
      if (options.showFeedback) {
        void pushHomeNotification(
          'Event reminder cancelled',
          `${event.title} reminder cleared because the event is in the past.`,
          'warning',
          EVENTS_ROUTE,
        );
        await NotificationScheduler.notifyImmediateUpdate(
          'events',
          `Event reminder cancelled: ${event.title}`,
          'Reminder cleared because the event no longer has an upcoming occurrence.',
          { eventId: event.id },
        );
      }
    }
  } catch (err) {
    console.error('Failed to process event notification job:', err);
  }
};

export const TaskService = {
  // --- Tasks ---
  observeTasks: (profileId?: string | null) => {
    if (!profileId) return EMPTY;

    const query = getDatabase()
      .get<Task>('tasks')
      .query(Q.where('deleted', false), Q.where('profile_id', profileId));
    return query
      .observeWithColumns(TASK_OBSERVE_COLUMNS)
      .pipe(map(records => records.map(serializeTaskRecord)));
  },

  addTask: async (data: Partial<Task> & { profileId?: string | null }) => {
    const profileId = await requireAuthProfileId(data.profileId);
    if (!profileId) {
      throw new Error(
        'Cannot add task without an active profile. Please sign in or continue as guest.',
      );
    }

    const now = Date.now();
    let createdTaskId: string | undefined;

    await getDatabase().write(async () => {
      const task = await getDatabase()
        .get<Task>('tasks')
        .create(t => {
          t.profileId = profileId;
          t.name = data.name || 'Untitled';
          t.status = data.status || 'pending';
          t.priority = data.priority || 'medium';
          t.dateString = data.dateString || formatTaskDateString(new Date());
          t.dueDisplay = data.dueDisplay || '';
          t.assigneeId = data.assigneeId || '';
          t.tab = data.tab || 'My Tasks';
          t.icon = data.icon || 'format-list-checks';
          t.reminderEnabled = data.reminderEnabled ?? true;
          applyTaskRecurrenceFields(t, data);
          t.createdAt = now;
          t.updatedAt = now;
          t.version = 1;
          t.deleted = false;
        });
      createdTaskId = task.id;
    });

    if (createdTaskId) {
      enqueueTaskNotificationJob(createdTaskId, {
        showFeedback: false,
        promptForPermission: true,
      });
    }
    syncAfterWrite();
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    const profileId = await requireAuthProfileId();
    if (!profileId) {
      throw new Error('TaskService: No valid auth profile for updateTask');
    }

    const now = Date.now();

    await getDatabase().write(async () => {
      const task = await getDatabase().get<Task>('tasks').find(id);
      assertWritableProfile(task.profileId, profileId, 'Task');

      await task.update(tsk => {
        if (shouldRepairProfileId(tsk.profileId, profileId)) {
          tsk.profileId = profileId;
        }

        const nextRule = normalizeTaskRecurrenceRule(
          updates.recurrenceRule ?? tsk.recurrenceRule,
        );
        const nextIsRecurring =
          updates.isRecurring ??
          Boolean(nextRule && (updates.isRecurring ?? tsk.isRecurring));
        const markCompleted =
          nextIsRecurring && updates.status === 'done' && tsk.status !== 'done';

        if (updates.name !== undefined) tsk.name = updates.name;
        if (updates.status !== undefined) tsk.status = updates.status;
        if (updates.priority !== undefined) tsk.priority = updates.priority;
        if (updates.dateString !== undefined)
          tsk.dateString = updates.dateString;
        if (updates.dueDisplay !== undefined)
          tsk.dueDisplay = updates.dueDisplay;
        if (updates.assigneeId !== undefined)
          tsk.assigneeId = updates.assigneeId;
        if (updates.tab !== undefined) tsk.tab = updates.tab;
        if (updates.icon !== undefined) tsk.icon = updates.icon;
        if (updates.reminderEnabled !== undefined)
          tsk.reminderEnabled = updates.reminderEnabled;
        applyTaskRecurrenceFields(tsk, {
          ...serializeTaskRecord(tsk),
          ...updates,
          isRecurring: nextIsRecurring,
          recurrenceRule: nextRule,
          recurrenceCompletedCount:
            updates.recurrenceCompletedCount ?? tsk.recurrenceCompletedCount,
          recurrenceAnchorDate:
            updates.recurrenceAnchorDate ??
            tsk.recurrenceAnchorDate ??
            tsk.dateString,
          recurrenceSkippedDates:
            updates.recurrenceSkippedDates ?? tsk.recurrenceSkippedDates,
        } as Partial<Task>);

        if (markCompleted) {
          maybeAdvanceRecurringTask(tsk, now, { markCompleted: true });
          return;
        }

        tsk.updatedAt = now;
        tsk.version = (tsk.version ?? 0) + 1;
      });
    });

    enqueueTaskNotificationJob(id, { showFeedback: true });
    syncAfterWrite();
  },

  deleteTask: async (id: string, options: TaskDeleteOptions = {}) => {
    const profileId = await resolveProfileId();
    if (!profileId) {
      console.error('TaskService: No profileId for deleteTask');
      return;
    }

    let notificationId: string | undefined;
    try {
      const task = await getDatabase().get<Task>('tasks').find(id);
      if (task.profileId !== profileId) {
        console.warn(
          'TaskService: Security violation - task does not belong to active profile',
        );
        return;
      }
      notificationId = task.notificationId;
    } catch {
      /* ignore */
    }

    const now = Date.now();
    await getDatabase().write(async () => {
      try {
        const task = await getDatabase().get<Task>('tasks').find(id);
        if (task.profileId !== profileId) return;

        await task.update(tsk => {
          if (options.mode === 'occurrence' && isTaskRecurring(tsk)) {
            maybeAdvanceRecurringTask(tsk, now, {
              skipOccurrence: true,
              occurrenceDate: options.occurrenceDate,
            });
            return;
          }
          tsk.deleted = true;
          tsk.updatedAt = now;
          tsk.version = (tsk.version ?? 0) + 1;
        });
      } catch (error) {
        console.error('Error soft deleting task:', error);
      }
    });
    syncAfterWrite();

    if (notificationId && options.mode !== 'occurrence') {
      NotificationScheduler.cancelNotification(notificationId).catch(err =>
        console.error('Bg cancel failed', err),
      );
    }

    if (options.mode === 'occurrence') {
      enqueueTaskNotificationJob(id, { showFeedback: false });
    }
  },

  // --- Events ---
  observeEvents: (profileId?: string | null) => {
    if (!profileId) return EMPTY;

    const query = getDatabase()
      .get<Event>('events')
      .query(Q.where('deleted', false), Q.where('profile_id', profileId));
    return query
      .observeWithColumns(EVENT_OBSERVE_COLUMNS)
      .pipe(map(records => records.map(serializeEventRecord)));
  },

  addEvent: async (data: Partial<Event> & { profileId?: string | null }) => {
    const profileId = await requireAuthProfileId(data.profileId);
    if (!profileId) {
      throw new Error(
        'Cannot add event without an active profile. Please sign in or continue as guest.',
      );
    }

    const now = Date.now();
    let createdEventId: string | undefined;

    await getDatabase().write(async () => {
      const event = await getDatabase()
        .get<Event>('events')
        .create(e => {
          e.profileId = profileId;
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
      scheduleDelayedEventSync(createdEventId, {
        showFeedback: false,
        promptForPermission: true,
      });
    }
  },

  updateEvent: async (id: string, updates: Partial<Event>) => {
    const profileId = await requireAuthProfileId();
    if (!profileId) {
      throw new Error('TaskService: No valid auth profile for updateEvent');
    }

    const now = Date.now();

    await getDatabase().write(async () => {
      const event = await getDatabase().get<Event>('events').find(id);
      assertWritableProfile(event.profileId, profileId, 'Event');

      await event.update(ev => {
        if (shouldRepairProfileId(ev.profileId, profileId)) {
          ev.profileId = profileId;
        }

        if (updates.title !== undefined) ev.title = updates.title;
        if (updates.dateString !== undefined)
          ev.dateString = updates.dateString;
        if (updates.time !== undefined) ev.time = updates.time;
        if (updates.endTime !== undefined) ev.endTime = updates.endTime;
        if (updates.endDate !== undefined) ev.endDate = updates.endDate;
        if (updates.location !== undefined) ev.location = updates.location;
        if (updates.description !== undefined)
          ev.description = updates.description;
        if (updates.notes !== undefined) ev.notes = updates.notes;
        if (updates.icon !== undefined) ev.icon = updates.icon;
        if (updates.memberId !== undefined) ev.memberId = updates.memberId;
        if (updates.isRecurring !== undefined)
          ev.isRecurring = updates.isRecurring;
        if (updates.recurrenceRule !== undefined)
          ev.recurrenceRule = updates.recurrenceRule;
        if (updates.recurrenceEndDate !== undefined)
          ev.recurrenceEndDate = updates.recurrenceEndDate;
        if (updates.reminderOffsetMinutes !== undefined)
          ev.reminderOffsetMinutes = updates.reminderOffsetMinutes;
        if (updates.timeZone !== undefined) ev.timeZone = updates.timeZone;
        if (updates.visibility !== undefined)
          ev.visibility = updates.visibility;
        ev.updatedAt = now;
        ev.version = (ev.version ?? 0) + 1;
      });
    });

    scheduleDelayedEventSync(id, { showFeedback: true, updates });
  },

  deleteEvent: async (id: string) => {
    const profileId = await resolveProfileId();
    if (!profileId) {
      console.error('TaskService: No profileId for deleteEvent');
      return;
    }

    cancelDelayedEventSync(id);

    let notificationId: string | undefined;
    try {
      const event = await getDatabase().get<Event>('events').find(id);
      if (event.profileId !== profileId) {
        console.warn(
          'TaskService: Security violation - event does not belong to active profile',
        );
        return;
      }
      notificationId = event.notificationId;
    } catch {
      /* ignore if not found */
    }

    const now = Date.now();
    await getDatabase().write(async () => {
      try {
        const event = await getDatabase().get<Event>('events').find(id);
        if (event.profileId !== profileId) return;

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
      NotificationScheduler.cancelNotification(notificationId).catch(err =>
        console.error('Bg cancel failed', err),
      );
    }
  },
};
