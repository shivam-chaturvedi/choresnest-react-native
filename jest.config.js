module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/helpers/',
    'syncFixtures\\.ts$',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@nozbe|@notifee|@react-native-async-storage|@react-native-community|@react-native-randombytes|react-native-reanimated|react-native-vector-icons|react-native-config|react-native-svg|lucide-react-native|react-native-url-polyfill)/)',
  ],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^react-native-url-polyfill/auto$': '<rootDir>/__mocks__/emptyMock.js',
  },
};
