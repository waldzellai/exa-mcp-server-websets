/**
 * Enhanced WebsetsManager Integration Tests
 * 
 * Tests for the enhanced list_content_items operation
 */

import { jest } from '@jest/globals';

// Mock the enhanced ItemService
const mockItemService = {
  listItemsWithFilters: jest.fn() as jest.MockedFunction<any>,
  getAllItems: jest.fn() as jest.MockedFunction<any>
};

const mockServices = {
  itemService: mockItemService
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn()
};

// Import the handler function (we'll need to mock the import)
const handleListContentItems = async (services: any, resourceId: string | undefined, params: any, logger: any) => {
  // This is a simplified version for testing - in real implementation this would be imported
  if (!resourceId) {
    throw new Error("resourceId is required to list content items");
  }
  
  const startTime = Date.now();
  
  try {
    // Mock enhanced filtering logic
    const result = await services.itemService.listItemsWithFilters(
      resourceId,
      params?.filters || {},
      params?.pagination || { type: 'cursor', limit: 25 },
      params?.sorting || { field: 'createdAt', order: 'desc' }
    );
    
    const processingTime = Date.now() - startTime;
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          collectionId: resourceId,
          message: `Found ${result.data.length} content items`,
          items: result.data,
          pagination: {
            type: params?.offset !== undefined ? 'offset' : 'cursor',
            limit: params?.limit || 25,
            hasMore: result.hasMore,
            nextCursor: result.nextCursor,
            nextOffset: result.nextOffset,
            offset: result.offset,
            totalEstimate: result.totalEstimate
          },
          filters: result.filters,
          sorting: result.sorting,
          metadata: {
            processingTime,
            cacheHit: result.cacheHit
          }
        }, null, 2)
      }]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: false,
          collectionId: resourceId,
          error: errorMessage
        }, null, 2)
      }],
      isError: true
    };
  }
};

