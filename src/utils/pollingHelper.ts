/**
 * Polling Helper
 * 
 * Utilities for polling operations with keep-alive support
 */

import { KeepAliveManager } from './keepAlive.js';
import { log } from './logger.js';

export interface PollingOptions {
  /** Maximum time to poll in milliseconds */
  maxDuration?: number;
  /** Interval between polls in milliseconds */
  pollInterval?: number;
  /** Keep-alive interval in milliseconds */
  keepAliveInterval?: number;
  /** Whether to log polling progress */
  enableLogging?: boolean;
}

export interface PollResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
  attempts: number;
}

/**
 * Poll an operation until it completes or times out
 */
export async function pollUntilComplete<T>(
  operationName: string,
  checkStatus: () => Promise<{ complete: boolean; result?: T; error?: Error }>,
  options: PollingOptions = {}
): Promise<PollResult<T>> {
  const {
    maxDuration = 300000, // 5 minutes default
    pollInterval = 5000, // 5 seconds default
    keepAliveInterval = 10000, // 10 seconds default
    enableLogging = false
  } = options;

  const keepAlive = new KeepAliveManager(operationName, {
    interval: keepAliveInterval,
    enableLogging
  });

  const startTime = Date.now();
  let attempts = 0;

  try {
    keepAlive.start();

    while (true) {
      attempts++;
      
      // Check if we've exceeded max duration
      const elapsed = Date.now() - startTime;
      if (elapsed > maxDuration) {
        throw new Error(`Operation timed out after ${elapsed}ms`);
      }

      // Update progress
      const progress = Math.min(90, Math.floor((elapsed / maxDuration) * 100));
      keepAlive.sendProgress(`Checking status (attempt ${attempts})`, progress);

      // Check status
      const status = await checkStatus();
      
      if (status.complete) {
        keepAlive.sendProgress('Operation completed successfully', 100);
        return {
          success: !status.error,
          result: status.result,
          error: status.error,
          duration: elapsed,
          attempts
        };
      }

      if (status.error) {
        throw status.error;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    keepAlive.sendProgress(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, -1);
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      duration: elapsed,
      attempts
    };
  } finally {
    keepAlive.stop();
  }
}

/**
 * Poll a webset until it completes processing
 */
export async function pollWebsetCompletion(
  websetId: string,
  getStatus: (id: string) => Promise<any>,
  options?: PollingOptions
): Promise<PollResult<any>> {
  return pollUntilComplete(
    `Webset ${websetId} processing`,
    async () => {
      const status = await getStatus(websetId);
      
      if (status.status === 'completed') {
        return { complete: true, result: status };
      } else if (status.status === 'failed' || status.status === 'cancelled') {
        return { 
          complete: true, 
          error: new Error(`Webset ${status.status}: ${status.error || 'Unknown error'}`) 
        };
      }
      
      return { complete: false };
    },
    options
  );
}