/**
 * Webhook Attempt Tracker Implementation
 * 
 * Tracks webhook delivery attempts, maintains delivery history, and provides
 * analytics and reporting capabilities for webhook performance monitoring.
 */

import { EventEmitter } from 'events';
import { WebhookDeliveryAttempt, WebhookDeliveryResult } from './WebhookSender.js';
import { WebsetEvent } from '../types/websets.js';

/**
 * Webhook attempt tracking configuration
 */
export interface WebhookAttemptTrackerConfig {
  /** Maximum number of attempts to keep in memory */
  maxAttemptsInMemory: number;
  /** Maximum age of attempts to keep in memory (milliseconds) */
  maxAttemptAge: number;
  /** Whether to enable detailed logging */
  enableDetailedLogging: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Whether to track response bodies */
  trackResponseBodies: boolean;
  /** Maximum response body size to track */
  maxResponseBodySize: number;
}

/**
 * Webhook delivery statistics
 */
export interface WebhookDeliveryStats {
  /** Total attempts made */
  totalAttempts: number;
  /** Successful attempts */
  successfulAttempts: number;
  /** Failed attempts */
  failedAttempts: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Median response time in milliseconds */
  medianResponseTime: number;
  /** 95th percentile response time in milliseconds */
  p95ResponseTime: number;
  /** Most common error types */
  commonErrors: Array<{ error: string; count: number }>;
  /** Status code distribution */
  statusCodeDistribution: Record<number, number>;
  /** Attempts by webhook ID */
  attemptsByWebhook: Record<string, number>;
}

/**
 * Webhook attempt filter criteria
 */
export interface WebhookAttemptFilter {
  /** Filter by webhook ID */
  webhookId?: string;
  /** Filter by event type */
  eventType?: string;
  /** Filter by success status */
  success?: boolean;
  /** Filter by status code */
  statusCode?: number;
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by attempt number */
  attemptNumber?: number;
  /** Filter by error pattern */
  errorPattern?: RegExp;
}

/**
 * Tracked webhook attempt with additional metadata
 */
export interface TrackedWebhookAttempt extends WebhookDeliveryAttempt {
  /** Event type for easier filtering */
  eventType: string;
  /** Whether this was the final attempt */
  finalAttempt: boolean;
  /** Total delivery result (if final attempt) */
  deliveryResult?: WebhookDeliveryResult;
}

/**
 * Default webhook attempt tracker configuration
 */
const DEFAULT_WEBHOOK_ATTEMPT_TRACKER_CONFIG: WebhookAttemptTrackerConfig = {
  maxAttemptsInMemory: 10000,
  maxAttemptAge: 24 * 60 * 60 * 1000, // 24 hours
  enableDetailedLogging: false,
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  trackResponseBodies: true,
  maxResponseBodySize: 1024, // 1KB
};

/**
 * Webhook attempt tracker for monitoring delivery performance
 */
export class WebhookAttemptTracker extends EventEmitter {
  private readonly config: WebhookAttemptTrackerConfig;
  private readonly attempts = new Map<string, TrackedWebhookAttempt>();
  private readonly attemptsByWebhook = new Map<string, Set<string>>();
  private readonly attemptsByEvent = new Map<string, Set<string>>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<WebhookAttemptTrackerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_WEBHOOK_ATTEMPT_TRACKER_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Track a webhook delivery attempt
   * @param attempt The delivery attempt to track
   * @param event The associated event
   * @param finalAttempt Whether this was the final attempt
   * @param deliveryResult The complete delivery result (if final attempt)
   */
  trackAttempt(
    attempt: WebhookDeliveryAttempt,
    event: WebsetEvent,
    finalAttempt: boolean = false,
    deliveryResult?: WebhookDeliveryResult
  ): void {
    // Truncate response body if too large
    let responseBody = attempt.responseBody;
    if (responseBody && responseBody.length > this.config.maxResponseBodySize) {
      responseBody = responseBody.substring(0, this.config.maxResponseBodySize) + '...';
    }

    const trackedAttempt: TrackedWebhookAttempt = {
      ...attempt,
      responseBody: this.config.trackResponseBodies ? responseBody : undefined,
      eventType: event.type,
      finalAttempt,
      deliveryResult,
    };

    // Store attempt
    this.attempts.set(attempt.id, trackedAttempt);

    // Index by webhook ID
    if (!this.attemptsByWebhook.has(attempt.webhookId)) {
      this.attemptsByWebhook.set(attempt.webhookId, new Set());
    }
    this.attemptsByWebhook.get(attempt.webhookId)!.add(attempt.id);

    // Index by event type
    if (!this.attemptsByEvent.has(event.type)) {
      this.attemptsByEvent.set(event.type, new Set());
    }
    this.attemptsByEvent.get(event.type)!.add(attempt.id);

    // Emit tracking event
    this.emit('attemptTracked', trackedAttempt);

    // Log if enabled
    if (this.config.enableDetailedLogging) {
      console.log(`Tracked webhook attempt: ${attempt.id}`, {
        webhookId: attempt.webhookId,
        eventType: event.type,
        success: attempt.success,
        statusCode: attempt.statusCode,
        duration: attempt.duration,
        finalAttempt,
      });
    }

    // Cleanup if memory limit exceeded
    if (this.attempts.size > this.config.maxAttemptsInMemory) {
      this.cleanupOldAttempts();
    }
  }