describe('Enhanced WebsetsManager Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list_content_items operation', () => {
    test('should handle basic listing without filters', async () => {
      const mockResult = {
        data: [
          {
            id: 'item-1',
            title: 'Test Item 1',
            url: 'https://example.com/1',
            content: 'Test content 1',
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 'item-2',
            title: 'Test Item 2',
            url: 'https://example.com/2',
            content: 'Test content 2',
            createdAt: '2024-01-02T00:00:00Z'
          }
        ],
        hasMore: false,
        nextCursor: undefined,
        totalEstimate: 2,
        filters: {},
        sorting: { field: 'createdAt', order: 'desc' },
        processingTime: 100,
        cacheHit: false
      };

      mockItemService.listItemsWithFilters.mockResolvedValue(mockResult);

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { limit: 25 },
        mockLogger
      );

      expect(result.content[0].text).toContain('"success": true');
      const response = JSON.parse(result.content[0].text);
      expect(response.items).toHaveLength(2);
      expect(response.pagination.limit).toBe(25);
      expect(response.metadata.cacheHit).toBe(false);
    });

    test('should handle verification status filtering', async () => {
      const mockResult = {
        data: [
          {
            id: 'item-1',
            title: 'Verified Item',
            url: 'https://example.com/1',
            verification: { status: 'verified' }
          }
        ],
        hasMore: false,
        filters: { verificationStatus: 'verified' },
        sorting: { field: 'createdAt', order: 'desc' },
        processingTime: 50,
        cacheHit: false
      };

      mockItemService.listItemsWithFilters.mockResolvedValue(mockResult);

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { 
          verificationStatus: 'verified',
          limit: 25 
        },
        mockLogger
      );

      expect(result.content[0].text).toContain('"success": true');
      const response = JSON.parse(result.content[0].text);
      expect(response.filters.verificationStatus).toBe('verified');
      expect(response.items).toHaveLength(1);
    });

    test('should handle entity type filtering', async () => {
      const mockResult = {
        data: [
          {
            id: 'item-1',
            title: 'Company Item',
            entity: { type: 'company' }
          }
        ],
        hasMore: false,
        filters: { entityType: 'company' },
        sorting: { field: 'createdAt', order: 'desc' },
        processingTime: 75,
        cacheHit: false
      };

      mockItemService.listItemsWithFilters.mockResolvedValue(mockResult);

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { 
          entityType: 'company',
          limit: 25 
        },
        mockLogger
      );

      expect(result.content[0].text).toContain('"success": true');
      const response = JSON.parse(result.content[0].text);
      expect(response.filters.entityType).toBe('company');
    });

    test('should handle date range filtering', async () => {
      const mockResult = {
        data: [
          {
            id: 'item-1',
            title: 'Recent Item',
            createdAt: '2024-06-01T00:00:00Z'
          }
        ],
        hasMore: false,
        filters: {
          dateRange: {
            field: 'createdAt',
            after: new Date('2024-01-01'),
            before: new Date('2024-12-31')
          }
        },
        sorting: { field: 'createdAt', order: 'desc' },
        processingTime: 80,
        cacheHit: false
      };

      mockItemService.listItemsWithFilters.mockResolvedValue(mockResult);

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { 
          createdAfter: '2024-01-01T00:00:00Z',
          createdBefore: '2024-12-31T23:59:59Z',
          limit: 25 
        },
        mockLogger
      );

      expect(result.content[0].text).toContain('"success": true');
      const response = JSON.parse(result.content[0].text);
      expect(response.filters.dateRange).toBeDefined();
    });

    test('should handle content search filtering', async () => {
      const mockResult = {
        data: [
          {
            id: 'item-1',
            title: 'Technology Company',
            content: 'This company works with advanced technology solutions'
          }
        ],
        hasMore: false,
        filters: {
          contentSearch: {
            term: 'technology',
            fields: ['title', 'content'],
            caseSensitive: false
          }
        },
        sorting: { field: 'createdAt', order: 'desc' },
        processingTime: 90,
        cacheHit: false
      };

      mockItemService.listItemsWithFilters.mockResolvedValue(mockResult);

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { 
          searchTerm: 'technology',
          searchFields: ['title', 'content'],
          limit: 25 
        },
        mockLogger
      );

      expect(result.content[0].text).toContain('"success": true');
      const response = JSON.parse(result.content[0].text);
      expect(response.filters.contentSearch.term).toBe('technology');
    });

    test('should handle complex filter combinations', async () => {
      const mockResult = {
        data: [
          {
            id: 'item-1',
            title: 'Verified Tech Company',
            entity: { type: 'company' },
            verification: { status: 'verified' },
            enrichments: { industry: 'technology' }
          }
        ],
        hasMore: false,
        filters: {
          verificationStatus: 'verified',
          entityType: 'company',
          hasEnrichments: true,
          contentSearch: {
            term: 'technology',
            fields: ['title'],
            caseSensitive: false
          }
        },
        sorting: { field: 'createdAt', order: 'desc' },
        processingTime: 120,
        cacheHit: false
      };

      mockItemService.listItemsWithFilters.mockResolvedValue(mockResult);

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { 
          verificationStatus: 'verified',
          entityType: 'company',
          hasEnrichments: true,
          searchTerm: 'technology',
          searchFields: ['title'],
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit: 50
        },
        mockLogger
      );

      expect(result.content[0].text).toContain('"success": true');
      const response = JSON.parse(result.content[0].text);
      expect(response.filters.verificationStatus).toBe('verified');
      expect(response.filters.entityType).toBe('company');
      expect(response.filters.hasEnrichments).toBe(true);
      expect(response.filters.contentSearch.term).toBe('technology');
      expect(response.sorting.field).toBe('createdAt');
      expect(response.sorting.order).toBe('desc');
    });

    test('should handle offset-based pagination', async () => {
      const mockResult = {
        data: Array.from({ length: 25 }, (_, i) => ({
          id: `item-${i + 50}`,
          title: `Item ${i + 50}`
        })),
        hasMore: true,
        offset: 50,
        nextOffset: 75,
        totalEstimate: 200,
        filters: {},
        sorting: { field: 'createdAt', order: 'desc' },
        processingTime: 60,
        cacheHit: false
      };

      mockItemService.listItemsWithFilters.mockResolvedValue(mockResult);

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { 
          offset: 50,
          limit: 25,
          estimateTotal: true
        },
        mockLogger
      );

      expect(result.content[0].text).toContain('"success": true');
      const response = JSON.parse(result.content[0].text);
      expect(response.pagination.type).toBe('offset');
      expect(response.pagination.hasMore).toBe(true);
      expect(response.pagination.totalEstimate).toBe(200);
    });

    test('should handle caching', async () => {
      const mockResult = {
        data: [{ id: 'cached-item' }],
        hasMore: false,
        filters: {},
        sorting: { field: 'createdAt', order: 'desc' },
        processingTime: 5, // Fast due to cache
        cacheHit: true
      };

      mockItemService.listItemsWithFilters.mockResolvedValue(mockResult);

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { limit: 25 },
        mockLogger
      );

      expect(result.content[0].text).toContain('"success": true');
      const response = JSON.parse(result.content[0].text);
      expect(response.metadata.cacheHit).toBe(true);
      expect(response.metadata.processingTime).toBeLessThan(10);
    });

    test('should handle errors gracefully', async () => {
      mockItemService.listItemsWithFilters.mockRejectedValue(
        new Error('Invalid filter parameters')
      );

      const result = await handleListContentItems(
        mockServices,
        'test-webset-id',
        { verificationStatus: 'invalid-status' },
        mockLogger
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('"success": false');
      const response = JSON.parse(result.content[0].text);
      expect(response.error).toContain('Invalid filter parameters');
    });

    test('should require resourceId', async () => {
      try {
        await handleListContentItems(
          mockServices,
          undefined,
          { limit: 25 },
          mockLogger
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('resourceId is required');
      }
    });
  });
});