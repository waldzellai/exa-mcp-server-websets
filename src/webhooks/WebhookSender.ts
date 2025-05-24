/**
 * Webhook Sender Implementation
 * 
 * Handles webhook delivery with retry logic, timeout handling, and comprehensive
 * tracking of delivery attempts and failures.
 */

import { EventEmitter } from 'events';
import { WebsetEvent, Webhook } from '../types/websets.js';
import { WebhookSubscription } from './WebhookRegistry.js';

/**
 * Webhook delivery configuration
 */
export interface WebhookSenderConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base retry delay in milliseconds */
  retryDelay: number;
  /** Maximum retry delay in milliseconds */
  maxRetryDelay: number;
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
  /** Maximum concurrent deliveries */
  maxConcurrency: number;
  /** User agent string for requests */
  userAgent: string;
  /** Whether to verify SSL certificates */
  verifySsl: boolean;
}

/**
 * Webhook delivery attempt
 */
export interface WebhookDeliveryAttempt {
  /** Unique attempt ID */
  id: string;
  /** Webhook ID */
  webhookId: string;
  /** Event being delivered */
  event: WebsetEvent;
  /** Attempt number (1-based) */
  attemptNumber: number;
  /** When the attempt was made */
  attemptedAt: Date;
  /** HTTP status code (if request completed) */
  statusCode?: number;
  /** Response body (if available) */
  responseBody?: string;
  /** Response headers */
  responseHeaders?: Record<string, string>;
  /** Duration of the request in milliseconds */
  duration: number;
  /** Whether the delivery was successful */
  success: boolean;
  /** Error message if delivery failed */
  error?: string;
  /** Next retry time (if applicable) */
  nextRetryAt?: Date;
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  /** Whether delivery was successful */
  success: boolean;
  /** All delivery attempts made */
  attempts: WebhookDeliveryAttempt[];
  /** Final error if delivery failed */
  finalError?: Error;
  /** Total duration of all attempts */
  totalDuration: number;
}

/**
 * Webhook sender statistics
 */
export interface WebhookSenderStats {
  /** Total deliveries attempted */
  totalDeliveries: number;
  /** Successful deliveries */
  successfulDeliveries: number;
  /** Failed deliveries */
  failedDeliveries: number;
  /** Currently active deliveries */
  activeDeliveries: number;
  /** Average delivery time in milliseconds */
  averageDeliveryTime: number;
  /** Success rate (0-1) */
  successRate: number;
}

/**
 * Default webhook sender configuration
 */
const DEFAULT_WEBHOOK_SENDER_CONFIG: WebhookSenderConfig = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  exponentialBackoff: true,
  maxConcurrency: 10,
  userAgent: 'Websets-Webhook-Sender/1.0',
  verifySsl: true,
};

/**
 * Webhook sender for delivering webhooks with retry logic
 */
export class WebhookSender extends EventEmitter {
  private readonly config: WebhookSenderConfig;
  private readonly activeDeliveries = new Map<string, Promise<WebhookDeliveryResult>>();
  private readonly stats: WebhookSenderStats = {
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    activeDeliveries: 0,
    averageDeliveryTime: 0,
    successRate: 0,
  };
  private readonly deliveryTimes: number[] = [];
  private isShuttingDown = false;

  constructor(config: Partial<WebhookSenderConfig> = {}) {
    super();
    this.config = { ...DEFAULT_WEBHOOK_SENDER_CONFIG, ...config };
  }

  /**
   * Send a webhook for an event
   * @param subscription The webhook subscription
   * @param event The event to send
   * @returns Promise that resolves to delivery result
   */
  async sendWebhook(
    subscription: WebhookSubscription,
    event: WebsetEvent
  ): Promise<WebhookDeliveryResult> {
    if (this.isShuttingDown) {
      throw new Error('Webhook sender is shutting down');
    }

    if (this.activeDeliveries.size >= this.config.maxConcurrency) {
      throw new Error(`Maximum concurrent deliveries reached (${this.config.maxConcurrency})`);
    }

    const deliveryId = `${subscription.webhook.id}-${event.id}-${Date.now()}`;
    
    // Create delivery promise
    const deliveryPromise = this.performDelivery(subscription, event, deliveryId);
    
    // Track active delivery
    this.activeDeliveries.set(deliveryId, deliveryPromise);
    this.stats.activeDeliveries = this.activeDeliveries.size;
    
    try {
      const result = await deliveryPromise;
      return result;
    } finally {
      this.activeDeliveries.delete(deliveryId);
      this.stats.activeDeliveries = this.activeDeliveries.size;
    }
  }

