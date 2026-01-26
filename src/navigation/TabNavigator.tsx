import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute, CommonActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { ListsScreen } from "../screens/ListsScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { BottomNavigation, BottomNavRoute } from "../components/layout/BottomNavigation";

// Home Stack Screens
import { RecipesScreen } from "../screens/RecipesScreen";
import { RecipeDetailScreen } from "../screens/RecipeDetailScreen";
import { MealPlanScreen } from "../screens/MealPlanScreen";
import { NutritionScreen } from "../screens/NutritionScreen";
import { ExportScreen } from "../screens/UtilityScreens";
import { VaultScreen } from "../screens/VaultScreen";
import { ExpensesScreen } from "../screens/ExpensesScreen";
import { ExpensesHistoryScreen } from "../screens/ExpensesHistoryScreen";
import { FamilyScreen } from "../screens/FamilyScreen";
import { NotesScreen } from "../screens/NotesScreen";
import { NoteDetailScreen } from "../screens/NoteDetailScreen";

// More Stack Screens
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { PrivacyScreen } from "../screens/PrivacyScreen";
import { ThemeScreen } from "../screens/ThemeScreen";
import { DataExportScreen } from "../screens/DataExportScreen";
import { HelpScreen } from "../screens/HelpScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="Recipes" component={RecipesScreen} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    <Stack.Screen name="MealPlan" component={MealPlanScreen} />
    <Stack.Screen name="Nutrition" component={NutritionScreen} />
    <Stack.Screen name="Vault" component={VaultScreen} />
    <Stack.Screen name="Expenses" component={ExpensesScreen} />
    <Stack.Screen name="ExpensesHistory" component={ExpensesHistoryScreen} />
    <Stack.Screen name="Family" component={FamilyScreen} />
    <Stack.Screen name="Notes" component={NotesScreen} />
    <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
  </Stack.Navigator>
);

const MoreStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMain" component={MoreScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="Theme" component={ThemeScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
    <Stack.Screen name="DataExport" component={DataExportScreen} />
    <Stack.Screen name="Help" component={HelpScreen} />
    <Stack.Screen name="Tasks" component={TasksScreen} />
  </Stack.Navigator>
);

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
    }}
    tabBar={(props: any) => {
      // Get the current route name for the 'home' tab
      // We need to check if we are on the 'home' tab AND specifically on the 'HomeMain' screen
      // If we are deeper in the stack (Recipes, etc), we don't want to show 'active' state

      const homeRoute = props.state.routes.find((r: any) => r.name === 'home');
      const focusedRouteName = homeRoute && getFocusedRouteNameFromRoute(homeRoute);

      let activeRoute = props.state.routeNames[props.state.index] as BottomNavRoute;

      // If we are on the 'home' tab, check the nested stack route
      if (activeRoute === 'home') {
        // If focusedRouteName is defined (we navigated within stack) and NOT 'HomeMain',
        // then we are on a deeper screen
        if (focusedRouteName && focusedRouteName !== 'HomeMain') {
          // @ts-ignore - Intentionally setting to undefined/unmatched to show no active tab
          activeRoute = undefined;
        }
      }

      return (
        <BottomNavigation
          activeRoute={activeRoute}
          onNavigate={(route) => {
            if (route === 'more') {
              const state = props.navigation.getState();
              const targetIndex = state.routes.findIndex((r: any) => r.name === 'more');

              if (targetIndex !== -1) {
                const routes = state.routes.map((routeItem: any) => {
                  if (routeItem.name === 'more') {
                    return {
                      ...routeItem,
                      state: {
                        index: 0,
                        routes: [{ name: 'MoreMain' }],
                      },
                    };
                  }

                  return routeItem;
                });

                props.navigation.dispatch(
                  CommonActions.reset({
                    ...state,
                    routes,
                    index: targetIndex,
                  })
                );
              } else {
                props.navigation.navigate(route);
              }
            } else if (route === 'home') {
              props.navigation.reset({
                index: 0,
                routes: [{ name: 'home' }],
              });
            } else {
              props.navigation.navigate(route);
            }
          }}
        />
      );
    }}
  >
    <Tab.Screen name="home" component={HomeStack} />
    <Tab.Screen name="calendar" component={CalendarScreen} />
    <Tab.Screen name="lists" component={ListsScreen} />
    <Tab.Screen name="more" component={MoreStack} />
  </Tab.Navigator>
);
