/**
 * Search Service
 * 
 * Service for managing webset searches - creation, monitoring, and cancellation.
 */

import { BaseService } from './BaseService.js';
import { 
  WebsetSearch, 
  CreateSearchRequest,
  SearchEntity,
  SearchCriteria 
} from '../types/websets.js';

export class SearchService extends BaseService {
  /**
   * Create a new search for a webset
   */
  async createSearch(request: CreateSearchRequest): Promise<WebsetSearch> {
    this.validateRequired({ websetId: request.websetId, query: request.query }, ['websetId', 'query']);
    this.validateCreateSearchRequest(request);
    this.logOperation('createSearch', { websetId: request.websetId, query: request.query, count: request.count });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/searches', { websetId: request.websetId });
    const sanitizedRequest = this.sanitizeParams({
      behavior: "override", // Required by API - default behavior to reuse existing items
      query: request.query,
      entity: request.entity,
      criteria: request.criteria,
      count: request.count || 10, // Default count if not provided
      metadata: request.metadata,
    });
    
    return this.handlePostRequest<WebsetSearch>(endpoint, sanitizedRequest);
  }

  /**
   * Get a search by ID
   */
  async getSearch(websetId: string, searchId: string): Promise<WebsetSearch> {
    this.validateRequired({ websetId, searchId }, ['websetId', 'searchId']);
    this.logOperation('getSearch', { websetId, searchId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/searches/{searchId}', { 
      websetId, 
      searchId 
    });
    
    return this.handleGetRequest<WebsetSearch>(endpoint);
  }

  /**
   * Cancel a running search
   */
  async cancelSearch(websetId: string, searchId: string): Promise<WebsetSearch> {
    this.validateRequired({ websetId, searchId }, ['websetId', 'searchId']);
    this.logOperation('cancelSearch', { websetId, searchId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/searches/{searchId}/cancel', { 
      websetId, 
      searchId 
    });
    
    return this.handlePostRequest<WebsetSearch>(endpoint);
  }

