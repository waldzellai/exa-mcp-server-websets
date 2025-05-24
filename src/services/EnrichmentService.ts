/**
 * Enrichment Service
 * 
 * Service for managing webset enrichments - creation, monitoring, and management.
 */

import { BaseService } from './BaseService.js';
import { 
  WebsetEnrichment, 
  CreateEnrichmentRequest,
  EnrichmentOption 
} from '../types/websets.js';

export class EnrichmentService extends BaseService {
  /**
   * Create a new enrichment for a webset
   */
  async createEnrichment(request: CreateEnrichmentRequest): Promise<WebsetEnrichment> {
    this.validateRequired({ websetId: request.websetId, description: request.description }, ['websetId', 'description']);
    this.validateCreateEnrichmentRequest(request);
    this.logOperation('createEnrichment', { websetId: request.websetId, format: request.format });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/enrichments', { websetId: request.websetId });
    const sanitizedRequest = this.sanitizeParams({
      description: request.description,
      format: request.format,
      options: request.options,
      metadata: request.metadata,
    });
    
    return this.handlePostRequest<WebsetEnrichment>(endpoint, sanitizedRequest);
  }

  /**
   * Get an enrichment by ID
   */
  async getEnrichment(websetId: string, enrichmentId: string): Promise<WebsetEnrichment> {
    this.validateRequired({ websetId, enrichmentId }, ['websetId', 'enrichmentId']);
    this.logOperation('getEnrichment', { websetId, enrichmentId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/enrichments/{enrichmentId}', { 
      websetId, 
      enrichmentId 
    });
    
    return this.handleGetRequest<WebsetEnrichment>(endpoint);
  }

  /**
   * Delete an enrichment
   */
  async deleteEnrichment(websetId: string, enrichmentId: string): Promise<WebsetEnrichment> {
    this.validateRequired({ websetId, enrichmentId }, ['websetId', 'enrichmentId']);
    this.logOperation('deleteEnrichment', { websetId, enrichmentId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/enrichments/{enrichmentId}', { 
      websetId, 
      enrichmentId 
    });
    
    return this.handleDeleteRequest<WebsetEnrichment>(endpoint);
  }

  /**
   * Cancel a running enrichment
   */
  async cancelEnrichment(websetId: string, enrichmentId: string): Promise<WebsetEnrichment> {
    this.validateRequired({ websetId, enrichmentId }, ['websetId', 'enrichmentId']);
    this.logOperation('cancelEnrichment', { websetId, enrichmentId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/enrichments/{enrichmentId}/cancel', { 
      websetId, 
      enrichmentId 
    });
    
    return this.handlePostRequest<WebsetEnrichment>(endpoint);
  }

