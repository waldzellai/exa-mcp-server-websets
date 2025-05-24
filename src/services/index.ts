/**
 * Services Index
 * 
 * Centralized exports for all service classes.
 */

export { BaseService } from './BaseService.js';
export { WebsetService } from './WebsetService.js';
export { SearchService } from './SearchService.js';
export { ItemService } from './ItemService.js';
export { EnrichmentService } from './EnrichmentService.js';
export { EventService } from './EventService.js';
export { WebhookService } from './WebhookService.js';

// Service factory for creating configured service instances
import { WebsetsApiClient } from '../api/WebsetsApiClient.js';
import { WebsetsConfig } from '../config/websets.js';
import { WebsetService } from './WebsetService.js';
import { SearchService } from './SearchService.js';
import { ItemService } from './ItemService.js';
import { EnrichmentService } from './EnrichmentService.js';
import { EventService } from './EventService.js';
import { WebhookService } from './WebhookService.js';
import { SecureTokenProvider } from '../utils/security.js';

export interface ServiceContainer {
  websetService: WebsetService;
  searchService: SearchService;
  itemService: ItemService;
  enrichmentService: EnrichmentService;
  eventService: EventService;
  webhookService: WebhookService;
}

/**
 * Create a container with all configured services
 */
export function createServiceContainer(apiClient: WebsetsApiClient): ServiceContainer {
  return {
    websetService: new WebsetService(apiClient),
    searchService: new SearchService(apiClient),
    itemService: new ItemService(apiClient),
    enrichmentService: new EnrichmentService(apiClient),
    eventService: new EventService(apiClient),
    webhookService: new WebhookService(apiClient),
  };
}

/**
 /**
  * Service factory with default configuration
  */
 export function createServices(apiKey: string, baseUrl?: string): ServiceContainer {
   const config: WebsetsConfig = {
     apiKey,
     baseUrl: baseUrl || 'https://api.exa.ai',
     timeout: 30000,
     retryAttempts: 3,
     retryDelay: 1000,
     maxRetryDelay: 10000,
     rateLimit: 10,
     circuitBreakerThreshold: 5,
     circuitBreakerTimeout: 60000,
   };
   
   const clientConfig = {
     userAgent: 'exa-mcp-server-websets/1.0.0',
     defaultHeaders: {
       'Content-Type': 'application/json',
       'Accept': 'application/json',
     },
     enableLogging: process.env.NODE_ENV !== 'production',
     enableMetrics: false,
   };
   
   const tokenProvider = new SecureTokenProvider(() => config.apiKey);
   const apiClient = new WebsetsApiClient(config, clientConfig, tokenProvider);
   return createServiceContainer(apiClient);
 }