import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NotificationScheduler } from '../services/NotificationScheduler';

export const useExactAlarmPermission = () => {
  const [exactAlarmEnabled, setExactAlarmEnabled] = useState(
    NotificationScheduler.isExactAlarmEnabled(),
  );

  const refresh = useCallback(async () => {
    try {
      const enabled = await NotificationScheduler.ensureExactAlarm(false);
      setExactAlarmEnabled(enabled);
    } catch (error) {
      console.warn('useExactAlarmPermission: failed to refresh status', error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refresh();
      }
    };
    const subscription = AppState.addEventListener('change', listener);
    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return { exactAlarmEnabled, refresh };
};
