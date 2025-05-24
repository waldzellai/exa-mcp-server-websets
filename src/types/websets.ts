/**
 * Websets API Type Definitions
 * 
 * Comprehensive TypeScript interfaces for all Websets API objects and operations.
 */

// ============================================================================
// Core API Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
}

// ============================================================================
// Webset Types
// ============================================================================

export interface Webset {
  id: string;
  object: "webset";
  status: "idle" | "running" | "paused";
  externalId?: string;
  searches: WebsetSearch[];
  enrichments: WebsetEnrichment[];
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebsetRequest {
  search?: {
    query: string;
    count?: number;
    entity?: {
      type: string;
    };
    criteria?: Array<{
      description: string;
    }>;
  };
  enrichments?: Array<{
    description: string;
    format?: string;
  }>;
  externalId?: string;
  metadata?: Record<string, string>;
}

export interface UpdateWebsetRequest {
  externalId?: string;
  metadata?: Record<string, string>;
}

// ============================================================================
// Search Types
// ============================================================================

export interface WebsetSearch {
  id: string;
  object: "webset_search";
  status: "created" | "running" | "completed" | "canceled";
  query: string;
  entity: SearchEntity;
  criteria: SearchCriteria[];
  count: number;
  progress: SearchProgress;
  metadata: Record<string, string>;
  canceledAt?: string;
  canceledReason?: "webset_deleted" | "webset_canceled";
  createdAt: string;
  updatedAt: string;
}

export interface SearchEntity {
  type: "company" | "person" | "research_paper" | "general";
}

export interface SearchCriteria {
  description: string;
  successRate: number; // 0-100
}

export interface SearchProgress {
  found: number;
  completion: number; // 0-100
}

export interface CreateSearchRequest {
  websetId: string;
  query: string;
  entity?: SearchEntity;
  criteria?: SearchCriteria[];
  count?: number;
  metadata?: Record<string, string>;
}

// ============================================================================
// Item Types
// ============================================================================

export interface WebsetItem {
  id: string;
  object: "webset_item";
  websetId: string;
  searchId: string;
  url: string;
  title: string;
  content: string;
  entity: ItemEntity;
  verification: ItemVerification;
  enrichments: Record<string, any>;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ItemEntity {
  type: string;
  properties: Record<string, any>;
}

export interface ItemVerification {
  status: "verified" | "unverified" | "rejected";
  reasoning: string;
  references: string[];
}

// ============================================================================
// Enrichment Types
// ============================================================================

export interface WebsetEnrichment {
  id: string;
  object: "webset_enrichment";
  status: "pending" | "canceled" | "completed";
  websetId: string;
  title?: string;
  description: string;
  format: "text" | "date" | "number" | "options" | "email" | "phone";
  options?: EnrichmentOption[];
  instructions?: string;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichmentOption {
  label: string;
}

export interface CreateEnrichmentRequest {
  websetId: string;
  description: string;
  format: string;
  options?: EnrichmentOption[];
  metadata?: Record<string, string>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface WebsetEvent {
  id: string;
  object: "event";
  type: EventType;
  data: any;
  createdAt: string;
}

export type EventType = 
  | "webset.created"
  | "webset.deleted" 
  | "webset.idle"
  | "webset.paused"
  | "webset.item.created"
  | "webset.item.enriched"
  | "webset.search.created"
  | "webset.search.updated"
  | "webset.search.canceled"
  | "webset.search.completed";

// ============================================================================
// Webhook Types
// ============================================================================

export interface Webhook {
  id: string;
  object: "webhook";
  status: "active" | "inactive";
  events: EventType[];
  url: string;
  secret?: string; // Only returned on creation
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookAttempt {
  id: string;
  object: "webhook_attempt";
  eventId: string;
  eventType: EventType;
  webhookId: string;
  url: string;
  successful: boolean;
  responseHeaders: Record<string, string>;
  responseBody: string;
  responseStatusCode: number;
  attempt: number;
  attemptedAt: string;
}

export interface CreateWebhookRequest {
  events: EventType[];
  url: string;
  metadata?: Record<string, string>;
}

export interface UpdateWebhookRequest {
  events?: EventType[];
  url?: string;
  metadata?: Record<string, string>;
}

// ============================================================================
// Error Classification
// ============================================================================

export enum ApiErrorType {
  AUTHENTICATION = "authentication_error",
  AUTHORIZATION = "authorization_error", 
  VALIDATION = "validation_error",
  NOT_FOUND = "not_found_error",
  RATE_LIMIT = "rate_limit_error",
  SERVER_ERROR = "server_error",
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error",
  CIRCUIT_BREAKER_OPEN = "circuit_breaker_open"
}

// ============================================================================
// HTTP Client Types
// ============================================================================

export interface HttpClientOptions {
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
}

export interface RequestOptions extends HttpClientOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  params?: Record<string, any>;
}

// ============================================================================
// Rate Limiter Types
// ============================================================================

export interface RateLimiterOptions {
  requestsPerSecond: number;
  burstSize?: number;
}

export interface RateLimitState {
  tokens: number;
  lastRefill: number;
}

// ============================================================================
// Circuit Breaker Types
// ============================================================================

export interface CircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  monitoringPeriod?: number;
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}