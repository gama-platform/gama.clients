import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    testTimeout: 30_000,
    // Every suite drives the same gama-server and asserts on global experiment state,
    // so they cannot run concurrently against each other.
    maxWorkers: 1,
    testMatch: ['**/tests/**/*.test.ts'],
};

export default config;
