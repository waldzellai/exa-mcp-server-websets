/**
 * Jest Test Setup
 * 
 * Global test configuration and utilities for the test suite.
 */

import { jest } from '@jest/globals';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers for consistent testing
jest.useFakeTimers();

// Global test utilities
global.testUtils = {
  // Helper to create mock functions with proper typing
  createMockFn: <T extends (...args: any[]) => any>(implementation?: T): jest.MockedFunction<T> => {
    return jest.fn(implementation) as unknown as jest.MockedFunction<T>;
  },

  // Helper to create async mock functions
  createAsyncMockFn: <T>(resolveValue?: T): jest.MockedFunction<() => Promise<T>> => {
    const mockFn = jest.fn();
    if (resolveValue !== undefined) {
      (mockFn as any).mockResolvedValue(resolveValue);
    }
    return mockFn as jest.MockedFunction<() => Promise<T>>;
  },

  // Helper to advance timers and flush promises
  advanceTimersAndFlush: async (ms: number = 0): Promise<void> => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  },

  // Helper to wait for next tick
  waitForNextTick: (): Promise<void> => {
    return new Promise(resolve => process.nextTick(resolve));
  },

  // Helper to create test dates
  createTestDate: (offset: number = 0): Date => {
    return new Date(new Date('2024-01-01T00:00:00.000Z').getTime() + offset);
  },

  // Helper to generate test IDs
  generateTestId: (prefix: string = 'test'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Extend global types
declare global {
  var testUtils: {
    createMockFn: <T extends (...args: any[]) => any>(implementation?: T) => jest.MockedFunction<T>;
    createAsyncMockFn: <T>(resolveValue?: T) => jest.MockedFunction<() => Promise<T>>;
    advanceTimersAndFlush: (ms?: number) => Promise<void>;
    waitForNextTick: () => Promise<void>;
    createTestDate: (offset?: number) => Date;
    generateTestId: (prefix?: string) => string;
  };
}

// Setup environment variables for tests
process.env.NODE_ENV = 'test';
process.env.EXA_API_KEY = 'test-api-key';
process.env.WEBSETS_API_URL = 'https://api.test.exa.ai';

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
});