/**
 * Pagination utilities for handling large responses
 */

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total?: number;
    hasMore?: boolean;
  };
}

/**
 * Default pagination limits to prevent token overflow
 */
export const PAGINATION_DEFAULTS = {
  ACTIVITIES: 5,
  WEBSETS: 25,
  ITEMS: 10,
  SEARCH_RESULTS: 10,
} as const;

/**
 * Estimates token count for a response (rough approximation)
 * Assumes ~4 characters per token on average
 */
export function estimateTokenCount(data: unknown): number {
  const jsonString = JSON.stringify(data);
  return Math.ceil(jsonString.length / 4);
}

/**
 * Automatically paginate through results to stay under token limit
 * @param fetchFn Function that fetches a page of results
 * @param maxTokens Maximum tokens allowed in response (default: 20000 to be safe)
 * @returns Combined results from all pages
 */
export async function autoPaginate<T>(
  fetchFn: (params: PaginationParams) => Promise<PaginatedResponse<T>>,
  maxTokens: number = 20000
): Promise<T[]> {
  const allResults: T[] = [];
  let offset = 0;
  let hasMore = true;
  let currentTokens = 0;
  
  // Start with a conservative limit
  let limit = 10;
  
  while (hasMore && currentTokens < maxTokens) {
    const response = await fetchFn({ limit, offset });
    
    // Estimate tokens for this batch
    const batchTokens = estimateTokenCount(response.data);
    
    // If we're getting close to the limit, stop
    if (currentTokens + batchTokens > maxTokens) {
      // Try to fit a smaller batch
      if (limit > 1) {
        limit = Math.max(1, Math.floor(limit / 2));
        continue;
      } else {
        // Even a single item is too large, stop here
        break;
      }
    }
    
    allResults.push(...response.data);
    currentTokens += batchTokens;
    
    // Check if there are more results
    hasMore = response.pagination.hasMore ?? false;
    offset += response.data.length;
    
    // Adjust limit based on token usage
    if (batchTokens < 1000 && limit < 50) {
      // If the batch was small, we can try fetching more next time
      limit = Math.min(limit * 2, 50);
    } else if (batchTokens > 5000 && limit > 5) {
      // If the batch was large, fetch less next time
      limit = Math.max(Math.floor(limit / 2), 5);
    }
  }
  
  return allResults;
}

/**
 * Create a paginated response with proper metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  params: PaginationParams,
  total?: number
): PaginatedResponse<T> {
  const limit = params.limit ?? 10;
  const offset = params.offset ?? 0;
  
  return {
    data,
    pagination: {
      limit,
      offset,
      total,
      hasMore: total ? offset + data.length < total : data.length === limit,
    },
  };
}