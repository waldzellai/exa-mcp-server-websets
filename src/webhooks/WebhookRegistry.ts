/**
 * Webhook Registry Implementation
 * 
 * Manages webhook subscriptions, filtering, and routing for different event types.
 * Provides thread-safe operations for webhook management.
 */

import { EventEmitter } from 'events';
import { EventType, Webhook, CreateWebhookRequest, UpdateWebhookRequest } from '../types/websets.js';

/**
 * Webhook subscription with additional metadata
 */
export interface WebhookSubscription {
  webhook: Webhook;
  isActive: boolean;
  lastDeliveryAt?: Date;
  deliveryCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastError?: Error;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook registry configuration
 */
export interface WebhookRegistryConfig {
  /** Maximum number of webhooks allowed */
  maxWebhooks: number;
  /** Maximum consecutive failures before deactivating */
  maxConsecutiveFailures: number;
  /** Webhook timeout in milliseconds */
  webhookTimeout: number;
  /** Enable webhook validation */
  enableValidation: boolean;
}

/**
 * Webhook registry statistics
 */
export interface WebhookRegistryStats {
  totalWebhooks: number;
  activeWebhooks: number;
  inactiveWebhooks: number;
  totalDeliveries: number;
  totalFailures: number;
  averageDeliveryTime: number;
}

/**
 * Default webhook registry configuration
 */
const DEFAULT_WEBHOOK_REGISTRY_CONFIG: WebhookRegistryConfig = {
  maxWebhooks: 100,
  maxConsecutiveFailures: 5,
  webhookTimeout: 30000,
  enableValidation: true,
};

/**
 * Thread-safe webhook registry for managing webhook subscriptions
 */
export class WebhookRegistry extends EventEmitter {
  private readonly config: WebhookRegistryConfig;
  private readonly subscriptions = new Map<string, WebhookSubscription>();
  private readonly eventTypeIndex = new Map<EventType, Set<string>>();
  private readonly stats: WebhookRegistryStats = {
    totalWebhooks: 0,
    activeWebhooks: 0,
    inactiveWebhooks: 0,
    totalDeliveries: 0,
    totalFailures: 0,
    averageDeliveryTime: 0,
  };
  private readonly deliveryTimes: number[] = [];

  constructor(config: Partial<WebhookRegistryConfig> = {}) {
    super();
    this.config = { ...DEFAULT_WEBHOOK_REGISTRY_CONFIG, ...config };
  }

