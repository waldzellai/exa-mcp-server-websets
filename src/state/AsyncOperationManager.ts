/**
 * Async Operation Manager Implementation
 * 
 * Manages long-running asynchronous operations with progress tracking,
 * cancellation support, and comprehensive state management.
 */

import { EventEmitter } from 'events';

/**
 * Operation status enumeration
 */
export enum OperationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

/**
 * Operation priority levels
 */
export enum OperationPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * Operation configuration
 */
export interface OperationConfig {
  /** Operation timeout in milliseconds */
  timeout?: number;
  /** Operation priority */
  priority?: OperationPriority;
  /** Whether operation can be cancelled */
  cancellable?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Operation metadata */
  metadata?: Record<string, any>;
}

/**
 * Operation progress information
 */
export interface OperationProgress {
  /** Current progress (0-100) */
  percentage: number;
  /** Current step description */
  currentStep?: string;
  /** Total steps */
  totalSteps?: number;
  /** Current step number */
  currentStepNumber?: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  /** Additional progress data */
  data?: Record<string, any>;
}

/**
 * Async operation definition
 */
export interface AsyncOperation<T = any> {
  /** Unique operation ID */
  id: string;
  /** Operation type/name */
  type: string;
  /** Current status */
  status: OperationStatus;
  /** Operation configuration */
  config: OperationConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Start timestamp */
  startedAt?: Date;
  /** Completion timestamp */
  completedAt?: Date;
  /** Current progress */
  progress?: OperationProgress;
  /** Operation result (if completed) */
  result?: T;
  /** Error information (if failed) */
  error?: Error;
  /** Retry count */
  retryCount: number;
  /** Cancellation reason */
  cancellationReason?: string;
  /** Operation context data */
  context?: Record<string, any>;
}

/**
 * Operation execution function
 */
export type OperationExecutor<T = any> = (
  operation: AsyncOperation<T>,
  progressCallback: (progress: OperationProgress) => void,
  cancellationToken: { cancelled: boolean }
) => Promise<T>;

/**
 * Operation manager configuration
 */
export interface AsyncOperationManagerConfig {
  /** Maximum concurrent operations */
  maxConcurrentOperations: number;
  /** Default operation timeout */
  defaultTimeout: number;
  /** Default retry attempts */
  defaultMaxRetries: number;
  /** Default retry delay */
  defaultRetryDelay: number;
  /** Cleanup interval for completed operations */
  cleanupInterval: number;
  /** Maximum age for completed operations */
  maxCompletedOperationAge: number;
  /** Whether to enable detailed logging */
  enableLogging: boolean;
}

/**
 * Operation manager statistics
 */
export interface OperationManagerStats {
  /** Total operations created */
  totalOperations: number;
  /** Currently running operations */
  runningOperations: number;
  /** Completed operations */
  completedOperations: number;
  /** Failed operations */
  failedOperations: number;
  /** Cancelled operations */
  cancelledOperations: number;
  /** Operations by type */
  operationsByType: Record<string, number>;
  /** Average operation duration */
  averageOperationDuration: number;
}

/**
 * Default configuration
 */
const DEFAULT_ASYNC_OPERATION_MANAGER_CONFIG: AsyncOperationManagerConfig = {
  maxConcurrentOperations: 10,
  defaultTimeout: 300000, // 5 minutes
  defaultMaxRetries: 3,
  defaultRetryDelay: 1000,
  cleanupInterval: 60000, // 1 minute
  maxCompletedOperationAge: 3600000, // 1 hour
  enableLogging: false,
};

/**
 * Async operation manager for handling long-running operations
 */
