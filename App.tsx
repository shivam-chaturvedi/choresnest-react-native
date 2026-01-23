import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "./src/theme";
import { FamilyProvider } from "./src/contexts/FamilyContext";
import { FinanceProvider } from "./src/contexts/FinanceContext";
import { MealPlanProvider } from "./src/contexts/MealPlanContext";
import { SidebarProvider } from "./src/contexts/SidebarContext";
import { RecipeProvider } from "./src/contexts/RecipeContext";
import { ToastProvider } from "./src/components/ui/Toast";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { databaseService } from "./src/services/DBService";
import { NotificationScheduler } from "./src/services/NotificationScheduler";

const App = () => {
  useEffect(() => {
        const initDB = async () => {
          try {
            await databaseService.init();
            await NotificationScheduler.initialize();
            await NotificationScheduler.rescheduleAllMissing();
          } catch (e) {
            console.error("Failed to init DB/Notifications on launch", e);
          }
        };
    initDB();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FamilyProvider>
            <FinanceProvider>
              <RecipeProvider>
                <MealPlanProvider>
                  <SidebarProvider>
                    <ToastProvider>
                      <StatusBar
                        barStyle="dark-content"
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
              </RecipeProvider>
            </FinanceProvider>
          </FamilyProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default App;
