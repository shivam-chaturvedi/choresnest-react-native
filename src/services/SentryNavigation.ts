import * as Sentry from '@sentry/react-native';

export const reactNavigationIntegration = Sentry.reactNavigationIntegration({
  routeChangeTimeoutMs: 1000,
});