export class AsyncOperationManager extends EventEmitter {
  private readonly config: AsyncOperationManagerConfig;
  private readonly operations = new Map<string, AsyncOperation>();
  private readonly executors = new Map<string, OperationExecutor>();
  private readonly runningOperations = new Set<string>();
  private readonly operationQueue: string[] = [];
  private readonly cancellationTokens = new Map<string, { cancelled: boolean }>();
  private readonly stats: OperationManagerStats = {
    totalOperations: 0,
    runningOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    cancelledOperations: 0,
    operationsByType: {},
    averageOperationDuration: 0,
  };
  private readonly operationDurations: number[] = [];
  private cleanupInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: Partial<AsyncOperationManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ASYNC_OPERATION_MANAGER_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Register an operation executor
   * @param type Operation type
   * @param executor Executor function
   */
  registerExecutor<T>(type: string, executor: OperationExecutor<T>): void {
    this.executors.set(type, executor);
    this.emit('executorRegistered', type);
  }

  /**
   * Create a new async operation
   * @param type Operation type
   * @param config Operation configuration
   * @returns Created operation
   */
  createOperation<T>(
    type: string,
    config: OperationConfig = {}
  ): AsyncOperation<T> {
    if (this.isShuttingDown) {
      throw new Error('Operation manager is shutting down');
    }

    if (!this.executors.has(type)) {
      throw new Error(`No executor registered for operation type: ${type}`);
    }

    const operation: AsyncOperation<T> = {
      id: this.generateOperationId(),
      type,
      status: OperationStatus.PENDING,
      config: {
        timeout: config.timeout || this.config.defaultTimeout,
        priority: config.priority || OperationPriority.NORMAL,
        cancellable: config.cancellable !== false,
        maxRetries: config.maxRetries || this.config.defaultMaxRetries,
        retryDelay: config.retryDelay || this.config.defaultRetryDelay,
        metadata: config.metadata || {},
      },
      createdAt: new Date(),
      retryCount: 0,
      context: {},
    };

    this.operations.set(operation.id, operation);
    this.stats.totalOperations++;
    this.stats.operationsByType[type] = (this.stats.operationsByType[type] || 0) + 1;

    this.emit('operationCreated', operation);

    if (this.config.enableLogging) {
      console.log(`Created operation: ${operation.id} (${type})`);
    }

    return operation;
  }

  /**
   * Start an operation
   * @param operationId Operation ID
   * @returns Promise that resolves when operation completes
   */
  async startOperation<T>(operationId: string): Promise<T> {
    const operation = this.operations.get(operationId) as AsyncOperation<T>;
    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    if (operation.status !== OperationStatus.PENDING) {
      throw new Error(`Operation ${operationId} is not in pending status`);
    }

    // Check if we can start the operation immediately
    if (this.runningOperations.size >= this.config.maxConcurrentOperations) {
      // Add to queue
      this.operationQueue.push(operationId);
      operation.status = OperationStatus.PENDING;
      this.emit('operationQueued', operation);
      
      // Wait for operation to be processed
      return new Promise((resolve, reject) => {
        const onCompleted = (completedOperation: AsyncOperation<T>) => {
          if (completedOperation.id === operationId) {
            this.removeAllListeners(`operationCompleted:${operationId}`);
            this.removeAllListeners(`operationFailed:${operationId}`);
            this.removeAllListeners(`operationCancelled:${operationId}`);
            
            if (completedOperation.status === OperationStatus.COMPLETED) {
              resolve(completedOperation.result!);
            } else if (completedOperation.status === OperationStatus.FAILED) {
              reject(completedOperation.error);
            } else if (completedOperation.status === OperationStatus.CANCELLED) {
              reject(new Error(`Operation cancelled: ${completedOperation.cancellationReason}`));
            }
          }
        };

        this.on(`operationCompleted:${operationId}`, onCompleted);
        this.on(`operationFailed:${operationId}`, onCompleted);
        this.on(`operationCancelled:${operationId}`, onCompleted);
      });
    }

    return this.executeOperation(operation);
  }

