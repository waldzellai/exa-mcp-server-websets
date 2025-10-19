import crypto from 'crypto';

export interface TokenProvider {
  getToken(): string;
}

export class SecureTokenProvider implements TokenProvider {
  private readonly tokenGetter: () => string;

  constructor(tokenGetter: () => string) {
    this.tokenGetter = tokenGetter;
  }

  getToken(): string {
    const token = this.tokenGetter();
    if (!token) {
      throw new Error('API token not configured');
    }
    return token;
  }
}

export function createHmacSignature(payload: string | Buffer, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

export function verifyHmacSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmacSignature(payload, secret);
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface WebhookHeaders {
  'X-Webhook-Signature': string;
  'X-Webhook-Timestamp': string;
  'X-Webhook-ID': string;
}

export function createWebhookHeaders(
  payload: string,
  secret: string,
  webhookId: string
): WebhookHeaders {
  const timestamp = Date.now().toString();
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = createHmacSignature(signaturePayload, secret);

  return {
    'X-Webhook-Signature': `sha256=${signature}`,
    'X-Webhook-Timestamp': timestamp,
    'X-Webhook-ID': webhookId
  };
}

export function verifyWebhookRequest(
  payload: string,
  headers: Partial<WebhookHeaders>,
  secret: string,
  maxAgeMs = 300000 // 5 minutes
): boolean {
  const signature = headers['X-Webhook-Signature'];
  const timestamp = headers['X-Webhook-Timestamp'];

  if (!signature || !timestamp) {
    return false;
  }

  // Check timestamp to prevent replay attacks
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  
  if (isNaN(requestTime) || currentTime - requestTime > maxAgeMs) {
    return false;
  }

  // Verify signature
  const expectedSignature = signature.replace('sha256=', '');
  const signaturePayload = `${timestamp}.${payload}`;
  
  return verifyHmacSignature(signaturePayload, expectedSignature, secret);
}

// Mask sensitive data in logs
export function maskSensitiveData(data: unknown): unknown {
  if (typeof data === 'string') {
    // Mask API keys and tokens
    return data.replace(/(api[_-]?key|token|secret|password)(["\s:=]+)([^"\s]+)/gi, '$1$2***MASKED***');
  }
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  
  if (data && typeof data === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (/api[_-]?key|token|secret|password/i.test(key)) {
        masked[key] = '***MASKED***';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  
  return data;
}

/**
 * Exa Webhook Signature Verification
 * Format: Exa-Signature: t=TIMESTAMP,v1=SIG1,v1=SIG2,...
 */

/**
 * Parsed Exa webhook signature header
 */
export interface ParsedExaSignature {
  /** Unix timestamp in seconds */
  t: number;
  /** Array of signature strings */
  sigs: string[];
}

/**
 * Signature verification result
 */
export type ExaVerificationResult = 
  | { ok: true; timestamp: number }
  | { ok: false; error: string };

/**
 * Parse Exa-Signature header
 * Format: t=TIMESTAMP,v1=SIG1,v1=SIG2,...
 */
export function parseExaSignature(header: string): ParsedExaSignature | null {
  if (!header) {
    return null;
  }

  const parts = header.split(',');
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=', 2);
    if (!key || !value) continue;

    if (key === 't') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        timestamp = parsed;
      }
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (timestamp === null || signatures.length === 0) {
    return null;
  }

  return { t: timestamp, sigs: signatures };
}

/**
 * Compute HMAC-SHA256 signature for Exa webhook
 * Payload format: "${timestamp}.${rawBody}"
 */
export function computeExaSignature(secret: string, timestamp: number, rawBody: Buffer | string): string {
  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  return crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Timing-safe string comparison for hex strings
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  // Ensure both strings are converted to buffers of equal length
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');

  // If lengths differ, comparison fails (but still use timing-safe)
  if (bufA.length !== bufB.length) {
    // Create dummy buffers of same length to maintain constant time
    const maxLen = Math.max(bufA.length, bufB.length);
    const dummyA = Buffer.alloc(maxLen);
    const dummyB = Buffer.alloc(maxLen);
    bufA.copy(dummyA);
    bufB.copy(dummyB);
    try {
      crypto.timingSafeEqual(dummyA, dummyB);
    } catch {
      // Expected to throw, but maintains timing
    }
    return false;
  }

  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verify Exa webhook signature
 * 
 * @param params Verification parameters
 * @returns Verification result with timestamp or error
 */
export function verifyExaSignature(params: {
  header: string;
  secret: string;
  rawBody: Buffer;
  maxSkewSec: number;
}): ExaVerificationResult {
  const { header, secret, rawBody, maxSkewSec } = params;

  // Parse signature header
  const parsed = parseExaSignature(header);
  if (!parsed) {
    return { ok: false, error: 'invalid_signature_format' };
  }

  // Check timestamp skew
  const now = Math.floor(Date.now() / 1000);
  const skew = Math.abs(now - parsed.t);
  if (skew > maxSkewSec) {
    return { ok: false, error: `timestamp_skew_${skew}s` };
  }

  // Compute expected signature
  const expected = computeExaSignature(secret, parsed.t, rawBody);

  // Check if any provided signature matches (timing-safe)
  for (const sig of parsed.sigs) {
    if (timingSafeEqualHex(expected, sig)) {
      return { ok: true, timestamp: parsed.t };
    }
  }

  return { ok: false, error: 'signature_mismatch' };
}
