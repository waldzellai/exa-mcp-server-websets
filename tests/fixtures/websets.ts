/**
 * Test Fixtures for Websets
 * 
 * Common test data and mock objects for webset-related tests.
 */

import { 
  Webset, 
  CreateWebsetRequest, 
  UpdateWebsetRequest,
  WebsetSearch,
  WebsetEnrichment,
  WebsetItem,
  WebsetEvent,
  PaginatedResponse
} from '../../src/types/websets.js';
export const mockWebset: Webset = {
  id: 'webset-123',
  object: 'webset',
  externalId: 'external-123',
  status: 'idle',
  searches: [],
  enrichments: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  metadata: {
    title: 'Test Webset',
    description: 'A test webset for unit testing'
  }
};

export const mockCreateWebsetRequest: CreateWebsetRequest = {
  externalId: 'test-external-id',
  metadata: {
    source: 'test-suite'
  }
};

export const mockUpdateWebsetRequest: UpdateWebsetRequest = {
  metadata: {
    title: 'Updated Test Webset',
    description: 'Updated description'
  }
};

export const mockWebsetSearch: WebsetSearch = {
  id: 'search-123',
  object: 'webset_search',
  query: 'AI companies in San Francisco',
  count: 10,
  status: 'completed',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  entity: {
    type: 'company'
  },
  criteria: [
    {
      description: 'Companies with AI focus',
      successRate: 85
    }
  ],
  progress: {
    found: 10,
    completion: 100
  },
  metadata: {}
};

export const mockWebsetEnrichment: WebsetEnrichment = {
  id: 'enrichment-123',
  object: 'webset_enrichment',
  websetId: 'webset-123',
  description: 'Get company funding information',
  format: 'text',
  status: 'completed',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  metadata: {}
};

export const mockWebsetItem: WebsetItem = {
  id: 'item-123',
  object: 'webset_item',
  websetId: 'webset-123',
  searchId: 'search-123',
  url: 'https://example.com',
  title: 'Example Company',
  content: 'An example AI company with innovative solutions',
  entity: {
    type: 'company',
    properties: {
      name: 'Example Company',
      industry: 'AI'
    }
  },
  verification: {
    status: 'verified',
    reasoning: 'Company information verified through multiple sources',
    references: ['https://example.com/about']
  },
  enrichments: {
    'enrichment-123': {
      value: 'Series A funding: $10M',
      confidence: 0.9
    }
  },
  metadata: {},
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

export const mockWebsetEvent: WebsetEvent = {
  id: 'event-123',
  object: 'event',
  type: 'webset.created',
  data: {
    webset: mockWebset
  },
  createdAt: '2024-01-01T00:00:00.000Z'
};

export const mockPaginatedWebsets: PaginatedResponse<Webset> = {
  data: [mockWebset],
  hasMore: false,
  nextCursor: 'cursor-123'
};

export const mockPaginatedItems: PaginatedResponse<WebsetItem> = {
  data: [mockWebsetItem],
  hasMore: false,
  nextCursor: 'cursor-123'
};

export const mockPaginatedEvents: PaginatedResponse<WebsetEvent> = {
  data: [mockWebsetEvent],
  hasMore: false,
  nextCursor: 'cursor-123'
};

// Error response fixtures
export const mockApiError = {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid request parameters',
    details: {
      field: 'query',
      issue: 'Required field missing'
    }
  }
};

export const mockRateLimitError = {
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded',
    retryAfter: 60
  }
};

// HTTP response fixtures
export const mockSuccessResponse = {
  status: 200,
  headers: {
    'content-type': 'application/json'
  },
  data: mockWebset
};

export const mockErrorResponse = {
  status: 400,
  headers: {
    'content-type': 'application/json'
  },
  data: mockApiError
};

export const mockRateLimitResponse = {
  status: 429,
  headers: {
    'content-type': 'application/json',
    'retry-after': '60'
  },
  data: mockRateLimitError
};

// Webhook fixtures
export const mockWebhookPayload = {
  event: mockWebsetEvent,
  timestamp: '2024-01-01T00:00:00.000Z',
  signature: 'test-signature'
};

export const mockWebhookConfig = {
  id: 'webhook-123',
  url: 'https://example.com/webhook',
  events: ['webset.created', 'webset.completed'],
  secret: 'webhook-secret',
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z'
};

// Test data generators
export const createMockWebset = (overrides: Partial<Webset> = {}): Webset => ({
  ...mockWebset,
  ...overrides,
  id: overrides.id || global.testUtils.generateTestId('webset')
});

export const createMockWebsetItem = (overrides: Partial<WebsetItem> = {}): WebsetItem => ({
  ...mockWebsetItem,
  ...overrides,
  id: overrides.id || global.testUtils.generateTestId('item')
});

export const createMockWebsetEvent = (overrides: Partial<WebsetEvent> = {}): WebsetEvent => ({
  ...mockWebsetEvent,
  ...overrides,
  id: overrides.id || global.testUtils.generateTestId('event')
});