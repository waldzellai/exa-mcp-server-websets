/**
 * Unit Tests for WebsetsApiClient
 *
 * Tests the low-level HTTP API client with mocked dependencies.
 * Following TDD London School methodology.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { WebsetsApiClient } from '../../../src/api/WebsetsApiClient.js';
import { ApiErrorHandler } from '../../../src/api/ErrorHandler.js';
import { RateLimiter, CircuitBreaker } from '../../../src/api/RateLimiter.js';
import { WebsetsConfig, ApiClientConfig } from '../../../src/config/websets.js';
import {
  mockWebset,
  mockSuccessResponse,
  mockErrorResponse,
  mockRateLimitResponse
} from '../../fixtures/websets.js';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../src/api/ErrorHandler.js');
jest.mock('../../../src/api/RateLimiter.js');
jest.mock('../../../src/utils/logger.js');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedApiErrorHandler = ApiErrorHandler as jest.MockedClass<typeof ApiErrorHandler>;
const MockedRateLimiter = RateLimiter as jest.MockedClass<typeof RateLimiter>;
const MockedCircuitBreaker = CircuitBreaker as jest.MockedClass<typeof CircuitBreaker>;

describe('WebsetsApiClient', () => {
  let apiClient: WebsetsApiClient;
  let mockAxiosInstance: jest.Mocked<any>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;
  let mockCircuitBreaker: jest.Mocked<CircuitBreaker>;
  let websetsConfig: WebsetsConfig;
  let clientConfig: ApiClientConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      request: global.testUtils.createAsyncMockFn(),
      interceptors: {
        request: {
          use: global.testUtils.createMockFn()
        },
        response: {
          use: global.testUtils.createMockFn()
        }
      },
      defaults: {
        timeout: 30000
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create mock rate limiter
    mockRateLimiter = {
      waitForToken: global.testUtils.createAsyncMockFn(),
      getStats: global.testUtils.createMockFn(() => ({ tokens: 10, lastRefill: Date.now() })),
      updateOptions: global.testUtils.createMockFn(),
      reset: global.testUtils.createMockFn()
    } as any;

    // Create mock circuit breaker
    mockCircuitBreaker = {
      execute: global.testUtils.createAsyncMockFn(),
      getState: global.testUtils.createMockFn(() => ({ state: 'closed', failures: 0, successes: 0 })),
      reset: global.testUtils.createMockFn()
    } as any;

    // Mock constructors
    MockedRateLimiter.mockImplementation(() => mockRateLimiter);
    MockedCircuitBreaker.mockImplementation(() => mockCircuitBreaker);

    // Setup configurations
    websetsConfig = {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.exa.ai',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      maxRetryDelay: 10000,
      rateLimit: 10,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000
    };

    clientConfig = {
      userAgent: 'test-client/1.0.0',
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      enableLogging: false,
      enableMetrics: false
    };

    // Create API client instance
    apiClient = new WebsetsApiClient(websetsConfig, clientConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with proper configuration', () => {
      expect(apiClient).toBeInstanceOf(WebsetsApiClient);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: websetsConfig.baseUrl,
        timeout: websetsConfig.timeout,
        headers: {
          'Authorization': `Bearer ${websetsConfig.apiKey}`,
          'User-Agent': clientConfig.userAgent,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    });

    it('should initialize rate limiter with correct options', () => {
      expect(MockedRateLimiter).toHaveBeenCalledWith({
        requestsPerSecond: websetsConfig.rateLimit
      });
    });

    it('should initialize circuit breaker with correct options', () => {
      expect(MockedCircuitBreaker).toHaveBeenCalledWith(
        websetsConfig.circuitBreakerThreshold,
        websetsConfig.circuitBreakerTimeout
      );
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      // Mock circuit breaker to execute function directly
      mockCircuitBreaker.execute.mockImplementation(async (fn) => fn());
      // Mock successful axios response
      mockAxiosInstance.request.mockResolvedValue({
        data: mockWebset,
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });

    describe('get', () => {
      it('should make GET request successfully', async () => {
        // Act
        const result = await apiClient.get('/websets/123');

        // Assert
        expect(mockRateLimiter.waitForToken).toHaveBeenCalled();
        expect(mockCircuitBreaker.execute).toHaveBeenCalled();
        expect(mockAxiosInstance.request).toHaveBeenCalledWith({
          method: 'GET',
          url: '/websets/123',
          data: undefined,
          params: undefined,
          headers: undefined,
          timeout: websetsConfig.timeout
        });
        expect(result).toEqual({
          data: mockWebset,
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      });

      it('should pass query parameters', async () => {
        // Arrange
        const params = { limit: 10, cursor: 'abc123' };

        // Act
        await apiClient.get('/websets', params);

        // Assert
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: '/websets',
            params
          })
        );
      });
    });

    describe('post', () => {
      it('should make POST request successfully', async () => {
        // Arrange
        const data = { name: 'Test Webset' };

        // Act
        const result = await apiClient.post('/websets', data);

        // Assert
        expect(mockRateLimiter.waitForToken).toHaveBeenCalled();
        expect(mockAxiosInstance.request).toHaveBeenCalledWith({
          method: 'POST',
          url: '/websets',
          data,
          params: undefined,
          headers: undefined,
          timeout: websetsConfig.timeout
        });
        expect(result.data).toEqual(mockWebset);
      });
    });

    describe('put', () => {
      it('should make PUT request successfully', async () => {
        // Arrange
        const data = { name: 'Updated Webset' };

        // Act
        await apiClient.put('/websets/123', data);

        // Assert
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PUT',
            url: '/websets/123',
            data
          })
        );
      });
    });

    describe('delete', () => {
      it('should make DELETE request successfully', async () => {
        // Act
        await apiClient.delete('/websets/123');

        // Assert
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'DELETE',
            url: '/websets/123'
          })
        );
      });
    });

    describe('patch', () => {
      it('should make PATCH request successfully', async () => {
        // Arrange
        const data = { status: 'paused' };

        // Act
        await apiClient.patch('/websets/123', data);

        // Assert
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PATCH',
            url: '/websets/123',
            data
          })
        );
      });
    });
  });

  describe('error handling and retries', () => {
    beforeEach(() => {
      mockCircuitBreaker.execute.mockImplementation(async (fn) => fn());
    });

    it('should retry on retryable errors', async () => {
      // Arrange
      const retryableError = new Error('Network error');
      MockedApiErrorHandler.createApiError.mockReturnValue({
        code: 'NETWORK_ERROR',
        message: 'Network error',
        type: 'network_error'
      } as any);
      MockedApiErrorHandler.classify.mockReturnValue('network_error' as any);
      MockedApiErrorHandler.shouldRetry.mockReturnValue(true);
      MockedApiErrorHandler.getRetryDelay.mockReturnValue(100);

      mockAxiosInstance.request
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({
          data: mockWebset,
          status: 200,
          headers: {}
        });

      // Act
      const result = await apiClient.get('/websets/123');

      // Assert
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
      expect(MockedApiErrorHandler.shouldRetry).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual(mockWebset);
    });

    it('should not retry on non-retryable errors', async () => {
      // Arrange
      const nonRetryableError = new Error('Validation error');
      MockedApiErrorHandler.createApiError.mockReturnValue({
        code: 'VALIDATION_ERROR',
        message: 'Validation error',
        type: 'validation_error'
      } as any);
      MockedApiErrorHandler.classify.mockReturnValue('validation_error' as any);
      MockedApiErrorHandler.shouldRetry.mockReturnValue(false);

      mockAxiosInstance.request.mockRejectedValue(nonRetryableError);

      // Act & Assert
      await expect(apiClient.get('/websets/123')).rejects.toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Validation error',
        type: 'validation_error'
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
      expect(MockedApiErrorHandler.shouldRetry).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      // Arrange
      const persistentError = new Error('Persistent error');
      const apiError = {
        code: 'SERVER_ERROR',
        message: 'Persistent error',
        type: 'server_error'
      };

      MockedApiErrorHandler.createApiError.mockReturnValue(apiError as any);
      MockedApiErrorHandler.classify.mockReturnValue('server_error' as any);
      MockedApiErrorHandler.shouldRetry.mockReturnValue(true);
      MockedApiErrorHandler.getRetryDelay.mockReturnValue(100);

      mockAxiosInstance.request.mockRejectedValue(persistentError);

      // Act & Assert
      await expect(apiClient.get('/websets/123')).rejects.toEqual(apiError);

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4); // 1 + 3 retries
    });
  });

  describe('rate limiting', () => {
    beforeEach(() => {
      mockCircuitBreaker.execute.mockImplementation(async (fn) => fn());
      mockAxiosInstance.request.mockResolvedValue({
        data: mockWebset,
        status: 200,
        headers: {}
      });
    });

    it('should wait for rate limiter before making requests', async () => {
      // Arrange
      let rateLimiterCalled = false;
      mockRateLimiter.waitForToken.mockImplementation(async () => {
        rateLimiterCalled = true;
      });

      // Act
      await apiClient.get('/websets/123');

      // Assert
      expect(rateLimiterCalled).toBe(true);
      expect(mockRateLimiter.waitForToken).toHaveBeenCalled();
      expect(mockAxiosInstance.request).toHaveBeenCalled();
    });
  });

  describe('circuit breaker', () => {
    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue({
        data: mockWebset,
        status: 200,
        headers: {}
      });
    });

    it('should execute requests through circuit breaker', async () => {
      // Arrange
      mockCircuitBreaker.execute.mockImplementation(async (fn) => fn());

      // Act
      await apiClient.get('/websets/123');

      // Assert
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
    });

    it('should handle circuit breaker open state', async () => {
      // Arrange
      const circuitOpenError = new Error('Circuit breaker is open');
      mockCircuitBreaker.execute.mockRejectedValue(circuitOpenError);

      // Act & Assert
      await expect(apiClient.get('/websets/123')).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      // Arrange
      const newConfig = {
        rateLimit: 20,
        timeout: 60000
      };

      // Act
      apiClient.updateConfig(newConfig);

      // Assert
      expect(mockRateLimiter.updateOptions).toHaveBeenCalledWith({
        requestsPerSecond: 20
      });
      expect(mockAxiosInstance.defaults.timeout).toBe(60000);
    });

    it('should get client statistics', () => {
      // Arrange
      const rateLimiterStats = { tokens: 5, lastRefill: Date.now() };
      const circuitBreakerState = { state: 'closed', failures: 0, successes: 10 };
      
      mockRateLimiter.getStats.mockReturnValue(rateLimiterStats as any);
      mockCircuitBreaker.getState.mockReturnValue(circuitBreakerState as any);

      // Act
      const stats = apiClient.getStats();

      // Assert
      expect(stats).toEqual({
        rateLimiter: rateLimiterStats,
        circuitBreaker: circuitBreakerState
      });
    });

    it('should reset client state', () => {
      // Act
      apiClient.reset();

      // Assert
      expect(mockRateLimiter.reset).toHaveBeenCalled();
      expect(mockCircuitBreaker.reset).toHaveBeenCalled();
    });
  });
});