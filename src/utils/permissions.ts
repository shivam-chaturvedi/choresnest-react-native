import { Platform, Alert, Linking } from 'react-native';
import {
    check,
    request,
    PERMISSIONS,
    RESULTS,
    Permission,
    PermissionStatus
} from 'react-native-permissions';

export type PermissionType = 'camera' | 'photo' | 'audio' | 'notification' | 'storage';

const getPermissionType = (type: PermissionType): Permission | null => {
    if (Platform.OS === 'ios') {
        switch (type) {
            case 'camera': return PERMISSIONS.IOS.CAMERA;
            case 'photo': return PERMISSIONS.IOS.PHOTO_LIBRARY;
            case 'audio': return PERMISSIONS.IOS.MICROPHONE;
            case 'notification': return PERMISSIONS.IOS.REMINDERS; // Notifications handled differently usually, but basic mapping
            case 'storage': return PERMISSIONS.IOS.PHOTO_LIBRARY; // iOS doesn't have generic filesystem permission like Android
            default: return null;
        }
    } else {
        const androidVersion = typeof Platform.Version === 'string' ? parseInt(Platform.Version, 10) : Platform.Version;
        switch (type) {
            case 'camera': return PERMISSIONS.ANDROID.CAMERA;
            case 'photo': return androidVersion >= 33 ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
            case 'audio': return PERMISSIONS.ANDROID.RECORD_AUDIO;
            case 'notification':
                // POST_NOTIFICATIONS is only available on Android 13+ (API 33)
                // We cast to any to avoid TS errors if the type definition is outdated
                return androidVersion >= 33
                    ? (PERMISSIONS.ANDROID as any).POST_NOTIFICATIONS
                    : null;
            case 'storage': return androidVersion >= 33 ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
            default: return null;
        }
    }
};

export const checkPermission = async (type: PermissionType): Promise<boolean> => {
    const permission = getPermissionType(type);
    if (!permission) return true; // Assume true for unhandled permissions to avoid blocking

    try {
        const result = await check(permission);
        if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) return true;
        return false;
    } catch (error) {
        console.error("Permission check failed:", error);
        return false;
    }
};

export const requestPermission = async (type: PermissionType): Promise<boolean> => {
    const permission = getPermissionType(type);
    if (!permission) return true;

    try {
        const result = await request(permission);
        if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) return true;

        if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
            Alert.alert(
                'Permission Required',
                `This feature requires ${type} access. Please enable it in settings.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]
            );
        }
        return false;
    } catch (error) {
        console.error("Permission request failed:", error);
        return false;
    }
};
