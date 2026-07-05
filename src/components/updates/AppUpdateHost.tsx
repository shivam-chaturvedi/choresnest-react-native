import React from 'react';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { AppUpdateOverlay } from './AppUpdateOverlay';

type AppUpdateHostProps = {
  enabled: boolean;
};

export const AppUpdateHost: React.FC<AppUpdateHostProps> = ({ enabled }) => {
  const {
    state,
    startUpdate,
    installUpdate,
    dismissUpdate,
    retryUpdate,
  } = useAppUpdate(enabled);

  return (
    <AppUpdateOverlay
      state={state}
      onStartUpdate={startUpdate}
      onInstallUpdate={installUpdate}
      onDismiss={dismissUpdate}
      onRetry={retryUpdate}
    />
  );
};