  /**
   * Get search status with polling support
   */
  async getSearchStatus(websetId: string, searchId: string, pollUntilComplete: boolean = false): Promise<WebsetSearch> {
    this.validateRequired({ websetId, searchId }, ['websetId', 'searchId']);
    this.logOperation('getSearchStatus', { websetId, searchId, pollUntilComplete });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/searches/{searchId}', { 
      websetId, 
      searchId 
    });
    
    if (!pollUntilComplete) {
      return this.handleGetRequest<WebsetSearch>(endpoint);
    }
    
    // Poll until search is complete
    return this.pollForCompletion<WebsetSearch>(
      endpoint,
      (search) => this.isSearchComplete(search),
      60, // max 60 attempts (5 minutes at 5s intervals)
      5000 // check every 5 seconds
    );
  }

  /**
   * Wait for search to complete with timeout
   */
  async waitForSearchCompletion(websetId: string, searchId: string, timeoutMs: number = 300000): Promise<WebsetSearch> {
    this.validateRequired({ websetId, searchId }, ['websetId', 'searchId']);
    this.logOperation('waitForSearchCompletion', { websetId, searchId, timeoutMs });
    
    const startTime = Date.now();
    const maxAttempts = Math.ceil(timeoutMs / 5000);
    
    return this.pollForCompletion<WebsetSearch>(
      this.buildEndpoint('/websets/{websetId}/searches/{searchId}', { websetId, searchId }),
      (search) => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) {
          throw new Error(`Search completion timeout after ${timeoutMs}ms`);
        }
        return this.isSearchComplete(search);
      },
      maxAttempts,
      5000
    );
  }

  /**
   * Check if search is complete
   */
  isSearchComplete(search: WebsetSearch): boolean {
    return search.status === 'completed' || search.status === 'canceled';
  }

  /**
   * Check if search is running
   */
  isSearchRunning(search: WebsetSearch): boolean {
    return search.status === 'running';
  }

  /**
   * Check if search was canceled
   */
  isSearchCanceled(search: WebsetSearch): boolean {
    return search.status === 'canceled';
  }

  /**
   * Get search progress percentage
   */
  getSearchProgress(search: WebsetSearch): number {
    return search.progress?.completion || 0;
  }

  /**
   * Get search results count
   */
  getSearchResultsCount(search: WebsetSearch): number {
    return search.progress?.found || 0;
  }

  /**
   * Create a company search
   */
  async createCompanySearch(
    websetId: string, 
    query: string, 
    count: number = 10,
    criteria?: string[],
    metadata?: Record<string, string>
  ): Promise<WebsetSearch> {
    const searchCriteria: SearchCriteria[] = criteria?.map(desc => ({
      description: desc,
      successRate: 0 // Will be updated by API
    })) || [];

    return this.createSearch({
      websetId,
      query,
      entity: { type: 'company' },
      criteria: searchCriteria,
      count,
      metadata,
    });
  }

  /**
   * Create a person search
   */
  async createPersonSearch(
    websetId: string, 
    query: string, 
    count: number = 10,
    criteria?: string[],
    metadata?: Record<string, string>
  ): Promise<WebsetSearch> {
    const searchCriteria: SearchCriteria[] = criteria?.map(desc => ({
      description: desc,
      successRate: 0
    })) || [];

    return this.createSearch({
      websetId,
      query,
      entity: { type: 'person' },
      criteria: searchCriteria,
      count,
      metadata,
    });
  }

  /**
   * Create a research paper search
   */
  async createResearchPaperSearch(
    websetId: string, 
    query: string, 
    count: number = 10,
    criteria?: string[],
    metadata?: Record<string, string>
  ): Promise<WebsetSearch> {
    const searchCriteria: SearchCriteria[] = criteria?.map(desc => ({
      description: desc,
      successRate: 0
    })) || [];

    return this.createSearch({
      websetId,
      query,
      entity: { type: 'research_paper' },
      criteria: searchCriteria,
      count,
      metadata,
    });
  }

  /**
   * Create a general search
   */
  async createGeneralSearch(
    websetId: string, 
    query: string, 
    count: number = 10,
    criteria?: string[],
    metadata?: Record<string, string>
  ): Promise<WebsetSearch> {
    const searchCriteria: SearchCriteria[] = criteria?.map(desc => ({
      description: desc,
      successRate: 0
    })) || [];

    return this.createSearch({
      websetId,
      query,
      entity: { type: 'general' },
      criteria: searchCriteria,
      count,
      metadata,
    });
  }

  /**
   * Validate search creation request
   */
  private validateCreateSearchRequest(request: CreateSearchRequest): void {
    // Validate query
    if (!request.query || typeof request.query !== 'string' || request.query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    if (request.query.length > 5000) {
      throw new Error('Query must be less than 5000 characters');
    }

    // Validate count
    if (request.count !== undefined) {
      if (typeof request.count !== 'number' || request.count < 1 || request.count > 1000) {
        throw new Error('Count must be a number between 1 and 1000');
      }
    }

    // Validate entity
    if (request.entity) {
      const validEntityTypes = ['company', 'person', 'research_paper', 'general'];
      if (!validEntityTypes.includes(request.entity.type)) {
        throw new Error(`Entity type must be one of: ${validEntityTypes.join(', ')}`);
      }
    }

    // Validate criteria
    if (request.criteria) {
      if (!Array.isArray(request.criteria)) {
        throw new Error('Criteria must be an array');
      }

      for (const criterion of request.criteria) {
        if (!criterion.description || typeof criterion.description !== 'string') {
          throw new Error('Each criterion must have a description string');
        }
        if (criterion.description.length > 1000) {
          throw new Error('Criterion description must be less than 1000 characters');
        }
      }
    }

    // Validate metadata
    if (request.metadata) {
      if (typeof request.metadata !== 'object') {
        throw new Error('Metadata must be an object');
      }

      for (const [key, value] of Object.entries(request.metadata)) {
        if (typeof value !== 'string') {
          throw new Error(`Metadata value for key '${key}' must be a string`);
        }
        if (value.length > 1000) {
          throw new Error(`Metadata value for key '${key}' must be less than 1000 characters`);
        }
      }
    }
  }
}