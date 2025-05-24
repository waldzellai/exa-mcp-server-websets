/**
 * Websets SDK Main Export
 * 
 * Main entry point for the Websets API SDK with all components.
 */

// Core API Client
export { WebsetsApiClient } from '../api/WebsetsApiClient.js';

// Services
export {
  WebsetService,
  SearchService,
  ItemService,
  EnrichmentService,
  createServices,
  createServiceContainer
} from '../services/index.js';

export type { ServiceContainer } from '../services/index.js';

// Import for internal use
import { createServices, type ServiceContainer } from '../services/index.js';

// Configuration
export {
  type WebsetsConfig,
  type ApiClientConfig
} from '../config/websets.js';

// Types
export * from '../types/websets.js';

// Utilities
export { ApiErrorHandler } from '../api/ErrorHandler.js';
export { RateLimiter, CircuitBreaker } from '../api/RateLimiter.js';

/**
 * Main SDK class that provides a unified interface to all Websets functionality
 */
export class WebsetsSDK {
  private services: ServiceContainer;

  constructor(apiKey: string, baseUrl?: string) {
    this.services = createServices(apiKey, baseUrl);
  }

  /**
   * Get the webset service
   */
  get websets() {
    return this.services.websetService;
  }

  /**
   * Get the search service
   */
  get searches() {
    return this.services.searchService;
  }

  /**
   * Get the item service
   */
  get items() {
    return this.services.itemService;
  }

  /**
   * Get the enrichment service
   */
  get enrichments() {
    return this.services.enrichmentService;
  }
/**
 * Create a new webset
 */
async createWebset(params: {
  externalId?: string;
  metadata?: Record<string, string>;
}) {
  const webset = await this.websets.createWebset({
    externalId: params.externalId,
    metadata: params.metadata,
  });

  return webset;
}

/**
 * Create a search for a webset
 */
async createSearch(websetId: string, params: {
  query: string;
  count?: number;
  entityType?: 'company' | 'person' | 'research_paper' | 'general';
  criteria?: string[];
}) {
  return this.searches.createSearch({
    websetId,
    query: params.query,
    count: params.count || 10,
    entity: { type: params.entityType || 'company' },
    criteria: params.criteria?.map(description => ({ description, successRate: 0 })),
  });
}

/**
 * Create an enrichment for a webset
 */
async createEnrichment(websetId: string, params: {
  description: string;
  format: string;
  options?: string[];
}) {
  return this.enrichments.createEnrichment({
    websetId,
    description: params.description,
    format: params.format as any,
    options: params.options?.map(label => ({ label })),
  });
  }

  /**
   * Wait for webset completion and return results
   */
  async waitForWebsetCompletion(websetId: string, timeoutMs: number = 600000) {
    return this.websets.getWebsetStatus(websetId, true);
  }

  /**
   * Get all items for a webset
   */
  async getWebsetItems(websetId: string) {
    return this.items.getAllItems(websetId);
  }

  /**
   * Export webset data
   */
  async exportWebsetData(websetId: string, format: 'json' | 'csv' = 'json') {
    if (format === 'csv') {
      return this.items.exportItemsToCsv(websetId);
    }
    return this.items.exportItemsToJson(websetId);
  }
}

/**
 * Create a new Websets SDK instance
 */
export function createWebsetsSDK(apiKey: string, baseUrl?: string): WebsetsSDK {
  return new WebsetsSDK(apiKey, baseUrl);
}