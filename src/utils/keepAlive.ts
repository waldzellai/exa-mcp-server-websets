/**
 * Keep-Alive Utilities
 * 
 * Provides heartbeat and progress notification mechanisms to prevent
 * timeouts during long-running operations.
 */

import { log } from './logger.js';

export interface KeepAliveOptions {
  /** Interval in milliseconds between heartbeats */
  interval?: number;
  /** Callback to send heartbeat/progress updates */
  onHeartbeat?: (message: string) => void;
  /** Whether to log heartbeats */
  enableLogging?: boolean;
}

export class KeepAliveManager {
  private intervalId?: NodeJS.Timeout;
  private options: Required<KeepAliveOptions>;
  private startTime: number;
  private operationName: string;

  constructor(operationName: string, options: KeepAliveOptions = {}) {
    this.operationName = operationName;
    this.options = {
      interval: options.interval || 10000, // 10 seconds default
      onHeartbeat: options.onHeartbeat || (() => {}),
      enableLogging: options.enableLogging ?? false
    };
    this.startTime = Date.now();
  }

  /**
   * Start sending heartbeats
   */
  start(): void {
    if (this.intervalId) {
      return; // Already started
    }

    // Send initial heartbeat
    this.sendHeartbeat();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.options.interval);

    if (this.options.enableLogging) {
      log(`KeepAlive started for ${this.operationName} with ${this.options.interval}ms interval`);
    }
  }

  /**
   * Stop sending heartbeats
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      
      if (this.options.enableLogging) {
        const duration = Date.now() - this.startTime;
        log(`KeepAlive stopped for ${this.operationName} after ${duration}ms`);
      }
    }
  }

  /**
   * Send a custom progress update
   */
  sendProgress(message: string, progress?: number): void {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const progressStr = progress !== undefined ? ` (${progress}%)` : '';
    const fullMessage = `[${this.operationName}] ${message}${progressStr} - ${elapsed}s elapsed`;
    
    this.options.onHeartbeat(fullMessage);
    
    if (this.options.enableLogging) {
      log(fullMessage);
    }
  }

  /**
   * Send a heartbeat message
   */
  private sendHeartbeat(): void {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const message = `[${this.operationName}] Still processing... ${elapsed}s elapsed`;
    
    this.options.onHeartbeat(message);
    
    if (this.options.enableLogging) {
      log(`Heartbeat: ${message}`);
    }
  }
}

/**
 * Wrap an async operation with keep-alive functionality
 */
export async function withKeepAlive<T>(
  operationName: string,
  operation: (keepAlive: KeepAliveManager) => Promise<T>,
  options?: KeepAliveOptions
): Promise<T> {
  const keepAlive = new KeepAliveManager(operationName, options);
  
  try {
    keepAlive.start();
    const result = await operation(keepAlive);
    return result;
  } finally {
    keepAlive.stop();
  }
}

/**
 * Create a progress reporter for long-running operations
 */
export class ProgressReporter {
  private keepAlive: KeepAliveManager;
  private totalSteps: number;
  private currentStep: number = 0;

  constructor(
    operationName: string, 
    totalSteps: number,
    options?: KeepAliveOptions
  ) {
    this.totalSteps = totalSteps;
    this.keepAlive = new KeepAliveManager(operationName, options);
  }

  start(): void {
    this.keepAlive.start();
    this.keepAlive.sendProgress('Starting operation', 0);
  }

  nextStep(stepDescription: string): void {
    this.currentStep++;
    const progress = Math.round((this.currentStep / this.totalSteps) * 100);
    this.keepAlive.sendProgress(stepDescription, progress);
  }

  complete(message: string = 'Operation completed'): void {
    this.keepAlive.sendProgress(message, 100);
    this.keepAlive.stop();
  }

  error(message: string): void {
    this.keepAlive.sendProgress(`Error: ${message}`, this.currentStep / this.totalSteps * 100);
    this.keepAlive.stop();
  }
}