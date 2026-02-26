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
import { ProfileBootstrapService } from "../services/ProfileBootstrapService";
import { ProfileService } from "../services/ProfileService";
import { supabase } from "../config/supabase";
import { LocalCacheService } from "../services/LocalCacheService";




const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { isDark } = useTheme();
  const [navState, setNavState] = React.useState<any>();

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
  );
};

const AppNavigatorInner = () => {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { user, isAuthenticated, isLoading, isGuest, hasCompletedOnboarding, completeOnboarding } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const [hasMembersInDB, setHasMembersInDB] = React.useState<boolean | null>(null);
  const [hasLocalOnboarding, setHasLocalOnboarding] = React.useState<boolean | null>(null);
  const [localOnboardingLoaded, setLocalOnboardingLoaded] = React.useState(false);
  const [isBootChecking, setIsBootChecking] = React.useState(true);
  const [isCacheReady, setIsCacheReady] = React.useState(false);

  // Auto-sync hook - triggers sync on data changes (runs in background)
  // Hook checks isGuest internally, so it's safe to call always
  useAutoSync();

  // Timeout to hide splash screen after maximum wait time (don't wait forever)
  React.useEffect(() => {
    console.log('AppNavigator: Render State:', {
      isLoading,
      isAuthenticated,
      isGuest,
      hasMembersInDB,
      localOnboardingLoaded,
      hasLocalOnboarding,
      showSplash
    });

    const rescueTimeout = setTimeout(() => {
      const needsRescue = showSplash || !localOnboardingLoaded || isBootChecking || !isCacheReady || (isAuthenticated && hasMembersInDB === null);
      if (needsRescue) {
        console.warn('AppNavigator: RESCUE TIMEOUT TRIGGERED - Forcing boot sequence', {
          showSplash, localOnboardingLoaded, isBootChecking, isCacheReady, hasMembersInDB
        });
        setShowSplash(false);
        setLocalOnboardingLoaded(true);
        setIsBootChecking(false);
        setIsCacheReady(true);
        if (hasMembersInDB === null) {
          setHasMembersInDB(false);
        }
      }
    }, 6000); // 6 seconds hard limit for splash/init

    return () => clearTimeout(rescueTimeout);
  }, [showSplash, isLoading, isAuthenticated, isGuest, hasMembersInDB, localOnboardingLoaded, hasLocalOnboarding, isBootChecking, isCacheReady]);

  // Sync isBootChecking with isLoading, but keep it true until checks settle
  React.useEffect(() => {
    if (isLoading) {
      console.log("AppNavigator: Auth loading detected, locking boot sequence");
      setIsBootChecking(true);
    }
  }, [isLoading]);

  // Ensure LocalCache is ready
  React.useEffect(() => {
    const prepareCache = async () => {
      console.log("AppNavigator: LocalCacheService preparation starting...");
      await LocalCacheService.ensureReady();
      console.log("AppNavigator: LocalCacheService is now ready");
      setIsCacheReady(true);
    };
    prepareCache();
  }, []);

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

    // Defer all initial network heavy operations by 8 seconds
    // to ensure Splash Screen and UI have fully rendered
    const INITIAL_SYNC_DELAY = 8000;
    let appHasStarted = false;
    setTimeout(() => { appHasStarted = true; }, INITIAL_SYNC_DELAY);

    const runInitialSync = async () => {
      setTimeout(async () => {
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
      }, INITIAL_SYNC_DELAY);
    };

    runInitialSync();

    appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && appHasStarted) {
        console.log('App foreground: Doing full rewrite sync to catch up on offline items');
        void triggerSync(false);
      }
    });

    netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && appHasStarted) {
        console.log('Network connected: Doing full rewrite sync to push offline items');
        void triggerSync(false);
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
      if (isLoading) return; // Wait for auth to settle

      try {
        console.log("AppNavigator: loadLocalOnboarding starting...");
        const globalOnboardingComplete = await AppSettingsService.hasAnyProfileCompletedOnboarding();
        if (cancelled) return;

        if (globalOnboardingComplete) {
          // Local DB already has onboarding flag — fast path
          setHasLocalOnboarding(true);
          console.log('AppNavigator: Onboarding check result: true (local)');
        } else if (isAuthenticated && !isGuest && user?.id) {
          // Local DB says no onboarding, but maybe it was just wiped after logout.
          // Check Supabase directly: if a family_name setting exists for this profile,
          // the user has already been through setup.
          console.log('AppNavigator: Local onboarding not found. Checking Supabase for returning user...');
          try {
            const remoteCheckPromise = supabase
              .from('settings')
              .select('id')
              .eq('profile_id', user.id)
              .eq('key', 'family_name')
              .eq('deleted', false)
              .maybeSingle();

            const timeoutPromise = new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 4000)
            );

            const result = await Promise.race([remoteCheckPromise, timeoutPromise]);
            if (cancelled) return;

            const hasRemoteFamilyName = result && 'data' in result && result.data !== null;
            if (hasRemoteFamilyName) {
              console.log('AppNavigator: Remote family_name found — returning user, skipping setup screen.');
              setHasLocalOnboarding(true);
              // Silently persist the flag locally so next boot is instant
              void AppSettingsService.completeOnboarding(user.id);
            } else {
              console.log('AppNavigator: No remote family_name found — new user, showing setup screen.');
              setHasLocalOnboarding(false);
            }
          } catch (remoteErr) {
            console.warn('AppNavigator: Remote onboarding check failed, defaulting to show setup:', remoteErr);
            if (!cancelled) setHasLocalOnboarding(false);
          }
        } else {
          // Guest or unauthenticated — rely solely on local data
          setHasLocalOnboarding(false);
          console.log('AppNavigator: Onboarding check result: false (guest/unauth, no remote check)');
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
  }, [isAuthenticated, isGuest, isLoading, user?.id]);

  React.useEffect(() => {
    let cancelled = false;

    const loadLocalMembers = async () => {
      if (!isAuthenticated || isLoading) {
        if (!cancelled) setHasMembersInDB(false);
        return;
      }

      try {
        console.log("AppNavigator: loadLocalMembers starting...");

        // 1. Resolve the active profile — AsyncStorage/memory only, no network
        const pid = await ProfileService.getActiveProfileId();

        // 1a. FAST PATH: Check if we already have members locally for this profile
        const membersCollection = database.collections.get<Member>('members');
        let localQuery = membersCollection.query();
        // Filter by profile_id if we have one so we don't pick up another profile's rows
        if (pid) {
          const { Q: WQ } = require('@nozbe/watermelondb');
          localQuery = membersCollection.query(WQ.where('profile_id', pid));
        }
        const localMembers = await localQuery.fetch();
        const existsLocally = localMembers.length > 0;

        if (existsLocally && !cancelled) {
          console.log(`AppNavigator: Found ${localMembers.length} members locally for profile ${pid}. Proceeding...`);
          setHasMembersInDB(true);
          // Don't return — still want to bootstrap in background for freshness
        }

        // 2. REMOTE BOOTSTRAP (with timeout) — only for authenticated, non-guest users
        let remoteBootstrapSuccess = false;
        if (pid && !isGuest) {
          try {
            console.log("AppNavigator: Attempting profile bootstrap with timeout...");
            const bootstrapPromise = ProfileBootstrapService.bootstrap(pid);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Bootstrap Timeout')), 4000)
            );

            const bootstrapResult = await Promise.race([bootstrapPromise, timeoutPromise]) as any;

            if (!cancelled) {
              if (bootstrapResult.membersFetchSuccess) {
                remoteBootstrapSuccess = true;
              }
              if (bootstrapResult.memberCount > 0) {
                console.log(`AppNavigator: Bootstrap succeeded with ${bootstrapResult.memberCount} members`);
                setHasMembersInDB(true);
                return;
              }
            }
          } catch (e) {
            console.warn('AppNavigator: Bootstrap skipped or timed out', e);
          }
        }

        // 3. FINAL DECISION: fall back to the local-exists check if remote didn't succeed
        if (!cancelled && hasMembersInDB === null) {
          console.log(`AppNavigator: Setting final members state from local check: ${existsLocally}`);
          setHasMembersInDB(existsLocally);
        }
      } catch (error) {
        console.error('AppNavigator: Error loading local members:', error);
        if (!cancelled && hasMembersInDB === null) {
          setHasMembersInDB(false);
        }
      }
    };

    loadLocalMembers();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isGuest, isLoading]);

  // Release isBootChecking once all checks are settled and auth is not loading
  React.useEffect(() => {
    const allChecksDone = !isLoading && localOnboardingLoaded && hasMembersInDB !== null && isCacheReady;
    if (allChecksDone && isBootChecking) {
      console.log("AppNavigator: All boot checks settled, releasing lock", {
        isAuthenticated,
        isGuest,
        hasMembersInDB,
        hasLocalOnboarding
      });
      setIsBootChecking(false);
      setShowSplash(false);
    } else if (isBootChecking) {
      console.log("AppNavigator: Still waiting for checks:", {
        isLoading,
        localOnboardingLoaded,
        hasMembersInDB_is_null: hasMembersInDB === null,
        isCacheReady
      });
    }
  }, [isLoading, localOnboardingLoaded, hasMembersInDB, isCacheReady, isBootChecking, isAuthenticated, isGuest, hasLocalOnboarding]);

  const shouldShowInitialSetup = !hasMembersInDB && hasLocalOnboarding !== true;

  // Only show splash on initial load, not during auth operations
  // Don't wait for sync - show UI immediately once members check completes
  if (
    showSplash ||
    !localOnboardingLoaded ||
    isLoading ||
    isBootChecking ||
    !isCacheReady ||
    (isAuthenticated && hasMembersInDB === null)
  ) {
    if (!showSplash && !isLoading && isBootChecking) {
      // Optional: Add a transition spinner if it takes too long between splash and app
    }
    return (
      <SplashScreen
        onContinue={() => {
          console.log("AppNavigator: Splash onContinue pressed - manual override");
          setShowSplash(false);
        }}
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
