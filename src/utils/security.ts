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