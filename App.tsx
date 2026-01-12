import "react-native-gesture-handler";
import React from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "./src/theme";
import { FamilyProvider } from "./src/contexts/FamilyContext";
import { MealPlanProvider } from "./src/contexts/MealPlanContext";
import { SidebarProvider } from "./src/contexts/SidebarContext";
import { ToastProvider } from "./src/components/ui/Toast";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ThemeProvider } from "./src/contexts/ThemeContext";

const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FamilyProvider>
          <MealPlanProvider>
            <SidebarProvider>
              <ToastProvider>
                <StatusBar
                  barStyle="light-content"
                  backgroundColor={theme.colors.background}
                  animated
                />
                <SafeAreaView style={styles.appWrapper} edges={["top", "bottom", "left", "right"]}>
                  <ErrorBoundary>
                    <AppNavigator />
                  </ErrorBoundary>
                </SafeAreaView>
              </ToastProvider>
            </SidebarProvider>
          </MealPlanProvider>
        </FamilyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default App;
