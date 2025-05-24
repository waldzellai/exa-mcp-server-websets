/**
 * Webhook Validator Implementation
 * 
 * Provides webhook signature verification using HMAC-SHA256 and other
 * validation utilities for webhook security and integrity.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Webhook validation configuration
 */
export interface WebhookValidatorConfig {
  /** Default signature algorithm */
  defaultAlgorithm: string;
  /** Maximum timestamp tolerance in seconds */
  timestampTolerance: number;
  /** Whether to require timestamp validation */
  requireTimestamp: boolean;
  /** Whether to log validation attempts */
  enableLogging: boolean;
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  /** Whether validation was successful */
  valid: boolean;
  /** Validation error message if failed */
  error?: string;
  /** Validation details */
  details?: {
    signatureValid?: boolean;
    timestampValid?: boolean;
    algorithm?: string;
    timestamp?: number;
  };
}

/**
 * Webhook signature components
 */
export interface WebhookSignature {
  /** Signature algorithm (e.g., 'sha256') */
  algorithm: string;
  /** Signature value */
  signature: string;
  /** Raw signature header value */
  raw: string;
}

/**
 * Default webhook validator configuration
 */
const DEFAULT_WEBHOOK_VALIDATOR_CONFIG: WebhookValidatorConfig = {
  defaultAlgorithm: 'sha256',
  timestampTolerance: 300, // 5 minutes
  requireTimestamp: true,
  enableLogging: false,
};

/**
 * Webhook validator for signature verification and security validation
 */
export class WebhookValidator {
  private readonly config: WebhookValidatorConfig;

  constructor(config: Partial<WebhookValidatorConfig> = {}) {
    this.config = { ...DEFAULT_WEBHOOK_VALIDATOR_CONFIG, ...config };
  }

