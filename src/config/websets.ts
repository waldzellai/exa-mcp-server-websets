/**
 * Websets API Configuration
 * 
 * Environment-based configuration for the Websets API client.
 * No hardcoded secrets or environment values.
 */

export interface WebsetsConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the Websets API */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retry attempts */
  retryAttempts: number;
  /** Base retry delay in milliseconds */
  retryDelay: number;
  /** Maximum retry delay in milliseconds */
  maxRetryDelay: number;
  /** Rate limit requests per second */
  rateLimit: number;
  /** Circuit breaker failure threshold */
  circuitBreakerThreshold: number;
  /** Circuit breaker timeout in milliseconds */
  circuitBreakerTimeout: number;
  /** Event system configuration */
  events?: EventSystemConfig;
  /** Webhook system configuration */
  webhooks?: WebhookSystemConfig;
}

/**
 * Event system configuration
 */
export interface EventSystemConfig {
  /** Enable event polling */
  enabled: boolean;
  /** Event polling interval in milliseconds */
  pollingInterval: number;
  /** Maximum events to fetch per poll */
  batchSize: number;
  /** Maximum events to store in queue */
  maxQueueSize: number;
  /** Event processing concurrency */
  processingConcurrency: number;
  /** Event processing timeout in milliseconds */
  processingTimeout: number;
  /** Maximum retry attempts for failed events */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Event types to filter (empty array means all types) */
  eventTypes: string[];
}

/**
 * Webhook system configuration
 */
export interface WebhookSystemConfig {
  /** Enable webhook delivery */
  enabled: boolean;
  /** Maximum webhook delivery attempts */
  maxAttempts: number;
  /** Webhook delivery timeout in milliseconds */
  deliveryTimeout: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Maximum retry delay in milliseconds */
  maxRetryDelay: number;
  /** Enable webhook signature validation */
  validateSignatures: boolean;
  /** Webhook secret for signature validation */
  secret?: string;
}

export interface ApiClientConfig {
  /** User agent string for requests */
  userAgent: string;
  /** Default headers to include in requests */
  defaultHeaders: Record<string, string>;
  /** Enable request/response logging */
  enableLogging: boolean;
  /** Enable metrics collection */
  enableMetrics: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Omit<WebsetsConfig, 'apiKey'> = {
  baseUrl: 'https://api.exa.ai/websets/v0',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  maxRetryDelay: 10000, // 10 seconds
  rateLimit: 10, // 10 requests per second
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000, // 1 minute
  events: {
    enabled: false, // Disabled by default
    pollingInterval: 5000, // 5 seconds
    batchSize: 50,
    maxQueueSize: 10000,
    processingConcurrency: 10,
    processingTimeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    eventTypes: [], // All event types
  },
  webhooks: {
    enabled: false, // Disabled by default
    maxAttempts: 3,
    deliveryTimeout: 30000, // 30 seconds
    retryDelay: 1000, // 1 second
    maxRetryDelay: 10000, // 10 seconds
    validateSignatures: true,
  },
};

const DEFAULT_CLIENT_CONFIG: ApiClientConfig = {
  userAgent: 'exa-mcp-server-websets/0.3.10',
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  enableLogging: process.env.NODE_ENV !== 'production',
  enableMetrics: false,
};

/**
 * Create Websets configuration from environment variables
 */
export function createWebsetsConfig(): WebsetsConfig {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY environment variable is required');
  }

