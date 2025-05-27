/**
 * Simple in-memory cache for list content items operations
 */

export interface CachedResult {
  data: any;
  timestamp: number;
}

export class ItemListCache {
  private cache = new Map<string, CachedResult>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  getCachedResult(cacheKey: string): CachedResult | null {
    const cached = this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  setCachedResult(cacheKey: string, result: any): void {
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
  }

  generateCacheKey(websetId: string, options: any): string {
    return `items:${websetId}:${JSON.stringify(options)}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const itemListCache = new ItemListCache();