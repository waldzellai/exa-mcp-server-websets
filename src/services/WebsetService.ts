/**
 * Webset Service
 * 
 * Service for managing websets - creation, retrieval, updates, and deletion.
 */

import { BaseService } from './BaseService.js';
import { 
  Webset, 
  CreateWebsetRequest, 
  UpdateWebsetRequest,
  PaginatedResponse 
} from '../types/websets.js';

export class WebsetService extends BaseService {
  /**
   * Create a new webset
   */
  async createWebset(request: CreateWebsetRequest): Promise<Webset> {
    this.logOperation('createWebset', { externalId: request.externalId });
    
    const sanitizedRequest = this.sanitizeParams(request);
    return this.handlePostRequest<Webset>('/websets', sanitizedRequest);
  }

  /**
   * Get a webset by ID
   */
  async getWebset(websetId: string, expand?: string): Promise<Webset> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('getWebset', { websetId, expand });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}', { websetId });
    const params = expand ? { expand } : undefined;
    
    return this.handleGetRequest<Webset>(endpoint, params);
  }

  /**
   * List all websets with pagination
   */
  async listWebsets(cursor?: string, limit?: number): Promise<PaginatedResponse<Webset>> {
    this.logOperation('listWebsets', { cursor, limit });
    
    return this.handlePaginatedRequest<Webset>('/websets', {}, cursor, limit);
  }

  /**
   * Update a webset
   */
  async updateWebset(websetId: string, request: UpdateWebsetRequest): Promise<Webset> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('updateWebset', { websetId, ...request });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}', { websetId });
    const sanitizedRequest = this.sanitizeParams(request);
    
    return this.handlePostRequest<Webset>(endpoint, sanitizedRequest);
  }

  /**
   * Delete a webset
   */
  async deleteWebset(websetId: string): Promise<Webset> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('deleteWebset', { websetId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}', { websetId });
    return this.handleDeleteRequest<Webset>(endpoint);
  }

  /**
   * Cancel a running webset
   */
  async cancelWebset(websetId: string): Promise<Webset> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('cancelWebset', { websetId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/cancel', { websetId });
    return this.handlePostRequest<Webset>(endpoint);
  }

  /**
   * Get webset status with polling support
   */
  async getWebsetStatus(websetId: string, pollUntilComplete: boolean = false): Promise<Webset> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('getWebsetStatus', { websetId, pollUntilComplete });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}', { websetId });
    
    if (!pollUntilComplete) {
      return this.handleGetRequest<Webset>(endpoint);
    }
    
    // Poll until webset is no longer running
    return this.pollForCompletion<Webset>(
      endpoint,
      (webset) => webset.status !== 'running',
      30, // max 30 attempts
      5000 // check every 5 seconds
    );
  }

  /**
   * Check if webset is complete (not running)
   */
  isWebsetComplete(webset: Webset): boolean {
    return webset.status === 'idle' || webset.status === 'paused';
  }

  /**
   * Check if webset is running
   */
  isWebsetRunning(webset: Webset): boolean {
    return webset.status === 'running';
  }

  /**
   * Get webset progress summary
   */
  getWebsetProgress(webset: Webset): {
    totalSearches: number;
    completedSearches: number;
    totalEnrichments: number;
    completedEnrichments: number;
    overallProgress: number;
  } {
    const totalSearches = webset.searches.length;
    const completedSearches = webset.searches.filter(s => s.status === 'completed').length;
    
    const totalEnrichments = webset.enrichments.length;
    const completedEnrichments = webset.enrichments.filter(e => e.status === 'completed').length;
    
    const totalOperations = totalSearches + totalEnrichments;
    const completedOperations = completedSearches + completedEnrichments;
    
    const overallProgress = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0;
    
    return {
      totalSearches,
      completedSearches,
      totalEnrichments,
      completedEnrichments,
      overallProgress: Math.round(overallProgress),
    };
  }

  /**
   * Wait for webset to complete with timeout
   */
  async waitForCompletion(websetId: string, timeoutMs: number = 300000): Promise<Webset> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('waitForCompletion', { websetId, timeoutMs });
    
    const startTime = Date.now();
    const maxAttempts = Math.ceil(timeoutMs / 5000); // Check every 5 seconds
    
    return this.pollForCompletion<Webset>(
      this.buildEndpoint('/websets/{websetId}', { websetId }),
      (webset) => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) {
          throw new Error(`Webset completion timeout after ${timeoutMs}ms`);
        }
        return this.isWebsetComplete(webset);
      },
      maxAttempts,
      5000
    );
  }

  /**
   * Get websets by external ID
   */
  async getWebsetsByExternalId(externalId: string): Promise<Webset[]> {
    this.validateRequired({ externalId }, ['externalId']);
    this.logOperation('getWebsetsByExternalId', { externalId });
    
    // Note: This would require API support for filtering by external ID
    // For now, we'll list all websets and filter client-side
    const allWebsets = await this.listWebsets();
    return allWebsets.data.filter(webset => webset.externalId === externalId);
  }

  /**
   * Validate webset creation request
   */
  validateCreateRequest(request: CreateWebsetRequest): void {
    if (request.externalId && typeof request.externalId !== 'string') {
      throw new Error('externalId must be a string');
    }
    
    if (request.metadata && typeof request.metadata !== 'object') {
      throw new Error('metadata must be an object');
    }
    
    // Validate metadata values are strings
    if (request.metadata) {
      for (const [key, value] of Object.entries(request.metadata)) {
        if (typeof value !== 'string') {
          throw new Error(`metadata.${key} must be a string`);
        }
      }
    }
  }

  /**
   * Validate webset update request
   */
  validateUpdateRequest(request: UpdateWebsetRequest): void {
    this.validateCreateRequest(request); // Same validation rules
  }
}