  /**
   * Validate a webhook request
   * @param payload The raw webhook payload
   * @param signature The signature header value
   * @param secret The webhook secret
   * @param timestamp Optional timestamp for replay protection
   * @returns Validation result
   */
  validateWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string,
    timestamp?: string | number
  ): WebhookValidationResult {
    try {
      // Parse signature
      const parsedSignature = this.parseSignature(signature);
      if (!parsedSignature) {
        return {
          valid: false,
          error: 'Invalid signature format',
        };
      }

      // Validate timestamp if required
      let timestampValid = true;
      let parsedTimestamp: number | undefined;
      
      if (this.config.requireTimestamp && timestamp) {
        const timestampResult = this.validateTimestamp(timestamp);
        timestampValid = timestampResult.valid;
        parsedTimestamp = timestampResult.timestamp;
        
        if (!timestampValid) {
          return {
            valid: false,
            error: timestampResult.error,
            details: {
              signatureValid: false,
              timestampValid: false,
              algorithm: parsedSignature.algorithm,
              timestamp: parsedTimestamp,
            },
          };
        }
      }

      // Validate signature
      const signatureValid = this.verifySignature(
        payload,
        parsedSignature,
        secret,
        parsedTimestamp
      );

      const result: WebhookValidationResult = {
        valid: signatureValid && timestampValid,
        details: {
          signatureValid,
          timestampValid,
          algorithm: parsedSignature.algorithm,
          timestamp: parsedTimestamp,
        },
      };

      if (!result.valid) {
        result.error = signatureValid ? 'Timestamp validation failed' : 'Signature validation failed';
      }

      if (this.config.enableLogging) {
        console.log('Webhook validation result:', result);
      }

      return result;

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  /**
   * Parse signature header
   * @param signature The signature header value
   * @returns Parsed signature components or null if invalid
   */
  private parseSignature(signature: string): WebhookSignature | null {
    if (!signature) {
      return null;
    }

    // Support multiple signature formats:
    // 1. "sha256=abc123..." (standard format)
    // 2. "v1=abc123..." (Stripe format)
    // 3. "t=timestamp,v1=signature" (Stripe format with timestamp)
    
    const parts = signature.split(',');
    let algorithm = this.config.defaultAlgorithm;
    let signatureValue = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=', 2);
      if (!key || !value) {
        continue;
      }
      
      if (key === 'sha256' || key === 'v1') {
        algorithm = key === 'v1' ? 'sha256' : key;
        signatureValue = value;
        break;
      }
    }
    
    if (!signatureValue) {
      // Try simple format: "abc123..." (assume default algorithm)
      if (signature.match(/^[a-fA-F0-9]+$/)) {
        signatureValue = signature;
      } else {
        return null;
      }
    }

    return {
      algorithm,
      signature: signatureValue,
      raw: signature,
    };
  }

  /**
   * Validate timestamp for replay protection
   * @param timestamp The timestamp to validate
   * @returns Validation result with parsed timestamp
   */
  private validateTimestamp(timestamp: string | number): {
    valid: boolean;
    timestamp?: number;
    error?: string;
  } {
    let parsedTimestamp: number;
    
    if (typeof timestamp === 'string') {
      parsedTimestamp = parseInt(timestamp, 10);
      if (isNaN(parsedTimestamp)) {
        return {
          valid: false,
          error: 'Invalid timestamp format',
        };
      }
    } else {
      parsedTimestamp = timestamp;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - parsedTimestamp);

    if (timeDiff > this.config.timestampTolerance) {
      return {
        valid: false,
        timestamp: parsedTimestamp,
        error: `Timestamp too old or too far in future (diff: ${timeDiff}s, tolerance: ${this.config.timestampTolerance}s)`,
      };
    }

    return {
      valid: true,
      timestamp: parsedTimestamp,
    };
  }

  /**
   * Verify webhook signature using HMAC
   * @param payload The webhook payload
   * @param signature The parsed signature
   * @param secret The webhook secret
   * @param timestamp Optional timestamp to include in signature
   * @returns True if signature is valid
   */
  private verifySignature(
    payload: string | Buffer,
    signature: WebhookSignature,
    secret: string,
    timestamp?: number
  ): boolean {
    try {
      // Prepare the data to sign
      let dataToSign: string;
      
      if (timestamp) {
        // Include timestamp in signature (Stripe-style)
        dataToSign = `${timestamp}.${payload}`;
      } else {
        // Simple payload signature
        dataToSign = typeof payload === 'string' ? payload : payload.toString();
      }

      // Generate expected signature
      const expectedSignature = this.generateSignature(dataToSign, secret, signature.algorithm);
      
      // Compare signatures using timing-safe comparison
      return this.compareSignatures(signature.signature, expectedSignature);

    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Signature verification error:', error);
      }
      return false;
    }
  }

  /**
   * Generate HMAC signature
   * @param data The data to sign
   * @param secret The secret key
   * @param algorithm The hash algorithm
   * @returns Generated signature
   */
  private generateSignature(data: string, secret: string, algorithm: string): string {
    const hmac = createHmac(algorithm, secret);
    hmac.update(data, 'utf8');
    return hmac.digest('hex');
  }

  /**
   * Compare two signatures using timing-safe comparison
   * @param signature1 First signature
   * @param signature2 Second signature
   * @returns True if signatures match
   */
  private compareSignatures(signature1: string, signature2: string): boolean {
    if (signature1.length !== signature2.length) {
      return false;
    }

    try {
      const buffer1 = Buffer.from(signature1, 'hex');
      const buffer2 = Buffer.from(signature2, 'hex');
      
      if (buffer1.length !== buffer2.length) {
        return false;
      }
      
      return timingSafeEqual(buffer1, buffer2);
    } catch (error) {
      // Fallback to string comparison if buffer conversion fails
      return signature1 === signature2;
    }
  }

  /**
   * Generate a webhook signature for outgoing webhooks
   * @param payload The payload to sign
   * @param secret The webhook secret
   * @param algorithm Optional algorithm (defaults to config default)
   * @param includeTimestamp Whether to include timestamp in signature
   * @returns Generated signature header value
   */
  generateWebhookSignature(
    payload: string | Buffer,
    secret: string,
    algorithm?: string,
    includeTimestamp: boolean = false
  ): string {
    const algo = algorithm || this.config.defaultAlgorithm;
    const timestamp = includeTimestamp ? Math.floor(Date.now() / 1000) : undefined;
    
    let dataToSign: string;
    if (timestamp) {
      dataToSign = `${timestamp}.${payload}`;
    } else {
      dataToSign = typeof payload === 'string' ? payload : payload.toString();
    }

    const signature = this.generateSignature(dataToSign, secret, algo);
    
    if (timestamp) {
      return `t=${timestamp},${algo}=${signature}`;
    } else {
      return `${algo}=${signature}`;
    }
  }

  /**
   * Extract timestamp from signature header (if present)
   * @param signature The signature header value
   * @returns Extracted timestamp or null
   */
  extractTimestamp(signature: string): number | null {
    const parts = signature.split(',');
    
    for (const part of parts) {
      const [key, value] = part.split('=', 2);
      if (key === 't' && value) {
        const timestamp = parseInt(value, 10);
        return isNaN(timestamp) ? null : timestamp;
      }
    }
    
    return null;
  }

  /**
   * Validate webhook URL format
   * @param url The webhook URL to validate
   * @returns Validation result
   */
  validateWebhookUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          valid: false,
          error: 'Webhook URL must use HTTP or HTTPS protocol',
        };
      }
      
      // Recommend HTTPS for production
      if (parsedUrl.protocol === 'http:' && this.config.enableLogging) {
        console.warn('Webhook URL uses HTTP instead of HTTPS - not recommended for production');
      }
      
      // Check for localhost/private IPs in production
      const hostname = parsedUrl.hostname.toLowerCase();
      const isLocalhost = hostname === 'localhost' || 
                         hostname === '127.0.0.1' || 
                         hostname.startsWith('192.168.') ||
                         hostname.startsWith('10.') ||
                         hostname.startsWith('172.');
      
      if (isLocalhost && this.config.enableLogging) {
        console.warn('Webhook URL points to localhost/private IP - may not be reachable');
      }
      
      return { valid: true };
      
    } catch (error) {
      return {
        valid: false,
        error: `Invalid webhook URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Create a test webhook payload for validation testing
   * @param eventType The event type
   * @param data Optional event data
   * @returns Test webhook payload
   */
  createTestPayload(eventType: string, data: any = {}): string {
    const payload = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: eventType,
      data,
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null,
      },
    };
    
    return JSON.stringify(payload);
  }

  /**
   * Update validator configuration
   * @param config Partial configuration to update
   */
  updateConfig(config: Partial<WebhookValidatorConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current validator configuration
   * @returns Current configuration
   */
  getConfig(): WebhookValidatorConfig {
    return { ...this.config };
  }
}

/**
 * Utility function to create a webhook validator with common configurations
 */
export function createWebhookValidator(
  options: {
    strict?: boolean;
    timestampTolerance?: number;
    enableLogging?: boolean;
  } = {}
): WebhookValidator {
  const config: Partial<WebhookValidatorConfig> = {
    enableLogging: options.enableLogging || false,
  };

  if (options.strict) {
    config.requireTimestamp = true;
    config.timestampTolerance = options.timestampTolerance || 60; // 1 minute for strict mode
  } else {
    config.requireTimestamp = false;
    config.timestampTolerance = options.timestampTolerance || 300; // 5 minutes for normal mode
  }

  return new WebhookValidator(config);
}