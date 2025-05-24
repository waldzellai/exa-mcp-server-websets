/**
 * Event System Exports
 *
 * This module exports all event system components for the Websets MCP server.
 */

// Core event types and interfaces
export * from './EventTypes.js';

// Event system components
export { EventPoller } from './EventPoller.js';
export { EventProcessor } from './EventProcessor.js';
export { EventQueue } from './EventQueue.js';

// Re-export commonly used types for convenience
export type {
  EventHandler,
  EventPollerConfig,
  EventProcessorConfig,
  EventQueueConfig,
  EventPollerStats,
  EventProcessorStats,
  EventQueueStats,
  TypedEvent,
  BaseEventData,
  WebsetEventData,
  SearchEventData,
  ItemEventData,
  EventDataMap,
  EventProcessingResult,
  HandlerResult,
  EventProcessingFilter,
  EventProcessingOptions,
  EventQueueItem,
  QueuedEvent
} from './EventTypes.js';