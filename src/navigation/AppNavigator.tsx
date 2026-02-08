import React from "react";
import { DefaultTheme, DarkTheme, NavigationContainer } from "@react-navigation/native";
import { theme } from "../theme";
import { createNativeStackNavigator, NativeStackNavigationProp } from "@react-navigation/native-stack";


import { SplashScreen } from "../screens/SplashScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { PrivacyScreen } from "../screens/PrivacyScreen";
import { InitialSetupScreen } from "../screens/InitialSetupScreen";
import { TabNavigator } from "./TabNavigator";
import { AppSidebar } from "../components/layout/AppSidebar";
import { useSidebar } from "../contexts/SidebarContext";
import { NotesProvider } from "../contexts/NotesContext";
import { useTheme } from "../contexts/ThemeContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/Toast";
import { AppLockProvider, useAppLock } from "../contexts/AppLockContext";
import { AppLockScreen } from "../screens/AppLockScreen";
import { BiometricLockScreen } from "../screens/BiometricLockScreen";
import { useAutoSync } from "../hooks/useAutoSync";
import { database } from "../database";
import { SyncService } from "../services/SyncService";
import NetInfo from "@react-native-community/netinfo";
import { AppState, AppStateStatus } from "react-native";
import { SyncIndicator } from "../components/SyncIndicator";
import { ProfileBootstrapService } from "../services/ProfileBootstrapService";
import { AppSettingsService } from "../services/AppSettingsService";




const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
  shouldRequireAuthOnStartup?: boolean;
}

export const AppNavigator = ({ shouldRequireAuthOnStartup = true }: AppNavigatorProps) => {
  const { isDark } = useTheme();
  const [navState, setNavState] = React.useState<any>();
  const { showToast } = useToast();

  const handleAuthError = React.useCallback((title: string, message: string) => {
    showToast({
      type: 'error',
      title,
      description: message,
      duration: 4000,
    });
  }, [showToast]);

  // Construct React Navigation compatible theme
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.foreground,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };

  return (
    <AuthProvider onError={handleAuthError}>
      <AppLockProvider shouldRequireAuthOnStartup={shouldRequireAuthOnStartup}>
        <NotesProvider>
          <NavigationContainer
            theme={navigationTheme}
            initialState={navState}
            onStateChange={(state) => setNavState(state)}
          >
            <AppNavigatorInner />
          </NavigationContainer>
        </NotesProvider>
      </AppLockProvider>
    </AuthProvider>
  );
};

