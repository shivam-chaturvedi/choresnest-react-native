import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";

import { SplashScreen } from "../screens/SplashScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { TabNavigator } from "./TabNavigator";
import { AppSidebar } from "../components/layout/AppSidebar";
import { useSidebar } from "../contexts/SidebarContext";

enableScreens();

const Stack = createNativeStackNavigator();

import { ErrorBoundary } from "../components/ErrorBoundary";

import { NotesProvider } from "../contexts/NotesContext";

export const AppNavigator = () => (
  <ErrorBoundary>
    <NotesProvider>
      <NavigationContainer>
        <AppNavigatorInner />
      </NavigationContainer>
    </NotesProvider>
  </ErrorBoundary>
);

const AppNavigatorInner = () => {
  const { isSidebarOpen, closeSidebar } = useSidebar();

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash">
          {({ navigation }) => (
            <SplashScreen onContinue={() => navigation.replace("Onboarding")} />
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
