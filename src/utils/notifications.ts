import notifee, { AndroidImportance } from '@notifee/react-native';

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
