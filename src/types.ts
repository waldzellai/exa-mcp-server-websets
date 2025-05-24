// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: string;
  category?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults: number;
  contents: {
    text: {
      maxCharacters?: number;
    } | boolean;
    livecrawl?: 'always' | 'fallback';
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaCrawlRequest {
  ids: string[];
  text: boolean;
  livecrawl?: 'always' | 'fallback';
}

export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString: string;
  resolvedSearchType: string;
  results: ExaSearchResult[];
}

// Tool Types
export interface SearchArgs {
  query: string;
  numResults?: number;
  livecrawl?: 'always' | 'fallback';
}

// Re-export Websets API types for convenience
export * from './types/websets.js';

// Combined types for tools that use both Exa and Websets APIs
export interface WebsetCreationArgs {
  query: string;
  count?: number;
  entityType?: string;
  criteria?: string[];
  enrichments?: Array<{
    description: string;
    format: string;
    options?: string[];
  }>;
  externalId?: string;
  metadata?: Record<string, string>;
}

export interface WebsetStatusArgs {
  websetId: string;
  expand?: string;
  includeDetails?: boolean;
}

export interface WebsetItemsArgs {
  websetId: string;
  limit?: number;
  cursor?: string;
  includeEnrichments?: boolean;
}

export interface EnrichmentCreationArgs {
  websetId: string;
  description: string;
  format: 'text' | 'date' | 'number' | 'options' | 'email' | 'phone';
  options?: string[];
  metadata?: Record<string, string>;
}

export interface SearchCreationArgs {
  websetId: string;
  query: string;
  count: number;
  entityType: string;
  criteria?: string[];
  metadata?: Record<string, string>;
}