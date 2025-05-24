/**
 * Webhook Service Implementation
 * 
 * Provides CRUD operations for Websets webhooks with management,
 * validation, and integration with the webhook system components.
 */

import { BaseService } from './BaseService.js';
import { WebsetsApiClient } from '../api/WebsetsApiClient.js';
import { 
  Webhook, 
  WebhookAttempt, 
  CreateWebhookRequest, 
  UpdateWebhookRequest,
  EventType,
  PaginatedResponse 
} from '../types/websets.js';

/**
 * Webhook query parameters for listing webhooks
 */
export interface WebhookQueryParams {
  cursor?: string;
  limit?: number;
}

/**
 * Webhook attempt query parameters
 */
export interface WebhookAttemptQueryParams {
  cursor?: string;
  limit?: number;
  eventType?: EventType;
}

/**
 * List webhooks response type
 */
export interface ListWebhooksResponse extends PaginatedResponse<Webhook> {
  webhooks?: Webhook[];
  nextCursor?: string;
}

/**
 * List webhook attempts response type
 */
export interface ListWebhookAttemptsResponse extends PaginatedResponse<WebhookAttempt> {
  attempts?: WebhookAttempt[];
  nextCursor?: string;
}

/**
 * Webhook statistics
 */
export interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  inactiveWebhooks: number;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  averageResponseTime: number;
  webhooksByEvent: Record<string, number>;
  recentAttempts: WebhookAttempt[];
}

/**
 * Webhook health check result
 */
export interface WebhookHealthCheck {
  webhookId: string;
  url: string;
  isReachable: boolean;
  responseTime?: number;
  statusCode?: number;
  error?: string;
  checkedAt: string;
}

/**
 * Webhook Service
 * 
 * Handles all webhook-related operations including CRUD operations,
 * attempt tracking, and health monitoring.
 */
export class WebhookService extends BaseService {
  constructor(apiClient: WebsetsApiClient) {
    super(apiClient);
  }

  /**
   * List all webhooks with optional pagination
   */
  async listWebhooks(params: WebhookQueryParams = {}): Promise<ListWebhooksResponse> {
    try {
      this.logOperation('Listing webhooks', params);

      const sanitizedParams = this.sanitizeParams({
        cursor: params.cursor,
        limit: params.limit,
      });

      const response = await this.handleGetRequest<ListWebhooksResponse>('/webhooks', sanitizedParams);

      this.logOperation('Listed webhooks successfully', {
        webhookCount: response.data?.length || 0,
        hasMore: !!response.nextCursor,
      });

      return {
        ...response,
        webhooks: response.data || [],
      };

    } catch (error) {
      this.logOperation('Failed to list webhooks', { error, params });
      throw error;
    }
  }

  /**
   * Get a specific webhook by ID
   */
  async getWebhook(webhookId: string): Promise<Webhook> {
    try {
      this.validateRequired({ webhookId }, ['webhookId']);
      this.logOperation('Getting webhook', { webhookId });

      const endpoint = this.buildEndpoint('/webhooks/{webhookId}', { webhookId });
      const webhook = await this.handleGetRequest<Webhook>(endpoint);

      this.logOperation('Retrieved webhook successfully', {
        webhookId,
        url: webhook.url,
        status: webhook.status,
        eventCount: webhook.events.length,
      });

      return webhook;

    } catch (error) {
      this.logOperation('Failed to get webhook', { error, webhookId });
      throw error;
    }
  }

