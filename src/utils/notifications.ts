import notifee, { AndroidImportance, TriggerType, RepeatFrequency, TimeUnit } from '@notifee/react-native';
import { Platform } from 'react-native';

export const setupNotifications = async () => {
    // Request permissions (required for iOS 10+)
    await notifee.requestPermission();

    // Create a channel (required for Android)
    await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
    });
};

export const displayImmediateNotification = async (title: string, body: string) => {
    await notifee.requestPermission();

    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
        title,
        body,
        android: {
            channelId,
            pressAction: {
                id: 'default',
            },
            smallIcon: 'ic_launcher', // verify if this exists or use default
        },
    });
};

export const scheduleDailyNotification = async () => {
    await notifee.requestPermission();

    const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
    });

    const date = new Date(Date.now());
    date.setHours(22);
    date.setMinutes(0);
    date.setSeconds(0); // Optional: clear seconds

    // If it's already past 10 PM, schedule for tomorrow
    if (date.getTime() <= Date.now()) {
        date.setDate(date.getDate() + 1);
    }

    try {
        await notifee.createTriggerNotification(
            {
                title: 'Family Chores Reminder 🏠',
                body: 'Time to check your tasks and meal plans for tomorrow!',
                android: {
                    channelId,
                    pressAction: {
                        id: 'default',
                    },
                },
            },
            {
                type: TriggerType.TIMESTAMP,
                timestamp: date.getTime(),
                repeatFrequency: RepeatFrequency.DAILY,
                alarmManager: true, // Allow executing even if app is in doze mode
            },
        );
        console.log("Daily notification scheduled for 10 PM");
    } catch (e) {
        console.error("Scheduling daily failed", e);
    }
};

const NOTIFICATION_MESSAGES = [
    { title: "Hydration Check 💧", body: "Have you had enough water today?" },
    { title: "Task Time 📝", body: "Check off a pending task from your list!" },
    { title: "Family Plan 👨‍👩‍👧‍👦", body: "See what everyone is up to today." },
    { title: "Meal Prep 🍎", body: "Is tonight's dinner planned?" },
    { title: "Quick Break 🧘", body: "Take a moment to breathe and stretch." }
];
