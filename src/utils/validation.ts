import { z } from 'zod';

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ParamValidator {
  static required<T>(params: Record<string, unknown>, name: string, schema: z.ZodSchema<T>): T {
    if (!(name in params) || params[name] === null || params[name] === undefined) {
      throw new ValidationError(
        `Missing required parameter: ${name}`,
        'MISSING_PARAMETER',
        { parameter: name }
      );
    }

    const result = schema.safeParse(params[name]);
    if (!result.success) {
      throw new ValidationError(
        `Invalid parameter ${name}: ${result.error.errors[0].message}`,
        'INVALID_PARAMETER',
        { parameter: name, value: params[name], errors: result.error.errors }
      );
    }

    return result.data;
  }

  static optional<T>(params: Record<string, unknown>, name: string, schema: z.ZodSchema<T>, defaultValue?: T): T | undefined {
    if (!(name in params) || params[name] === null || params[name] === undefined) {
      return defaultValue;
    }

    const result = schema.safeParse(params[name]);
    if (!result.success) {
      throw new ValidationError(
        `Invalid parameter ${name}: ${result.error.errors[0].message}`,
        'INVALID_PARAMETER',
        { parameter: name, value: params[name], errors: result.error.errors }
      );
    }

    return result.data;
  }
}

const SAFE_URL_PROTOCOLS = ['https:', 'http:'];
const DANGEROUS_PROTOCOLS = ['file:', 'javascript:', 'data:', 'vbscript:', 'about:', 'blob:'];

export function validateUrl(url: string, options: { allowHttp?: boolean } = {}): URL {
  let parsed: URL;
  
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new ValidationError(
      'Invalid URL format',
      'INVALID_URL',
      { url, error: error instanceof Error ? error.message : String(error) }
    );
  }

  const allowedProtocols = options.allowHttp ? SAFE_URL_PROTOCOLS : ['https:'];
  
  if (DANGEROUS_PROTOCOLS.includes(parsed.protocol)) {
    throw new ValidationError(
      `Dangerous URL protocol: ${parsed.protocol}`,
      'DANGEROUS_PROTOCOL',
      { url, protocol: parsed.protocol, dangerous: DANGEROUS_PROTOCOLS }
    );
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new ValidationError(
      `Unsupported URL protocol: ${parsed.protocol}`,
      'UNSUPPORTED_PROTOCOL',
      { url, protocol: parsed.protocol, allowed: allowedProtocols }
    );
  }

  // Additional security checks
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.startsWith('192.168.')) {
    throw new ValidationError(
      'URLs to local network addresses are not allowed',
      'LOCAL_ADDRESS',
      { url, hostname: parsed.hostname }
    );
  }

  return parsed;
}

export function sanitizeString(input: string, maxLength = 1000): string {
  // Basic XSS prevention - escape HTML entities
  const escaped = input
    .substring(0, maxLength)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Remove any control characters except newline and tab
  return escaped.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}