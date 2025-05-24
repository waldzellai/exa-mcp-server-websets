/**
 * Event Service Implementation
 *
 * Provides CRUD operations for Websets events with filtering, pagination,
 * and integration with the event system components.
 */

import { BaseService } from './BaseService.js';
import { WebsetsApiClient } from '../api/WebsetsApiClient.js';
import { WebsetEvent, PaginatedResponse } from '../types/websets.js';

/**
 * List events response type
 */
export interface ListEventsResponse extends PaginatedResponse<WebsetEvent> {
  events?: WebsetEvent[];
  nextCursor?: string;
}

/**
 * Event query parameters
 */
export interface EventQueryParams {
  /** Cursor for pagination */
  cursor?: string;
  /** Maximum number of events to return */
  limit?: number;
  /** Filter by event types */
  types?: string[];
  /** Stream format for real-time events */
  streamFormat?: 'jsonl' | 'json';
  /** Batch size for streaming */
  batchSize?: number;
}

/**
 * Event streaming options
 */
export interface EventStreamOptions {
  /** Event types to filter by */
  types?: string[];
  /** Stream format */
  format?: 'jsonl' | 'json';
  /** Batch size for processing */
  batchSize?: number;
  /** Maximum total events to stream */
  limit?: number;
  /** Callback for each event batch */
  onBatch?: (events: WebsetEvent[]) => void;
  /** Callback for stream completion */
  onComplete?: (totalEvents: number) => void;
  /** Callback for stream errors */
  onError?: (error: Error) => void;
}

/**
 * Event statistics
 */
export interface EventStats {
  /** Total events */
  totalEvents: number;
  /** Events by type */
  eventsByType: Record<string, number>;
  /** Recent event rate (events per hour) */
  recentEventRate: number;
  /** Most active event types */
  mostActiveTypes: Array<{ type: string; count: number }>;
  /** Event timeline (last 24 hours) */
  timeline: Array<{ hour: number; count: number }>;
}

/**
 * Event filter criteria
 */
export interface EventFilter {
  /** Filter by event types */
  types?: string[];
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by webset ID */
  websetId?: string;
  /** Filter by search ID */
  searchId?: string;
  /** Filter by enrichment ID */
  enrichmentId?: string;
  /** Filter by item ID */
  itemId?: string;
  /** Text search in event data */
  textSearch?: string;
}

/**
 * Service for managing Websets events
 */
export class EventService extends BaseService {
  constructor(apiClient: WebsetsApiClient) {
    super(apiClient);
  }

  /**
   * List events with filtering and pagination
   * @param params Query parameters
   * @returns Promise resolving to events response
   */
  async listEvents(params: EventQueryParams = {}): Promise<ListEventsResponse> {
    try {
      this.logOperation('Listing events', params);

      const sanitizedParams = this.sanitizeParams({
        cursor: params.cursor,
        limit: params.limit,
        types: params.types,
        streamFormat: params.streamFormat,
        batchSize: params.batchSize,
      });

      const response = await this.handleGetRequest<ListEventsResponse>('/events', sanitizedParams);

      this.logOperation('Listed events successfully', {
        eventCount: response.data?.length || 0,
        hasMore: !!response.nextCursor,
      });

      return {
        ...response,
        events: response.data || [],
      };

    } catch (error) {
      this.logOperation('Failed to list events', { error, params });
      throw error;
    }
  }

  /**
   * Get a specific event by ID
   * @param eventId Event ID
   * @returns Promise resolving to event
   */
  async getEvent(eventId: string): Promise<WebsetEvent> {
    try {
      this.validateRequired({ eventId }, ['eventId']);
      this.logOperation('Getting event', { eventId });

      const endpoint = this.buildEndpoint('/events/{eventId}', { eventId });
      const event = await this.handleGetRequest<WebsetEvent>(endpoint);

      this.logOperation('Retrieved event successfully', {
        eventId,
        eventType: event.type,
      });

      return event;

    } catch (error) {
      this.logOperation('Failed to get event', { error, eventId });
      throw error;
    }
  }

  /**
   * Stream events with real-time processing
   * @param options Streaming options
   * @returns Promise resolving when streaming completes
   */
  async streamEvents(options: EventStreamOptions = {}): Promise<void> {
    try {
      this.logOperation('Starting event stream', options);

      let totalEvents = 0;
      let cursor: string | undefined;
      const batchSize = options.batchSize || 25;

      while (true) {
        const response = await this.listEvents({
          cursor,
          limit: batchSize,
          types: options.types,
          streamFormat: options.format,
          batchSize,
        });

        if (!response.events || response.events.length === 0) {
          break;
        }

        // Process batch
        if (options.onBatch) {
          try {
            options.onBatch(response.events);
          } catch (batchError) {
            this.logOperation('Error in batch callback', { batchError });
          }
        }

        totalEvents += response.events.length;

        // Check if we've reached the limit
        if (options.limit && totalEvents >= options.limit) {
          break;
        }

        // Check if there are more events
        if (!response.nextCursor) {
          break;
        }

        cursor = response.nextCursor;
      }

      if (options.onComplete) {
        try {
          options.onComplete(totalEvents);
        } catch (completeError) {
          this.logOperation('Error in completion callback', { completeError });
        }
      }

      this.logOperation('Event streaming completed', { totalEvents });

    } catch (error) {
      this.logOperation('Failed to stream events', { error, options });
      
      if (options.onError) {
        try {
          options.onError(error as Error);
        } catch (errorCallbackError) {
          this.logOperation('Error in error callback', { errorCallbackError });
        }
      }
      
      throw error;
    }
  }

