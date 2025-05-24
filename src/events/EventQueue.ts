/**
 * Event Queue Implementation
 * 
 * Thread-safe event queue for managing and processing Websets events
 * with retry logic, backoff strategies, and comprehensive statistics.
 */

import { EventEmitter } from 'events';
import { WebsetEvent } from '../types/websets.js';
import {
  QueuedEvent,
  EventQueueConfig,
  ExtendedEventQueueStats,
  EventQueueStats,
  DEFAULT_EVENT_SYSTEM_CONFIG,
  getEventPriority,
  EventType
} from './EventTypes.js';

/**
 * Thread-safe event queue with retry logic and statistics
 */
export class EventQueue extends EventEmitter {
  private readonly config: EventQueueConfig;
  private readonly queue: QueuedEvent[] = [];
  private readonly processing = new Set<string>();
  private readonly stats: ExtendedEventQueueStats = {
    totalEvents: 0,
    pendingEvents: 0,
    processingEvents: 0,
    completedEvents: 0,
    failedEvents: 0,
    totalQueued: 0,
    currentSize: 0,
    processing: 0,
    processed: 0,
    failed: 0,
    averageProcessingTime: 0,
    eventsByType: {} as Record<EventType, number>,
    queueHealth: 'healthy',
  };
  private readonly processingTimes: number[] = [];
  private processingInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: Partial<EventQueueConfig> = {}) {
    super();
    this.config = { ...DEFAULT_EVENT_SYSTEM_CONFIG.queue, ...config };
    this.startProcessing();
  }

  /**
   * Add an event to the queue
   * @param event The event to queue
   * @returns Promise that resolves when event is queued
   */
  async enqueue(event: WebsetEvent): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Queue is shutting down');
    }

    if (this.queue.length >= this.config.maxSize) {
      throw new Error(`Queue is full (max size: ${this.config.maxSize})`);
    }

    const queuedEvent: QueuedEvent = {
      event,
      priority: getEventPriority(event.type),
      attempts: 0,
      maxAttempts: this.config.maxAttempts,
      nextAttemptAt: new Date(),
      addedAt: new Date(),
      queuedAt: new Date(),
    };

    this.queue.push(queuedEvent);
    this.stats.totalQueued++;
    this.stats.currentSize = this.queue.length;

    this.emit('enqueued', queuedEvent);
  }

  /**
   * Get the next batch of events ready for processing
   * @returns Array of events ready for processing
   */
  private getNextBatch(): QueuedEvent[] {
    const now = new Date();
    const batch: QueuedEvent[] = [];
    
    for (let i = 0; i < this.queue.length && batch.length < this.config.batchSize; i++) {
      const queuedEvent = this.queue[i];
      
      // Skip if already processing
      if (this.processing.has(queuedEvent.event.id)) {
        continue;
      }
      
      // Skip if waiting for retry
      if (queuedEvent.nextRetryAt && queuedEvent.nextRetryAt > now) {
        continue;
      }
      
      // Skip if max attempts exceeded
      if (queuedEvent.attempts >= queuedEvent.maxAttempts) {
        continue;
      }
      
      batch.push(queuedEvent);
    }
    
    return batch;
  }

  /**
   * Process a single event
   * @param queuedEvent The queued event to process
   * @returns Promise that resolves when processing is complete
   */
  private async processEvent(queuedEvent: QueuedEvent): Promise<void> {
    const startTime = Date.now();
    const eventId = queuedEvent.event.id;
    
    this.processing.add(eventId);
    this.stats.processing = this.processing.size;
    queuedEvent.attempts++;

    try {
      this.emit('processing', queuedEvent);
      
      // Emit the event for handlers to process
      this.emit('event', queuedEvent.event);
      
      // Remove from queue on successful processing
      const index = this.queue.indexOf(queuedEvent);
      if (index !== -1) {
        this.queue.splice(index, 1);
        this.stats.currentSize = this.queue.length;
      }
      
      this.stats.processed++;
      this.recordProcessingTime(Date.now() - startTime);
      
      this.emit('processed', queuedEvent);
      
    } catch (error) {
      queuedEvent.lastError = error as Error;
      
      if (queuedEvent.attempts < queuedEvent.maxAttempts) {
        // Schedule retry
        queuedEvent.nextRetryAt = this.calculateNextRetryTime(queuedEvent.attempts);
        this.emit('retrying', queuedEvent, error);
      } else {
        // Max attempts exceeded, move to failed
        const index = this.queue.indexOf(queuedEvent);
        if (index !== -1) {
          this.queue.splice(index, 1);
          this.stats.currentSize = this.queue.length;
        }
        
        this.stats.failed++;
        this.emit('failed', queuedEvent, error);
      }
    } finally {
      this.processing.delete(eventId);
      this.stats.processing = this.processing.size;
    }
  }

  /**
   * Calculate the next retry time based on attempt number
   * @param attempt The current attempt number
   * @returns Date when the next retry should occur
   */
  private calculateNextRetryTime(attempt: number): Date {
    let delay = this.config.retryDelay;
    
    if (this.config.exponentialBackoff) {
      delay = Math.min(
        this.config.retryDelay * Math.pow(2, attempt - 1),
        this.config.maxRetryDelay
      );
    }
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;
    
    return new Date(Date.now() + delay);
  }

  /**
   * Record processing time for statistics
   * @param duration Processing duration in milliseconds
   */
  private recordProcessingTime(duration: number): void {
    this.processingTimes.push(duration);
    
    // Keep only last 1000 processing times for average calculation
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }
    
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }

  /**
   * Start the processing loop
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      if (this.isShuttingDown) {
        return;
      }

      const batch = this.getNextBatch();
      if (batch.length === 0) {
        return;
      }

      // Process events concurrently
      const promises = batch.map(queuedEvent => 
        this.processEvent(queuedEvent).catch(error => {
          // Error handling is done in processEvent
          console.error('Unexpected error in event processing:', error);
        })
      );

      await Promise.allSettled(promises);
    }, this.config.processingInterval);
  }

  /**
   * Stop the processing loop
   */
  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  /**
   * Get current queue statistics
   * @returns Current statistics
   */
  getStats(): EventQueueStats {
    return { ...this.stats };
  }

  /**
   * Get current queue size
   * @returns Number of events in queue
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   * @returns True if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Clear all events from the queue
   */
  clear(): void {
    const clearedCount = this.queue.length;
    this.queue.length = 0;
    this.stats.currentSize = 0;
    this.emit('cleared', clearedCount);
  }

  /**
   * Get events that are waiting for retry
   * @returns Array of events waiting for retry
   */
  getRetryingEvents(): QueuedEvent[] {
    const now = new Date();
    return this.queue.filter(event => 
      event.nextRetryAt && event.nextRetryAt > now
    );
  }

  /**
   * Get events that have failed all retry attempts
   * @returns Array of failed events still in queue
   */
  getFailedEvents(): QueuedEvent[] {
    return this.queue.filter(event => 
      event.attempts >= event.maxAttempts
    );
  }

  /**
   * Gracefully shutdown the queue
   * @param timeout Maximum time to wait for shutdown in milliseconds
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(timeout: number = 30000): Promise<void> {
    this.isShuttingDown = true;
    this.stopProcessing();

    // Wait for all processing to complete
    const startTime = Date.now();
    while (this.processing.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.processing.size > 0) {
      console.warn(`Queue shutdown with ${this.processing.size} events still processing`);
    }

    this.emit('shutdown');
  }

  /**
   * Health check for the queue
   * @returns Health status information
   */
  healthCheck(): {
    healthy: boolean;
    queueSize: number;
    processing: number;
    failedEvents: number;
    retryingEvents: number;
  } {
    const failedEvents = this.getFailedEvents().length;
    const retryingEvents = this.getRetryingEvents().length;
    
    return {
      healthy: !this.isShuttingDown && this.queue.length < this.config.maxSize,
      queueSize: this.queue.length,
      processing: this.processing.size,
      failedEvents,
      retryingEvents,
    };
  }
}