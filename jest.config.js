/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  // detectLeaks: true,
  // detectOpenHandles: true,
  forceExit: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  unmockedModulePathPatterns: ['<rootDir>/test/setup.js'],
};

module.exports = config;
