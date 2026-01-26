module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@nozbe|@notifee|@react-native-async-storage|@react-native-community|@react-native-randombytes|react-native-reanimated)/)',
  ],
};