  /**
   * Register a new webhook
   * @param webhookData The webhook data
   * @returns Promise that resolves to the created webhook subscription
   */
  async register(webhookData: CreateWebhookRequest & { id: string; secret?: string }): Promise<WebhookSubscription> {
    if (this.subscriptions.size >= this.config.maxWebhooks) {
      throw new Error(`Maximum number of webhooks reached (${this.config.maxWebhooks})`);
    }

    if (this.config.enableValidation) {
      this.validateWebhookData(webhookData);
    }

    const webhook: Webhook = {
      id: webhookData.id,
      object: 'webhook',
      status: 'active',
      events: [...webhookData.events],
      url: webhookData.url,
      secret: webhookData.secret,
      metadata: webhookData.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const subscription: WebhookSubscription = {
      webhook,
      isActive: true,
      deliveryCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(webhook.id, subscription);
    this.updateEventTypeIndex(webhook.id, webhook.events);
    this.updateStats();

    this.emit('registered', subscription);
    return subscription;
  }

  /**
   * Update an existing webhook
   * @param webhookId The webhook ID
   * @param updateData The update data
   * @returns Promise that resolves to the updated webhook subscription
   */
  async update(webhookId: string, updateData: UpdateWebhookRequest): Promise<WebhookSubscription> {
    const subscription = this.subscriptions.get(webhookId);
    if (!subscription) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    if (this.config.enableValidation && updateData.url) {
      this.validateUrl(updateData.url);
    }

    // Remove from old event type index
    this.removeFromEventTypeIndex(webhookId, subscription.webhook.events);

    // Update webhook data
    const updatedWebhook: Webhook = {
      ...subscription.webhook,
      events: updateData.events || subscription.webhook.events,
      url: updateData.url || subscription.webhook.url,
      metadata: updateData.metadata || subscription.webhook.metadata,
      updatedAt: new Date().toISOString(),
    };

    subscription.webhook = updatedWebhook;
    subscription.updatedAt = new Date();

    // Update event type index with new events
    this.updateEventTypeIndex(webhookId, updatedWebhook.events);
    this.updateStats();

    this.emit('updated', subscription);
    return subscription;
  }

  /**
   * Unregister a webhook
   * @param webhookId The webhook ID
   * @returns Promise that resolves when webhook is unregistered
   */
  async unregister(webhookId: string): Promise<void> {
    const subscription = this.subscriptions.get(webhookId);
    if (!subscription) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    this.removeFromEventTypeIndex(webhookId, subscription.webhook.events);
    this.subscriptions.delete(webhookId);
    this.updateStats();

    this.emit('unregistered', subscription);
  }

  /**
   * Get webhook subscription by ID
   * @param webhookId The webhook ID
   * @returns Webhook subscription or undefined
   */
  get(webhookId: string): WebhookSubscription | undefined {
    return this.subscriptions.get(webhookId);
  }

  /**
   * Get all webhook subscriptions
   * @returns Array of all webhook subscriptions
   */
  getAll(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get active webhook subscriptions
   * @returns Array of active webhook subscriptions
   */
  getActive(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }

  /**
   * Get webhooks subscribed to a specific event type
   * @param eventType The event type
   * @returns Array of webhook subscriptions
   */
  getByEventType(eventType: EventType): WebhookSubscription[] {
    const webhookIds = this.eventTypeIndex.get(eventType) || new Set();
    return Array.from(webhookIds)
      .map(id => this.subscriptions.get(id))
      .filter((sub): sub is WebhookSubscription => sub !== undefined && sub.isActive);
  }

  /**
   * Activate a webhook
   * @param webhookId The webhook ID
   */
  activate(webhookId: string): void {
    const subscription = this.subscriptions.get(webhookId);
    if (!subscription) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    subscription.isActive = true;
    subscription.webhook.status = 'active';
    subscription.consecutiveFailures = 0;
    subscription.updatedAt = new Date();
    this.updateStats();

    this.emit('activated', subscription);
  }

  /**
   * Deactivate a webhook
   * @param webhookId The webhook ID
   * @param reason Optional reason for deactivation
   */
  deactivate(webhookId: string, reason?: string): void {
    const subscription = this.subscriptions.get(webhookId);
    if (!subscription) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    subscription.isActive = false;
    subscription.webhook.status = 'inactive';
    subscription.updatedAt = new Date();
    this.updateStats();

    this.emit('deactivated', subscription, reason);
  }

  /**
   * Record a successful delivery
   * @param webhookId The webhook ID
   * @param deliveryTime Delivery time in milliseconds
   */
  recordDelivery(webhookId: string, deliveryTime: number): void {
    const subscription = this.subscriptions.get(webhookId);
    if (!subscription) {
      return;
    }

    subscription.deliveryCount++;
    subscription.consecutiveFailures = 0;
    subscription.lastDeliveryAt = new Date();
    subscription.updatedAt = new Date();

    this.recordDeliveryTime(deliveryTime);
    this.stats.totalDeliveries++;

    this.emit('delivered', subscription, deliveryTime);
  }

  /**
   * Record a failed delivery
   * @param webhookId The webhook ID
   * @param error The error that occurred
   */
  recordFailure(webhookId: string, error: Error): void {
    const subscription = this.subscriptions.get(webhookId);
    if (!subscription) {
      return;
    }

    subscription.failureCount++;
    subscription.consecutiveFailures++;
    subscription.lastError = error;
    subscription.updatedAt = new Date();

    this.stats.totalFailures++;

    // Deactivate if too many consecutive failures
    if (subscription.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.deactivate(webhookId, `Too many consecutive failures (${subscription.consecutiveFailures})`);
    }

    this.emit('failed', subscription, error);
  }

  /**
   * Update event type index
   * @param webhookId The webhook ID
   * @param eventTypes Array of event types
   */
  private updateEventTypeIndex(webhookId: string, eventTypes: EventType[]): void {
    for (const eventType of eventTypes) {
      if (!this.eventTypeIndex.has(eventType)) {
        this.eventTypeIndex.set(eventType, new Set());
      }
      this.eventTypeIndex.get(eventType)!.add(webhookId);
    }
  }

  /**
   * Remove from event type index
   * @param webhookId The webhook ID
   * @param eventTypes Array of event types
   */
  private removeFromEventTypeIndex(webhookId: string, eventTypes: EventType[]): void {
    for (const eventType of eventTypes) {
      const webhookIds = this.eventTypeIndex.get(eventType);
      if (webhookIds) {
        webhookIds.delete(webhookId);
        if (webhookIds.size === 0) {
          this.eventTypeIndex.delete(eventType);
        }
      }
    }
  }

  /**
   * Validate webhook data
   * @param webhookData The webhook data to validate
   */
  private validateWebhookData(webhookData: CreateWebhookRequest): void {
    if (!webhookData.events || webhookData.events.length === 0) {
      throw new Error('At least one event type must be specified');
    }

    this.validateUrl(webhookData.url);

    // Validate event types
    const validEventTypes: EventType[] = [
      'webset.created',
      'webset.deleted',
      'webset.idle',
      'webset.paused',
      'webset.item.created',
      'webset.item.enriched',
      'webset.search.created',
      'webset.search.updated',
      'webset.search.canceled',
      'webset.search.completed',
    ];

    for (const eventType of webhookData.events) {
      if (!validEventTypes.includes(eventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }
    }
  }

  /**
   * Validate webhook URL
   * @param url The URL to validate
   */
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Webhook URL must use HTTP or HTTPS protocol');
      }
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${url}`);
    }
  }

  /**
   * Record delivery time for statistics
   * @param deliveryTime Delivery time in milliseconds
   */
  private recordDeliveryTime(deliveryTime: number): void {
    this.deliveryTimes.push(deliveryTime);
    
    // Keep only last 1000 delivery times
    if (this.deliveryTimes.length > 1000) {
      this.deliveryTimes.shift();
    }
    
    this.stats.averageDeliveryTime = 
      this.deliveryTimes.reduce((sum, time) => sum + time, 0) / this.deliveryTimes.length;
  }

  /**
   * Update registry statistics
   */
  private updateStats(): void {
    this.stats.totalWebhooks = this.subscriptions.size;
    this.stats.activeWebhooks = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive).length;
    this.stats.inactiveWebhooks = this.stats.totalWebhooks - this.stats.activeWebhooks;
  }

  /**
   * Get registry statistics
   * @returns Current statistics
   */
  getStats(): WebhookRegistryStats {
    return { ...this.stats };
  }

  /**
   * Clear all webhooks
   */
  clear(): void {
    const clearedCount = this.subscriptions.size;
    this.subscriptions.clear();
    this.eventTypeIndex.clear();
    this.updateStats();
    this.emit('cleared', clearedCount);
  }

  /**
   * Health check for the registry
   * @returns Health status information
   */
  healthCheck(): {
    healthy: boolean;
    totalWebhooks: number;
    activeWebhooks: number;
    failureRate: number;
  } {
    const failureRate = this.stats.totalDeliveries > 0 ? 
      this.stats.totalFailures / (this.stats.totalDeliveries + this.stats.totalFailures) : 0;

    return {
      healthy: this.stats.totalWebhooks < this.config.maxWebhooks,
      totalWebhooks: this.stats.totalWebhooks,
      activeWebhooks: this.stats.activeWebhooks,
      failureRate,
    };
  }
}