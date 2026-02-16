import React from "react";
import { DefaultTheme, DarkTheme, NavigationContainer } from "@react-navigation/native";
import { theme } from "../theme";
import { createNativeStackNavigator } from "@react-navigation/native-stack";


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
import { AppSettingsService } from "../services/AppSettingsService";
import Member from "../database/models/Member";




const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
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
      <AppLockProvider>
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

  // Comprehensive sync setup: app restart, foreground, network changes
  React.useEffect(() => {
    if (!isAuthenticated || isGuest || isLoading) {
      return;
    }

    if (!SyncService.isEnabled()) {
      console.log('Background sync is disabled via Config.ENABLE_SYNC=false; skipping sync setup.');
      return;
    }

    let netInfoUnsubscribe: (() => void) | null = null;
    let appStateSubscription: any = null;

    const triggerSync = async (readOnly: boolean = false) => {
      if (SyncService.isSyncing()) {
        console.log('Sync trigger skipped - SyncService already running');
        return;
      }

      try {
        const isOnline = await SyncService.isOnline();
        if (!isOnline) {
          console.log('Sync skipped because device is offline');
          return;
        }

        console.log(`Triggering ${readOnly ? 'read-only' : 'full'} sync from AppNavigator`);
        await SyncService.sync(readOnly);
      } catch (err) {
        if (!(err as Error)?.message?.includes('Concurrent synchronization')) {
          console.error('Background sync failed:', err);
        }
      }
    };

      const runInitialSync = async () => {
        try {
          const shouldDoWriteSync = await SyncService.shouldDoWriteSync();
          if (shouldDoWriteSync) {
            console.log('App start: Last write sync was >1 hour ago, doing full sync');
            void triggerSync(false);
          } else {
            console.log('App start: Last write sync was <1 hour ago, doing read-only sync');
            void triggerSync(true);
          }
        } catch (err) {
          console.error('Failed to check write sync requirement, doing read-only sync:', err);
          void triggerSync(true);
        }
      };

    runInitialSync();

    appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App foreground: Doing read-only sync');
        void triggerSync(true);
      }
    });

    netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('Network connected: Doing read-only sync');
        void triggerSync(true);
      }
    });

    return () => {
      if (netInfoUnsubscribe) {
        netInfoUnsubscribe();
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
    };
  }, [isAuthenticated, isGuest, isLoading]);

  React.useEffect(() => {
    if (!SyncService.isEnabled()) {
      return;
    }

    if (isAuthenticated && !isGuest && !isLoading) {
      SyncService.startPeriodicSync();
      return () => {
        SyncService.stopPeriodicSync();
      };
    }

    return () => {
      SyncService.stopPeriodicSync();
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
    let cancelled = false;

    const loadLocalMembers = async () => {
      if (!isAuthenticated || isGuest || isLoading) {
        if (!cancelled) {
          setHasMembersInDB(false);
        }
        return;
      }

      try {
        const membersCollection = database.collections.get<Member>('members');
        const localMembers = await membersCollection.query().fetch();
        if (!cancelled) {
          setHasMembersInDB(localMembers.length > 0);
        }
      } catch (error) {
        console.error('Failed to read local members:', error);
        if (!cancelled) {
          setHasMembersInDB(false);
        }
      }
    };

    loadLocalMembers();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isGuest, isLoading]);

  const shouldShowInitialSetup = !hasMembersInDB && hasLocalOnboarding !== true;

  // Only show splash on initial load, not during auth operations
  // Don't wait for sync - show UI immediately once members check completes
  if (
    showSplash ||
    !localOnboardingLoaded ||
    isLoading ||
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
            {shouldShowInitialSetup ? (
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
                      // No navigation.replace needed, state change triggers re-render
                    }}
                    onComplete={() => {
                      completeOnboarding();
                      // No navigation.replace needed
                    }}
                  />
                )}
              </Stack.Screen>
            ) : null}
            <Stack.Screen name="Auth">
              {({ navigation }: any) => (
                <AuthScreen
                  onAuthenticated={() => {
                    // No navigation needed, state change to isAuthenticated=true will switch stacks
                  }}
                  onForgotPassword={() => navigation.navigate("ForgotPassword")}
                  onPrivacy={() => navigation.navigate("Privacy")}
                />
              )}
            </Stack.Screen>
            {/* Pass navigation correctly */}
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
    isBiometricEnabled,
    unlockWithPin,
    unlockWithBiometric,
  } = useAppLock();
  const [shouldRenderLock, setShouldRenderLock] = React.useState(false);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (isLocked) {
      rafRef.current = requestAnimationFrame(() => {
        setShouldRenderLock(true);
        rafRef.current = null;
      });
    } else {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setShouldRenderLock(false);
    }

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isLocked]);

  if (!isLocked || !shouldRenderLock) {
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
