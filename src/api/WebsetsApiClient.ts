/**
 * Websets API Client
 * 
 * HTTP client with retry logic, rate limiting, and circuit breaker for the Websets API.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { WebsetsConfig, ApiClientConfig } from '../config/websets.js';
import { 
  ApiResponse, 
  ApiError, 
  RequestOptions, 
  HttpClientOptions,
  ApiErrorType 
} from '../types/websets.js';
import { ApiErrorHandler } from './ErrorHandler.js';
import { RateLimiter, CircuitBreaker } from './RateLimiter.js';
import { log } from '../utils/logger.js';
import { TokenProvider, maskSensitiveData } from '../utils/security.js';

export class WebsetsApiClient {
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private config: WebsetsConfig;
  private clientConfig: ApiClientConfig;
  private tokenProvider: TokenProvider;

  constructor(
    config: WebsetsConfig, 
    clientConfig: ApiClientConfig,
    tokenProvider: TokenProvider
  ) {
    this.config = config;
    this.clientConfig = clientConfig;
    this.tokenProvider = tokenProvider;

    // Initialize HTTP client without auth header
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'User-Agent': clientConfig.userAgent,
        ...clientConfig.defaultHeaders,
      },
    });

    // Add request interceptor to inject auth header
    this.httpClient.interceptors.request.use(
      (config) => {
        try {
          const token = this.tokenProvider.getToken();
          config.headers['x-api-key'] = token;
        } catch (error) {
          log.error('Failed to get API token', error);
          throw error;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      requestsPerSecond: config.rateLimit,
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreakerThreshold,
      config.circuitBreakerTimeout
    );

    // Setup request/response interceptors
    this.setupInterceptors();

    log('WebsetsApiClient initialized');
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>, options?: HttpClientOptions): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'GET',
      url: endpoint,
      params,
      ...options,
    });
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, data?: any, options?: HttpClientOptions): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url: endpoint,
      data,
      ...options,
    });
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, data?: any, options?: HttpClientOptions): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url: endpoint,
      data,
      ...options,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, options?: HttpClientOptions): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'DELETE',
      url: endpoint,
      ...options,
    });
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(endpoint: string, data?: any, options?: HttpClientOptions): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'PATCH',
      url: endpoint,
      data,
      ...options,
    });
  }

  /**
   * Core request method with retry logic and error handling
   */
  private async request<T>(requestOptions: RequestOptions): Promise<ApiResponse<T>> {
    const { retries = this.config.retryAttempts, ...options } = requestOptions;
    
    return this.circuitBreaker.execute(async () => {
      return this.executeRequestWithRetry<T>(options, retries);
    });
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequestWithRetry<T>(options: Omit<RequestOptions, 'retries'>, maxRetries: number): Promise<ApiResponse<T>> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Wait for rate limiter
        await this.rateLimiter.waitForToken();

        // Make the request
        const response = await this.httpClient.request({
          method: options.method,
          url: options.url,
          data: options.data,
          params: options.params,
          headers: options.headers,
          timeout: options.timeout || this.config.timeout,
        });

        return this.createApiResponse<T>(response);
      } catch (error) {
        const apiError = ApiErrorHandler.createApiError(error);
        lastError = apiError;

        // Log the error
        ApiErrorHandler.logError(apiError, `Attempt ${attempt + 1}/${maxRetries + 1}`);

        // Check if we should retry
        const errorType = ApiErrorHandler.classify(error);
        const shouldRetry = ApiErrorHandler.shouldRetry(errorType) && attempt < maxRetries;

        if (!shouldRetry) {
          break;
        }

        // Calculate retry delay
        const delay = ApiErrorHandler.getRetryDelay(
          attempt,
          errorType,
          this.config.retryDelay,
          this.config.maxRetryDelay
        );

        log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    // All retries exhausted, throw the last error
    throw lastError;
  }

  /**
   * Create standardized API response
   */
  private createApiResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        if (this.clientConfig.enableLogging) {
          log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
        }
        return config;
      },
      (error) => {
        if (this.clientConfig.enableLogging) {
          log(`Request error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        if (this.clientConfig.enableLogging) {
          log(`Received ${response.status} response from ${response.config.url}`);
        }
        return response;
      },
      (error) => {
        if (this.clientConfig.enableLogging) {
          const status = error.response?.status || 'unknown';
          log(`Response error ${status}: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get client statistics
   */
  getStats(): {
    rateLimiter: ReturnType<RateLimiter['getStats']>;
    circuitBreaker: ReturnType<CircuitBreaker['getState']>;
  } {
    return {
      rateLimiter: this.rateLimiter.getStats(),
      circuitBreaker: this.circuitBreaker.getState(),
    };
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<WebsetsConfig>): void {
    // Update internal config
    this.config = { ...this.config, ...config };

    // Update rate limiter if needed
    if (config.rateLimit !== undefined) {
      this.rateLimiter.updateOptions({ requestsPerSecond: config.rateLimit });
    }

    // Update HTTP client timeout if needed
    if (config.timeout !== undefined) {
      this.httpClient.defaults.timeout = config.timeout;
    }

    log('WebsetsApiClient configuration updated');
  }

  /**
   * Reset client state (rate limiter, circuit breaker)
   */
  reset(): void {
    this.rateLimiter.reset();
    this.circuitBreaker.reset();
    log('WebsetsApiClient state reset');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}