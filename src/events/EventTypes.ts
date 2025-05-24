/**
 * Event Types and Handlers
 * 
 * Defines all Websets event types, their data structures, and handler interfaces.
 */

import { EventType } from '../types/websets.js';

// Re-export EventType for convenience
export { EventType };

/**
 * Base event data structure
 */
export interface BaseEventData {
  id: string;
  timestamp: string;
  source: 'websets_api' | 'internal' | 'webhook';
}

/**
 * Webset-related event data
 */
export interface WebsetEventData extends BaseEventData {
  websetId: string;
  websetStatus?: 'idle' | 'running' | 'paused';
  metadata?: Record<string, any>;
}

/**
 * Search-related event data
 */
export interface SearchEventData extends BaseEventData {
  websetId: string;
  searchId: string;
  query?: string;
  status?: 'created' | 'running' | 'completed' | 'canceled';
  progress?: {
    found: number;
    completion: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Item-related event data
 */
export interface ItemEventData extends BaseEventData {
  websetId: string;
  searchId: string;
  itemId: string;
  url?: string;
  title?: string;
  enrichments?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Event data type mapping
 */
export interface EventDataMap {
  'webset.created': WebsetEventData;
  'webset.deleted': WebsetEventData;
  'webset.idle': WebsetEventData;
  'webset.paused': WebsetEventData;
  'webset.search.created': SearchEventData;
  'webset.search.updated': SearchEventData;
  'webset.search.completed': SearchEventData;
  'webset.search.canceled': SearchEventData;
  'webset.item.created': ItemEventData;
  'webset.item.enriched': ItemEventData;
}

/**
 * Typed event structure
 */
export interface TypedEvent<T extends EventType = EventType> {
  id: string;
  type: T;
  data: EventDataMap[T];
  createdAt: string;
}

/**
 * Event handler interface
 */
export interface EventHandler<T extends EventType = EventType> {
  eventType: T;
  priority: number;
  handle(event: TypedEvent<T>): Promise<void>;
  canHandle(event: TypedEvent<T>): boolean;
}

/**
 * Event processing result
 */
export interface EventProcessingResult {
  eventId?: string;
  eventType?: EventType;
  processed?: boolean;
  processingTime?: number;
  duration?: number;
  error?: Error;
  handlerResults?: HandlerResult[];
  metadata?: Record<string, any>;
}

/**
 * Handler execution result
 */
export interface HandlerResult {
  handlerName: string;
  success: boolean;
  executionTime: number;
  error?: Error;
}

/**
 * Event filter for processing
 */
export interface EventProcessingFilter {
  eventTypes?: EventType[];
  websetIds?: string[];
  searchIds?: string[];
  itemIds?: string[];
  minTimestamp?: string;
  maxTimestamp?: string;
}

/**
 * Event processing options
 */
export interface EventProcessingOptions {
  filter?: EventProcessingFilter;
  maxConcurrency?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Event queue item
 */
export interface EventQueueItem {
  event: TypedEvent;
  priority: number;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  nextRetryAt?: Date;
  addedAt: Date;
  queuedAt: Date;
  processingStartedAt?: Date;
  lastError?: Error;
}

/**
 * Event queue statistics
 */
export interface EventQueueStats {
  totalEvents: number;
  pendingEvents: number;
  processingEvents: number;
  completedEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  eventsByType: Record<EventType, number>;
  queueHealth: 'healthy' | 'degraded' | 'critical';
}

/**
 * Event polling configuration
 */
export interface EventPollingConfig {
  intervalMs: number;
  interval: number;
  batchSize: number;
  maxEvents?: number;
  eventTypes?: EventType[];
  enabled: boolean;
  backoffMultiplier: number;
  maxBackoffMs: number;
  cursor?: string;
  longPolling?: boolean;
  longPollingTimeout?: number;
}

/**
 * Event polling state
 */
export interface EventPollingState {
  isRunning: boolean;
  lastPollAt?: Date;
  nextPollAt?: Date;
  consecutiveErrors: number;
  currentBackoffMs: number;
  totalEventsFetched: number;
  lastCursor?: string;
}

/**
 * Base event handler abstract class
 */
export abstract class BaseEventHandler<T extends EventType = EventType> implements EventHandler<T> {
  abstract eventType: T;
  priority: number = 5; // Default priority
  
  abstract handle(event: TypedEvent<T>): Promise<void>;
  
  canHandle(event: TypedEvent<T>): boolean {
    return event.type === this.eventType;
  }
  
  protected log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.constructor.name}] ${message}`, data || '');
  }
  
  protected validateEventData(event: TypedEvent<T>): void {
    if (!event.id) {
      throw new Error('Event ID is required');
    }
    if (!event.type) {
      throw new Error('Event type is required');
    }
    if (!event.data) {
      throw new Error('Event data is required');
    }
    if (!event.createdAt) {
      throw new Error('Event creation timestamp is required');
    }
  }
}

/**
 * Event priority levels
 */
export enum EventPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10
}

/**
 * Get event priority based on event type
 */
export function getEventPriority(eventType: EventType): EventPriority {
  switch (eventType) {
    case 'webset.created':
    case 'webset.deleted':
      return EventPriority.HIGH;
    
    case 'webset.search.created':
    case 'webset.search.completed':
    case 'webset.search.canceled':
      return EventPriority.NORMAL;
    
    case 'webset.search.updated':
    case 'webset.item.created':
    case 'webset.item.enriched':
      return EventPriority.NORMAL;
    
    case 'webset.idle':
    case 'webset.paused':
      return EventPriority.LOW;
    
    default:
      return EventPriority.NORMAL;
  }
}

/**
 * Validate event type
 */
export function isValidEventType(eventType: string): eventType is EventType {
  const validTypes: EventType[] = [
    'webset.created',
    'webset.deleted',
    'webset.idle',
    'webset.paused',
    'webset.search.created',
    'webset.search.updated',
    'webset.search.completed',
    'webset.search.canceled',
    'webset.item.created',
    'webset.item.enriched',
  ];
  
  return validTypes.includes(eventType as EventType);
}

/**
 * Create a typed event
 */
export function createTypedEvent<T extends EventType>(
  type: T,
  data: EventDataMap[T],
  id?: string
): TypedEvent<T> {
  return {
    id: id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Event type categories for filtering and organization
 */
export const EVENT_CATEGORIES = {
  WEBSET: ['webset.created', 'webset.deleted', 'webset.idle', 'webset.paused'] as EventType[],
  SEARCH: ['webset.search.created', 'webset.search.updated', 'webset.search.completed', 'webset.search.canceled'] as EventType[],
  ITEM: ['webset.item.created', 'webset.item.enriched'] as EventType[],
} as const;

/**
 * Get event category
 */
export function getEventCategory(eventType: EventType): keyof typeof EVENT_CATEGORIES | 'UNKNOWN' {
  for (const [category, types] of Object.entries(EVENT_CATEGORIES)) {
    if (types.includes(eventType)) {
      return category as keyof typeof EVENT_CATEGORIES;
    }
  }
  return 'UNKNOWN';
}
/**
 * Additional types for event system components
 */

/**
 * Queued event item (alias for EventQueueItem)
 */
export type QueuedEvent = EventQueueItem;

/**
 * Event queue configuration
 */
export interface EventQueueConfig {
  maxSize: number;
  maxRetries: number;
  maxAttempts: number;
  retryDelayMs: number;
  retryDelay: number;
  maxRetryDelay: number;
  processingTimeoutMs: number;
  processingInterval: number;
  batchSize: number;
  concurrency: number;
  exponentialBackoff: boolean;
}

/**
 * Event poller configuration (alias for EventPollingConfig)
 */
export type EventPollerConfig = EventPollingConfig;

/**
 * Event poller statistics
 */
export interface EventPollerStats {
  isRunning: boolean;
  totalEventsFetched: number;
  lastPollAt?: Date;
  nextPollAt?: Date;
  consecutiveErrors: number;
  averageEventsPerPoll: number;
  pollsPerformed: number;
  errorRate: number;
  totalPolls: number;
  successfulPolls: number;
  failedPolls: number;
  eventsFetched: number;
  status: 'idle' | 'polling' | 'error';
  lastPollDuration: number;
}

/**
 * Event processor configuration
 */
export interface EventProcessorConfig {
  maxConcurrency: number;
  concurrency: number;
  processingTimeoutMs: number;
  timeout: number;
  retryAttempts: number;
  retryDelayMs: number;
  enableMetrics: boolean;
  enableDeadLetterQueue?: boolean;
  deadLetterQueue?: {
    maxSize: number;
  };
}

/**
 * Event processor statistics
 */
export interface EventProcessorStats {
  totalProcessed: number;
  totalFailed: number;
  successful: number;
  failed: number;
  averageProcessingTime: number;
  activeHandlers: number;
  activeWorkers: number;
  processingRate: number;
  errorRate: number;
  handlerStats: Record<string, HandlerStats>;
}

/**
 * Handler statistics
 */
export interface HandlerStats {
  name: string;
  totalProcessed: number;
  totalFailed: number;
  averageExecutionTime: number;
  lastExecutedAt?: Date;
  errorRate: number;
}

/**
 * Event handler registry
 */
export interface EventHandlerRegistry {
  handlers: Map<EventType, EventHandler[]>;
  register<T extends EventType>(handler: EventHandler<T>): void;
  unregister<T extends EventType>(handler: EventHandler<T>): void;
  getHandlers(eventType: EventType): EventHandler[];
  getAllHandlers(): EventHandler[];
  clear(): void;
}

/**
 * Default event system configuration
 */
export const DEFAULT_EVENT_SYSTEM_CONFIG = {
  polling: {
    intervalMs: 5000,
    interval: 5000,
    batchSize: 50,
    maxEvents: 1000,
    enabled: true,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
    eventTypes: [],
  } as EventPollingConfig,
  
  poller: {
    intervalMs: 5000,
    interval: 5000,
    batchSize: 50,
    maxEvents: 1000,
    enabled: true,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
    eventTypes: [],
  } as EventPollingConfig,
  
  queue: {
    maxSize: 10000,
    maxRetries: 3,
    maxAttempts: 3,
    retryDelayMs: 1000,
    retryDelay: 1000,
    maxRetryDelay: 10000,
    processingTimeoutMs: 30000,
    processingInterval: 1000,
    batchSize: 10,
    concurrency: 5,
    exponentialBackoff: true,
  } as EventQueueConfig,
  
  processor: {
    maxConcurrency: 10,
    concurrency: 10,
    processingTimeoutMs: 30000,
    timeout: 30000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    enableMetrics: true,
  } as EventProcessorConfig,
} as const;

/**
 * Extended event queue statistics with additional fields
 */
export interface ExtendedEventQueueStats extends EventQueueStats {
  totalQueued: number;
  currentSize: number;
  processing: number;
  processed: number;
  failed: number;
}

/**
 * Enhanced event handler with priority
 */
export interface PrioritizedEventHandler<T extends EventType = EventType> extends EventHandler<T> {
  priority: number;
}

/**
 * Enhanced event processing result with success flag
 */
export interface EnhancedEventProcessingResult extends EventProcessingResult {
  success: boolean;
}