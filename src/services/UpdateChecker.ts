import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';

const inAppUpdates = new SpInAppUpdates(false);

export const checkForUpdate = async () => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const result = await inAppUpdates.checkNeedsUpdate({
      curVersion: DeviceInfo.getVersion(),
    });

    console.info('[UpdateChecker] update check result', result);

    if (!result?.shouldUpdate) {
      return;
    }

    if (Platform.OS === 'android') {
      await inAppUpdates.startUpdate({
        updateType: IAUUpdateKind.FLEXIBLE,
      });
      return;
    }

    await inAppUpdates.startUpdate({
      title: 'Update available',
      message: 'A newer version of the app is waiting in the store.',
      bundleId: DeviceInfo.getBundleId(),
    });
  } catch (error) {
    console.warn('[UpdateChecker] failed to check for updates', error);
  }
};
