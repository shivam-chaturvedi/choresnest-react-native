jest.mock('../src/services/NotificationPreferencesService', () => ({
  NotificationPreferencesService: {
    isPushEnabled: jest.fn(async () => true),
    isCategoryEnabled: jest.fn(async () => true),
    isSoundEnabled: jest.fn(async () => true),
    getReminderTime: jest.fn(async () => 15),
  },
}));

jest.mock('../src/utils/permissions', () => ({
  checkPermission: jest.fn(async () => true),
  requestPermission: jest.fn(async () => true),
}));

import notifee from '@notifee/react-native';
import { NotificationScheduler, getSafeFutureTimestamp, MIN_FUTURE_BUFFER_MS, resetNotificationSchedulerState } from '../src/services/NotificationScheduler';

describe('NotificationScheduler safe timestamp handling', () => {
  const baseTime = 1_000_000;
  let dateNowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    resetNotificationSchedulerState();
    jest.clearAllMocks();
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(baseTime);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  test('getSafeFutureTimestamp rejects invalid values', () => {
    expect(getSafeFutureTimestamp(null)).toBeNull();
    expect(getSafeFutureTimestamp(undefined)).toBeNull();
    expect(getSafeFutureTimestamp(NaN as any)).toBeNull();
  });

  test('getSafeFutureTimestamp bumps near-future dates and rejects stale ones', () => {
    const justInPast = new Date(baseTime - 5_000);
    const stale = new Date(baseTime - 10 * 60_000);
    const future = new Date(baseTime + 500_000);

    expect(getSafeFutureTimestamp(justInPast)).toBe(baseTime + MIN_FUTURE_BUFFER_MS);
    expect(getSafeFutureTimestamp(stale)).toBeNull();
    expect(getSafeFutureTimestamp(future)).toBe(future.getTime());
  });

  test('scheduleNotification skips stale triggers and does not call Notifee', async () => {
    const result = await NotificationScheduler.scheduleNotification(
      'tasks',
      {
        title: 'Stale Task',
        body: 'Old trigger',
        data: { taskId: 't1' },
      },
      new Date(baseTime - 10 * 60_000)
    );

    expect(result).toBeNull();
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  test('scheduleNotification bumps near-future triggers and calls Notifee once', async () => {
    const futureDate = new Date(baseTime + 500);
    const result = await NotificationScheduler.scheduleNotification(
      'tasks',
      {
        title: 'Near Task',
        body: 'Soon',
        data: { taskId: 't2' },
      },
      futureDate
    );

    expect(result).toBe('trigger-id');
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
    const triggerArg = (notifee.createTriggerNotification as jest.Mock).mock.calls[0][1];
    expect(triggerArg.timestamp).toBe(baseTime + MIN_FUTURE_BUFFER_MS);
  });

  test('scheduleNotification is idempotent for the same key and timestamp', async () => {
    const futureDate = new Date(baseTime + 10_000);

    const first = await NotificationScheduler.scheduleNotification(
      'events',
      {
        title: 'Event',
        body: 'Reminder',
        data: { eventId: 'e1' },
      },
      futureDate
    );

    const second = await NotificationScheduler.scheduleNotification(
      'events',
      {
        title: 'Event',
        body: 'Reminder',
        data: { eventId: 'e1' },
      },
      futureDate
    );

    expect(first).toBe('trigger-id');
    expect(second).toBe('trigger-id');
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });
});