  /**
   * Get enrichment status with polling support
   */
  async getEnrichmentStatus(websetId: string, enrichmentId: string, pollUntilComplete: boolean = false): Promise<WebsetEnrichment> {
    this.validateRequired({ websetId, enrichmentId }, ['websetId', 'enrichmentId']);
    this.logOperation('getEnrichmentStatus', { websetId, enrichmentId, pollUntilComplete });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/enrichments/{enrichmentId}', { 
      websetId, 
      enrichmentId 
    });
    
    if (!pollUntilComplete) {
      return this.handleGetRequest<WebsetEnrichment>(endpoint);
    }
    
    // Poll until enrichment is complete
    return this.pollForCompletion<WebsetEnrichment>(
      endpoint,
      (enrichment) => this.isEnrichmentComplete(enrichment),
      120, // max 120 attempts (10 minutes at 5s intervals)
      5000 // check every 5 seconds
    );
  }

  /**
   * Wait for enrichment to complete with timeout
   */
  async waitForEnrichmentCompletion(websetId: string, enrichmentId: string, timeoutMs: number = 600000): Promise<WebsetEnrichment> {
    this.validateRequired({ websetId, enrichmentId }, ['websetId', 'enrichmentId']);
    this.logOperation('waitForEnrichmentCompletion', { websetId, enrichmentId, timeoutMs });
    
    const startTime = Date.now();
    const maxAttempts = Math.ceil(timeoutMs / 5000);
    
    return this.pollForCompletion<WebsetEnrichment>(
      this.buildEndpoint('/websets/{websetId}/enrichments/{enrichmentId}', { websetId, enrichmentId }),
      (enrichment) => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) {
          throw new Error(`Enrichment completion timeout after ${timeoutMs}ms`);
        }
        return this.isEnrichmentComplete(enrichment);
      },
      maxAttempts,
      5000
    );
  }

  /**
   * Check if enrichment is complete
   */
  isEnrichmentComplete(enrichment: WebsetEnrichment): boolean {
    return enrichment.status === 'completed' || enrichment.status === 'canceled';
  }

  /**
   * Check if enrichment is running
   */
  isEnrichmentRunning(enrichment: WebsetEnrichment): boolean {
    return enrichment.status === 'pending';
  }

  /**
   * Check if enrichment was canceled
   */
  isEnrichmentCanceled(enrichment: WebsetEnrichment): boolean {
    return enrichment.status === 'canceled';
  }

  /**
   * Create a text enrichment
   */
  async createTextEnrichment(
    websetId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<WebsetEnrichment> {
    return this.createEnrichment({
      websetId,
      description,
      format: 'text',
      metadata,
    });
  }

  /**
   * Create a date enrichment
   */
  async createDateEnrichment(
    websetId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<WebsetEnrichment> {
    return this.createEnrichment({
      websetId,
      description,
      format: 'date',
      metadata,
    });
  }

  /**
   * Create a number enrichment
   */
  async createNumberEnrichment(
    websetId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<WebsetEnrichment> {
    return this.createEnrichment({
      websetId,
      description,
      format: 'number',
      metadata,
    });
  }

  /**
   * Create an email enrichment
   */
  async createEmailEnrichment(
    websetId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<WebsetEnrichment> {
    return this.createEnrichment({
      websetId,
      description,
      format: 'email',
      metadata,
    });
  }

  /**
   * Create a phone enrichment
   */
  async createPhoneEnrichment(
    websetId: string,
    description: string,
    metadata?: Record<string, string>
  ): Promise<WebsetEnrichment> {
    return this.createEnrichment({
      websetId,
      description,
      format: 'phone',
      metadata,
    });
  }

  /**
   * Create an options enrichment
   */
  async createOptionsEnrichment(
    websetId: string,
    description: string,
    options: string[],
    metadata?: Record<string, string>
  ): Promise<WebsetEnrichment> {
    const enrichmentOptions: EnrichmentOption[] = options.map(label => ({ label }));
    
    return this.createEnrichment({
      websetId,
      description,
      format: 'options',
      options: enrichmentOptions,
      metadata,
    });
  }

  /**
   * Create multiple enrichments at once
   */
  async createBulkEnrichments(
    websetId: string,
    enrichments: Array<{
      description: string;
      format: string;
      options?: string[];
      metadata?: Record<string, string>;
    }>
  ): Promise<WebsetEnrichment[]> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('createBulkEnrichments', { websetId, count: enrichments.length });
    
    const results: WebsetEnrichment[] = [];
    
    for (const enrichment of enrichments) {
      const options = enrichment.options?.map(label => ({ label }));
      
      const result = await this.createEnrichment({
        websetId,
        description: enrichment.description,
        format: enrichment.format as any,
        options,
        metadata: enrichment.metadata,
      });
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get all enrichments for a webset
   */
  async getAllEnrichments(websetId: string): Promise<WebsetEnrichment[]> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('getAllEnrichments', { websetId });
    
    // Note: This assumes the webset object includes enrichments
    // In practice, you might need a separate API endpoint
    const webset = await this.handleGetRequest<any>(`/websets/${websetId}?expand=enrichments`);
    return webset.enrichments || [];
  }

  /**
   * Get enrichment statistics for a webset
   */
  async getEnrichmentStats(websetId: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    canceled: number;
    byFormat: Record<string, number>;
  }> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('getEnrichmentStats', { websetId });
    
    const enrichments = await this.getAllEnrichments(websetId);
    
    const stats = {
      total: enrichments.length,
      pending: 0,
      completed: 0,
      canceled: 0,
      byFormat: {} as Record<string, number>,
    };
    
    for (const enrichment of enrichments) {
      // Count by status
      switch (enrichment.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'canceled':
          stats.canceled++;
          break;
      }
      
      // Count by format
      const format = enrichment.format;
      stats.byFormat[format] = (stats.byFormat[format] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Validate enrichment creation request
   */
  private validateCreateEnrichmentRequest(request: CreateEnrichmentRequest): void {
    // Validate description
    if (!request.description || typeof request.description !== 'string' || request.description.trim().length === 0) {
      throw new Error('Description must be a non-empty string');
    }

    if (request.description.length > 5000) {
      throw new Error('Description must be less than 5000 characters');
    }

    // Validate format
    const validFormats = ['text', 'date', 'number', 'options', 'email', 'phone'];
    if (!validFormats.includes(request.format)) {
      throw new Error(`Format must be one of: ${validFormats.join(', ')}`);
    }

    // Validate options for options format
    if (request.format === 'options') {
      if (!request.options || !Array.isArray(request.options) || request.options.length === 0) {
        throw new Error('Options are required for options format');
      }

      for (const option of request.options) {
        if (!option.label || typeof option.label !== 'string' || option.label.trim().length === 0) {
          throw new Error('Each option must have a non-empty label');
        }
        if (option.label.length > 100) {
          throw new Error('Option labels must be less than 100 characters');
        }
      }

      if (request.options.length > 50) {
        throw new Error('Maximum 50 options allowed');
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