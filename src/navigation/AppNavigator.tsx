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




const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
  shouldRequireAuthOnStartup?: boolean;
}

export const AppNavigator = ({ shouldRequireAuthOnStartup = true }: AppNavigatorProps) => {
  const { isDark } = useTheme();
  const [navState, setNavState] = React.useState<any>();
  const { showToast } = useToast();
  
  // Trigger sync when navigator mounts (user is authenticated)
  React.useEffect(() => {
    const { SyncService } = require('../services/SyncService');
    SyncService.sync().catch((err: Error) => {
      console.error('Initial sync on navigation mount failed:', err);
    });
  }, []);

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
  const { isAuthenticated, isLoading, hasCompletedOnboarding, completeOnboarding } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const [hasMembersInDB, setHasMembersInDB] = React.useState<boolean | null>(null);
  
  // Auto-sync hook - triggers sync on data changes
  useAutoSync();

  // Check if there are members in the database
  React.useEffect(() => {
    const checkMembers = async () => {
      try {
        const membersCollection = database.get('members');
        const members = await membersCollection.query().fetch();
        setHasMembersInDB(members.length > 0);
      } catch (error) {
        console.error('Error checking members:', error);
        setHasMembersInDB(false);
      }
    };

    if (isAuthenticated && !isLoading) {
      checkMembers();
    }
  }, [isAuthenticated, isLoading]);

  // Only show splash on initial load, not during auth operations
  if (showSplash || (isAuthenticated && hasMembersInDB === null)) {
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
            {!hasMembersInDB ? (
              <Stack.Screen name="InitialSetup">
                {() => (
                  <InitialSetupScreen
                    onComplete={async () => {
                      // Refresh member check
                      const membersCollection = database.get('members');
                      const members = await membersCollection.query().fetch();
                      setHasMembersInDB(members.length > 0);
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
