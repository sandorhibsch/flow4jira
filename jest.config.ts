import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.(test|spec).(ts|tsx)'],
  testPathIgnorePatterns: ['<rootDir>/src/lib/server/__integration__/'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.{test,spec}.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__integration__/**',
    '!src/lib/testutils/**',
    '!src/setupTests.ts',
    '!src/data/**',
  ],
  coverageDirectory: '<rootDir>/coverage/unit',
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
};

export default config;
