/**
 * Unit Tests for EventProcessor
 * 
 * Tests the EventProcessor with mocked event handlers.
 * Following TDD London School methodology.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventProcessor, DefaultEventHandlerRegistry } from '../../../src/events/EventProcessor.js';
import { EventHandler, EventHandlerRegistry } from '../../../src/events/EventTypes.js';
import { 
  mockWebsetEvent, 
  createMockWebsetEvent
} from '../../fixtures/websets.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js');

describe('EventProcessor', () => {
  let eventProcessor: EventProcessor;
  let mockHandlerRegistry: jest.Mocked<EventHandlerRegistry>;
  let mockHandler: jest.Mocked<EventHandler>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock handler
    mockHandler = {
      eventType: 'webset.created',
      priority: 100,
      canHandle: global.testUtils.createMockFn(() => true),
      handle: global.testUtils.createAsyncMockFn()
    };

    // Create mock handler registry
    mockHandlerRegistry = {
      handlers: new Map(),
      register: global.testUtils.createMockFn(),
      unregister: global.testUtils.createMockFn(),
      getHandlers: global.testUtils.createMockFn(() => [mockHandler]),
      getAllHandlers: global.testUtils.createMockFn(() => [mockHandler]),
      clear: global.testUtils.createMockFn()
    } as any;

    // Create processor instance
    eventProcessor = new EventProcessor({
      concurrency: 2,
      timeout: 5000,
      enableDeadLetterQueue: true
    }, mockHandlerRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default configuration', () => {
      const processor = new EventProcessor();
      expect(processor).toBeInstanceOf(EventProcessor);
    });

    it('should create instance with custom configuration', () => {
      const config = {
        concurrency: 5,
        timeout: 10000,
        enableDeadLetterQueue: false
      };

      const processor = new EventProcessor(config);
      expect(processor).toBeInstanceOf(EventProcessor);
    });

    it('should use provided handler registry', () => {
      const customRegistry = new DefaultEventHandlerRegistry();
      const processor = new EventProcessor({}, customRegistry);
      expect(processor).toBeInstanceOf(EventProcessor);
    });
  });

  describe('processEvent', () => {
    it('should process event successfully with handlers', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandler.handle.mockResolvedValue(undefined);

      // Act
      const result = await eventProcessor.processEvent(event);

      // Assert
      expect(mockHandlerRegistry.getHandlers).toHaveBeenCalledWith('webset.created');
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle event with no registered handlers', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandlerRegistry.getHandlers.mockReturnValue([]);

      // Act
      const result = await eventProcessor.processEvent(event);

      // Assert
      expect(result.duration).toBeGreaterThan(0);
      expect(result.metadata?.reason).toBe('no_handlers');
      expect(result.error).toBeUndefined();
    });

    it('should handle handler errors gracefully', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      const handlerError = new Error('Handler failed');
      mockHandler.handle.mockRejectedValue(handlerError);

      // Act
      const result = await eventProcessor.processEvent(event);

      // Assert
      expect(result.error).toBe(handlerError);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle processing timeout', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandler.handle.mockImplementation(async () => {
        // Simulate long-running operation
        await new Promise(resolve => setTimeout(resolve, 10000));
      });

      // Create processor with short timeout
      const shortTimeoutProcessor = new EventProcessor({
        timeout: 100
      }, mockHandlerRegistry);

      // Act
      const result = await shortTimeoutProcessor.processEvent(event);

      // Assert
      expect(result.error?.message).toContain('Event processing timeout');
    });
  });

  describe('handler management', () => {
    it('should register handler', () => {
      // Act
      eventProcessor.registerHandler(mockHandler);

      // Assert
      expect(mockHandlerRegistry.register).toHaveBeenCalledWith(mockHandler);
    });

    it('should unregister handler', () => {
      // Act
      eventProcessor.unregisterHandler(mockHandler);

      // Assert
      expect(mockHandlerRegistry.unregister).toHaveBeenCalledWith(mockHandler);
    });

    it('should get handlers for event type', () => {
      // Act
      const handlers = eventProcessor.getHandlers('webset.created');

      // Assert
      expect(mockHandlerRegistry.getHandlers).toHaveBeenCalledWith('webset.created');
      expect(handlers).toEqual([mockHandler]);
    });

    it('should clear all handlers', () => {
      // Act
      eventProcessor.clearHandlers();

      // Assert
      expect(mockHandlerRegistry.clear).toHaveBeenCalled();
    });
  });

  describe('statistics and monitoring', () => {
    it('should track processing statistics', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandler.handle.mockResolvedValue(undefined);

      // Act
      await eventProcessor.processEvent(event);
      const stats = eventProcessor.getStats();

      // Assert
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should track failed processing statistics', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandler.handle.mockRejectedValue(new Error('Handler failed'));

      // Act
      await eventProcessor.processEvent(event);
      const stats = eventProcessor.getStats();

      // Assert
      expect(stats.totalProcessed).toBe(1);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(1);
    });

    it('should reset statistics', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandler.handle.mockResolvedValue(undefined);
      await eventProcessor.processEvent(event);

      // Act
      eventProcessor.resetStats();
      const stats = eventProcessor.getStats();

      // Assert
      expect(stats.totalProcessed).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
    });

    it('should provide health check information', () => {
      // Act
      const health = eventProcessor.healthCheck();

      // Assert
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('activeWorkers');
      expect(health).toHaveProperty('deadLetterQueueSize');
      expect(health).toHaveProperty('processingRate');
      expect(health).toHaveProperty('errorRate');
    });
  });

  describe('dead letter queue', () => {
    it('should add failed events to dead letter queue when enabled', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandler.handle.mockRejectedValue(new Error('Handler failed'));

      // Act
      await eventProcessor.processEvent(event);
      const deadLetterQueue = eventProcessor.getDeadLetterQueue();

      // Assert
      expect(deadLetterQueue).toHaveLength(1);
      expect(deadLetterQueue[0]).toEqual(event);
    });

    it('should not add events to dead letter queue when disabled', async () => {
      // Arrange
      const processorWithoutDLQ = new EventProcessor({
        enableDeadLetterQueue: false
      }, mockHandlerRegistry);

      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandler.handle.mockRejectedValue(new Error('Handler failed'));

      // Act
      await processorWithoutDLQ.processEvent(event);
      const deadLetterQueue = processorWithoutDLQ.getDeadLetterQueue();

      // Assert
      expect(deadLetterQueue).toHaveLength(0);
    });

    it('should clear dead letter queue', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      mockHandler.handle.mockRejectedValue(new Error('Handler failed'));
      await eventProcessor.processEvent(event);

      // Act
      eventProcessor.clearDeadLetterQueue();
      const deadLetterQueue = eventProcessor.getDeadLetterQueue();

      // Assert
      expect(deadLetterQueue).toHaveLength(0);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      // Act
      await eventProcessor.shutdown(1000);

      // Assert
      const health = eventProcessor.healthCheck();
      expect(health.healthy).toBe(false);
    });

    it('should reject new events during shutdown', async () => {
      // Arrange
      const event = createMockWebsetEvent({ type: 'webset.created' });
      await eventProcessor.shutdown(100);

      // Act & Assert
      await expect(eventProcessor.processEvent(event))
        .rejects.toThrow('Processor is shutting down');
    });
  });
});

describe('DefaultEventHandlerRegistry', () => {
  let registry: DefaultEventHandlerRegistry;
  let mockHandler: EventHandler;

  beforeEach(() => {
    registry = new DefaultEventHandlerRegistry();
    mockHandler = {
      eventType: 'webset.created',
      priority: 100,
      canHandle: (event) => event.type === 'webset.created',
      handle: global.testUtils.createAsyncMockFn()
    };
  });

  describe('register', () => {
    it('should register handler for matching event types', () => {
      // Act
      registry.register(mockHandler);

      // Assert
      const handlers = registry.getHandlers('webset.created');
      expect(handlers).toContain(mockHandler);
    });

    it('should sort handlers by priority', () => {
      // Arrange
      const lowPriorityHandler = {
        eventType: 'webset.created' as const,
        priority: 50,
        canHandle: (event: any) => event.type === 'webset.created',
        handle: global.testUtils.createAsyncMockFn()
      };

      const highPriorityHandler = {
        eventType: 'webset.created' as const,
        priority: 200,
        canHandle: (event: any) => event.type === 'webset.created',
        handle: global.testUtils.createAsyncMockFn()
      };

      // Act
      registry.register(lowPriorityHandler);
      registry.register(highPriorityHandler);
      registry.register(mockHandler);

      // Assert
      const handlers = registry.getHandlers('webset.created');
      expect(handlers[0]).toBe(highPriorityHandler);
      expect(handlers[1]).toBe(mockHandler);
      expect(handlers[2]).toBe(lowPriorityHandler);
    });
  });

  describe('unregister', () => {
    it('should unregister handler', () => {
      // Arrange
      registry.register(mockHandler);

      // Act
      registry.unregister(mockHandler);

      // Assert
      const handlers = registry.getHandlers('webset.created');
      expect(handlers).not.toContain(mockHandler);
    });
  });

  describe('clear', () => {
    it('should clear all handlers', () => {
      // Arrange
      registry.register(mockHandler);

      // Act
      registry.clear();

      // Assert
      const handlers = registry.getHandlers('webset.created');
      expect(handlers).toHaveLength(0);
    });
  });

  describe('getAllHandlers', () => {
    it('should return all registered handlers', () => {
      // Arrange
      const handler2 = {
        eventType: 'webset.deleted' as const,
        priority: 90,
        canHandle: (event: any) => event.type === 'webset.deleted',
        handle: global.testUtils.createAsyncMockFn()
      };

      registry.register(mockHandler);
      registry.register(handler2);

      // Act
      const allHandlers = registry.getAllHandlers();

      // Assert
      expect(allHandlers).toContain(mockHandler);
      expect(allHandlers).toContain(handler2);
    });
  });
});