  /**
   * Get events by type
   * @param eventType Event type to filter by
   * @param limit Maximum number of events to return
   * @returns Promise resolving to events
   */
  async getEventsByType(eventType: string, limit: number = 100): Promise<WebsetEvent[]> {
    try {
      this.validateRequired({ eventType }, ['eventType']);
      this.logOperation('Getting events by type', { eventType, limit });

      const response = await this.listEvents({
        types: [eventType],
        limit,
      });

      this.logOperation('Retrieved events by type', {
        eventType,
        eventCount: response.events?.length || 0,
      });

      return response.events || [];

    } catch (error) {
      this.logOperation('Failed to get events by type', { error, eventType });
      throw error;
    }
  }

  /**
   * Get recent events
   * @param hours Number of hours to look back
   * @param limit Maximum number of events to return
   * @returns Promise resolving to recent events
   */
  async getRecentEvents(hours: number = 24, limit: number = 100): Promise<WebsetEvent[]> {
    try {
      this.logOperation('Getting recent events', { hours, limit });

      // Get events and filter by time (API doesn't support time filtering directly)
      const response = await this.listEvents({ limit: limit * 2 }); // Get more to account for filtering
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const recentEvents = (response.events || [])
        .filter((event: WebsetEvent) => new Date(event.createdAt) >= cutoffTime)
        .slice(0, limit);

      this.logOperation('Retrieved recent events', {
        hours,
        eventCount: recentEvents.length,
      });

      return recentEvents;

    } catch (error) {
      this.logOperation('Failed to get recent events', { error, hours });
      throw error;
    }
  }

  /**
   * Search events with advanced filtering
   * @param filter Filter criteria
   * @param limit Maximum number of events to return
   * @returns Promise resolving to filtered events
   */
  async searchEvents(filter: EventFilter, limit: number = 100): Promise<WebsetEvent[]> {
    try {
      this.logOperation('Searching events', { filter, limit });

      // Start with basic type filtering if provided
      const response = await this.listEvents({
        types: filter.types,
        limit: limit * 2, // Get more to account for additional filtering
      });

      let events = response.events || [];

      // Apply additional filters
      if (filter.dateRange) {
        events = events.filter((event: WebsetEvent) => {
          const eventDate = new Date(event.createdAt);
          return eventDate >= filter.dateRange!.start && eventDate <= filter.dateRange!.end;
        });
      }

      if (filter.websetId) {
        events = events.filter((event: WebsetEvent) =>
          event.data && 'websetId' in event.data && event.data.websetId === filter.websetId
        );
      }

      if (filter.searchId) {
        events = events.filter((event: WebsetEvent) =>
          event.data && 'searchId' in event.data && event.data.searchId === filter.searchId
        );
      }

      if (filter.enrichmentId) {
        events = events.filter((event: WebsetEvent) =>
          event.data && 'enrichmentId' in event.data && event.data.enrichmentId === filter.enrichmentId
        );
      }

      if (filter.itemId) {
        events = events.filter((event: WebsetEvent) =>
          event.data && 'itemId' in event.data && event.data.itemId === filter.itemId
        );
      }

      if (filter.textSearch) {
        const searchTerm = filter.textSearch.toLowerCase();
        events = events.filter((event: WebsetEvent) => {
          const eventStr = JSON.stringify(event).toLowerCase();
          return eventStr.includes(searchTerm);
        });
      }

      // Limit results
      events = events.slice(0, limit);

      this.logOperation('Searched events successfully', {
        filter,
        eventCount: events.length,
      });

      return events;

    } catch (error) {
      this.logOperation('Failed to search events', { error, filter });
      throw error;
    }
  }