  /**
   * Get attempts by filter criteria
   * @param filter Filter criteria
   * @returns Array of matching attempts
   */
  getAttempts(filter: WebhookAttemptFilter = {}): TrackedWebhookAttempt[] {
    const results: TrackedWebhookAttempt[] = [];

    for (const attempt of this.attempts.values()) {
      if (this.matchesFilter(attempt, filter)) {
        results.push(attempt);
      }
    }

    // Sort by attempt time (newest first)
    return results.sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime());
  }

  /**
   * Get attempts for a specific webhook
   * @param webhookId The webhook ID
   * @param limit Maximum number of attempts to return
   * @returns Array of attempts for the webhook
   */
  getWebhookAttempts(webhookId: string, limit: number = 100): TrackedWebhookAttempt[] {
    const attemptIds = this.attemptsByWebhook.get(webhookId);
    if (!attemptIds) {
      return [];
    }

    const attempts: TrackedWebhookAttempt[] = [];
    for (const attemptId of attemptIds) {
      const attempt = this.attempts.get(attemptId);
      if (attempt) {
        attempts.push(attempt);
      }
    }

    // Sort by attempt time (newest first) and limit
    return attempts
      .sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get attempts for a specific event type
   * @param eventType The event type
   * @param limit Maximum number of attempts to return
   * @returns Array of attempts for the event type
   */
  getEventTypeAttempts(eventType: string, limit: number = 100): TrackedWebhookAttempt[] {
    const attemptIds = this.attemptsByEvent.get(eventType);
    if (!attemptIds) {
      return [];
    }

    const attempts: TrackedWebhookAttempt[] = [];
    for (const attemptId of attemptIds) {
      const attempt = this.attempts.get(attemptId);
      if (attempt) {
        attempts.push(attempt);
      }
    }

    // Sort by attempt time (newest first) and limit
    return attempts
      .sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get delivery statistics
   * @param filter Optional filter criteria
   * @returns Delivery statistics
   */
  getStats(filter: WebhookAttemptFilter = {}): WebhookDeliveryStats {
    const attempts = this.getAttempts(filter);
    
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        successRate: 0,
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        commonErrors: [],
        statusCodeDistribution: {},
        attemptsByWebhook: {},
      };
    }

    const successfulAttempts = attempts.filter(a => a.success).length;
    const failedAttempts = attempts.length - successfulAttempts;
    const responseTimes = attempts.map(a => a.duration).sort((a, b) => a - b);
    
    // Calculate percentiles
    const medianIndex = Math.floor(responseTimes.length / 2);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    
    // Count errors
    const errorCounts = new Map<string, number>();
    const statusCodeCounts = new Map<number, number>();
    const webhookCounts = new Map<string, number>();
    
    for (const attempt of attempts) {
      // Count errors
      if (attempt.error) {
        const count = errorCounts.get(attempt.error) || 0;
        errorCounts.set(attempt.error, count + 1);
      }
      
      // Count status codes
      if (attempt.statusCode) {
        const count = statusCodeCounts.get(attempt.statusCode) || 0;
        statusCodeCounts.set(attempt.statusCode, count + 1);
      }
      
      // Count by webhook
      const count = webhookCounts.get(attempt.webhookId) || 0;
      webhookCounts.set(attempt.webhookId, count + 1);
    }

    // Convert to arrays and objects
    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 errors

    const statusCodeDistribution: Record<number, number> = {};
    for (const [code, count] of statusCodeCounts) {
      statusCodeDistribution[code] = count;
    }

    const attemptsByWebhook: Record<string, number> = {};
    for (const [webhookId, count] of webhookCounts) {
      attemptsByWebhook[webhookId] = count;
    }

    return {
      totalAttempts: attempts.length,
      successfulAttempts,
      failedAttempts,
      successRate: attempts.length > 0 ? successfulAttempts / attempts.length : 0,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      medianResponseTime: responseTimes[medianIndex] || 0,
      p95ResponseTime: responseTimes[p95Index] || 0,
      commonErrors,
      statusCodeDistribution,
      attemptsByWebhook,
    };
  }

  /**
   * Get recent failed attempts
   * @param limit Maximum number of attempts to return
   * @param hours Number of hours to look back
   * @returns Array of recent failed attempts
   */
  getRecentFailedAttempts(limit: number = 50, hours: number = 24): TrackedWebhookAttempt[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.getAttempts({
      success: false,
      dateRange: {
        start: cutoffTime,
        end: new Date(),
      },
    }).slice(0, limit);
  }

  /**
   * Get webhook health status
   * @param webhookId The webhook ID
   * @param hours Number of hours to analyze
   * @returns Health status information
   */
  getWebhookHealth(webhookId: string, hours: number = 24): {
    healthy: boolean;
    successRate: number;
    totalAttempts: number;
    recentErrors: string[];
    averageResponseTime: number;
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const attempts = this.getAttempts({
      webhookId,
      dateRange: {
        start: cutoffTime,
        end: new Date(),
      },
    });

    if (attempts.length === 0) {
      return {
        healthy: true,
        successRate: 0,
        totalAttempts: 0,
        recentErrors: [],
        averageResponseTime: 0,
      };
    }

    const successfulAttempts = attempts.filter(a => a.success).length;
    const successRate = successfulAttempts / attempts.length;
    const recentErrors = attempts
      .filter(a => !a.success && a.error)
      .map(a => a.error!)
      .slice(0, 5); // Last 5 errors

    const averageResponseTime = attempts.reduce((sum, a) => sum + a.duration, 0) / attempts.length;

    return {
      healthy: successRate >= 0.95, // Consider healthy if 95%+ success rate
      successRate,
      totalAttempts: attempts.length,
      recentErrors,
      averageResponseTime,
    };
  }

  /**
   * Check if an attempt matches filter criteria
   * @param attempt The attempt to check
   * @param filter The filter criteria
   * @returns True if attempt matches filter
   */
  private matchesFilter(attempt: TrackedWebhookAttempt, filter: WebhookAttemptFilter): boolean {
    if (filter.webhookId && attempt.webhookId !== filter.webhookId) {
      return false;
    }

    if (filter.eventType && attempt.eventType !== filter.eventType) {
      return false;
    }

    if (filter.success !== undefined && attempt.success !== filter.success) {
      return false;
    }

    if (filter.statusCode && attempt.statusCode !== filter.statusCode) {
      return false;
    }

    if (filter.attemptNumber && attempt.attemptNumber !== filter.attemptNumber) {
      return false;
    }

    if (filter.dateRange) {
      const attemptTime = attempt.attemptedAt.getTime();
      if (attemptTime < filter.dateRange.start.getTime() || 
          attemptTime > filter.dateRange.end.getTime()) {
        return false;
      }
    }

    if (filter.errorPattern && attempt.error && !filter.errorPattern.test(attempt.error)) {
      return false;
    }

    return true;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldAttempts();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup old attempts from memory
   */
  private cleanupOldAttempts(): void {
    const cutoffTime = new Date(Date.now() - this.config.maxAttemptAge);
    const toRemove: string[] = [];

    for (const [attemptId, attempt] of this.attempts) {
      if (attempt.attemptedAt < cutoffTime) {
        toRemove.push(attemptId);
      }
    }

    // Remove old attempts
    for (const attemptId of toRemove) {
      const attempt = this.attempts.get(attemptId);
      if (attempt) {
        this.attempts.delete(attemptId);
        
        // Remove from indexes
        const webhookAttempts = this.attemptsByWebhook.get(attempt.webhookId);
        if (webhookAttempts) {
          webhookAttempts.delete(attemptId);
          if (webhookAttempts.size === 0) {
            this.attemptsByWebhook.delete(attempt.webhookId);
          }
        }
        
        const eventAttempts = this.attemptsByEvent.get(attempt.eventType);
        if (eventAttempts) {
          eventAttempts.delete(attemptId);
          if (eventAttempts.size === 0) {
            this.attemptsByEvent.delete(attempt.eventType);
          }
        }
      }
    }

    if (toRemove.length > 0) {
      this.emit('attemptsCleanedUp', toRemove.length);
      
      if (this.config.enableDetailedLogging) {
        console.log(`Cleaned up ${toRemove.length} old webhook attempts`);
      }
    }
  }

  /**
   * Clear all tracked attempts
   */
  clear(): void {
    const count = this.attempts.size;
    this.attempts.clear();
    this.attemptsByWebhook.clear();
    this.attemptsByEvent.clear();
    
    this.emit('attemptsCleared', count);
  }

  /**
   * Get current memory usage
   * @returns Memory usage information
   */
  getMemoryUsage(): {
    totalAttempts: number;
    webhooksTracked: number;
    eventTypesTracked: number;
    memoryLimitReached: boolean;
  } {
    return {
      totalAttempts: this.attempts.size,
      webhooksTracked: this.attemptsByWebhook.size,
      eventTypesTracked: this.attemptsByEvent.size,
      memoryLimitReached: this.attempts.size >= this.config.maxAttemptsInMemory,
    };
  }

  /**
   * Shutdown the tracker
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    this.emit('shutdown');
  }
}