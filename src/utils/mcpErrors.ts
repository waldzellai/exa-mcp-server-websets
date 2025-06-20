/**
 * MCP Error Utilities
 * 
 * Provides utilities for handling errors in MCP tools with backward compatibility.
 * Supports both the new MCP error format and legacy error handling.
 */

import { z } from "zod";

/**
 * MCP Error codes based on JSON-RPC 2.0 standards
 */
export enum MCPErrorCode {
  // Standard JSON-RPC errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // MCP-specific errors
  RESOURCE_NOT_FOUND = -32001,
  RESOURCE_UNAVAILABLE = -32002,
  PERMISSION_DENIED = -32003,
  RATE_LIMITED = -32004,
  INVALID_API_KEY = -32005,
  OPERATION_FAILED = -32006
}

/**
 * MCP Error class that supports both legacy and new error formats
 */
export class MCPError extends Error {
  public readonly code: number;
  public readonly data?: unknown;
  
  constructor(message: string, code: number = MCPErrorCode.INTERNAL_ERROR, data?: unknown) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.data = data;
  }
  
  /**
   * Convert to MCP-compliant error format
   */
  toMCPFormat() {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
  
  /**
   * Convert to legacy error format for backward compatibility
   */
  toLegacyFormat() {
    return {
      error: this.message,
      details: this.data
    };
  }
}

/**
 * Helper function to create standardized errors
 */
export function createMCPError(
  message: string,
  code: MCPErrorCode = MCPErrorCode.INTERNAL_ERROR,
  data?: unknown
): MCPError {
  return new MCPError(message, code, data);
}

/**
 * Helper to handle API key errors
 */
export function createAPIKeyError(): MCPError {
  return new MCPError(
    "EXA_API_KEY environment variable is not set",
    MCPErrorCode.INVALID_API_KEY,
    {
      help: "Please set the EXA_API_KEY environment variable with your Exa API key"
    }
  );
}

/**
 * Helper to handle rate limit errors
 */
export function createRateLimitError(retryAfter?: number): MCPError {
  return new MCPError(
    "Rate limit exceeded",
    MCPErrorCode.RATE_LIMITED,
    {
      retryAfter,
      help: "Please wait before making additional requests"
    }
  );
}

/**
 * Helper to handle validation errors
 */
export function createValidationError(errors: z.ZodError): MCPError {
  return new MCPError(
    "Invalid parameters provided",
    MCPErrorCode.INVALID_PARAMS,
    {
      errors: errors.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    }
  );
}

/**
 * Helper to handle resource not found errors
 */
export function createNotFoundError(resource: string, id: string): MCPError {
  return new MCPError(
    `${resource} not found`,
    MCPErrorCode.RESOURCE_NOT_FOUND,
    { resource, id }
  );
}

/**
 * Wrap error handler to support both formats based on feature flag
 */
export function handleToolError(error: unknown, useNewFormat: boolean = false): any {
  // If it's already an MCPError, return in appropriate format
  if (error instanceof MCPError) {
    return useNewFormat ? error.toMCPFormat() : error.toLegacyFormat();
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    const mcpError = new MCPError(error.message);
    return useNewFormat ? mcpError.toMCPFormat() : mcpError.toLegacyFormat();
  }
  
  // Handle unknown errors
  const mcpError = new MCPError('An unknown error occurred');
  return useNewFormat ? mcpError.toMCPFormat() : mcpError.toLegacyFormat();
}

/**
 * Feature flag helper to check if new error format should be used
 */
export function shouldUseNewErrorFormat(): boolean {
  // Check environment variable directly to avoid circular dependency
  return process.env.MCP_FEATURE_ENHANCED_ERRORS === 'true';
}