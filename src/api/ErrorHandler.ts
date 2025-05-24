/**
 * API Error Handler
 * 
 * Centralized error handling, classification, and retry logic for the Websets API.
 */

import { ApiError, ApiErrorType } from '../types/websets.js';
import { log } from '../utils/logger.js';
import { maskSensitiveData } from '../utils/security.js';

export class ApiErrorHandler {
  /**
   * Classify an error based on its characteristics
   */
  static classify(error: unknown): ApiErrorType {
    // Type guard for error-like objects
    const errorObj = error as any;
    
    // Network/connection errors
    if (errorObj?.code === 'ECONNREFUSED' || errorObj?.code === 'ENOTFOUND' || errorObj?.code === 'ECONNRESET') {
      return ApiErrorType.NETWORK_ERROR;
    }

    // Timeout errors
    if (errorObj?.code === 'ETIMEDOUT' || errorObj?.message?.includes('timeout')) {
      return ApiErrorType.TIMEOUT_ERROR;
    }

    // HTTP status code based classification
    if (errorObj?.response?.status) {
      const status = errorObj.response.status;
      
      if (status === 401) {
        return ApiErrorType.AUTHENTICATION;
      }
      
      if (status === 403) {
        return ApiErrorType.AUTHORIZATION;
      }
      
      if (status === 404) {
        return ApiErrorType.NOT_FOUND;
      }
      
      if (status === 400 || status === 422) {
        return ApiErrorType.VALIDATION;
      }
      
      if (status === 429) {
        return ApiErrorType.RATE_LIMIT;
      }
      
      if (status >= 500) {
        return ApiErrorType.SERVER_ERROR;
      }
    }

    // Circuit breaker errors
    if (errorObj?.message?.includes('circuit breaker')) {
      return ApiErrorType.CIRCUIT_BREAKER_OPEN;
    }

    // Default to network error for unknown errors
    return ApiErrorType.NETWORK_ERROR;
  }

  /**
   * Determine if an error should trigger a retry
   */
  static shouldRetry(errorType: ApiErrorType): boolean {
    switch (errorType) {
      case ApiErrorType.RATE_LIMIT:
      case ApiErrorType.SERVER_ERROR:
      case ApiErrorType.NETWORK_ERROR:
      case ApiErrorType.TIMEOUT_ERROR:
        return true;
      
      case ApiErrorType.AUTHENTICATION:
      case ApiErrorType.AUTHORIZATION:
      case ApiErrorType.VALIDATION:
      case ApiErrorType.NOT_FOUND:
      case ApiErrorType.CIRCUIT_BREAKER_OPEN:
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static getRetryDelay(attempt: number, errorType: ApiErrorType, baseDelay: number = 1000, maxDelay: number = 10000): number {
    // Special handling for rate limit errors
    if (errorType === ApiErrorType.RATE_LIMIT) {
      // Use longer delays for rate limit errors
      return Math.min(baseDelay * Math.pow(2, attempt) * 2, maxDelay);
    }

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Format error message for logging and user display
   */
  static formatErrorMessage(error: ApiError): string {
    let message = `${error.code}: ${error.message}`;
    
    if (error.details) {
      if (typeof error.details === 'string') {
        message += ` - ${maskSensitiveData(error.details)}`;
      } else if (typeof error.details === 'object') {
        try {
          const maskedDetails = maskSensitiveData(error.details);
          message += ` - ${JSON.stringify(maskedDetails)}`;
        } catch {
          message += ` - [Complex error details]`;
        }
      }
    }
    
    return message;
  }

  /**
   * Create a standardized ApiError from various error types
   */
  static createApiError(error: unknown): ApiError {
    const errorType = this.classify(error);
    
    // Extract error information based on error structure
    let code = errorType;
    let message = 'An unknown error occurred';
    let details: unknown = undefined;

    if (error && typeof error === 'object' && 'response' in error) {
      const responseError = error as any;
      if (responseError.response?.data?.error) {
        // Structured API error response
        const apiError = responseError.response.data.error;
        code = apiError.code || errorType;
        message = apiError.message || message;
        details = apiError.details;
      } else if ('message' in error && typeof (error as any).message === 'string') {
        // Standard Error object
        const err = error as any;
        message = err.message;
        details = {
          stack: err.stack,
          code: err.code,
          status: responseError.response?.status,
        };
      }
    } else if (typeof error === 'string') {
      // String error
      message = error;
    }

    return {
      code,
      message,
      details,
    };
  }

  /**
   * Log error with appropriate level based on error type
   */
  static logError(error: ApiError, context?: string): void {
    const contextStr = context ? `[${context}] ` : '';
    const errorMsg = this.formatErrorMessage(error);
    
    // Log with different levels based on error severity
    switch (error.code) {
      case ApiErrorType.AUTHENTICATION:
      case ApiErrorType.AUTHORIZATION:
        log(`${contextStr}Auth Error: ${errorMsg}`);
        break;
      
      case ApiErrorType.VALIDATION:
        log(`${contextStr}Validation Error: ${errorMsg}`);
        break;
      
      case ApiErrorType.NOT_FOUND:
        log(`${contextStr}Not Found: ${errorMsg}`);
        break;
      
      case ApiErrorType.RATE_LIMIT:
        log(`${contextStr}Rate Limited: ${errorMsg}`);
        break;
      
      case ApiErrorType.SERVER_ERROR:
        log(`${contextStr}Server Error: ${errorMsg}`);
        break;
      
      case ApiErrorType.NETWORK_ERROR:
      case ApiErrorType.TIMEOUT_ERROR:
        log(`${contextStr}Network Error: ${errorMsg}`);
        break;
      
      case ApiErrorType.CIRCUIT_BREAKER_OPEN:
        log(`${contextStr}Circuit Breaker Open: ${errorMsg}`);
        break;
      
      default:
        log(`${contextStr}Unknown Error: ${errorMsg}`);
    }
  }

  /**
   * Check if an error indicates a temporary failure
   */
  static isTemporaryError(errorType: ApiErrorType): boolean {
    return [
      ApiErrorType.RATE_LIMIT,
      ApiErrorType.SERVER_ERROR,
      ApiErrorType.NETWORK_ERROR,
      ApiErrorType.TIMEOUT_ERROR,
    ].includes(errorType);
  }

  /**
   * Check if an error indicates a permanent failure
   */
  static isPermanentError(errorType: ApiErrorType): boolean {
    return [
      ApiErrorType.AUTHENTICATION,
      ApiErrorType.AUTHORIZATION,
      ApiErrorType.VALIDATION,
      ApiErrorType.NOT_FOUND,
    ].includes(errorType);
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: ApiError): string {
    switch (error.code) {
      case ApiErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your API key.';
      
      case ApiErrorType.AUTHORIZATION:
        return 'Access denied. You may not have permission for this operation.';
      
      case ApiErrorType.VALIDATION:
        return 'Invalid request data. Please check your input parameters.';
      
      case ApiErrorType.NOT_FOUND:
        return 'The requested resource was not found.';
      
      case ApiErrorType.RATE_LIMIT:
        return 'Rate limit exceeded. Please try again later.';
      
      case ApiErrorType.SERVER_ERROR:
        return 'Server error occurred. Please try again later.';
      
      case ApiErrorType.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection.';
      
      case ApiErrorType.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.';
      
      case ApiErrorType.CIRCUIT_BREAKER_OPEN:
        return 'Service temporarily unavailable. Please try again later.';
      
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
}