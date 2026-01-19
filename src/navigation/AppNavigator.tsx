import React from "react";
import { DefaultTheme, DarkTheme, NavigationContainer } from "@react-navigation/native";
import { theme } from "../theme";
import { createNativeStackNavigator } from "@react-navigation/native-stack";


import { SplashScreen } from "../screens/SplashScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { PrivacyScreen } from "../screens/PrivacyScreen";
import { TabNavigator } from "./TabNavigator";
import { AppSidebar } from "../components/layout/AppSidebar";
import { useSidebar } from "../contexts/SidebarContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { NotesProvider } from "../contexts/NotesContext";
import { useTheme } from "../contexts/ThemeContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";




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
    <ErrorBoundary>
      <AuthProvider>
        <NotesProvider>
          <NavigationContainer
            theme={navigationTheme}
            initialState={navState}
            onStateChange={(state) => setNavState(state)}
          >
            <AppNavigatorInner />
          </NavigationContainer>
        </NotesProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

const AppNavigatorInner = () => {
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { isAuthenticated, isLoading, hasCompletedOnboarding, completeOnboarding } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);

  if (isLoading || showSplash) {
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
          <Stack.Screen name="MainTabs" component={TabNavigator} />
        ) : (
          <>
            {!hasCompletedOnboarding ? (
              <Stack.Screen name="Onboarding">
                {({ navigation }) => (
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
              {({ navigation }) => (
                <AuthScreen
                  onAuthenticated={() => {
                    // MainTabs will render automatically due to state change
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
      <AppSidebar open={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
};
