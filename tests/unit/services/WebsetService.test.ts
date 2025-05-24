/**
 * Unit Tests for WebsetService
 * 
 * Tests the WebsetService with mocked API client dependencies.
 * Following TDD London School methodology.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WebsetService } from '../../../src/services/WebsetService.js';
import { WebsetsApiClient } from '../../../src/api/WebsetsApiClient.js';
import { ApiErrorHandler } from '../../../src/api/ErrorHandler.js';
import { 
  mockWebset, 
  mockCreateWebsetRequest, 
  mockUpdateWebsetRequest,
  mockPaginatedWebsets,
  createMockWebset
} from '../../fixtures/websets.js';

// Mock dependencies
jest.mock('../../../src/api/WebsetsApiClient.js');
jest.mock('../../../src/api/ErrorHandler.js');
jest.mock('../../../src/utils/logger.js');

const MockedWebsetsApiClient = WebsetsApiClient as jest.MockedClass<typeof WebsetsApiClient>;
const MockedApiErrorHandler = ApiErrorHandler as jest.MockedClass<typeof ApiErrorHandler>;

describe('WebsetService', () => {
  let websetService: WebsetService;
  let mockApiClient: jest.Mocked<WebsetsApiClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock API client
    mockApiClient = {
      get: global.testUtils.createAsyncMockFn(),
      post: global.testUtils.createAsyncMockFn(),
      put: global.testUtils.createAsyncMockFn(),
      patch: global.testUtils.createAsyncMockFn(),
      delete: global.testUtils.createAsyncMockFn()
    } as any;

    MockedWebsetsApiClient.mockImplementation(() => mockApiClient);

    // Create service instance
    websetService = new WebsetService(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebset', () => {
    it('should create webset successfully', async () => {
      // Arrange
      mockApiClient.post.mockResolvedValue({
        data: mockWebset,
        status: 201,
        headers: {}
      });

      // Act
      const result = await websetService.createWebset(mockCreateWebsetRequest);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith('/websets', mockCreateWebsetRequest);
      expect(result).toEqual(mockWebset);
    });

    it('should validate create request', async () => {
      // Arrange
      const invalidRequest = {
        externalId: 123, // Should be string
        metadata: 'invalid' // Should be object
      } as any;

      // Act & Assert
      await expect(websetService.createWebset(invalidRequest))
        .rejects.toThrow('externalId must be a string');
    });

    it('should validate metadata values are strings', async () => {
      // Arrange
      const invalidRequest = {
        metadata: {
          validKey: 'validValue',
          invalidKey: 123 // Should be string
        }
      } as any;

      // Act & Assert
      await expect(websetService.createWebset(invalidRequest))
        .rejects.toThrow('metadata.invalidKey must be a string');
    });

    it('should handle API errors', async () => {
      // Arrange
      const apiError = new Error('API Error');
      mockApiClient.post.mockRejectedValue(apiError);
      MockedApiErrorHandler.createApiError.mockReturnValue(apiError as any);

      // Act & Assert
      await expect(websetService.createWebset(mockCreateWebsetRequest))
        .rejects.toThrow('API Error');

      expect(MockedApiErrorHandler.createApiError).toHaveBeenCalledWith(apiError);
      expect(MockedApiErrorHandler.logError).toHaveBeenCalled();
    });
  });

  describe('getWebset', () => {
    it('should get webset successfully', async () => {
      // Arrange
      const websetId = 'webset-123';
      mockApiClient.get.mockResolvedValue({
        data: mockWebset,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.getWebset(websetId);

      // Assert
      expect(mockApiClient.get).toHaveBeenCalledWith('/websets/webset-123', undefined);
      expect(result).toEqual(mockWebset);
    });

    it('should get webset with expand parameter', async () => {
      // Arrange
      const websetId = 'webset-123';
      const expand = 'items';
      mockApiClient.get.mockResolvedValue({
        data: mockWebset,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.getWebset(websetId, expand);

      // Assert
      expect(mockApiClient.get).toHaveBeenCalledWith('/websets/webset-123', { expand });
      expect(result).toEqual(mockWebset);
    });

    it('should validate required websetId', async () => {
      // Act & Assert
      await expect(websetService.getWebset(''))
        .rejects.toThrow();
    });

    it('should handle not found error', async () => {
      // Arrange
      const notFoundError = new Error('Webset not found');
      mockApiClient.get.mockRejectedValue(notFoundError);
      MockedApiErrorHandler.createApiError.mockReturnValue(notFoundError as any);

      // Act & Assert
      await expect(websetService.getWebset('nonexistent'))
        .rejects.toThrow('Webset not found');
    });
  });

  describe('listWebsets', () => {
    it('should list websets successfully', async () => {
      // Arrange
      mockApiClient.get.mockResolvedValue({
        data: mockPaginatedWebsets,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.listWebsets();

      // Assert
      expect(mockApiClient.get).toHaveBeenCalledWith('/websets', {});
      expect(result).toEqual(mockPaginatedWebsets);
    });

    it('should list websets with pagination', async () => {
      // Arrange
      const cursor = 'next-cursor';
      const limit = 50;
      mockApiClient.get.mockResolvedValue({
        data: mockPaginatedWebsets,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.listWebsets(cursor, limit);

      // Assert
      expect(mockApiClient.get).toHaveBeenCalledWith('/websets', { cursor, limit });
      expect(result).toEqual(mockPaginatedWebsets);
    });
  });

  describe('updateWebset', () => {
    it('should update webset successfully', async () => {
      // Arrange
      const websetId = 'webset-123';
      const updatedWebset = { ...mockWebset, ...mockUpdateWebsetRequest };
      mockApiClient.patch.mockResolvedValue({
        data: updatedWebset,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.updateWebset(websetId, mockUpdateWebsetRequest);

      // Assert
      expect(mockApiClient.patch).toHaveBeenCalledWith('/websets/webset-123', mockUpdateWebsetRequest);
      expect(result).toEqual(updatedWebset);
    });

    it('should validate update request', async () => {
      // Arrange
      const invalidRequest = {
        metadata: {
          invalidKey: 123 // Should be string
        }
      } as any;

      // Act & Assert
      await expect(websetService.updateWebset('webset-123', invalidRequest))
        .rejects.toThrow('metadata.invalidKey must be a string');
    });
  });

  describe('deleteWebset', () => {
    it('should delete webset successfully', async () => {
      // Arrange
      const websetId = 'webset-123';
      mockApiClient.delete.mockResolvedValue({
        data: mockWebset,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.deleteWebset(websetId);

      // Assert
      expect(mockApiClient.delete).toHaveBeenCalledWith('/websets/webset-123');
      expect(result).toEqual(mockWebset);
    });

    it('should validate required websetId', async () => {
      // Act & Assert
      await expect(websetService.deleteWebset(''))
        .rejects.toThrow();
    });
  });

  describe('cancelWebset', () => {
    it('should cancel webset successfully', async () => {
      // Arrange
      const websetId = 'webset-123';
      const canceledWebset = { ...mockWebset, status: 'paused' as const };
      mockApiClient.post.mockResolvedValue({
        data: canceledWebset,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.cancelWebset(websetId);

      // Assert
      expect(mockApiClient.post).toHaveBeenCalledWith('/websets/webset-123/cancel');
      expect(result).toEqual(canceledWebset);
    });
  });

  describe('getWebsetStatus', () => {
    it('should get webset status without polling', async () => {
      // Arrange
      const websetId = 'webset-123';
      mockApiClient.get.mockResolvedValue({
        data: mockWebset,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.getWebsetStatus(websetId, false);

      // Assert
      expect(mockApiClient.get).toHaveBeenCalledWith('/websets/webset-123');
      expect(result).toEqual(mockWebset);
    });

    it('should poll until completion when requested', async () => {
      // Arrange
      const websetId = 'webset-123';
      const runningWebset = createMockWebset({ status: 'running' });
      const completedWebset = createMockWebset({ status: 'idle' });

      mockApiClient.get
        .mockResolvedValueOnce({ data: runningWebset, status: 200, headers: {} })
        .mockResolvedValueOnce({ data: runningWebset, status: 200, headers: {} })
        .mockResolvedValueOnce({ data: completedWebset, status: 200, headers: {} });

      // Mock setTimeout to resolve immediately for testing
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      // Act
      const result = await websetService.getWebsetStatus(websetId, true);

      // Assert
      expect(mockApiClient.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual(completedWebset);

      // Cleanup
      jest.restoreAllMocks();
    });
  });

  describe('utility methods', () => {
    describe('isWebsetComplete', () => {
      it('should return true for idle webset', () => {
        const idleWebset = createMockWebset({ status: 'idle' });
        expect(websetService.isWebsetComplete(idleWebset)).toBe(true);
      });

      it('should return true for paused webset', () => {
        const pausedWebset = createMockWebset({ status: 'paused' });
        expect(websetService.isWebsetComplete(pausedWebset)).toBe(true);
      });

      it('should return false for running webset', () => {
        const runningWebset = createMockWebset({ status: 'running' });
        expect(websetService.isWebsetComplete(runningWebset)).toBe(false);
      });
    });

    describe('isWebsetRunning', () => {
      it('should return true for running webset', () => {
        const runningWebset = createMockWebset({ status: 'running' });
        expect(websetService.isWebsetRunning(runningWebset)).toBe(true);
      });

      it('should return false for idle webset', () => {
        const idleWebset = createMockWebset({ status: 'idle' });
        expect(websetService.isWebsetRunning(idleWebset)).toBe(false);
      });
    });

    describe('getWebsetProgress', () => {
      it('should calculate progress correctly', () => {
        // Arrange
        const websetWithProgress = createMockWebset({
          searches: [
            { status: 'completed' } as any,
            { status: 'completed' } as any,
            { status: 'running' } as any
          ],
          enrichments: [
            { status: 'completed' } as any,
            { status: 'pending' } as any
          ]
        });

        // Act
        const progress = websetService.getWebsetProgress(websetWithProgress);

        // Assert
        expect(progress).toEqual({
          totalSearches: 3,
          completedSearches: 2,
          totalEnrichments: 2,
          completedEnrichments: 1,
          overallProgress: 60 // 3 out of 5 operations completed
        });
      });

      it('should handle empty webset', () => {
        // Arrange
        const emptyWebset = createMockWebset({
          searches: [],
          enrichments: []
        });

        // Act
        const progress = websetService.getWebsetProgress(emptyWebset);

        // Assert
        expect(progress).toEqual({
          totalSearches: 0,
          completedSearches: 0,
          totalEnrichments: 0,
          completedEnrichments: 0,
          overallProgress: 0
        });
      });
    });
  });

  describe('getWebsetsByExternalId', () => {
    it('should filter websets by external ID', async () => {
      // Arrange
      const externalId = 'test-external-id';
      const matchingWebset = createMockWebset({ externalId });
      const nonMatchingWebset = createMockWebset({ externalId: 'other-id' });
      
      const allWebsets = {
        data: [matchingWebset, nonMatchingWebset],
        hasMore: false
      };

      mockApiClient.get.mockResolvedValue({
        data: allWebsets,
        status: 200,
        headers: {}
      });

      // Act
      const result = await websetService.getWebsetsByExternalId(externalId);

      // Assert
      expect(result).toEqual([matchingWebset]);
      expect(mockApiClient.get).toHaveBeenCalledWith('/websets', {});
    });

    it('should validate required externalId', async () => {
      // Act & Assert
      await expect(websetService.getWebsetsByExternalId(''))
        .rejects.toThrow();
    });
  });

  describe('waitForCompletion', () => {
    it('should timeout if webset does not complete', async () => {
      // Arrange
      const websetId = 'webset-123';
      const runningWebset = createMockWebset({ status: 'running' });
      
      mockApiClient.get.mockResolvedValue({
        data: runningWebset,
        status: 200,
        headers: {}
      });

      // Mock setTimeout to resolve immediately for testing
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      // Act & Assert
      await expect(websetService.waitForCompletion(websetId, 1000))
        .rejects.toThrow('Webset completion timeout after 1000ms');

      // Cleanup
      jest.restoreAllMocks();
    });
  });
});