const AppNavigatorInner = () => {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { user, isAuthenticated, isLoading, isGuest, hasCompletedOnboarding, completeOnboarding } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const [hasMembersInDB, setHasMembersInDB] = React.useState<boolean | null>(null);
  const [hasLocalOnboarding, setHasLocalOnboarding] = React.useState<boolean | null>(null);
  const [localOnboardingLoaded, setLocalOnboardingLoaded] = React.useState(false);
  
  // Auto-sync hook - triggers sync on data changes (runs in background)
  // Hook checks isGuest internally, so it's safe to call always
  useAutoSync();

  // Timeout to hide splash screen after maximum wait time (don't wait forever)
  React.useEffect(() => {
    const splashTimeout = setTimeout(() => {
      if (showSplash) {
        console.log('Splash screen timeout - hiding splash');
        setShowSplash(false);
        // If members check hasn't completed, assume false
        if (hasMembersInDB === null) {
          setHasMembersInDB(false);
        }
      }
    }, 3000); // Maximum 3 seconds for splash

    return () => clearTimeout(splashTimeout);
  }, [showSplash, hasMembersInDB]);

  // Comprehensive sync setup: app restart, foreground, network changes, periodic
  React.useEffect(() => {
    // Only sync if authenticated and not a guest
    if (!isAuthenticated || isGuest || isLoading) {
      return;
    }

    let netInfoUnsubscribe: (() => void) | null = null;
    let syncInterval: ReturnType<typeof setInterval> | null = null;
    let appStateSubscription: any = null;

    // Track last sync time to prevent too frequent syncs
    let lastSyncTime = 0;
    let syncInProgress = false;
    const MIN_SYNC_INTERVAL = 5000; // Minimum 5 seconds between syncs

    const triggerSync = (readOnly: boolean = false) => {
      const now = Date.now();
      
      // Skip if sync is already in progress (check our local flag first)
      if (syncInProgress) {
        console.log('Sync trigger skipped - sync already in progress');
        return;
      }

      // Skip if synced too recently (only for read-only syncs)
      if (readOnly && now - lastSyncTime < MIN_SYNC_INTERVAL) {
        console.log('Read sync skipped - too soon since last sync');
        return;
      }

      // Set local flag to prevent multiple triggers
      syncInProgress = true;
      lastSyncTime = now;

      // Run sync in background without blocking - don't await
      (async () => {
        try {
          const isOnline = await SyncService.isOnline();
          if (isOnline) {
            // Don't await sync - let it run in background
            // The sync function itself handles concurrent calls
            SyncService.sync(readOnly)
              .then(() => {
                syncInProgress = false;
              })
              .catch(err => {
                syncInProgress = false;
                // Don't log concurrent sync errors - they're expected and handled by SyncService
                if (!err?.message?.includes('Concurrent synchronization')) {
                  console.error('Background sync failed:', err);
                }
              });
          } else {
            syncInProgress = false;
          }
        } catch (err) {
          syncInProgress = false;
          console.error('Sync trigger failed:', err);
        }
      })();
    };

    // Initial sync on mount (app start/restart) - check 1-hour gap for write sync
    setTimeout(async () => {
      try {
        const shouldDoWriteSync = await SyncService.shouldDoWriteSync();
        if (shouldDoWriteSync) {
          console.log('App start: Last write sync was >1 hour ago, doing full sync');
          triggerSync(false); // Full sync (read + write)
        } else {
          console.log('App start: Last write sync was <1 hour ago, doing read-only sync');
          triggerSync(true); // Read-only sync
        }
      } catch (err) {
        console.error('Failed to check write sync requirement, doing read-only sync:', err);
        triggerSync(true); // Fallback to read-only on error
      }
    }, 500); // Increased delay to ensure UI is ready

    // Sync when app comes to foreground - always read-only
    appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - read-only sync to get latest data
        console.log('App foreground: Doing read-only sync');
        triggerSync(true);
      }
    });

    // Listen for network changes and sync when coming online - read-only
    netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('Network connected: Doing read-only sync');
        triggerSync(true); // Read-only sync on network change
      }
    });

    // Periodic sync every 2 minutes when online - read-only only (write sync only on app start)
    syncInterval = setInterval(() => {
      // Don't await - run in background
      NetInfo.fetch().then((currentState) => {
        if (currentState.isConnected) {
          // Periodic syncs are always read-only (write sync only happens on app start)
          console.log('Periodic sync: Doing read-only sync');
          triggerSync(true); // Read-only sync only
        }
      }).catch(err => {
        console.error('Network check failed:', err);
      });
    }, 120000); // 2 minutes

    return () => {
      if (netInfoUnsubscribe) {
        netInfoUnsubscribe();
      }
      if (syncInterval) {
        clearInterval(syncInterval);
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
    };
  }, [isAuthenticated, isGuest, isLoading]);

  React.useEffect(() => {
    let cancelled = false;

    const loadLocalOnboarding = async () => {
      try {
        const localComplete = await AppSettingsService.hasCompletedOnboarding();
        if (cancelled) return;
        setHasLocalOnboarding(localComplete);
        if (localComplete) {
          setHasMembersInDB(true);
        }
      } catch (error) {
        console.error('Failed to read local onboarding flag:', error);
        if (!cancelled) {
          setHasLocalOnboarding(false);
        }
      } finally {
        if (!cancelled) {
          setLocalOnboardingLoaded(true);
        }
      }
    };

    loadLocalOnboarding();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (hasLocalOnboarding) {
      return;
    }

    let cancelled = false;

    const bootstrapAndCheckMembers = async () => {
      if (!isAuthenticated || isGuest || isLoading || !user?.id) {
        if (!isAuthenticated) {
          setHasMembersInDB(false);
        }
        return;
      }

      try {
        const result = await ProfileBootstrapService.bootstrap(user.id);
        if (cancelled) return;
        if (result.hasMembers) {
          try {
            await AppSettingsService.completeOnboarding();
            if (cancelled) return;
            setHasLocalOnboarding(true);
          } catch (completeError) {
            console.warn('Failed to mark onboarding complete after bootstrap:', completeError);
          }
          setHasMembersInDB(true);
          return;
        }
        setHasMembersInDB(false);
      } catch (error) {
        console.error('Profile bootstrap failed:', error);
        if (!cancelled) {
          setHasMembersInDB(false);
        }
      }
    };

    bootstrapAndCheckMembers();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isGuest, isLoading, user?.id, hasLocalOnboarding]);

  // Only show splash on initial load, not during auth operations
  // Don't wait for sync - show UI immediately once members check completes
  if (
    showSplash ||
    !localOnboardingLoaded ||
    (isAuthenticated && !isLoading && hasMembersInDB === null)
  ) {
    return (
      <SplashScreen
        onContinue={() => setShowSplash(false)}
      />
    );
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            {(!hasMembersInDB && hasLocalOnboarding !== true) ? (
              <Stack.Screen name="InitialSetup">
                {() => (
                  <InitialSetupScreen
                    onComplete={async () => {
                      // Refresh member check
                      const membersCollection = database.get('members');
                      const members = await membersCollection.query().fetch();
                      setHasMembersInDB(members.length > 0);
                      setHasLocalOnboarding(true);
                    }}
                  />
                )}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="MainTabs" component={TabNavigator} />
            )}
          </>
        ) : (
          <>
            {!hasCompletedOnboarding ? (
              <Stack.Screen name="Onboarding">
                {({ navigation }: any) => (
                  <OnboardingScreen
                    onSkip={() => {
                      completeOnboarding();
                      navigation.replace("Auth");
                    }}
                    onComplete={() => {
                      completeOnboarding();
                      navigation.replace("Auth");
                    }}
                  />
                )}
              </Stack.Screen>
            ) : null}
            <Stack.Screen name="Auth">
              {({ navigation }: any) => (
                <AuthScreen
                  onAuthenticated={() => {
                    // MainTabs or InitialSetup will render automatically due to state change
                  }}
                  onForgotPassword={() => navigation.navigate("ForgotPassword")}
                  onPrivacy={() => navigation.navigate("Privacy")}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
          </>
        )}
      </Stack.Navigator>
      <SyncIndicator />
      <AppLockOverlay />
      <AppSidebar open={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
};

const AppLockOverlay = () => {
  const {
    isLocked,
    isAppLockEnabled,
    isBiometricEnabled,
    unlockWithPin,
    unlockWithBiometric,
  } = useAppLock();

  if (!isLocked) {
    return null;
  }

  // Show biometric lock screen if biometric is enabled, otherwise show PIN lock screen
  if (isBiometricEnabled) {
    return (
      <BiometricLockScreen
        isLocked={isLocked}
        unlockWithBiometric={unlockWithBiometric}
      />
    );
  }

  return (
    <AppLockScreen
      isLocked={isLocked}
      unlockWithPin={unlockWithPin}
    />
  );
};