  /**
   * Execute an operation
   * @param operation Operation to execute
   * @returns Promise that resolves with operation result
   */
  private async executeOperation<T>(operation: AsyncOperation<T>): Promise<T> {
    const executor = this.executors.get(operation.type) as OperationExecutor<T>;
    if (!executor) {
      throw new Error(`No executor found for operation type: ${operation.type}`);
    }

    // Mark as running
    operation.status = OperationStatus.RUNNING;
    operation.startedAt = new Date();
    this.runningOperations.add(operation.id);
    this.stats.runningOperations = this.runningOperations.size;

    // Create cancellation token
    const cancellationToken = { cancelled: false };
    this.cancellationTokens.set(operation.id, cancellationToken);

    this.emit('operationStarted', operation);

    if (this.config.enableLogging) {
      console.log(`Started operation: ${operation.id} (${operation.type})`);
    }

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Operation timeout'));
        }, operation.config.timeout);
      });

      // Create progress callback
      const progressCallback = (progress: OperationProgress) => {
        operation.progress = progress;
        this.emit('operationProgress', operation, progress);
      };

      // Execute operation with timeout
      const result = await Promise.race([
        executor(operation, progressCallback, cancellationToken),
        timeoutPromise,
      ]);

      // Check if cancelled during execution
      if (cancellationToken.cancelled) {
        operation.status = OperationStatus.CANCELLED;
        this.stats.cancelledOperations++;
        this.emit('operationCancelled', operation);
        this.emit(`operationCancelled:${operation.id}`, operation);
        throw new Error(`Operation cancelled: ${operation.cancellationReason}`);
      }

      // Operation completed successfully
      operation.status = OperationStatus.COMPLETED;
      operation.completedAt = new Date();
      operation.result = result;
      this.stats.completedOperations++;
      
      this.recordOperationDuration(operation);
      this.emit('operationCompleted', operation);
      this.emit(`operationCompleted:${operation.id}`, operation);

      if (this.config.enableLogging) {
        console.log(`Completed operation: ${operation.id} (${operation.type})`);
      }

      return result;

    } catch (error) {
      // Check if it was a timeout
      if (error instanceof Error && error.message === 'Operation timeout') {
        operation.status = OperationStatus.TIMEOUT;
      } else if (cancellationToken.cancelled) {
        operation.status = OperationStatus.CANCELLED;
        this.stats.cancelledOperations++;
      } else {
        operation.status = OperationStatus.FAILED;
        this.stats.failedOperations++;
      }

      operation.completedAt = new Date();
      operation.error = error as Error;

      // Check if we should retry
      if (operation.status === OperationStatus.FAILED && 
          operation.retryCount < operation.config.maxRetries!) {
        operation.retryCount++;
        operation.status = OperationStatus.PENDING;
        
        this.emit('operationRetrying', operation);
        
        // Wait for retry delay
        await new Promise(resolve => setTimeout(resolve, operation.config.retryDelay));
        
        // Retry the operation
        return this.executeOperation(operation);
      }

      this.emit('operationFailed', operation);
      this.emit(`operationFailed:${operation.id}`, operation);

      if (this.config.enableLogging) {
        console.log(`Failed operation: ${operation.id} (${operation.type}):`, error);
      }

      throw error;

    } finally {
      // Cleanup
      this.runningOperations.delete(operation.id);
      this.cancellationTokens.delete(operation.id);
      this.stats.runningOperations = this.runningOperations.size;

      // Process next operation in queue
      this.processQueue();
    }
  }

  /**
   * Cancel an operation
   * @param operationId Operation ID
   * @param reason Cancellation reason
   * @returns True if operation was cancelled
   */
  cancelOperation(operationId: string, reason: string = 'User requested'): boolean {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return false;
    }

    if (!operation.config.cancellable) {
      throw new Error(`Operation ${operationId} is not cancellable`);
    }

    if (operation.status === OperationStatus.COMPLETED ||
        operation.status === OperationStatus.FAILED ||
        operation.status === OperationStatus.CANCELLED) {
      return false;
    }

    operation.cancellationReason = reason;
    
    // If operation is running, signal cancellation
    const cancellationToken = this.cancellationTokens.get(operationId);
    if (cancellationToken) {
      cancellationToken.cancelled = true;
    } else {
      // Operation is pending, cancel immediately
      operation.status = OperationStatus.CANCELLED;
      operation.completedAt = new Date();
      this.stats.cancelledOperations++;
      
      // Remove from queue if present
      const queueIndex = this.operationQueue.indexOf(operationId);
      if (queueIndex !== -1) {
        this.operationQueue.splice(queueIndex, 1);
      }
      
      this.emit('operationCancelled', operation);
      this.emit(`operationCancelled:${operationId}`, operation);
    }

    if (this.config.enableLogging) {
      console.log(`Cancelled operation: ${operationId} - ${reason}`);
    }

    return true;
  }

  /**
   * Get operation by ID
   * @param operationId Operation ID
   * @returns Operation or undefined
   */
  getOperation(operationId: string): AsyncOperation | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get operations by status
   * @param status Operation status
   * @returns Array of operations
   */
  getOperationsByStatus(status: OperationStatus): AsyncOperation[] {
    return Array.from(this.operations.values()).filter(op => op.status === status);
  }

  /**
   * Get operations by type
   * @param type Operation type
   * @returns Array of operations
   */
  getOperationsByType(type: string): AsyncOperation[] {
    return Array.from(this.operations.values()).filter(op => op.type === type);
  }

  /**
   * Process the operation queue
   */
  private processQueue(): void {
    if (this.operationQueue.length === 0 || 
        this.runningOperations.size >= this.config.maxConcurrentOperations) {
      return;
    }

    // Sort queue by priority
    this.operationQueue.sort((a, b) => {
      const opA = this.operations.get(a);
      const opB = this.operations.get(b);
      if (!opA || !opB) return 0;
      return (opB.config.priority || 0) - (opA.config.priority || 0);
    });

    const operationId = this.operationQueue.shift();
    if (operationId) {
      const operation = this.operations.get(operationId);
      if (operation && operation.status === OperationStatus.PENDING) {
        this.executeOperation(operation).catch(() => {
          // Error handling is done in executeOperation
        });
      }
    }
  }

  /**
   * Record operation duration for statistics
   * @param operation Completed operation
   */
  private recordOperationDuration(operation: AsyncOperation): void {
    if (operation.startedAt && operation.completedAt) {
      const duration = operation.completedAt.getTime() - operation.startedAt.getTime();
      this.operationDurations.push(duration);
      
      // Keep only last 1000 durations
      if (this.operationDurations.length > 1000) {
        this.operationDurations.shift();
      }
      
      this.stats.averageOperationDuration = 
        this.operationDurations.reduce((sum, d) => sum + d, 0) / this.operationDurations.length;
    }
  }

  /**
   * Generate unique operation ID
   * @returns Unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedOperations();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup old completed operations
   */
  private cleanupCompletedOperations(): void {
    const cutoffTime = new Date(Date.now() - this.config.maxCompletedOperationAge);
    const toRemove: string[] = [];

    for (const [id, operation] of this.operations) {
      if ((operation.status === OperationStatus.COMPLETED ||
           operation.status === OperationStatus.FAILED ||
           operation.status === OperationStatus.CANCELLED) &&
          operation.completedAt &&
          operation.completedAt < cutoffTime) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.operations.delete(id);
    }

    if (toRemove.length > 0) {
      this.emit('operationsCleanedUp', toRemove.length);
    }
  }

  /**
   * Get current statistics
   * @returns Operation manager statistics
   */
  getStats(): OperationManagerStats {
    return { ...this.stats };
  }

  /**
   * Shutdown the operation manager
   * @param timeout Maximum time to wait for operations to complete
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(timeout: number = 30000): Promise<void> {
    this.isShuttingDown = true;

    // Cancel all pending operations
    for (const operationId of this.operationQueue) {
      this.cancelOperation(operationId, 'Manager shutting down');
    }

    // Wait for running operations to complete
    const startTime = Date.now();
    while (this.runningOperations.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force cancel remaining operations
    for (const operationId of this.runningOperations) {
      this.cancelOperation(operationId, 'Manager shutdown timeout');
    }

    // Stop cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.emit('shutdown');
  }
}