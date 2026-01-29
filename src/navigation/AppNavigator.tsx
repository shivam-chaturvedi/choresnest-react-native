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
import { AppLockProvider, useAppLock } from "../contexts/AppLockContext";
import { AppLockScreen } from "../screens/AppLockScreen";
import { database } from "../database";




const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
  shouldRequireAuthOnStartup?: boolean;
}

export const AppNavigator = ({ shouldRequireAuthOnStartup = true }: AppNavigatorProps) => {
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
    <AuthProvider>
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

  if (isLoading || showSplash || (isAuthenticated && hasMembersInDB === null)) {
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
<<<<<<< HEAD
                {({ navigation }: { navigation: NativeStackNavigationProp<any> }) => (
=======
                {({ navigation }: any) => (
>>>>>>> feature-storage
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
<<<<<<< HEAD
              {({ navigation }: { navigation: NativeStackNavigationProp<any> }) => (
=======
              {({ navigation }: any) => (
>>>>>>> feature-storage
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
    isBiometricEnabled,
    isBiometricAvailable,
    biometryType,
    unlockWithPin,
    unlockWithBiometrics,
  } = useAppLock();

  if (!isLocked) {
    return null;
  }

  return (
    <AppLockScreen
      isLocked={isLocked}
      isBiometricEnabled={isBiometricEnabled}
      isBiometricAvailable={isBiometricAvailable}
      biometryType={biometryType}
      unlockWithPin={unlockWithPin}
      unlockWithBiometrics={unlockWithBiometrics}
    />
  );
};
