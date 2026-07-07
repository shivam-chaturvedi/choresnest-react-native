import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { launchCamera, CameraOptions } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

export interface SavedDocument {
    uri: string;
    name: string;
    type: string;
    size: number;
    originalUri?: string;
}

export const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                    title: "Camera Permission",
                    message: "App needs access to your camera to scan documents.",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn(err);
            return false;
        }
    }
    return true; // iOS handles permission via Info.plist and OS prompt automatically/gracefully usually
};

export const requestStoragePermission = async (): Promise<boolean> => {
    // Document/photo pickers use the system UI (SAF / Photo Picker) — no broad storage permission.
    return true;
};

export const saveFileToStorage = async (uri: string, fileName: string): Promise<string> => {
    try {
        // Sanitize filename
        const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const destPath = `${RNFS.DocumentDirectoryPath}/${safeName}`;

        // If file exists, append timestamp
        if (await RNFS.exists(destPath)) {
            const timestamp = Date.now();
            const parts = safeName.split('.');
            const ext = parts.pop();
            const name = parts.join('.');
            const newDestPath = `${RNFS.DocumentDirectoryPath}/${name}_${timestamp}.${ext}`;
            await RNFS.copyFile(uri, newDestPath);
            return newDestPath;
        }

        await RNFS.copyFile(uri, destPath);
        return destPath;
    } catch (error) {
        console.error("Error saving file:", error);
        throw error;
    }
};

export const pickDocument = async (): Promise<SavedDocument | null> => {
    try {
        const results = await pick({
            type: [types.allFiles],
            mode: 'open',
            allowMultiSelection: false,
            allowVirtualFiles: false,
        });

        if (!results || results.length === 0) {
            return null;
        }

        const uniqueResults = results.filter((entry, index, self) => {
            if (!entry.uri) {
                return false;
            }
            return (
                self.findIndex(item => item.uri === entry.uri) === index
            );
        });
        const result = uniqueResults[0];

        if (!result) {
            return null;
        }

        if (!result.uri) {
            throw new Error("Could not get file URI");
        }

        const sourceUri = result.uri;
        // Check for null name, use default if missing
        const fileName = result.name ?? `doc_${Date.now()}`;
        const savedPath = await saveFileToStorage(sourceUri, fileName);

        return {
            uri: savedPath,
            name: fileName,
            type: result.type ?? 'application/octet-stream',
            size: result.size ?? 0,
            originalUri: result.uri
        };
    } catch (err) {
        if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
            // User cancelled
            return null;
        } else {
            throw err;
        }
    }
};

export const captureImage = async (): Promise<SavedDocument | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
        Alert.alert("Permission Denied", "Camera permission is required to scan documents.");
        return null;
    }

    const options: CameraOptions = {
        mediaType: 'photo',
        saveToPhotos: false,
        quality: 0.8,
    };

    return new Promise((resolve) => {
        launchCamera(options, async (response) => {
            if (response.didCancel) {
                resolve(null);
            } else if (response.errorMessage) {
                Alert.alert("Error", response.errorMessage);
                resolve(null);
            } else if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                if (asset.uri) {
                    try {
                        const fileName = asset.fileName || `scan_${Date.now()}.jpg`;
                        const savedPath = await saveFileToStorage(asset.uri, fileName);

                        resolve({
                            uri: savedPath,
                            name: fileName,
                            type: asset.type || 'image/jpeg',
                            size: asset.fileSize || 0,
                            originalUri: asset.uri
                        });
                    } catch (error) {
                        console.error("Failed to save captured image", error);
                        Alert.alert("Error", "Failed to save the scanned document.");
                        resolve(null);
                    }
                } else {
                    console.warn("Captured asset has no URI");
                    resolve(null);
                }
            } else {
                console.warn("Camera response has no assets");
                resolve(null);
            }
        });
    });
};
