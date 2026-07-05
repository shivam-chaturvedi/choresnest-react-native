import { AppState, Platform } from 'react-native';
import Config from 'react-native-config';
import DeviceInfo from 'react-native-device-info';
import SpInAppUpdates, {
  AndroidInstallStatus,
  AndroidUpdateType,
  type AndroidStatusEventListener,
  type CheckOptions,
  type StartUpdateOptions,
} from 'sp-react-native-in-app-updates';

export type AppUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'error';

export type AppUpdateState = {
  phase: AppUpdatePhase;
  progress: number;
  storeVersion?: string;
  currentVersion?: string;
  errorMessage?: string;
};

type StateListener = (state: AppUpdateState) => void;

const INITIAL_STATE: AppUpdateState = {
  phase: 'idle',
  progress: 0,
};

const resolveUpdateType = (): AndroidUpdateType => {
  const mode = (Config.APP_UPDATE_MODE || 'flexible').trim().toLowerCase();
  return mode === 'immediate'
    ? AndroidUpdateType.IMMEDIATE
    : AndroidUpdateType.FLEXIBLE;
};

class AppUpdateServiceClass {
  private client = new SpInAppUpdates(__DEV__);
  private listeners = new Set<StateListener>();
  private state: AppUpdateState = INITIAL_STATE;
  private statusListener?: AndroidStatusEventListener;
  private checkInFlight = false;
  private userInitiatedUpdate = false;
  private installTimeout?: ReturnType<typeof setTimeout>;

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): AppUpdateState {
    return this.state;
  }

  private emit(patch: Partial<AppUpdateState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener(this.state));
  }

  private isEnabled(): boolean {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return false;
    }
    if (Config.ENABLE_IN_APP_UPDATES === 'false') {
      return false;
    }
    if (__DEV__ && Config.ENABLE_IN_APP_UPDATES !== 'true') {
      return false;
    }
    return true;
  }

  private buildCheckOptions(): CheckOptions {
    return {
      curVersion: DeviceInfo.getVersion(),
    };
  }

  private clearInstallTimeout() {
    if (this.installTimeout) {
      clearTimeout(this.installTimeout);
      this.installTimeout = undefined;
    }
  }

  private attachStatusListener() {
    if (this.statusListener || Platform.OS !== 'android') {
      return;
    }

    this.statusListener = event => {
      const { status, bytesDownloaded, totalBytesToDownload } = event;
      const downloaded = Number(bytesDownloaded) || 0;
      const total = Number(totalBytesToDownload) || 0;

      if (status === AndroidInstallStatus.DOWNLOADING) {
        const progress =
          total > 0 ? Math.min(1, Math.max(0, downloaded / total)) : 0.05;
        this.emit({
          phase: 'downloading',
          progress,
          errorMessage: undefined,
        });
        return;
      }

      if (status === AndroidInstallStatus.DOWNLOADED) {
        this.emit({
          phase: 'ready',
          progress: 1,
          errorMessage: undefined,
        });

        if (this.userInitiatedUpdate) {
          this.clearInstallTimeout();
          this.installTimeout = setTimeout(() => {
            this.installDownloadedUpdate();
          }, 600);
        }
        return;
      }

      if (status === AndroidInstallStatus.INSTALLING) {
        this.emit({ phase: 'installing', progress: 1 });
        return;
      }

      if (status === AndroidInstallStatus.INSTALLED) {
        this.detachStatusListener();
        this.emit(INITIAL_STATE);
        return;
      }

      if (
        status === AndroidInstallStatus.FAILED ||
        status === AndroidInstallStatus.CANCELED
      ) {
        this.detachStatusListener();
        this.emit({
          phase: 'error',
          errorMessage:
            status === AndroidInstallStatus.CANCELED
              ? 'Update cancelled. You can try again later.'
              : 'Update failed. Please try again from the Play Store.',
        });
      }
    };

    this.client.addStatusUpdateListener(this.statusListener);
  }

  private detachStatusListener() {
    if (!this.statusListener) {
      return;
    }
    this.client.removeStatusUpdateListener(this.statusListener);
    this.statusListener = undefined;
  }

  async checkForUpdate(options?: { force?: boolean }): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    if (
      this.checkInFlight ||
      this.state.phase === 'downloading' ||
      this.state.phase === 'installing' ||
      this.state.phase === 'ready'
    ) {
      return false;
    }

    if (
      !options?.force &&
      this.state.phase === 'available' &&
      this.state.storeVersion
    ) {
      return true;
    }

    this.checkInFlight = true;
    this.emit({
      phase: 'checking',
      progress: 0,
      errorMessage: undefined,
      currentVersion: DeviceInfo.getVersion(),
    });

    try {
      const result = await this.client.checkNeedsUpdate(this.buildCheckOptions());
      if (!result.shouldUpdate) {
        this.emit({
          ...INITIAL_STATE,
          currentVersion: DeviceInfo.getVersion(),
        });
        return false;
      }

      this.emit({
        phase: 'available',
        progress: 0,
        storeVersion: result.storeVersion,
        currentVersion: DeviceInfo.getVersion(),
        errorMessage: undefined,
      });
      return true;
    } catch (error) {
      console.warn('[AppUpdate] check failed', error);
      this.emit({
        ...INITIAL_STATE,
        currentVersion: DeviceInfo.getVersion(),
      });
      return false;
    } finally {
      this.checkInFlight = false;
    }
  }

  async startUpdate(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    this.userInitiatedUpdate = true;
    this.emit({ errorMessage: undefined });

    if (Platform.OS === 'ios') {
      const updateOptions: StartUpdateOptions = {
        title: 'Update available',
        message: `Version ${this.state.storeVersion ?? ''} is ready on the App Store.`,
        buttonUpgradeText: 'Update now',
        buttonCancelText: 'Later',
      };
      try {
        await this.client.startUpdate(updateOptions);
      } catch (error) {
        console.warn('[AppUpdate] iOS update prompt failed', error);
        this.emit({
          phase: 'error',
          errorMessage: 'Could not open the App Store. Please update manually.',
        });
      }
      return;
    }

    this.attachStatusListener();
    const updateType = resolveUpdateType();

    if (updateType === AndroidUpdateType.IMMEDIATE) {
      this.emit({ phase: 'installing', progress: 0.15 });
      try {
        await this.client.startUpdate({ updateType });
      } catch (error) {
        console.warn('[AppUpdate] immediate update failed', error);
        this.detachStatusListener();
        this.emit({
          phase: 'error',
          errorMessage: 'Could not start the required update.',
        });
      }
      return;
    }

    this.emit({ phase: 'downloading', progress: 0.02 });

    try {
      await this.client.startUpdate({
        updateType: AndroidUpdateType.FLEXIBLE,
      });
    } catch (error) {
      console.warn('[AppUpdate] startUpdate failed', error);
      this.detachStatusListener();
      this.emit({
        phase: 'error',
        errorMessage: 'Could not start the update. Please try again.',
      });
    }
  }

  installDownloadedUpdate(): void {
    if (Platform.OS !== 'android') {
      return;
    }

    this.clearInstallTimeout();
    this.emit({ phase: 'installing', progress: 1, errorMessage: undefined });

    try {
      this.client.installUpdate();
    } catch (error) {
      console.warn('[AppUpdate] installUpdate failed', error);
      this.emit({
        phase: 'error',
        errorMessage:
          'Could not install the update. Tap retry or update from the Play Store.',
      });
    }
  }

  dismiss(): void {
    if (
      this.state.phase === 'downloading' ||
      this.state.phase === 'installing'
    ) {
      return;
    }

    this.userInitiatedUpdate = false;
    this.clearInstallTimeout();
    this.detachStatusListener();
    this.emit({
      ...INITIAL_STATE,
      currentVersion: DeviceInfo.getVersion(),
    });
  }

  retry(): void {
    this.userInitiatedUpdate = false;
    this.clearInstallTimeout();
    this.detachStatusListener();
    void this.startUpdate();
  }

  bindAppStateRecheck(): () => void {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        return;
      }
      if (
        this.state.phase === 'idle' ||
        this.state.phase === 'available' ||
        this.state.phase === 'error'
      ) {
        void this.checkForUpdate();
      }
    });

    return () => subscription.remove();
  }
}

export const AppUpdateService = new AppUpdateServiceClass();
