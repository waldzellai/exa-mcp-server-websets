/**
 * Base Service
 * 
 * Common functionality for all Websets API services.
 */

import { WebsetsApiClient } from '../api/WebsetsApiClient.js';
import { ApiResponse, PaginatedResponse, ApiError } from '../types/websets.js';
import { ApiErrorHandler } from '../api/ErrorHandler.js';
import { log } from '../utils/logger.js';

export abstract class BaseService {
  protected apiClient: WebsetsApiClient;

  constructor(apiClient: WebsetsApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Handle paginated requests with cursor-based pagination
   */
  protected async handlePaginatedRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResponse<T>> {
    try {
      const requestParams = {
        ...params,
        ...(cursor && { cursor }),
        ...(limit && { limit }),
      };

      const response = await this.apiClient.get<PaginatedResponse<T>>(endpoint, requestParams);
      return response.data;
    } catch (error) {
      const apiError = ApiErrorHandler.createApiError(error);
      ApiErrorHandler.logError(apiError, `Paginated request to ${endpoint}`);
      throw apiError;
    }
  }

  /**
   * Handle standard GET requests
   */
  protected async handleGetRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await this.apiClient.get<T>(endpoint, params);
      return response.data;
    } catch (error) {
      const apiError = ApiErrorHandler.createApiError(error);
      ApiErrorHandler.logError(apiError, `GET request to ${endpoint}`);
      throw apiError;
    }
  }

  /**
   * Handle standard POST requests
   */
  protected async handlePostRequest<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.apiClient.post<T>(endpoint, data);
      return response.data;
    } catch (error) {
      const apiError = ApiErrorHandler.createApiError(error);
      ApiErrorHandler.logError(apiError, `POST request to ${endpoint}`);
      throw apiError;
    }
  }

  /**
   * Handle standard PUT requests
   */
  protected async handlePutRequest<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.apiClient.put<T>(endpoint, data);
      return response.data;
    } catch (error) {
      const apiError = ApiErrorHandler.createApiError(error);
      ApiErrorHandler.logError(apiError, `PUT request to ${endpoint}`);
      throw apiError;
    }
  }

  /**
   * Handle standard DELETE requests
   */
  protected async handleDeleteRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await this.apiClient.delete<T>(endpoint);
      return response.data;
    } catch (error) {
      const apiError = ApiErrorHandler.createApiError(error);
      ApiErrorHandler.logError(apiError, `DELETE request to ${endpoint}`);
      throw apiError;
    }
  }

  /**
   * Handle standard PATCH requests
   */
  protected async handlePatchRequest<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.apiClient.patch<T>(endpoint, data);
      return response.data;
    } catch (error) {
      const apiError = ApiErrorHandler.createApiError(error);
      ApiErrorHandler.logError(apiError, `PATCH request to ${endpoint}`);
      throw apiError;
    }
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required parameters: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Sanitize parameters by removing undefined/null values
   */
  protected sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Build endpoint URL with path parameters
   */
  protected buildEndpoint(template: string, params: Record<string, string>): string {
    let endpoint = template;
    
    for (const [key, value] of Object.entries(params)) {
      endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(value));
    }
    
    return endpoint;
  }

  /**
   * Log service operation
   */
  protected logOperation(operation: string, details?: any): void {
    const serviceName = this.constructor.name;
    const message = `[${serviceName}] ${operation}`;
    
    if (details) {
      log(`${message}: ${JSON.stringify(details)}`);
    } else {
      log(message);
    }
  }

  /**
   * Handle async operations with polling
   */
  protected async pollForCompletion<T>(
    checkEndpoint: string,
    isComplete: (data: T) => boolean,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const data = await this.handleGetRequest<T>(checkEndpoint);
        
        if (isComplete(data)) {
          return data;
        }
        
        if (attempt < maxAttempts) {
          await this.sleep(intervalMs);
        }
      } catch (error) {
        // If it's a temporary error, continue polling
        const apiError = ApiErrorHandler.createApiError(error);
        const errorType = ApiErrorHandler.classify(error);
        
        if (!ApiErrorHandler.isTemporaryError(errorType) || attempt === maxAttempts) {
          throw apiError;
        }
        
        await this.sleep(intervalMs);
      }
    }
    
    throw new Error(`Operation did not complete within ${maxAttempts} attempts`);
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format date for API requests
   */
  protected formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse date from API responses
   */
  protected parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Validate URL format
   */
  protected validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    serviceName: string;
    apiClientStats: ReturnType<WebsetsApiClient['getStats']>;
  } {
    return {
      serviceName: this.constructor.name,
      apiClientStats: this.apiClient.getStats(),
    };
  }
}