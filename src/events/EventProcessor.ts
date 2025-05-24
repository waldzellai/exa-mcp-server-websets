/**
 * Event Processor Implementation
 * 
 * Processes events from the event queue using registered handlers.
 * Supports concurrent processing, timeout handling, and dead letter queue.
 */

import { EventEmitter } from 'events';
import { WebsetEvent, EventType } from '../types/websets.js';
import { 
  EventHandler,
  EventHandlerRegistry,
  EventProcessorConfig,
  EventProcessingResult,
  EventProcessorStats,
  DEFAULT_EVENT_SYSTEM_CONFIG 
} from './EventTypes.js';

/**
 * Registry for managing event handlers
 */
export class DefaultEventHandlerRegistry implements EventHandlerRegistry {
  public handlers = new Map<EventType, EventHandler[]>();

  register(handler: EventHandler): void {
    // Register handler for all event types it can handle
    const allEventTypes: EventType[] = [
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

    for (const eventType of allEventTypes) {
      // Create a mock event to test canHandle
      const mockEvent = {
        id: 'test',
        type: eventType,
        data: {} as any,
        createdAt: new Date().toISOString()
      };
      
      if (handler.canHandle(mockEvent)) {
        if (!this.handlers.has(eventType)) {
          this.handlers.set(eventType, []);
        }
        
        const typeHandlers = this.handlers.get(eventType)!;
        typeHandlers.push(handler);
        
        // Sort by priority (higher priority first)
        typeHandlers.sort((a, b) => b.priority - a.priority);
      }
    }
  }

  unregister(handler: EventHandler): void {
    for (const [eventType, typeHandlers] of this.handlers.entries()) {
      const index = typeHandlers.indexOf(handler);
      if (index !== -1) {
        typeHandlers.splice(index, 1);
        
        // Remove empty arrays
        if (typeHandlers.length === 0) {
          this.handlers.delete(eventType);
        }
      }
    }
  }

  getHandlers(eventType: EventType): EventHandler[] {
    return this.handlers.get(eventType) || [];
  }
getAllHandlers(): EventHandler[] {
    const allHandlers: EventHandler[] = [];
    for (const handlers of this.handlers.values()) {
      allHandlers.push(...handlers);
    }
    return allHandlers;
  }

  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Event processor for handling events with registered handlers
 */
export class EventProcessor extends EventEmitter {
  private readonly config: EventProcessorConfig;
  private readonly handlerRegistry: EventHandlerRegistry;
  private readonly stats: EventProcessorStats = {
    totalProcessed: 0,
    totalFailed: 0,
    successful: 0,
    failed: 0,
    averageProcessingTime: 0,
    activeHandlers: 0,
    activeWorkers: 0,
    processingRate: 0,
    errorRate: 0,
    handlerStats: {},
  };
  
  private readonly processingTimes: number[] = [];
  private readonly activeWorkers = new Set<string>();
  private readonly deadLetterQueue: WebsetEvent[] = [];
  private isShuttingDown = false;
  private rateCalculationInterval?: NodeJS.Timeout;
  private lastProcessedCount = 0;

  constructor(
    config: Partial<EventProcessorConfig> = {},
    handlerRegistry?: EventHandlerRegistry
  ) {
    super();
    this.config = { ...DEFAULT_EVENT_SYSTEM_CONFIG.processor, ...config };
    this.handlerRegistry = handlerRegistry || new DefaultEventHandlerRegistry();
    
    this.startRateCalculation();
  }

  /**
   * Process a single event
   * @param event The event to process
   * @returns Promise that resolves to processing result
   */
  async processEvent(event: WebsetEvent): Promise<EventProcessingResult> {
    if (this.isShuttingDown) {
      throw new Error('Processor is shutting down');
    }

    const workerId = `worker-${Date.now()}-${Math.random()}`;
    const startTime = Date.now();
    
    this.activeWorkers.add(workerId);
    this.stats.activeWorkers = this.activeWorkers.size;
    this.stats.totalProcessed++;

    try {
      // Get handlers for this event type
      const handlers = this.handlerRegistry.getHandlers(event.type);
      
      if (handlers.length === 0) {
        // No handlers registered for this event type
        this.emit('noHandlers', event);
        return {
          duration: Date.now() - startTime,
          metadata: { reason: 'no_handlers' },
        };
      }

      // Process with timeout
      await this.processWithTimeout(event, handlers);
      
      const duration = Date.now() - startTime;
      this.stats.successful++;
      this.recordProcessingTime(duration);
      
      this.emit('processed', event, { duration });
      
      return {
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.failed++;
      
      // Add to dead letter queue if enabled
      if (this.config.enableDeadLetterQueue) {
        this.addToDeadLetterQueue(event);
      }
      
      this.emit('failed', event, error);
      
      return {
        duration,
        error: error as Error,
      };
      
    } finally {
      this.activeWorkers.delete(workerId);
      this.stats.activeWorkers = this.activeWorkers.size;
    }
  }

  /**
   * Process event with timeout
   * @param event The event to process
   * @param handlers Array of handlers to use
   */
  private async processWithTimeout(event: WebsetEvent, handlers: EventHandler[]): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Event processing timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    const processingPromise = this.executeHandlers(event, handlers);

    await Promise.race([processingPromise, timeoutPromise]);
  }

  /**
   * Execute all handlers for an event
   * @param event The event to process
   * @param handlers Array of handlers to execute
   */
  private async executeHandlers(event: WebsetEvent, handlers: EventHandler[]): Promise<void> {
    const errors: Error[] = [];

    // Execute handlers in priority order
    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        errors.push(error as Error);
        this.emit('handlerError', event, handler, error);
      }
    }

    // If all handlers failed, throw combined error
    if (errors.length === handlers.length && errors.length > 0) {
      const combinedError = new Error(
        `All handlers failed: ${errors.map(e => e.message).join('; ')}`
      );
      throw combinedError;
    }
  }