  return {
    apiKey,
    baseUrl: process.env.WEBSETS_BASE_URL || DEFAULT_CONFIG.baseUrl,
    timeout: parseInt(process.env.WEBSETS_TIMEOUT || String(DEFAULT_CONFIG.timeout), 10),
    retryAttempts: parseInt(process.env.WEBSETS_RETRY_ATTEMPTS || String(DEFAULT_CONFIG.retryAttempts), 10),
    retryDelay: parseInt(process.env.WEBSETS_RETRY_DELAY || String(DEFAULT_CONFIG.retryDelay), 10),
    maxRetryDelay: parseInt(process.env.WEBSETS_MAX_RETRY_DELAY || String(DEFAULT_CONFIG.maxRetryDelay), 10),
    rateLimit: parseInt(process.env.WEBSETS_RATE_LIMIT || String(DEFAULT_CONFIG.rateLimit), 10),
    circuitBreakerThreshold: parseInt(process.env.WEBSETS_CIRCUIT_BREAKER_THRESHOLD || String(DEFAULT_CONFIG.circuitBreakerThreshold), 10),
    circuitBreakerTimeout: parseInt(process.env.WEBSETS_CIRCUIT_BREAKER_TIMEOUT || String(DEFAULT_CONFIG.circuitBreakerTimeout), 10),
    events: {
      enabled: process.env.WEBSETS_EVENTS_ENABLED === 'true' || DEFAULT_CONFIG.events!.enabled,
      pollingInterval: parseInt(process.env.WEBSETS_EVENTS_POLLING_INTERVAL || String(DEFAULT_CONFIG.events!.pollingInterval), 10),
      batchSize: parseInt(process.env.WEBSETS_EVENTS_BATCH_SIZE || String(DEFAULT_CONFIG.events!.batchSize), 10),
      maxQueueSize: parseInt(process.env.WEBSETS_EVENTS_MAX_QUEUE_SIZE || String(DEFAULT_CONFIG.events!.maxQueueSize), 10),
      processingConcurrency: parseInt(process.env.WEBSETS_EVENTS_PROCESSING_CONCURRENCY || String(DEFAULT_CONFIG.events!.processingConcurrency), 10),
      processingTimeout: parseInt(process.env.WEBSETS_EVENTS_PROCESSING_TIMEOUT || String(DEFAULT_CONFIG.events!.processingTimeout), 10),
      maxRetries: parseInt(process.env.WEBSETS_EVENTS_MAX_RETRIES || String(DEFAULT_CONFIG.events!.maxRetries), 10),
      retryDelay: parseInt(process.env.WEBSETS_EVENTS_RETRY_DELAY || String(DEFAULT_CONFIG.events!.retryDelay), 10),
      eventTypes: process.env.WEBSETS_EVENTS_TYPES ? process.env.WEBSETS_EVENTS_TYPES.split(',').map(t => t.trim()) : DEFAULT_CONFIG.events!.eventTypes,
    },
    webhooks: {
      enabled: process.env.WEBSETS_WEBHOOKS_ENABLED === 'true' || DEFAULT_CONFIG.webhooks!.enabled,
      maxAttempts: parseInt(process.env.WEBSETS_WEBHOOKS_MAX_ATTEMPTS || String(DEFAULT_CONFIG.webhooks!.maxAttempts), 10),
      deliveryTimeout: parseInt(process.env.WEBSETS_WEBHOOKS_DELIVERY_TIMEOUT || String(DEFAULT_CONFIG.webhooks!.deliveryTimeout), 10),
      retryDelay: parseInt(process.env.WEBSETS_WEBHOOKS_RETRY_DELAY || String(DEFAULT_CONFIG.webhooks!.retryDelay), 10),
      maxRetryDelay: parseInt(process.env.WEBSETS_WEBHOOKS_MAX_RETRY_DELAY || String(DEFAULT_CONFIG.webhooks!.maxRetryDelay), 10),
      validateSignatures: process.env.WEBSETS_WEBHOOKS_VALIDATE_SIGNATURES !== 'false' && DEFAULT_CONFIG.webhooks!.validateSignatures,
      secret: process.env.WEBSETS_WEBHOOKS_SECRET,
    },
  };
}

/**
 * Create API client configuration
 */
export function createApiClientConfig(): ApiClientConfig {
  return {
    userAgent: process.env.WEBSETS_USER_AGENT || DEFAULT_CLIENT_CONFIG.userAgent,
    defaultHeaders: {
      ...DEFAULT_CLIENT_CONFIG.defaultHeaders,
      ...(process.env.WEBSETS_EXTRA_HEADERS ? JSON.parse(process.env.WEBSETS_EXTRA_HEADERS) : {}),
    },
    enableLogging: process.env.WEBSETS_ENABLE_LOGGING === 'true' || DEFAULT_CLIENT_CONFIG.enableLogging,
    enableMetrics: process.env.WEBSETS_ENABLE_METRICS === 'true' || DEFAULT_CLIENT_CONFIG.enableMetrics,
  };
}

/**
 * Validate configuration values
 */
export function validateConfig(config: WebsetsConfig): void {
  if (!config.apiKey) {
    throw new Error('API key is required');
  }

  if (!config.baseUrl || !isValidUrl(config.baseUrl)) {
    throw new Error('Valid base URL is required');
  }

  if (config.timeout <= 0) {
    throw new Error('Timeout must be positive');
  }

  if (config.retryAttempts < 0) {
    throw new Error('Retry attempts must be non-negative');
  }

  if (config.retryDelay <= 0) {
    throw new Error('Retry delay must be positive');
  }

  if (config.maxRetryDelay <= config.retryDelay) {
    throw new Error('Max retry delay must be greater than retry delay');
  }

  if (config.rateLimit <= 0) {
    throw new Error('Rate limit must be positive');
  }

  if (config.circuitBreakerThreshold <= 0) {
    throw new Error('Circuit breaker threshold must be positive');
  }

  if (config.circuitBreakerTimeout <= 0) {
    throw new Error('Circuit breaker timeout must be positive');
  }

  // Validate event system configuration
  if (config.events) {
    if (config.events.pollingInterval <= 0) {
      throw new Error('Event polling interval must be positive');
    }

    if (config.events.batchSize <= 0) {
      throw new Error('Event batch size must be positive');
    }

    if (config.events.maxQueueSize <= 0) {
      throw new Error('Event max queue size must be positive');
    }

    if (config.events.processingConcurrency <= 0) {
      throw new Error('Event processing concurrency must be positive');
    }

    if (config.events.processingTimeout <= 0) {
      throw new Error('Event processing timeout must be positive');
    }

    if (config.events.maxRetries < 0) {
      throw new Error('Event max retries must be non-negative');
    }

    if (config.events.retryDelay <= 0) {
      throw new Error('Event retry delay must be positive');
    }
  }

  // Validate webhook system configuration
  if (config.webhooks) {
    if (config.webhooks.maxAttempts <= 0) {
      throw new Error('Webhook max attempts must be positive');
    }

    if (config.webhooks.deliveryTimeout <= 0) {
      throw new Error('Webhook delivery timeout must be positive');
    }

    if (config.webhooks.retryDelay <= 0) {
      throw new Error('Webhook retry delay must be positive');
    }

    if (config.webhooks.maxRetryDelay <= config.webhooks.retryDelay) {
      throw new Error('Webhook max retry delay must be greater than retry delay');
    }
  }
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}