  /**
   * Perform the actual webhook delivery with retries
   * @param subscription The webhook subscription
   * @param event The event to send
   * @param deliveryId Unique delivery ID
   * @returns Promise that resolves to delivery result
   */
  private async performDelivery(
    subscription: WebhookSubscription,
    event: WebsetEvent,
    deliveryId: string
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const attempts: WebhookDeliveryAttempt[] = [];
    let lastError: Error | undefined;

    this.stats.totalDeliveries++;
    this.emit('deliveryStarted', subscription, event, deliveryId);

    for (let attemptNumber = 1; attemptNumber <= this.config.maxRetries + 1; attemptNumber++) {
      const attempt = await this.makeDeliveryAttempt(
        subscription,
        event,
        attemptNumber,
        deliveryId
      );
      
      attempts.push(attempt);
      this.emit('deliveryAttempt', attempt);

      if (attempt.success) {
        // Successful delivery
        const totalDuration = Date.now() - startTime;
        this.stats.successfulDeliveries++;
        this.recordDeliveryTime(totalDuration);
        this.updateSuccessRate();
        
        const result: WebhookDeliveryResult = {
          success: true,
          attempts,
          totalDuration,
        };
        
        this.emit('deliverySuccess', subscription, event, result);
        return result;
      }

      // Delivery failed
      lastError = new Error(attempt.error || 'Unknown delivery error');
      
      // Check if we should retry
      if (attemptNumber <= this.config.maxRetries) {
        const retryDelay = this.calculateRetryDelay(attemptNumber);
        attempt.nextRetryAt = new Date(Date.now() + retryDelay);
        
        this.emit('deliveryRetry', attempt, retryDelay);
        await this.sleep(retryDelay);
      }
    }

    // All attempts failed
    const totalDuration = Date.now() - startTime;
    this.stats.failedDeliveries++;
    this.updateSuccessRate();
    
    const result: WebhookDeliveryResult = {
      success: false,
      attempts,
      finalError: lastError,
      totalDuration,
    };
    
    this.emit('deliveryFailed', subscription, event, result);
    return result;
  }

  /**
   * Make a single delivery attempt
   * @param subscription The webhook subscription
   * @param event The event to send
   * @param attemptNumber The attempt number
   * @param deliveryId Unique delivery ID
   * @returns Promise that resolves to delivery attempt
   */
  private async makeDeliveryAttempt(
    subscription: WebhookSubscription,
    event: WebsetEvent,
    attemptNumber: number,
    deliveryId: string
  ): Promise<WebhookDeliveryAttempt> {
    const attemptId = `${deliveryId}-${attemptNumber}`;
    const startTime = Date.now();
    
    const attempt: WebhookDeliveryAttempt = {
      id: attemptId,
      webhookId: subscription.webhook.id,
      event,
      attemptNumber,
      attemptedAt: new Date(),
      duration: 0,
      success: false,
    };

    try {
      // Prepare webhook payload
      const payload = this.createWebhookPayload(event, subscription.webhook);
      
      // Make HTTP request
      const response = await this.makeHttpRequest(
        subscription.webhook.url,
        payload,
        subscription.webhook.secret
      );
      
      attempt.statusCode = response.status;
      attempt.responseBody = response.body;
      attempt.responseHeaders = response.headers;
      attempt.duration = Date.now() - startTime;
      
      // Consider 2xx status codes as successful
      attempt.success = response.status >= 200 && response.status < 300;
      
      if (!attempt.success) {
        attempt.error = `HTTP ${response.status}: ${response.statusText}`;
      }
      
    } catch (error) {
      attempt.duration = Date.now() - startTime;
      attempt.error = error instanceof Error ? error.message : 'Unknown error';
      attempt.success = false;
    }

    return attempt;
  }

