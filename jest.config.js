export default {
  projects: [
    // Frontend tests (jsdom environment)
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          jsx: 'react-jsx',
        }],
      },
      moduleNameMapper: {
        '^\\.\\/styles\\/index\\.css$': '<rootDir>/src/frontend/__tests__/__mocks__/styleMock.js',
      },
      setupFilesAfterEnv: ['<rootDir>/src/frontend/__tests__/setup.ts'],
      testMatch: ['**/src/frontend/__tests__/**/*.test.{ts,tsx}'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    },
    // Electron tests (node environment)
    {
      displayName: 'electron',
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {}],
      },
      testMatch: ['**/src/electron/__tests__/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    },
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/dist-electron/',
    '/release/',
  ],
};