  /**
   * Create a new webhook
   */
  async createWebhook(request: CreateWebhookRequest): Promise<Webhook> {
    try {
      this.validateRequired(request, ['events', 'url']);
      this.validateWebhookRequest(request);
      this.logOperation('Creating webhook', { 
        url: request.url, 
        eventCount: request.events.length 
      });

      const webhook = await this.handlePostRequest<Webhook>('/webhooks', request);

      this.logOperation('Created webhook successfully', {
        webhookId: webhook.id,
        url: webhook.url,
        eventCount: webhook.events.length,
      });

      return webhook;

    } catch (error) {
      this.logOperation('Failed to create webhook', { error, request });
      throw error;
    }
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(webhookId: string, request: UpdateWebhookRequest): Promise<Webhook> {
    try {
      this.validateRequired({ webhookId }, ['webhookId']);
      this.validateWebhookUpdateRequest(request);
      this.logOperation('Updating webhook', { webhookId, request });

      const endpoint = this.buildEndpoint('/webhooks/{webhookId}', { webhookId });
      const webhook = await this.handlePutRequest<Webhook>(endpoint, request);

      this.logOperation('Updated webhook successfully', {
        webhookId,
        url: webhook.url,
        status: webhook.status,
      });

      return webhook;

    } catch (error) {
      this.logOperation('Failed to update webhook', { error, webhookId, request });
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      this.validateRequired({ webhookId }, ['webhookId']);
      this.logOperation('Deleting webhook', { webhookId });

      const endpoint = this.buildEndpoint('/webhooks/{webhookId}', { webhookId });
      await this.handleDeleteRequest<void>(endpoint);

      this.logOperation('Deleted webhook successfully', { webhookId });

    } catch (error) {
      this.logOperation('Failed to delete webhook', { error, webhookId });
      throw error;
    }
  }

  /**
   * List webhook attempts for a specific webhook
   */
  async listWebhookAttempts(
    webhookId: string, 
    params: WebhookAttemptQueryParams = {}
  ): Promise<ListWebhookAttemptsResponse> {
    try {
      this.validateRequired({ webhookId }, ['webhookId']);
      this.logOperation('Listing webhook attempts', { webhookId, params });

      const sanitizedParams = this.sanitizeParams({
        cursor: params.cursor,
        limit: params.limit,
        eventType: params.eventType,
      });

      const endpoint = this.buildEndpoint('/webhooks/{webhookId}/attempts', { webhookId });
      const response = await this.handleGetRequest<ListWebhookAttemptsResponse>(endpoint, sanitizedParams);

      this.logOperation('Listed webhook attempts successfully', {
        webhookId,
        attemptCount: response.data?.length || 0,
        hasMore: !!response.nextCursor,
      });

      return {
        ...response,
        attempts: response.data || [],
      };

    } catch (error) {
      this.logOperation('Failed to list webhook attempts', { error, webhookId, params });
      throw error;
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<WebhookStats> {
    try {
      this.logOperation('Getting webhook statistics');

      // Get all webhooks
      const webhooksResponse = await this.listWebhooks({ limit: 1000 });
      const webhooks = webhooksResponse.webhooks || [];

      // Initialize stats
      const stats: WebhookStats = {
        totalWebhooks: webhooks.length,
        activeWebhooks: 0,
        inactiveWebhooks: 0,
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        successRate: 0,
        averageResponseTime: 0,
        webhooksByEvent: {},
        recentAttempts: [],
      };

      // Count active/inactive webhooks and events
      for (const webhook of webhooks) {
        if (webhook.status === 'active') {
          stats.activeWebhooks++;
        } else {
          stats.inactiveWebhooks++;
        }

        // Count events
        for (const eventType of webhook.events) {
          stats.webhooksByEvent[eventType] = (stats.webhooksByEvent[eventType] || 0) + 1;
        }
      }

      // Get recent attempts for active webhooks (sample from first few)
      const sampleWebhooks = webhooks.filter(w => w.status === 'active').slice(0, 5);
      const allAttempts: WebhookAttempt[] = [];

      for (const webhook of sampleWebhooks) {
        try {
          const attemptsResponse = await this.listWebhookAttempts(webhook.id, { limit: 50 });
          allAttempts.push(...(attemptsResponse.attempts || []));
        } catch (error) {
          // Continue if we can't get attempts for a webhook
          this.logOperation('Failed to get attempts for webhook', { webhookId: webhook.id, error });
        }
      }

      // Calculate attempt statistics
      stats.totalAttempts = allAttempts.length;
      stats.successfulAttempts = allAttempts.filter(a => a.successful).length;
      stats.failedAttempts = stats.totalAttempts - stats.successfulAttempts;
      stats.successRate = stats.totalAttempts > 0 ? 
        (stats.successfulAttempts / stats.totalAttempts) * 100 : 0;

      // Get recent attempts (last 10)
      stats.recentAttempts = allAttempts
        .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime())
        .slice(0, 10);

      this.logOperation('Generated webhook statistics', {
        totalWebhooks: stats.totalWebhooks,
        activeWebhooks: stats.activeWebhooks,
        totalAttempts: stats.totalAttempts,
        successRate: stats.successRate,
      });

      return stats;

    } catch (error) {
      this.logOperation('Failed to get webhook statistics', { error });
      throw error;
    }
  }

  /**
   * Get webhooks by event type
   */
  async getWebhooksByEventType(eventType: EventType): Promise<Webhook[]> {
    try {
      this.validateRequired({ eventType }, ['eventType']);
      this.logOperation('Getting webhooks by event type', { eventType });

      const response = await this.listWebhooks({ limit: 1000 });
      const webhooks = (response.webhooks || []).filter(webhook => 
        webhook.events.includes(eventType)
      );

      this.logOperation('Retrieved webhooks by event type', {
        eventType,
        webhookCount: webhooks.length,
      });

      return webhooks;

    } catch (error) {
      this.logOperation('Failed to get webhooks by event type', { error, eventType });
      throw error;
    }
  }

  /**
   * Perform health check on a webhook URL
   */
  async checkWebhookHealth(webhookId: string): Promise<WebhookHealthCheck> {
    try {
      this.validateRequired({ webhookId }, ['webhookId']);
      this.logOperation('Checking webhook health', { webhookId });

      const webhook = await this.getWebhook(webhookId);
      const startTime = Date.now();

      const healthCheck: WebhookHealthCheck = {
        webhookId,
        url: webhook.url,
        isReachable: false,
        checkedAt: new Date().toISOString(),
      };

      try {
        // Simple HTTP HEAD request to check if URL is reachable with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(webhook.url, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        healthCheck.isReachable = true;
        healthCheck.statusCode = response.status;
        healthCheck.responseTime = Date.now() - startTime;

      } catch (error) {
        healthCheck.isReachable = false;
        healthCheck.error = error instanceof Error ? error.message : 'Unknown error';
        healthCheck.responseTime = Date.now() - startTime;
      }

      this.logOperation('Webhook health check completed', {
        webhookId,
        isReachable: healthCheck.isReachable,
        responseTime: healthCheck.responseTime,
      });

      return healthCheck;

    } catch (error) {
      this.logOperation('Failed to check webhook health', { error, webhookId });
      throw error;
    }
  }

  /**
   * Get active webhooks
   */
  async getActiveWebhooks(): Promise<Webhook[]> {
    try {
      this.logOperation('Getting active webhooks');

      const response = await this.listWebhooks({ limit: 1000 });
      const activeWebhooks = (response.webhooks || []).filter(webhook => 
        webhook.status === 'active'
      );

      this.logOperation('Retrieved active webhooks', {
        webhookCount: activeWebhooks.length,
      });

      return activeWebhooks;

    } catch (error) {
      this.logOperation('Failed to get active webhooks', { error });
      throw error;
    }
  }

  /**
   * Validate webhook creation request
   */
  private validateWebhookRequest(request: CreateWebhookRequest): void {
    if (!this.validateUrl(request.url)) {
      throw new Error('Invalid webhook URL format');
    }

    if (!request.events || request.events.length === 0) {
      throw new Error('At least one event type must be specified');
    }

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

    for (const eventType of request.events) {
      if (!validEventTypes.includes(eventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }
    }
  }

  /**
   * Validate webhook update request
   */
  private validateWebhookUpdateRequest(request: UpdateWebhookRequest): void {
    if (request.url && !this.validateUrl(request.url)) {
      throw new Error('Invalid webhook URL format');
    }

    if (request.events) {
      if (request.events.length === 0) {
        throw new Error('At least one event type must be specified');
      }

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

      for (const eventType of request.events) {
        if (!validEventTypes.includes(eventType)) {
          throw new Error(`Invalid event type: ${eventType}`);
        }
      }
    }
  }
}