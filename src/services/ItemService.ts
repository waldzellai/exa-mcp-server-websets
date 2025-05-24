/**
 * Item Service
 * 
 * Service for managing webset items - retrieval, filtering, and analysis.
 */

import { BaseService } from './BaseService.js';
import { 
  WebsetItem, 
  PaginatedResponse,
  ItemEntity,
  ItemVerification 
} from '../types/websets.js';

export class ItemService extends BaseService {
  /**
   * Get a specific item by ID
   */
  async getItem(websetId: string, itemId: string): Promise<WebsetItem> {
    this.validateRequired({ websetId, itemId }, ['websetId', 'itemId']);
    this.logOperation('getItem', { websetId, itemId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/items/{itemId}', { 
      websetId, 
      itemId 
    });
    
    return this.handleGetRequest<WebsetItem>(endpoint);
  }

  /**
   * List items for a webset with pagination
   */
  async listItems(
    websetId: string, 
    cursor?: string, 
    limit?: number,
    batchSize?: number
  ): Promise<PaginatedResponse<WebsetItem>> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('listItems', { websetId, cursor, limit, batchSize });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/items', { websetId });
    const params: Record<string, any> = {};
    
    if (batchSize) {
      params.batchSize = batchSize;
    }
    
    return this.handlePaginatedRequest<WebsetItem>(endpoint, params, cursor, limit);
  }

  /**
   * Delete an item from a webset
   */
  async deleteItem(websetId: string, itemId: string): Promise<WebsetItem> {
    this.validateRequired({ websetId, itemId }, ['websetId', 'itemId']);
    this.logOperation('deleteItem', { websetId, itemId });
    
    const endpoint = this.buildEndpoint('/websets/{websetId}/items/{itemId}', { 
      websetId, 
      itemId 
    });
    
    return this.handleDeleteRequest<WebsetItem>(endpoint);
  }

  /**
   * Get all items for a webset (handles pagination automatically)
   */
  async getAllItems(websetId: string, batchSize: number = 50): Promise<WebsetItem[]> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('getAllItems', { websetId, batchSize });
    
    const allItems: WebsetItem[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    
    while (hasMore) {
      const response = await this.listItems(websetId, cursor, undefined, batchSize);
      allItems.push(...response.data);
      
      hasMore = response.hasMore;
      cursor = response.nextCursor;
    }
    
    return allItems;
  }

  /**
   * Filter items by verification status
   */
  async getItemsByVerificationStatus(
    websetId: string, 
    status: 'verified' | 'unverified' | 'rejected'
  ): Promise<WebsetItem[]> {
    this.validateRequired({ websetId, status }, ['websetId', 'status']);
    this.logOperation('getItemsByVerificationStatus', { websetId, status });
    
    const allItems = await this.getAllItems(websetId);
    return allItems.filter(item => item.verification.status === status);
  }

  /**
   * Filter items by entity type
   */
  async getItemsByEntityType(websetId: string, entityType: string): Promise<WebsetItem[]> {
    this.validateRequired({ websetId, entityType }, ['websetId', 'entityType']);
    this.logOperation('getItemsByEntityType', { websetId, entityType });
    
    const allItems = await this.getAllItems(websetId);
    return allItems.filter(item => item.entity.type === entityType);
  }

  /**
   * Search items by content
   */
  async searchItemsByContent(websetId: string, searchTerm: string): Promise<WebsetItem[]> {
    this.validateRequired({ websetId, searchTerm }, ['websetId', 'searchTerm']);
    this.logOperation('searchItemsByContent', { websetId, searchTerm });
    
    const allItems = await this.getAllItems(websetId);
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return allItems.filter(item => 
      item.title.toLowerCase().includes(lowerSearchTerm) ||
      item.content.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Get items with enrichments
   */
  async getEnrichedItems(websetId: string): Promise<WebsetItem[]> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('getEnrichedItems', { websetId });
    
    const allItems = await this.getAllItems(websetId);
    return allItems.filter(item => 
      item.enrichments && Object.keys(item.enrichments).length > 0
    );
  }

  /**
   * Get items by search ID
   */
  async getItemsBySearchId(websetId: string, searchId: string): Promise<WebsetItem[]> {
    this.validateRequired({ websetId, searchId }, ['websetId', 'searchId']);
    this.logOperation('getItemsBySearchId', { websetId, searchId });
    
    const allItems = await this.getAllItems(websetId);
    return allItems.filter(item => item.searchId === searchId);
  }

  /**
   * Get item statistics for a webset
   */
  async getItemStats(websetId: string): Promise<{
    total: number;
    verified: number;
    unverified: number;
    rejected: number;
    enriched: number;
    byEntityType: Record<string, number>;
    bySearchId: Record<string, number>;
  }> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('getItemStats', { websetId });
    
    const allItems = await this.getAllItems(websetId);
    
    const stats = {
      total: allItems.length,
      verified: 0,
      unverified: 0,
      rejected: 0,
      enriched: 0,
      byEntityType: {} as Record<string, number>,
      bySearchId: {} as Record<string, number>,
    };
    
    for (const item of allItems) {
      // Count by verification status
      switch (item.verification.status) {
        case 'verified':
          stats.verified++;
          break;
        case 'unverified':
          stats.unverified++;
          break;
        case 'rejected':
          stats.rejected++;
          break;
      }
      
      // Count enriched items
      if (item.enrichments && Object.keys(item.enrichments).length > 0) {
        stats.enriched++;
      }
      
      // Count by entity type
      const entityType = item.entity.type;
      stats.byEntityType[entityType] = (stats.byEntityType[entityType] || 0) + 1;
      
      // Count by search ID
      const searchId = item.searchId;
      stats.bySearchId[searchId] = (stats.bySearchId[searchId] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Export items to JSON
   */
  async exportItemsToJson(websetId: string): Promise<string> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('exportItemsToJson', { websetId });
    
    const allItems = await this.getAllItems(websetId);
    return JSON.stringify(allItems, null, 2);
  }

  /**
   * Export items to CSV format
   */
  async exportItemsToCsv(websetId: string): Promise<string> {
    this.validateRequired({ websetId }, ['websetId']);
    this.logOperation('exportItemsToCsv', { websetId });
    
    const allItems = await this.getAllItems(websetId);
    
    if (allItems.length === 0) {
      return 'No items found';
    }
    
    // CSV headers
    const headers = [
      'id',
      'title',
      'url',
      'entity_type',
      'verification_status',
      'verification_reasoning',
      'search_id',
      'created_at',
      'updated_at'
    ];
    
    // Add enrichment columns
    const enrichmentKeys = new Set<string>();
    for (const item of allItems) {
      if (item.enrichments) {
        Object.keys(item.enrichments).forEach(key => enrichmentKeys.add(key));
      }
    }
    
    headers.push(...Array.from(enrichmentKeys).map(key => `enrichment_${key}`));
    
    // Build CSV rows
    const rows = [headers.join(',')];
    
    for (const item of allItems) {
      const row = [
        this.escapeCsvValue(item.id),
        this.escapeCsvValue(item.title),
        this.escapeCsvValue(item.url),
        this.escapeCsvValue(item.entity.type),
        this.escapeCsvValue(item.verification.status),
        this.escapeCsvValue(item.verification.reasoning),
        this.escapeCsvValue(item.searchId),
        this.escapeCsvValue(item.createdAt),
        this.escapeCsvValue(item.updatedAt),
      ];
      
      // Add enrichment values
      for (const key of enrichmentKeys) {
        const value = item.enrichments?.[key];
        row.push(this.escapeCsvValue(value ? String(value) : ''));
      }
      
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }

  /**
   * Check if item is verified
   */
  isItemVerified(item: WebsetItem): boolean {
    return item.verification.status === 'verified';
  }

  /**
   * Check if item is enriched
   */
  isItemEnriched(item: WebsetItem): boolean {
    return item.enrichments && Object.keys(item.enrichments).length > 0;
  }

  /**
   * Get item enrichment value
   */
  getEnrichmentValue(item: WebsetItem, enrichmentKey: string): any {
    return item.enrichments?.[enrichmentKey];
  }

  /**
   * Validate URL format
   */
  validateItemUrl(url: string): boolean {
    return this.validateUrl(url);
  }

  /**
   * Escape CSV values
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}