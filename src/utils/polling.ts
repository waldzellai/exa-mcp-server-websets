/**
 * Polling utilities for handling asynchronous operations
 */

export interface PollingOptions {
  maxAttempts?: number;
  intervalMs?: number;
  maxWaitMs?: number;
  onProgress?: (attempt: number, status: any) => void;
}

export interface PollingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  duration: number;
}

/**
 * Status values that indicate an operation is complete
 */
export const COMPLETE_STATUSES = ['completed', 'failed', 'cancelled', 'idle'] as const;

/**
 * Status values that indicate an operation is still running
 */
export const RUNNING_STATUSES = ['pending', 'running', 'processing'] as const;

/**
 * Default polling configurations - keeping intervals reasonable
 */
export const POLLING_DEFAULTS = {
  SEARCH: {
    intervalMs: 2000,      // Check every 2 seconds
    maxAttempts: 30,       // Max 1 minute total
    maxWaitMs: 60000,      // 1 minute timeout
  },
  ENHANCEMENT: {
    intervalMs: 3000,      // Check every 3 seconds
    maxAttempts: 40,       // Max 2 minutes total
    maxWaitMs: 120000,     // 2 minute timeout
  },
  DEFAULT: {
    intervalMs: 2000,      // Check every 2 seconds
    maxAttempts: 25,       // Max 50 seconds total
    maxWaitMs: 50000,      // 50 second timeout
  },
} as const;

/**
 * Poll an asynchronous operation until it completes
 * Uses fixed intervals instead of exponential backoff for predictability
 */
export async function pollOperation<T>(
  checkFn: () => Promise<{ status: string; data?: T }>,
  options: PollingOptions = {}
): Promise<PollingResult<T>> {
  const {
    maxAttempts = POLLING_DEFAULTS.DEFAULT.maxAttempts,
    intervalMs = POLLING_DEFAULTS.DEFAULT.intervalMs,
    maxWaitMs = POLLING_DEFAULTS.DEFAULT.maxWaitMs,
    onProgress,
  } = options;

  const startTime = Date.now();
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const result = await checkFn();
      
      // Notify progress if callback provided
      if (onProgress) {
        onProgress(attempts, result);
      }

      // Check if operation is complete
      if (COMPLETE_STATUSES.includes(result.status as any)) {
        return {
          success: result.status === 'completed' || result.status === 'idle',
          data: result.data,
          error: result.status === 'failed' || result.status === 'cancelled' 
            ? `Operation ${result.status}` 
            : undefined,
          attempts,
          duration: Date.now() - startTime,
        };
      }

      // Check if we've exceeded max wait time
      if (Date.now() - startTime > maxWaitMs) {
        return {
          success: false,
          error: `Operation timed out after ${maxWaitMs}ms`,
          attempts,
          duration: Date.now() - startTime,
        };
      }

      // Wait before next attempt (fixed interval, not exponential)
      await sleep(intervalMs);
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempts,
        duration: Date.now() - startTime,
      };
    }
  }

  return {
    success: false,
    error: `Max attempts (${maxAttempts}) reached`,
    attempts,
    duration: Date.now() - startTime,
  };
}

/**
 * Poll with simple retry logic (not exponential)
 * Retries with same interval if request fails
 */
export async function pollWithRetry<T>(
  checkFn: () => Promise<{ status: string; data?: T }>,
  options: PollingOptions = {},
  maxRetries: number = 3
): Promise<PollingResult<T>> {
  let lastError: string | undefined;
  
  for (let retry = 0; retry < maxRetries; retry++) {
    const result = await pollOperation(checkFn, options);
    
    if (result.success || !result.error?.includes('Unknown error')) {
      // Success or a definitive failure (not a network error)
      return result;
    }
    
    lastError = result.error;
    
    // Wait a bit before retrying (fixed delay, not exponential)
    if (retry < maxRetries - 1) {
      await sleep(1000); // 1 second between retries
    }
  }
  
  return {
    success: false,
    error: lastError || 'All retries exhausted',
    attempts: maxRetries,
    duration: 0,
  };
}

/**
 * Simple sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a progress callback that logs status updates
 */
export function createProgressLogger(operationType: string) {
  return (attempt: number, status: { status: string; progress?: any }) => {
    const progress = status.progress 
      ? ` (${JSON.stringify(status.progress)})`
      : '';
    console.log(`[${operationType}] Attempt ${attempt}: ${status.status}${progress}`);
  };
}