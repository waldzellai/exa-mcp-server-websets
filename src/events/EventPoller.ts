/**
 * Event Poller Implementation
 * 
 * Polls the Websets API for new events and feeds them into the event queue.
 * Supports both regular polling and long polling with configurable intervals.
 */

import { EventEmitter } from 'events';
import { WebsetsApiClient } from '../api/WebsetsApiClient.js';
import { WebsetEvent, EventType, PaginatedResponse } from '../types/websets.js';
import { 
  EventPollerConfig, 
  EventPollerStats,
  DEFAULT_EVENT_SYSTEM_CONFIG 
} from './EventTypes.js';

/**
 * Event poller for fetching events from the Websets API
 */
export class EventPoller extends EventEmitter {
  private readonly config: EventPollerConfig;
  private readonly apiClient: WebsetsApiClient;
  private readonly stats: EventPollerStats = {
    totalPolls: 0,
    successfulPolls: 0,
    failedPolls: 0,
    eventsFetched: 0,
    status: 'idle',
    isRunning: false,
    totalEventsFetched: 0,
    consecutiveErrors: 0,
    averageEventsPerPoll: 0,
    lastPollDuration: 0,
    nextPollAt: undefined,
    pollsPerformed: 0,
    errorRate: 0,
  };
  
  private pollingInterval?: NodeJS.Timeout;
  private isPolling = false;
  private isShuttingDown = false;
  private currentCursor?: string;
  private lastEventId?: string;

  constructor(
    apiClient: WebsetsApiClient,
    config: Partial<EventPollerConfig> = {}
  ) {
    super();
    this.apiClient = apiClient;
    this.config = { ...DEFAULT_EVENT_SYSTEM_CONFIG.poller, ...config };
    this.currentCursor = this.config.cursor;
  }

