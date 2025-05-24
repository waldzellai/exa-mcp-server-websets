/**
 * Axios mocks for testing
 */

import { jest } from '@jest/globals';
import { AxiosResponse, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// Mock axios instance
export const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  request: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
    },
  },
  defaults: {
    timeout: 30000,
    headers: {
      common: {},
      get: {},
      post: {},
      put: {},
      delete: {},
      patch: {},
    },
  },
} as any;

// Mock axios
export const mockAxios = {
  create: jest.fn().mockReturnValue(mockAxiosInstance),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  request: jest.fn(),
  defaults: {
    headers: {
      common: {},
    },
  },
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
  isAxiosError: jest.fn(),
} as any;
// Helper to create mock axios response
export function createMockAxiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {
      headers: {},
    } as InternalAxiosRequestConfig,
  };
}

// Helper to create mock axios error
export function createMockAxiosError(
  message: string,
  status = 500,
  code = 'NETWORK_ERROR'
): AxiosError {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.code = code;
  error.response = {
    data: { error: message },
    status,
    statusText: 'Internal Server Error',
    headers: {},
    config: {
      headers: {},
    } as InternalAxiosRequestConfig,
  };
  return error;
}

// Reset all mocks
export function resetAxiosMocks(): void {
  jest.clearAllMocks();
  mockAxios.create.mockReturnValue(mockAxiosInstance);
}