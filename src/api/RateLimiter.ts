/**
 * Rate Limiter
 * 
 * Token bucket rate limiter implementation for API request throttling.
 */

import { RateLimiterOptions, RateLimitState } from '../types/websets.js';
import { log } from '../utils/logger.js';

export class RateLimiter {
  private options: Required<RateLimiterOptions>;
  private state: RateLimitState;

  constructor(options: RateLimiterOptions) {
    this.options = {
      requestsPerSecond: options.requestsPerSecond,
      burstSize: options.burstSize || options.requestsPerSecond * 2, // Default burst is 2x rate
    };

    this.state = {
      tokens: this.options.burstSize,
      lastRefill: Date.now(),
    };

    log(`Rate limiter initialized: ${this.options.requestsPerSecond} req/s, burst: ${this.options.burstSize}`);
  }

  /**
   * Attempt to acquire a token for a request
   * Returns true if token acquired, false if rate limited
   */
  async acquire(): Promise<boolean> {
    this.refillTokens();

    if (this.state.tokens >= 1) {
      this.state.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Wait until a token becomes available
   */
  async waitForToken(): Promise<void> {
    while (!(await this.acquire())) {
      const waitTime = this.getWaitTime();
      await this.sleep(waitTime);
    }
  }

  /**
   * Get the current number of available tokens
   */
  getAvailableTokens(): number {
    this.refillTokens();
    return Math.floor(this.state.tokens);
  }

  /**
   * Get the time to wait before next token becomes available (in ms)
   */
  getWaitTime(): number {
    this.refillTokens();
    
    if (this.state.tokens >= 1) {
      return 0;
    }

    // Calculate time needed for next token
    const tokensNeeded = 1 - this.state.tokens;
    const timePerToken = 1000 / this.options.requestsPerSecond; // ms per token
    
    return Math.ceil(tokensNeeded * timePerToken);
  }

  /**
   * Reset the rate limiter state
   */
  reset(): void {
    this.state = {
      tokens: this.options.burstSize,
      lastRefill: Date.now(),
    };
  }

  /**
   * Update rate limiter configuration
   */
  updateOptions(options: Partial<RateLimiterOptions>): void {
    if (options.requestsPerSecond !== undefined) {
      this.options.requestsPerSecond = options.requestsPerSecond;
    }
    
    if (options.burstSize !== undefined) {
      this.options.burstSize = options.burstSize;
    } else if (options.requestsPerSecond !== undefined) {
      // Update burst size proportionally if not explicitly set
      this.options.burstSize = options.requestsPerSecond * 2;
    }

    // Reset state to apply new configuration
    this.reset();
    
    log(`Rate limiter updated: ${this.options.requestsPerSecond} req/s, burst: ${this.options.burstSize}`);
  }

  /**
   * Get current rate limiter statistics
   */
  getStats(): {
    requestsPerSecond: number;
    burstSize: number;
    availableTokens: number;
    waitTime: number;
  } {
    return {
      requestsPerSecond: this.options.requestsPerSecond,
      burstSize: this.options.burstSize,
      availableTokens: this.getAvailableTokens(),
      waitTime: this.getWaitTime(),
    };
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const timeSinceLastRefill = now - this.state.lastRefill;
    
    if (timeSinceLastRefill <= 0) {
      return;
    }

    // Calculate tokens to add based on elapsed time
    const tokensToAdd = (timeSinceLastRefill / 1000) * this.options.requestsPerSecond;
    
    // Add tokens but don't exceed burst size
    this.state.tokens = Math.min(
      this.state.tokens + tokensToAdd,
      this.options.burstSize
    );
    
    this.state.lastRefill = now;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker implementation for fault tolerance
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private failureThreshold: number,
    private timeout: number,
    private monitoringPeriod: number = 60000 // 1 minute
  ) {
    log(`Circuit breaker initialized: threshold=${failureThreshold}, timeout=${timeout}ms`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is open');
      } else {
        this.state = 'half-open';
        log('Circuit breaker transitioning to half-open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): {
    state: string;
    failures: number;
    successes: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
    log('Circuit breaker reset to closed state');
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successCount++;
    
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failureCount = 0;
      log('Circuit breaker closed after successful half-open attempt');
    }

    // Reset failure count if we've had recent successes
    if (this.successCount >= this.failureThreshold) {
      this.failureCount = 0;
      this.successCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      log('Circuit breaker opened from half-open state');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      log(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
}