  /**
   * Start polling for events
   */
  start(): void {
    if (this.isPolling || this.isShuttingDown) {
      return;
    }

    this.isPolling = true;
    this.stats.status = 'polling';
    this.emit('started');

    // Start immediate poll, then set up interval
    this.poll().catch(error => {
      console.error('Initial poll failed:', error);
    });

    this.pollingInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.poll().catch(error => {
          console.error('Polling error:', error);
        });
      }
    }, this.config.interval);
  }

  /**
   * Stop polling for events
   */
  stop(): void {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;
    this.stats.status = 'idle';

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    this.emit('stopped');
  }

  /**
   * Perform a single poll for events
   * @returns Promise that resolves when polling is complete
   */
  private async poll(): Promise<void> {
    if (this.isShuttingDown || !this.isPolling) {
      return;
    }

    this.stats.totalPolls++;
    this.stats.lastPollAt = new Date();

    try {
      const events = await this.fetchEvents();
      
      if (events.length > 0) {
        this.stats.eventsFetched += events.length;
        
        // Process events in order
        for (const event of events) {
          this.emit('event', event);
          this.lastEventId = event.id;
        }
        
        this.emit('events', events);
      }

      this.stats.successfulPolls++;
      this.stats.status = 'polling';

    } catch (error) {
      this.stats.failedPolls++;
      this.stats.status = 'error';
      this.emit('error', error);
      
      // Exponential backoff on errors
      await this.backoffDelay();
    }
  }

  /**
   * Fetch events from the API
   * @returns Promise that resolves to array of events
   */
  private async fetchEvents(): Promise<WebsetEvent[]> {
    const params: any = {
      limit: this.config.batchSize,
    };

    // Add cursor for pagination
    if (this.currentCursor) {
      params.cursor = this.currentCursor;
    }

    // Add event type filters
    if (this.config.eventTypes && this.config.eventTypes.length > 0) {
      params.types = this.config.eventTypes;
    }

    // Use long polling if configured
    if (this.config.longPolling && this.config.longPollingTimeout) {
      params.timeout = Math.floor(this.config.longPollingTimeout / 1000); // Convert to seconds
    }

    const timeout = this.config.longPolling ?
      (this.config.longPollingTimeout || 30000) + 5000 : // Add buffer for long polling
      undefined;

    const response = await this.apiClient.get<PaginatedResponse<WebsetEvent>>(
      '/events',
      params,
      { timeout }
    );

    // Update cursor for next poll
    if (response.data.nextCursor) {
      this.currentCursor = response.data.nextCursor;
    }

    return response.data.data || [];
  }

  /**
   * Implement exponential backoff delay for error recovery
   */
  private async backoffDelay(): Promise<void> {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    const backoffMultiplier = Math.min(this.stats.failedPolls, 6); // Cap at 2^6 = 64
    
    const delay = Math.min(baseDelay * Math.pow(2, backoffMultiplier), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    const finalDelay = delay + jitter;

    await new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  /**
   * Set the cursor for pagination
   * @param cursor The cursor to set
   */
  setCursor(cursor?: string): void {
    this.currentCursor = cursor;
  }

  /**
   * Get the current cursor
   * @returns Current cursor or undefined
   */
  getCursor(): string | undefined {
    return this.currentCursor;
  }

  /**
   * Set event type filters
   * @param eventTypes Array of event types to filter for
   */
  setEventTypes(eventTypes: EventType[]): void {
    this.config.eventTypes = [...eventTypes];
  }

  /**
   * Get current event type filters
   * @returns Array of event types being filtered for
   */
  getEventTypes(): EventType[] {
    return [...(this.config.eventTypes || [])];
  }

  /**
   * Get current polling statistics
   * @returns Current statistics
   */
  getStats(): EventPollerStats {
    return { ...this.stats };
  }

  /**
   * Check if currently polling
   * @returns True if polling is active
   */
  isActive(): boolean {
    return this.isPolling;
  }

  /**
   * Get the last event ID that was processed
   * @returns Last event ID or undefined
   */
  getLastEventId(): string | undefined {
    return this.lastEventId;
  }

  /**
   * Reset polling statistics
   */
  resetStats(): void {
    this.stats.totalPolls = 0;
    this.stats.successfulPolls = 0;
    this.stats.failedPolls = 0;
    this.stats.eventsFetched = 0;
    delete this.stats.lastPollAt;
  }

  /**
   * Perform a one-time poll without starting continuous polling
   * @returns Promise that resolves to fetched events
   */
  async pollOnce(): Promise<WebsetEvent[]> {
    if (this.isShuttingDown) {
      throw new Error('Poller is shutting down');
    }

    this.stats.totalPolls++;
    this.stats.lastPollAt = new Date();

    try {
      const events = await this.fetchEvents();
      this.stats.successfulPolls++;
      this.stats.eventsFetched += events.length;
      
      for (const event of events) {
        this.lastEventId = event.id;
      }
      
      return events;
    } catch (error) {
      this.stats.failedPolls++;
      throw error;
    }
  }

  /**
   * Gracefully shutdown the poller
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.stop();
    
    // Clean up event listeners
    this.removeAllListeners();
    
    this.emit('shutdown');
  }

  /**
   * Health check for the poller
   * @returns Health status information
   */
  healthCheck(): {
    healthy: boolean;
    status: string;
    isPolling: boolean;
    successRate: number;
    lastPollAge?: number;
  } {
    const successRate = this.stats.totalPolls > 0 ? 
      this.stats.successfulPolls / this.stats.totalPolls : 0;
    
    const lastPollAge = this.stats.lastPollAt ? 
      Date.now() - this.stats.lastPollAt.getTime() : undefined;

    return {
      healthy: !this.isShuttingDown && this.stats.status !== 'error',
      status: this.stats.status,
      isPolling: this.isPolling,
      successRate,
      lastPollAge,
    };
  }

  /**
   * Update polling configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<EventPollerConfig>): void {
    Object.assign(this.config, config);
    
    // Restart polling if interval changed and currently polling
    if (config.interval && this.isPolling) {
      this.stop();
      this.start();
    }
  }
}