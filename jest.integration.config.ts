import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/lib/server/__integration__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/lib/repositories/board-config.pg.repository.ts',
    'src/lib/serializers/processed-issue.serializer.ts',
    'src/lib/server/db/prisma-client.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
};

export default config;
