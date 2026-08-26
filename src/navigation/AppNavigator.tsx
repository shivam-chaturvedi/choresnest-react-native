import React from 'react';
import {
  DefaultTheme,
  DarkTheme,
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { theme } from '../theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { InitialSetupScreen } from '../screens/InitialSetupScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { TabNavigator } from './TabNavigator';
import { AppSidebar } from '../components/layout/AppSidebar';
import { useSidebar } from '../contexts/SidebarContext';
import { NotesProvider } from '../contexts/NotesContext';
import { useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { AppLockProvider, useAppLock } from '../contexts/AppLockContext';
import { AppLockScreen } from '../screens/AppLockScreen';
import { BiometricLockScreen } from '../screens/BiometricLockScreen';
import { useAutoSync } from '../hooks/useAutoSync';
import { getDatabase } from '../database';
import { SyncService } from '../services/SyncService';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { AppSettingsService } from '../services/AppSettingsService';
import Member from '../database/models/Member';
import { ProfileBootstrapService } from '../services/ProfileBootstrapService';
import { ProfileService, GUEST_PROFILE_ID } from '../services/ProfileService';
import { LocalCacheService } from '../services/LocalCacheService';
import { reactNavigationIntegration } from '../services/SentryNavigation';
import { useFamily } from '../contexts/FamilyContext';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { isDark } = useTheme();
  const navigationRef = React.useRef<NavigationContainerRef<any>>(null);

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

  const handleReady = () => {
    if (navigationRef.current) {
      reactNavigationIntegration.registerNavigationContainer(
        navigationRef.current,
      );
    }
  };

  return (
    <AppLockProvider>
      <NotesProvider>
        <NavigationContainer
          ref={navigationRef}
          theme={navigationTheme}
          onReady={handleReady}
        >
          <AppNavigatorInner />
        </NavigationContainer>
      </NotesProvider>
    </AppLockProvider>
  );
};

const AppNavigatorInner = () => {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const {
    user,
    isAuthenticated,
    isLoading,
    isGuest,
    hasCompletedOnboarding,
    completeOnboarding,
    isPasswordRecoveryFlow,
    sessionEpoch,
  } = useAuth();
  const { members: familyMembers } = useFamily();
  const [showSplash, setShowSplash] = React.useState(true);
  const [hasMembersInDB, setHasMembersInDB] = React.useState<boolean | null>(
    null,
  );
  const [membersReady, setMembersReady] = React.useState(false);
  const [profileOnboardingComplete, setProfileOnboardingComplete] =
    React.useState<boolean | null>(null);
  const [localOnboardingLoaded, setLocalOnboardingLoaded] =
    React.useState(false);
  const [isBootChecking, setIsBootChecking] = React.useState(true);
  const [isCacheReady, setIsCacheReady] = React.useState(false);

  // Auto-sync hook - triggers sync on data changes (runs in background)
  // Hook checks isGuest internally, so it's safe to call always
  useAutoSync();

  // Keep setup gate in sync when members appear in FamilyContext
  React.useEffect(() => {
    if (!isAuthenticated || isGuest || isLoading) {
      return;
    }
    if ((familyMembers || []).length > 0) {
      setHasMembersInDB(true);
      setProfileOnboardingComplete(true);
    }
  }, [familyMembers, isAuthenticated, isGuest, isLoading]);

  // Timeout to hide splash screen after maximum wait time (don't wait forever)
  React.useEffect(() => {
    console.log('AppNavigator: Render State:', {
      isLoading,
      isAuthenticated,
      isGuest,
      hasMembersInDB,
      localOnboardingLoaded,
      profileOnboardingComplete,
      showSplash,
    });

    const rescueTimeout = setTimeout(() => {
      const needsRescue = showSplash || isBootChecking || !isCacheReady;
      if (needsRescue) {
        console.warn(
          'AppNavigator: RESCUE TIMEOUT TRIGGERED - Forcing boot sequence',
          {
            showSplash,
            localOnboardingLoaded,
            isBootChecking,
            isCacheReady,
            hasMembersInDB,
          },
        );
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
  }, [
    showSplash,
    isLoading,
    isAuthenticated,
    isGuest,
    hasMembersInDB,
    localOnboardingLoaded,
    profileOnboardingComplete,
    isBootChecking,
    isCacheReady,
  ]);

  // Sync isBootChecking with isLoading, but keep it true until checks settle
  React.useEffect(() => {
    if (isLoading) {
      console.log('AppNavigator: Auth loading detected, locking boot sequence');
      setIsBootChecking(true);
    }
  }, [isLoading]);

  // Ensure LocalCache is ready
  React.useEffect(() => {
    const prepareCache = async () => {
      console.log('AppNavigator: LocalCacheService preparation starting...');
      await LocalCacheService.ensureReady();
      console.log('AppNavigator: LocalCacheService is now ready');
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
      console.log(
        'Background sync is disabled via Config.ENABLE_SYNC=false; skipping sync setup.',
      );
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

        console.log(
          `Triggering ${readOnly ? 'read-only' : 'full'
          } sync from AppNavigator`,
        );
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
    setTimeout(() => {
      appHasStarted = true;
    }, INITIAL_SYNC_DELAY);

    const runInitialSync = async () => {
      setTimeout(() => {
        // Always do a full sync on app start so any locally-created-while-offline
        // changes are pushed immediately. The removed 1-hour gate was converting
        // most app-start syncs to read-only, silently suppressing pushes.
        console.log(
          'App start: Triggering full sync to push any offline changes',
        );
        void triggerSync(false);
      }, INITIAL_SYNC_DELAY);
    };

    runInitialSync();

    appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && appHasStarted) {
          console.log(
            'App foreground: Doing full rewrite sync to catch up on offline items',
          );
          void triggerSync(false);
        }
      },
    );

    netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && appHasStarted) {
        console.log(
          'Network connected: Doing full rewrite sync to push offline items',
        );
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
    if (!isAuthenticated && !isLoading) {
      if (hasMembersInDB !== false) {
        setHasMembersInDB(false);
      }
      if (showSplash) {
        setShowSplash(false);
      }
      if (isBootChecking) {
        setIsBootChecking(false);
      }
      if (!localOnboardingLoaded) {
        setLocalOnboardingLoaded(true);
      }
      if (!isCacheReady) {
        setIsCacheReady(true);
      }
      if (profileOnboardingComplete !== false) {
        setProfileOnboardingComplete(false);
      }
    }
  }, [isAuthenticated, isLoading, hasMembersInDB, showSplash, isBootChecking]);

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

    const loadProfileOnboarding = async () => {
      if (isLoading) return; // Wait for auth to settle

      try {
        console.log('AppNavigator: loadProfileOnboarding starting...');
        const profileId = await ProfileService.getActiveProfileId();
        if (cancelled) return;

        if (!profileId) {
          setProfileOnboardingComplete(false);
          console.log('AppNavigator: No active profile - showing setup screen');
          return;
        }

        const profileOnboardingFlag =
          await AppSettingsService.hasCompletedOnboarding(profileId);
        if (cancelled) return;

        if (profileOnboardingFlag && !isGuest) {
          setProfileOnboardingComplete(true);
          console.log(
            'AppNavigator: Onboarding flag true for profile',
            profileId,
          );
          return;
        }

        if (isGuest) {
          setProfileOnboardingComplete(false);
          console.log('AppNavigator: Guest/unauth - relying on local data');
          return;
        }

        try {
          const netState = await NetInfo.fetch();
          if (!(netState.isConnected ?? false)) {
            console.log(
              'AppNavigator: Offline - skipping remote onboarding check',
            );
            if (cancelled) return;
            setProfileOnboardingComplete(false);
            return;
          }
        } catch (netErr) {
          console.warn(
            'AppNavigator: Failed to read network status before onboarding check:',
            netErr,
          );
        }

        try {
          const bootstrapResult = await ProfileBootstrapService.bootstrap(
            profileId,
          );
          if (cancelled) return;
          if (bootstrapResult.memberCount > 0) {
            console.log(
              'AppNavigator: Remote profile bootstrap found members - skipping setup screen.',
            );
            setProfileOnboardingComplete(true);
            void AppSettingsService.completeOnboarding(profileId);
          } else {
            console.log(
              'AppNavigator: Remote profile bootstrap found no members - new user, showing setup screen.',
            );
            // Force setup even if a stale onboarding flag exists from a prior install
            setProfileOnboardingComplete(false);
            setHasMembersInDB(false);
          }
        } catch (remoteErr) {
          console.warn(
            'AppNavigator: Remote onboarding check failed, defaulting to show setup:',
            remoteErr,
          );
          if (!cancelled) {
            setProfileOnboardingComplete(false);
          }
        }
      } catch (error) {
        console.error('Failed to read profile onboarding flag:', error);
        if (!cancelled) {
          setProfileOnboardingComplete(false);
        }
      } finally {
        if (!cancelled) {
          setLocalOnboardingLoaded(true);
        }
      }
    };

    loadProfileOnboarding();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isGuest, isLoading, user?.id]);

  React.useEffect(() => {
    if (!isAuthenticated || isGuest || isLoading) {
      return;
    }

    let cancelled = false;

    const waitForProfileId = async (): Promise<string | null> => {
      const timeoutMs = 4000;
      const start = Date.now();
      while (!cancelled && Date.now() - start < timeoutMs) {
        const pid = await ProfileService.getActiveProfileId();
        if (pid) {
          return pid;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      return null;
    };

    const loadLocalMembers = async () => {
      if (cancelled) {
        return;
      }

      try {
        console.log('AppNavigator: loadLocalMembers starting...');

        // 1. Resolve the active profile — AsyncStorage/memory only, no network
        const pid = await waitForProfileId();
        if (!pid) {
          console.warn(
            'AppNavigator: Unable to resolve profile ID in time, deferring member check.',
          );
          if (!cancelled && hasMembersInDB === null) {
            setHasMembersInDB(false);
          }
          return;
        }

        // 1a. FAST PATH: Check if we already have members locally for this profile
        const membersCollection =
          getDatabase().collections.get<Member>('members');
        let localQuery = membersCollection.query();
        // Filter by profile_id if we have one so we don't pick up another profile's rows
        if (pid) {
          const { Q: WQ } = require('@nozbe/watermelondb');
          localQuery = membersCollection.query(
            WQ.where('profile_id', pid),
            WQ.where('deleted', false),
          );
        }
        const localMembers = await localQuery.fetch();
        const existsLocally = localMembers.length > 0;

        if (existsLocally && !cancelled) {
          console.log(
            `AppNavigator: Found ${localMembers.length} members locally for profile ${pid}. Proceeding...`,
          );
          setHasMembersInDB(true);
          // Refresh from remote and remove any auto-seeded "Me" duplicates
          void ProfileBootstrapService.bootstrap(pid, { force: true })
            .then(async () => {
              const { FamilyService } = await import(
                '../services/FamilyService'
              );
              await FamilyService.cleanupSeededMeMembers(pid);
            })
            .catch(error => {
              console.warn(
                'AppNavigator: background force bootstrap failed',
                error,
              );
            });
        }

        // 2. REMOTE BOOTSTRAP (with timeout) — only for authenticated, non-guest users
        if (!cancelled && pid && !isGuest) {
          console.log(
            'AppNavigator: Attempting profile bootstrap with timeout...',
          );
          const bootstrapPromise = ProfileBootstrapService.bootstrap(pid);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Bootstrap Timeout')), 4000),
          );

          void bootstrapPromise
            .then(bootstrapResult => {
              if (cancelled || hasMembersInDB) {
                return;
              }
              if (bootstrapResult.memberCount > 0) {
                console.log(
                  `AppNavigator: Backend bootstrap resolved with ${bootstrapResult.memberCount} members`,
                );
                setHasMembersInDB(true);
              }
            })
            .catch(error => {
              console.warn('AppNavigator: Background bootstrap failed', error);
            });

          try {
            const bootstrapResult = (await Promise.race([
              bootstrapPromise,
              timeoutPromise,
            ])) as any;

            if (!cancelled) {
              if (bootstrapResult.memberCount > 0) {
                console.log(
                  `AppNavigator: Bootstrap succeeded with ${bootstrapResult.memberCount} members`,
                );
                setHasMembersInDB(true);
                return;
              }
              console.log(
                'AppNavigator: Bootstrap found 0 members — routing to setup if needed',
              );
              setHasMembersInDB(false);
              setProfileOnboardingComplete(false);
            }
          } catch (e) {
            console.warn('AppNavigator: Bootstrap skipped or timed out', e);
          }
        }

        // 3. FINAL DECISION: fall back to the local-exists check if remote didn't succeed
        if (!cancelled && hasMembersInDB === null) {
          console.log(
            `AppNavigator: Setting final members state from local check: ${existsLocally}`,
          );
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
    const essentialBootChecksDone = !isLoading && isCacheReady;
    if (essentialBootChecksDone && isBootChecking) {
      console.log('AppNavigator: All boot checks settled, releasing lock', {
        isAuthenticated,
        isGuest,
        hasMembersInDB,
        profileOnboardingComplete,
      });
      setIsBootChecking(false);
      setShowSplash(false);
    } else if (isBootChecking) {
      console.log('AppNavigator: Still waiting for checks:', {
        isLoading,
        localOnboardingLoaded,
        hasMembersInDB_is_null: hasMembersInDB === null,
        isCacheReady,
      });
    }
  }, [
    isLoading,
    localOnboardingLoaded,
    hasMembersInDB,
    isCacheReady,
    isBootChecking,
    isAuthenticated,
    isGuest,
    profileOnboardingComplete,
  ]);

  React.useEffect(() => {
    if (sessionEpoch > 0 && !isAuthenticated) {
      setShowSplash(false);
      setIsBootChecking(false);
    }
  }, [sessionEpoch, isAuthenticated]);

  // Don't show main app until we know whether this profile has members
  const membersCheckPending =
    isAuthenticated && !isGuest && hasMembersInDB === null;

  const shouldShowInitialSetup =
    isAuthenticated && !isGuest && hasMembersInDB === false;
  const navigatorKey = isPasswordRecoveryFlow
    ? 'password-recovery'
    : isAuthenticated
      ? 'authenticated'
      : 'unauthenticated';

  // Only show splash on initial load, not during auth operations
  // Don't wait for the member check; show UI once the essential boot sequence finishes
  if (
    showSplash ||
    isLoading ||
    isBootChecking ||
    !isCacheReady ||
    membersCheckPending
  ) {
    if (!showSplash && !isLoading && isBootChecking) {
      // Optional: Add a transition spinner if it takes too long between splash and app
    }
    return (
      <SplashScreen
        onContinue={() => {
          console.log(
            'AppNavigator: Splash onContinue pressed - manual override',
          );
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <>
      <Stack.Navigator key={navigatorKey} screenOptions={{ headerShown: false }}>
        {isPasswordRecoveryFlow ? (
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
          />
        ) : isAuthenticated ? (
          shouldShowInitialSetup ? (
            <Stack.Screen name="InitialSetup">
              {() => (
                <InitialSetupScreen
                  onComplete={async () => {
                    const pid = await ProfileService.getActiveProfileId();
                    const membersCollection =
                      getDatabase().get<Member>('members');
                    const { Q: WQ } = require('@nozbe/watermelondb');
                    const members = pid
                      ? await membersCollection
                          .query(
                            WQ.where('profile_id', pid),
                            WQ.where('deleted', false),
                          )
                          .fetch()
                      : [];

                    setHasMembersInDB(members.length > 0);
                    setProfileOnboardingComplete(members.length > 0);
                    setLocalOnboardingLoaded(true);
                  }}
                />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
            />
          )
        ) : (
          <>
            {!hasCompletedOnboarding && (
              <Stack.Screen name="Onboarding">
                {() => (
                  <OnboardingScreen
                    onSkip={() => {
                      completeOnboarding();
                    }}
                    onComplete={() => {
                      completeOnboarding();
                    }}
                  />
                )}
              </Stack.Screen>
            )}

            <Stack.Screen name="Auth">
              {({ navigation }: any) => (
                <AuthScreen
                  onAuthenticated={() => {
                    // AuthContext state change will re-render navigator
                  }}
                  onForgotPassword={() =>
                    navigation.navigate('ForgotPassword')
                  }
                  onPrivacy={() =>
                    navigation.navigate('Privacy')
                  }
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
 
            <Stack.Screen
              name="Privacy"
              component={PrivacyScreen}
            />
          </>
        )}
      </Stack.Navigator>
      <AppLockOverlay />
      <AppSidebar open={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
};

const AppLockOverlay = () => {
  const { isLocked, isBiometricEnabled, unlockWithPin, unlockWithBiometric } =
    useAppLock();
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

  return <AppLockScreen isLocked={isLocked} unlockWithPin={unlockWithPin} />;
};