  /**
   * Get event statistics
   * @param hours Number of hours to analyze (default: 24)
   * @returns Promise resolving to event statistics
   */
  async getEventStats(hours: number = 24): Promise<EventStats> {
    try {
      this.logOperation('Getting event statistics', { hours });

      const events = await this.getRecentEvents(hours, 1000); // Get more events for better stats
      
      const stats: EventStats = {
        totalEvents: events.length,
        eventsByType: {},
        recentEventRate: 0,
        mostActiveTypes: [],
        timeline: [],
      };

      // Count events by type
      for (const event of events) {
        stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      }

      // Calculate event rate (events per hour)
      stats.recentEventRate = events.length / hours;

      // Get most active types
      stats.mostActiveTypes = Object.entries(stats.eventsByType)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Create timeline (hourly buckets)
      const timeline = new Array(24).fill(0);
      const now = new Date();
      
      for (const event of events) {
        const eventTime = new Date(event.createdAt);
        const hoursAgo = Math.floor((now.getTime() - eventTime.getTime()) / (60 * 60 * 1000));
        if (hoursAgo >= 0 && hoursAgo < 24) {
          timeline[23 - hoursAgo]++;
        }
      }

      stats.timeline = timeline.map((count, index) => ({ hour: index, count }));

      this.logOperation('Generated event statistics', {
        totalEvents: stats.totalEvents,
        typeCount: Object.keys(stats.eventsByType).length,
        eventRate: stats.recentEventRate,
      });

      return stats;

    } catch (error) {
      this.logOperation('Failed to get event statistics', { error, hours });
      throw error;
    }
  }

  /**
   * Get events for a specific webset
   * @param websetId Webset ID
   * @param limit Maximum number of events to return
   * @returns Promise resolving to webset events
   */
  async getWebsetEvents(websetId: string, limit: number = 100): Promise<WebsetEvent[]> {
    try {
      this.validateRequired({ websetId }, ['websetId']);
      this.logOperation('Getting webset events', { websetId, limit });

      const events = await this.searchEvents({ websetId }, limit);

      this.logOperation('Retrieved webset events', {
        websetId,
        eventCount: events.length,
      });

      return events;

    } catch (error) {
      this.logOperation('Failed to get webset events', { error, websetId });
      throw error;
    }
  }

  /**
   * Monitor events in real-time
   * @param callback Callback function for new events
   * @param options Monitoring options
   * @returns Function to stop monitoring
   */
  monitorEvents(
    callback: (event: WebsetEvent) => void,
    options: {
      types?: string[];
      pollInterval?: number;
      batchSize?: number;
    } = {}
  ): () => void {
    const pollInterval = options.pollInterval || 5000; // 5 seconds
    const batchSize = options.batchSize || 10;
    let lastEventTime = new Date();
    let isMonitoring = true;

    const poll = async () => {
      if (!isMonitoring) return;

      try {
        // Get events since last poll
        const events = await this.searchEvents({
          types: options.types,
          dateRange: {
            start: lastEventTime,
            end: new Date(),
          },
        }, batchSize);

        // Process new events
        for (const event of events) {
          if (new Date(event.createdAt) > lastEventTime) {
            try {
              callback(event);
            } catch (callbackError) {
              this.logOperation('Error in event monitor callback', { callbackError });
            }
          }
        }

        // Update last event time
        if (events.length > 0) {
          const latestEvent = events.reduce((latest, event) => 
            new Date(event.createdAt) > new Date(latest.createdAt) ? event : latest
          );
          lastEventTime = new Date(latestEvent.createdAt);
        }

      } catch (error) {
        this.logOperation('Error polling events', { error });
      }

      // Schedule next poll
      if (isMonitoring) {
        setTimeout(poll, pollInterval);
      }
    };

    // Start polling
    setTimeout(poll, pollInterval);

    this.logOperation('Started event monitoring', options);

    // Return stop function
    return () => {
      isMonitoring = false;
      this.logOperation('Stopped event monitoring');
    };
  }

  /**
   * Get event types available in the system
   * @returns Promise resolving to available event types
   */
  async getEventTypes(): Promise<string[]> {
    try {
      this.logOperation('Getting available event types');

      // Get recent events to determine available types
      const events = await this.getRecentEvents(24 * 7, 1000); // Last week, up to 1000 events
      const types = new Set<string>();

      for (const event of events) {
        types.add(event.type);
      }

      const eventTypes = Array.from(types).sort();

      this.logOperation('Retrieved event types', {
        typeCount: eventTypes.length,
        types: eventTypes,
      });

      return eventTypes;

    } catch (error) {
      this.logOperation('Failed to get event types', { error });
      throw error;
    }
  }

  /**
   * Validate event data structure
   * @param event Event to validate
   * @returns True if event is valid
   */
  validateEvent(event: any): event is WebsetEvent {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const requiredFields = ['id', 'type', 'createdAt'];
    for (const field of requiredFields) {
      if (!(field in event)) {
        return false;
      }
    }

    // Validate event type
    const validTypes = [
      'webset.created',
      'webset.deleted',
      'webset.paused',
      'webset.idle',
      'webset.search.created',
      'webset.search.canceled',
      'webset.search.completed',
      'webset.search.updated',
      'webset.export.created',
      'webset.export.completed',
      'webset.item.created',
      'webset.item.enriched',
    ];

    if (!validTypes.includes(event.type)) {
      return false;
    }

    // Validate timestamp
    if (isNaN(Date.parse(event.createdAt))) {
      return false;
    }

    return true;
  }
}