  /**
   * Create webhook payload
   * @param event The event data
   * @param webhook The webhook configuration
   * @returns Webhook payload
   */
  private createWebhookPayload(event: WebsetEvent, webhook: Webhook): any {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      object: 'event',
      type: event.type,
      data: event.data,
      created: Math.floor(Date.now() / 1000),
      livemode: false, // Assuming sandbox mode for now
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null,
      },
    };
  }

  /**
   * Make HTTP request to webhook URL
   * @param url The webhook URL
   * @param payload The payload to send
   * @param secret Optional webhook secret for signature
   * @returns Promise that resolves to HTTP response
   */
  private async makeHttpRequest(
    url: string,
    payload: any,
    secret?: string
  ): Promise<{
    status: number;
    statusText: string;
    body: string;
    headers: Record<string, string>;
  }> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.config.userAgent,
      'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString(),
    };

    // Add signature if secret is provided
    if (secret) {
      const signature = await this.generateSignature(body, secret);
      headers['X-Webhook-Signature-256'] = signature;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
        // Note: In Node.js, you might need to configure SSL verification
        // This is a simplified implementation
      });

      const responseBody = await response.text();
      const responseHeaders: Record<string, string> = {};
      
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
        headers: responseHeaders,
      };
      
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook
   * @param payload The payload to sign
   * @param secret The webhook secret
   * @returns Promise that resolves to signature
   */
  private async generateSignature(payload: string, secret: string): Promise<string> {
    // This is a simplified implementation
    // In a real implementation, you would use Node.js crypto module
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `sha256=${hashHex}`;
  }

  /**
   * Calculate retry delay based on attempt number
   * @param attemptNumber The current attempt number
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attemptNumber: number): number {
    let delay = this.config.retryDelay;
    
    if (this.config.exponentialBackoff) {
      delay = Math.min(
        this.config.retryDelay * Math.pow(2, attemptNumber - 1),
        this.config.maxRetryDelay
      );
    }
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Sleep for specified duration
   * @param ms Duration in milliseconds
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Record delivery time for statistics
   * @param duration Delivery duration in milliseconds
   */
  private recordDeliveryTime(duration: number): void {
    this.deliveryTimes.push(duration);
    
    // Keep only last 1000 delivery times
    if (this.deliveryTimes.length > 1000) {
      this.deliveryTimes.shift();
    }
    
    this.stats.averageDeliveryTime = 
      this.deliveryTimes.reduce((sum, time) => sum + time, 0) / this.deliveryTimes.length;
  }

  /**
   * Update success rate statistics
   */
  private updateSuccessRate(): void {
    const totalCompleted = this.stats.successfulDeliveries + this.stats.failedDeliveries;
    this.stats.successRate = totalCompleted > 0 ? 
      this.stats.successfulDeliveries / totalCompleted : 0;
  }

  /**
   * Get current sender statistics
   * @returns Current statistics
   */
  getStats(): WebhookSenderStats {
    return { ...this.stats };
  }

  /**
   * Get active deliveries count
   * @returns Number of active deliveries
   */
  getActiveDeliveriesCount(): number {
    return this.activeDeliveries.size;
  }

  /**
   * Gracefully shutdown the sender
   * @param timeout Maximum time to wait for shutdown in milliseconds
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(timeout: number = 30000): Promise<void> {
    this.isShuttingDown = true;

    // Wait for all active deliveries to complete
    const startTime = Date.now();
    while (this.activeDeliveries.size > 0 && (Date.now() - startTime) < timeout) {
      await this.sleep(100);
    }

    if (this.activeDeliveries.size > 0) {
      console.warn(`Webhook sender shutdown with ${this.activeDeliveries.size} deliveries still active`);
    }

    this.emit('shutdown');
  }

  /**
   * Health check for the sender
   * @returns Health status information
   */
  healthCheck(): {
    healthy: boolean;
    activeDeliveries: number;
    successRate: number;
    averageDeliveryTime: number;
  } {
    return {
      healthy: !this.isShuttingDown && this.activeDeliveries.size < this.config.maxConcurrency,
      activeDeliveries: this.activeDeliveries.size,
      successRate: this.stats.successRate,
      averageDeliveryTime: this.stats.averageDeliveryTime,
    };
  }
}