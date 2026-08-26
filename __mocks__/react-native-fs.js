module.exports = {
  DocumentDirectoryPath: '/tmp',
  CachesDirectoryPath: '/tmp/cache',
  TemporaryDirectoryPath: '/tmp',
  exists: jest.fn(async () => false),
  mkdir: jest.fn(async () => undefined),
  unlink: jest.fn(async () => undefined),
  copyFile: jest.fn(async () => undefined),
  moveFile: jest.fn(async () => undefined),
  downloadFile: jest.fn(() => ({
    promise: Promise.resolve({ statusCode: 200 }),
  })),
  uploadFiles: jest.fn(() => ({
    promise: Promise.resolve({ statusCode: 200 }),
  })),
  readFile: jest.fn(async () => ''),
  writeFile: jest.fn(async () => undefined),
  appendFile: jest.fn(async () => undefined),
  stat: jest.fn(async () => ({ size: 0, isFile: () => true })),
  readDir: jest.fn(async () => []),
};