  /**
   * Add event to dead letter queue
   * @param event The event to add
   */
  private addToDeadLetterQueue(event: WebsetEvent): void {
    if (!this.config.deadLetterQueue) {
      return;
    }

    // Check if dead letter queue is full
    if (this.deadLetterQueue.length >= this.config.deadLetterQueue.maxSize) {
      // Remove oldest event
      this.deadLetterQueue.shift();
    }

    this.deadLetterQueue.push(event);
    this.emit('deadLetter', event);
  }

  /**
   * Register an event handler
   * @param handler The handler to register
   */
  registerHandler(handler: EventHandler): void {
    this.handlerRegistry.register(handler);
    this.emit('handlerRegistered', handler);
  }

  /**
   * Unregister an event handler
   * @param handler The handler to unregister
   */
  unregisterHandler(handler: EventHandler): void {
    this.handlerRegistry.unregister(handler);
    this.emit('handlerUnregistered', handler);
  }

  /**
   * Get handlers for a specific event type
   * @param eventType The event type
   * @returns Array of handlers
   */
  getHandlers(eventType: EventType): EventHandler[] {
    return this.handlerRegistry.getHandlers(eventType);
  }

  /**
   * Clear all registered handlers
   */
  clearHandlers(): void {
    this.handlerRegistry.clear();
    this.emit('handlersCleared');
  }

  /**
   * Record processing time for statistics
   * @param duration Processing duration in milliseconds
   */
  private recordProcessingTime(duration: number): void {
    this.processingTimes.push(duration);
    
    // Keep only last 1000 processing times
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }
    
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }

  /**
   * Start processing rate calculation
   */
  private startRateCalculation(): void {
    this.rateCalculationInterval = setInterval(() => {
      const currentProcessed = this.stats.totalProcessed;
      const processedSinceLastCheck = currentProcessed - this.lastProcessedCount;
      
      // Calculate rate per second (interval is 1 second)
      this.stats.processingRate = processedSinceLastCheck;
      this.lastProcessedCount = currentProcessed;
    }, 1000);
  }

  /**
   * Stop processing rate calculation
   */
  private stopRateCalculation(): void {
    if (this.rateCalculationInterval) {
      clearInterval(this.rateCalculationInterval);
      this.rateCalculationInterval = undefined;
    }
  }

  /**
   * Get current processor statistics
   * @returns Current statistics
   */
  getStats(): EventProcessorStats {
    return { ...this.stats };
  }

  /**
   * Get dead letter queue events
   * @returns Array of events in dead letter queue
   */
  getDeadLetterQueue(): WebsetEvent[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    const clearedCount = this.deadLetterQueue.length;
    this.deadLetterQueue.length = 0;
    this.emit('deadLetterCleared', clearedCount);
  }

  /**
   * Reset processor statistics
   */
  resetStats(): void {
    this.stats.totalProcessed = 0;
    this.stats.successful = 0;
    this.stats.failed = 0;
    this.stats.processingRate = 0;
    this.stats.averageProcessingTime = 0;
    this.processingTimes.length = 0;
    this.lastProcessedCount = 0;
  }

  /**
   * Gracefully shutdown the processor
   * @param timeout Maximum time to wait for shutdown in milliseconds
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(timeout: number = 30000): Promise<void> {
    this.isShuttingDown = true;
    this.stopRateCalculation();

    // Wait for all active workers to complete
    const startTime = Date.now();
    while (this.activeWorkers.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.activeWorkers.size > 0) {
      console.warn(`Processor shutdown with ${this.activeWorkers.size} workers still active`);
    }

    this.emit('shutdown');
  }

  /**
   * Health check for the processor
   * @returns Health status information
   */
  healthCheck(): {
    healthy: boolean;
    activeWorkers: number;
    deadLetterQueueSize: number;
    processingRate: number;
    errorRate: number;
  } {
    const errorRate = this.stats.totalProcessed > 0 ? 
      this.stats.failed / this.stats.totalProcessed : 0;

    return {
      healthy: !this.isShuttingDown && this.activeWorkers.size < this.config.concurrency,
      activeWorkers: this.activeWorkers.size,
      deadLetterQueueSize: this.deadLetterQueue.length,
      processingRate: this.stats.processingRate,
      errorRate,
    };
  }
}