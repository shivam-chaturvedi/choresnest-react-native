import { Platform, Linking } from 'react-native';
import {
    check,
    request,
    requestMultiple,
    checkNotifications,
    requestNotifications,
    PERMISSIONS,
    RESULTS,
    Permission,
    PermissionStatus,
} from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionType } from '../types/Permissions';
import { showPermissionPrompt } from '../components/ui/PermissionPrompt';

const PERMISSION_LABELS: Record<PermissionType, string> = {
    camera: 'camera',
    photo: 'photo library',
    audio: 'microphone',
    notification: 'notifications',
    storage: 'storage',
};

const getPermissionType = (type: Exclude<PermissionType, 'notification'>): Permission | null => {
    if (Platform.OS === 'ios') {
        switch (type) {
            case 'camera': return PERMISSIONS.IOS.CAMERA;
            case 'photo': return PERMISSIONS.IOS.PHOTO_LIBRARY;
            case 'audio': return PERMISSIONS.IOS.MICROPHONE;
            case 'storage': return PERMISSIONS.IOS.PHOTO_LIBRARY;
            default: return null;
        }
    } else {
        const androidVersion = typeof Platform.Version === 'string' ? parseInt(Platform.Version, 10) : Platform.Version;
        switch (type) {
            case 'camera': return PERMISSIONS.ANDROID.CAMERA;
            case 'photo': return androidVersion >= 33 ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
            case 'audio': return PERMISSIONS.ANDROID.RECORD_AUDIO;
            case 'storage': return androidVersion >= 33 ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
            default: return null;
        }
    }
};

const PROMPT_SUPPRESS_PREFIX = 'permission_prompt_suppress_';

const getPromptKey = (type: PermissionType) => `${PROMPT_SUPPRESS_PREFIX}${type}`;

const isPromptSuppressed = async (type: PermissionType): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(getPromptKey(type));
        return value === 'true';
    } catch (error) {
        console.error('Failed to read permission prompt suppression flag:', error);
        return false;
    }
};

const suppressPrompt = async (type: PermissionType) => {
    try {
        await AsyncStorage.setItem(getPromptKey(type), 'true');
    } catch (error) {
        console.error('Failed to save permission prompt suppression flag:', error);
    }
};

const maybeShowSettingsPrompt = async (type: PermissionType) => {
    if (await isPromptSuppressed(type)) {
        return;
    }
    showPermissionPrompt({
        type,
        message: `This feature requires ${PERMISSION_LABELS[type]} access. Please enable it in settings.`,
        onOpenSettings: () => Linking.openSettings(),
        onDontShowAgain: () => suppressPrompt(type),
    });
};

const isStatusGranted = (status: PermissionStatus) =>
    status === RESULTS.GRANTED || status === RESULTS.LIMITED;

const checkNotificationPermission = async (): Promise<boolean> => {
    try {
        const response = await checkNotifications();
        if (isStatusGranted(response.status)) {
            return true;
        }

        if (response.status === RESULTS.DENIED || response.status === RESULTS.BLOCKED) {
            return false;
        }
        return false;
    } catch (error) {
        console.error("Notification check failed:", error);
        return false;
    }
};

const requestNotificationPermission = async (options?: { showSettingsPrompt?: boolean }): Promise<boolean> => {
  try {
    const response = await requestNotifications(['alert', 'sound', 'badge']);
    if (isStatusGranted(response.status)) {
      return true;
    }

    if (response.status === RESULTS.DENIED || response.status === RESULTS.BLOCKED) {
        if (options?.showSettingsPrompt ?? true) {
            await maybeShowSettingsPrompt('notification');
        }
    }
    return false;
  } catch (error) {
    console.error("Notification request failed:", error);
    return false;
  }
};

export const checkPermission = async (type: PermissionType): Promise<boolean> => {
    if (type === 'notification') {
        return checkNotificationPermission();
    }

    const permission = getPermissionType(type);
    if (!permission) return true; // Assume true for unhandled permissions to avoid blocking

    try {
        const result = await check(permission);
        return isStatusGranted(result);
    } catch (error) {
        console.error("Permission check failed:", error);
        return false;
    }
};


export const resetPermissionPrompt = async (type: PermissionType): Promise<void> => {
    try {
        await AsyncStorage.removeItem(getPromptKey(type));
    } catch (error) {
        console.error('Failed to reset permission prompt suppress flag:', error);
    }
};

export const requestPermission = async (type: PermissionType, options?: { showSettingsPrompt?: boolean }): Promise<boolean> => {
  if (type === 'notification') {
        return requestNotificationPermission(options);
  }

    const permission = getPermissionType(type);
    if (!permission) return true;

    try {
        if (Platform.OS === 'android' && type === 'audio') {
            const androidVersion = typeof Platform.Version === 'string' ? parseInt(Platform.Version, 10) : Platform.Version;
            if (androidVersion < 33) {
                const results = await requestMultiple([
                    PERMISSIONS.ANDROID.RECORD_AUDIO,
                    PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
                    PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE
                ]);
                return results[PERMISSIONS.ANDROID.RECORD_AUDIO] === RESULTS.GRANTED;
            }
        }

        const result = await request(permission);
        if (isStatusGranted(result)) return true;

        if (result === RESULTS.BLOCKED || result === RESULTS.DENIED) {
            await maybeShowSettingsPrompt(type);
        }
        return false;
    } catch (error) {
        console.error("Permission request failed:", error);
        return false;
    }
};
