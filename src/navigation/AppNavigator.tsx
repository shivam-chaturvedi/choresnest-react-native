import React from "react";
import { DefaultTheme, DarkTheme, NavigationContainer } from "@react-navigation/native";
import { theme } from "../theme";
import { createNativeStackNavigator } from "@react-navigation/native-stack";


import { SplashScreen } from "../screens/SplashScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { TabNavigator } from "./TabNavigator";
import { AppSidebar } from "../components/layout/AppSidebar";
import { useSidebar } from "../contexts/SidebarContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { NotesProvider } from "../contexts/NotesContext";
import { useTheme } from "../contexts/ThemeContext";




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
      <NotesProvider>
        <NavigationContainer
          theme={navigationTheme}
          initialState={navState}
          onStateChange={(state) => setNavState(state)}
        >
          <AppNavigatorInner />
        </NavigationContainer>
      </NotesProvider>
    </ErrorBoundary>
  );
};

const AppNavigatorInner = () => {
  const { isSidebarOpen, closeSidebar } = useSidebar();

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash">
          {({ navigation }) => (
            <SplashScreen
              onContinue={(destination) => navigation.replace(destination)}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Onboarding">
          {({ navigation }) => (
            <OnboardingScreen
              onSkip={() => navigation.replace("Auth")}
              onComplete={() => navigation.replace("Auth")}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Auth">
          {({ navigation }) => (
            <AuthScreen
              onAuthenticated={() => navigation.replace("MainTabs")}
              onForgotPassword={() => navigation.navigate("ForgotPassword")}
              onPrivacy={() => navigation.navigate("Privacy")}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      </Stack.Navigator>
      <AppSidebar open={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
};
