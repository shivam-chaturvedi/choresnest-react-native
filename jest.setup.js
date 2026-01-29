import "react-native-gesture-handler/jestSetup";
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

import React from "react";

const identityProvider = ({ children }) => <>{children}</>;

jest.mock("./src/navigation/AppNavigator", () => ({
  AppNavigator: () => null,
}));

jest.mock("./src/contexts/FamilyContext", () => ({
  FamilyProvider: identityProvider,
}));
jest.mock("./src/contexts/FinanceContext", () => ({
  FinanceProvider: identityProvider,
}));
jest.mock("./src/contexts/MealPlanContext", () => ({
  MealPlanProvider: identityProvider,
}));
jest.mock("./src/contexts/SidebarContext", () => ({
  SidebarProvider: identityProvider,
}));
jest.mock("./src/contexts/RecipeContext", () => ({
  RecipeProvider: identityProvider,
}));
jest.mock("./src/contexts/ThemeContext", () => ({
  ThemeProvider: identityProvider,
}));
jest.mock("./src/components/ui/Toast", () => ({
  ToastProvider: identityProvider,
}));

jest.mock("@notifee/react-native", () => {
  const EventType = {
    DELIVERED: "DELIVERED",
    PRESS: "PRESS",
  };

  const AndroidImportance = {
    HIGH: 4,
    DEFAULT: 3,
  };

  const AndroidNotificationSetting = {
    ENABLED: "ENABLED",
    DISABLED: "DISABLED",
  };

  const TriggerType = {
    TIMESTAMP: "timestamp",
  };

  const RepeatFrequency = {
    DAILY: "daily",
    WEEKLY: "weekly",
  };

  const TimestampTrigger = {
    type: "timestamp",
  };

  const mockNotifee = {
    deleteChannel: jest.fn(async () => {}),
    createChannel: jest.fn(async () => "channel"),
    getNotificationSettings: jest.fn(async () => ({
      importance: AndroidImportance.DEFAULT,
      android: {
        importance: AndroidImportance.DEFAULT,
      },
    })),
    openAlarmPermissionSettings: jest.fn(async () => {}),
    createTriggerNotification: jest.fn(async () => "trigger-id"),
    displayNotification: jest.fn(async () => "notification-id"),
    cancelNotification: jest.fn(async () => {}),
    cancelAllNotifications: jest.fn(async () => {}),
    requestPermission: jest.fn(async () => true),
    onForegroundEvent: jest.fn(() => ({
      unsubscribe: jest.fn(),
    })),
    createChannelGroup: jest.fn(async () => {}),
  };

  return {
    __esModule: true,
    default: mockNotifee,
    EventType,
    AndroidImportance,
    AndroidNotificationSetting,
    TriggerType,
    TimestampTrigger,
    RepeatFrequency,
    onForegroundEvent: mockNotifee.onForegroundEvent,
  };
});

jest.mock("@react-native-async-storage/async-storage", () => {
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async () => null),
      getItem: jest.fn(async () => null),
      removeItem: jest.fn(async () => null),
      multiGet: jest.fn(async () => []),
      multiSet: jest.fn(async () => null),
    },
  };
});

jest.mock("./src/database", () => {
  const subscribeStub = jest.fn(() => ({ unsubscribe: jest.fn() }));
  const mockQuery = () => ({
    observe: subscribeStub,
    fetch: jest.fn(async () => []),
  });

  const preferenceRecord = {
    id: "user-preferences",
    countryCode: "US",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    update: jest.fn(async cb => {
      if (cb) await cb(preferenceRecord);
      return preferenceRecord;
    }),
  };

  const preferenceCollection = () => ({
    query: () => ({
      observe: subscribeStub,
      fetch: jest.fn(async () => [preferenceRecord]),
    }),
    find: jest.fn(async () => preferenceRecord),
    create: jest.fn(async cb => {
      if (cb) await cb(preferenceRecord);
      return preferenceRecord;
    }),
  });

  const mockCollection = (tableName) => {
    if (tableName === "user_preferences") {
      return preferenceCollection();
    }

    return {
      query: mockQuery,
      find: jest.fn(async () => ({
        update: jest.fn(async cb => cb && cb()),
      })),
      create: jest.fn(async cb => {
        const item = {
          id: Date.now().toString(),
          update: jest.fn(async cb2 => cb2 && cb2()),
        };

        if (cb) await cb(item);
        return item;
      }),
    };
  };

  return {
    database: {
      get: jest.fn(table => mockCollection(table)),
      write: jest.fn(async cb => cb && cb()),
    },
  };
});

jest.mock("react-native-permissions", () => {
  const STATUS = {
    AUTHORIZED: "AUTHORIZED",
    DENIED: "DENIED",
    GRANTED: "GRANTED",
    UNDETERMINED: "UNDETERMINED",
    LIMITED: "LIMITED",
    BLOCKED: "BLOCKED",
  };

  return {
    PERMISSIONS: {},
    RESULTS: STATUS,
    check: jest.fn(async () => STATUS.GRANTED),
    request: jest.fn(async () => STATUS.GRANTED),
    requestMultiple: jest.fn(async () => ({})),
  };
});

jest.mock("react-native-image-picker", () => ({
  launchImageLibrary: jest.fn(async () => ({ assets: [] })),
  launchCamera: jest.fn(async () => ({ assets: [] })),
}));

jest.mock("react-native-nitro-sound", () => ({
  createSound: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    release: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVolume: jest.fn(),
    setVolume: jest.fn(),
    seek: jest.fn(),
  })),
  RecordBackType: {},
  PlayBackType: {},
}));
