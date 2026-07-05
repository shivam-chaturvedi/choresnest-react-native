import { useCallback, useEffect, useState } from 'react';
import {
  AppUpdateService,
  type AppUpdateState,
} from '../services/AppUpdateService';

const INITIAL_DELAY_MS = 2500;

export const useAppUpdate = (enabled: boolean) => {
  const [state, setState] = useState<AppUpdateState>(() =>
    AppUpdateService.getState(),
  );

  useEffect(() => {
    return AppUpdateService.subscribe(setState);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setTimeout(() => {
      void AppUpdateService.checkForUpdate();
    }, INITIAL_DELAY_MS);

    const unsubscribeAppState = AppUpdateService.bindAppStateRecheck();

    return () => {
      clearTimeout(timer);
      unsubscribeAppState();
    };
  }, [enabled]);

  const startUpdate = useCallback(() => {
    void AppUpdateService.startUpdate();
  }, []);

  const installUpdate = useCallback(() => {
    AppUpdateService.installDownloadedUpdate();
  }, []);

  const dismissUpdate = useCallback(() => {
    AppUpdateService.dismiss();
  }, []);

  const retryUpdate = useCallback(() => {
    AppUpdateService.retry();
  }, []);

  const recheckUpdate = useCallback(() => {
    void AppUpdateService.checkForUpdate({ force: true });
  }, []);

  return {
    state,
    startUpdate,
    installUpdate,
    dismissUpdate,
    retryUpdate,
    recheckUpdate,
  };
};
