/**
 * Memory Store Implementation
 * 
 * Provides in-memory caching and state persistence with TTL support,
 * LRU eviction, and optional persistence to disk.
 */

import { EventEmitter } from 'events';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Memory store configuration
 */
export interface MemoryStoreConfig {
  /** Maximum number of items to store */
  maxItems: number;
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Whether to enable LRU eviction */
  enableLru: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Whether to persist to disk */
  persistToDisk: boolean;
  /** Persistence file path */
  persistenceFile?: string;
  /** Persistence interval in milliseconds */
  persistenceInterval: number;
  /** Whether to enable detailed logging */
  enableLogging: boolean;
  /** Compression threshold in bytes */
  compressionThreshold: number;
}

/**
 * Stored item with metadata
 */
export interface StoredItem<T = any> {
  /** Item key */
  key: string;
  /** Item value */
  value: T;
  /** Creation timestamp */
  createdAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt: Date;
  /** Expiration timestamp (if TTL set) */
  expiresAt?: Date;
  /** Item size in bytes (estimated) */
  size: number;
  /** Access count */
  accessCount: number;
  /** Item tags for categorization */
  tags?: string[];
  /** Item metadata */
  metadata?: Record<string, any>;
}

/**
 * Memory store statistics
 */
export interface MemoryStoreStats {
  /** Total items in store */
  totalItems: number;
  /** Total memory usage in bytes */
  totalMemoryUsage: number;
  /** Cache hit rate */
  hitRate: number;
  /** Cache miss rate */
  missRate: number;
  /** Total hits */
  totalHits: number;
  /** Total misses */
  totalMisses: number;
  /** Items by tag */
  itemsByTag: Record<string, number>;
  /** Average item size */
  averageItemSize: number;
  /** Expired items cleaned up */
  expiredItemsCleanedUp: number;
  /** LRU evictions */
  lruEvictions: number;
}

/**
 * Query options for finding items
 */
export interface QueryOptions {
  /** Filter by tags */
  tags?: string[];
  /** Filter by key pattern (regex) */
  keyPattern?: RegExp;
  /** Filter by creation date range */
  createdDateRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by access date range */
  accessDateRange?: {
    start: Date;
    end: Date;
  };
  /** Maximum number of results */
  limit?: number;
  /** Sort by field */
  sortBy?: 'createdAt' | 'lastAccessedAt' | 'accessCount' | 'size';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Default memory store configuration
 */
const DEFAULT_MEMORY_STORE_CONFIG: MemoryStoreConfig = {
  maxItems: 10000,
  defaultTtl: 3600000, // 1 hour
  enableLru: true,
  cleanupInterval: 300000, // 5 minutes
  persistToDisk: false,
  persistenceInterval: 60000, // 1 minute
  enableLogging: false,
  compressionThreshold: 1024, // 1KB
};

/**
 * In-memory store with TTL, LRU eviction, and persistence
 */
export class MemoryStore<T = any> extends EventEmitter {
  private readonly config: MemoryStoreConfig;
  private readonly items = new Map<string, StoredItem<T>>();
  private readonly accessOrder: string[] = []; // For LRU tracking
  private readonly stats: MemoryStoreStats = {
    totalItems: 0,
    totalMemoryUsage: 0,
    hitRate: 0,
    missRate: 0,
    totalHits: 0,
    totalMisses: 0,
    itemsByTag: {},
    averageItemSize: 0,
    expiredItemsCleanedUp: 0,
    lruEvictions: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;
  private persistenceInterval?: NodeJS.Timeout;
  private isDirty = false;

  constructor(config: Partial<MemoryStoreConfig> = {}) {
    super();
    this.config = { ...DEFAULT_MEMORY_STORE_CONFIG, ...config };
    this.startCleanup();
    
    if (this.config.persistToDisk) {
      this.startPersistence();
      this.loadFromDisk().catch(error => {
        if (this.config.enableLogging) {
          console.warn('Failed to load from disk:', error);
        }
      });
    }
  }

  /**
   * Set an item in the store
   * @param key Item key
   * @param value Item value
   * @param ttl Time to live in milliseconds (optional)
   * @param tags Item tags (optional)
   * @param metadata Item metadata (optional)
   * @returns True if item was set successfully
   */
  set(
    key: string,
    value: T,
    ttl?: number,
    tags?: string[],
    metadata?: Record<string, any>
  ): boolean {
    try {
      const now = new Date();
      const size = this.estimateSize(value);
      const expiresAt = ttl ? new Date(now.getTime() + ttl) : 
                      this.config.defaultTtl ? new Date(now.getTime() + this.config.defaultTtl) : 
                      undefined;

      // Check if we need to evict items
      if (this.items.size >= this.config.maxItems && !this.items.has(key)) {
        if (!this.evictLru()) {
          return false; // Could not evict, store is full
        }
      }

      // Remove existing item if updating
      if (this.items.has(key)) {
        this.removeFromAccessOrder(key);
        const existingItem = this.items.get(key)!;
        this.updateTagStats(existingItem.tags, -1);
        this.stats.totalMemoryUsage -= existingItem.size;
      }

      const item: StoredItem<T> = {
        key,
        value,
        createdAt: now,
        lastAccessedAt: now,
        expiresAt,
        size,
        accessCount: 0,
        tags,
        metadata,
      };

      this.items.set(key, item);
      this.addToAccessOrder(key);
      this.updateTagStats(tags, 1);
      
      this.stats.totalItems = this.items.size;
      this.stats.totalMemoryUsage += size;
      this.updateAverageItemSize();
      
      this.isDirty = true;
      this.emit('itemSet', key, value);

      if (this.config.enableLogging) {
        console.log(`Set item: ${key} (size: ${size} bytes, TTL: ${ttl || 'default'})`);
      }

      return true;

    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Get an item from the store
   * @param key Item key
   * @returns Item value or undefined if not found
   */
  get(key: string): T | undefined {
    const item = this.items.get(key);
    
    if (!item) {
      this.stats.totalMisses++;
      this.updateHitRate();
      this.emit('cacheMiss', key);
      return undefined;
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt <= new Date()) {
      this.delete(key);
      this.stats.totalMisses++;
      this.updateHitRate();
      this.emit('cacheMiss', key);
      return undefined;
    }

    // Update access information
    item.lastAccessedAt = new Date();
    item.accessCount++;
    
    // Update LRU order
    if (this.config.enableLru) {
      this.removeFromAccessOrder(key);
      this.addToAccessOrder(key);
    }

    this.stats.totalHits++;
    this.updateHitRate();
    this.emit('cacheHit', key);

    return item.value;
  }

  /**
   * Check if an item exists in the store
   * @param key Item key
   * @returns True if item exists and is not expired
   */
  has(key: string): boolean {
    const item = this.items.get(key);
    if (!item) {
      return false;
    }

    // Check if expired
    if (item.expiresAt && item.expiresAt <= new Date()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an item from the store
   * @param key Item key
   * @returns True if item was deleted
   */
  delete(key: string): boolean {
    const item = this.items.get(key);
    if (!item) {
      return false;
    }

    this.items.delete(key);
    this.removeFromAccessOrder(key);
    this.updateTagStats(item.tags, -1);
    
    this.stats.totalItems = this.items.size;
    this.stats.totalMemoryUsage -= item.size;
    this.updateAverageItemSize();
    
    this.isDirty = true;
    this.emit('itemDeleted', key);

    if (this.config.enableLogging) {
      console.log(`Deleted item: ${key}`);
    }

    return true;
  }

  /**
   * Clear all items from the store
   */
  clear(): void {
    const count = this.items.size;
    this.items.clear();
    this.accessOrder.length = 0;
    
    this.stats.totalItems = 0;
    this.stats.totalMemoryUsage = 0;
    this.stats.itemsByTag = {};
    this.stats.averageItemSize = 0;
    
    this.isDirty = true;
    this.emit('storeCleared', count);

    if (this.config.enableLogging) {
      console.log(`Cleared store: ${count} items removed`);
    }
  }

  /**
   * Get all keys in the store
   * @returns Array of keys
   */
  keys(): string[] {
    return Array.from(this.items.keys());
  }

  /**
   * Get all values in the store
   * @returns Array of values
   */
  values(): T[] {
    return Array.from(this.items.values()).map(item => item.value);
  }

  /**
   * Get all items with metadata
   * @returns Array of stored items
   */
  entries(): StoredItem<T>[] {
    return Array.from(this.items.values());
  }

  /**
   * Query items based on criteria
   * @param options Query options
   * @returns Array of matching items
   */
  query(options: QueryOptions = {}): StoredItem<T>[] {
    let results = Array.from(this.items.values());

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(item => 
        item.tags && options.tags!.some(tag => item.tags!.includes(tag))
      );
    }

    // Filter by key pattern
    if (options.keyPattern) {
      results = results.filter(item => options.keyPattern!.test(item.key));
    }

    // Filter by creation date range
    if (options.createdDateRange) {
      results = results.filter(item => 
        item.createdAt >= options.createdDateRange!.start &&
        item.createdAt <= options.createdDateRange!.end
      );
    }

    // Filter by access date range
    if (options.accessDateRange) {
      results = results.filter(item => 
        item.lastAccessedAt >= options.accessDateRange!.start &&
        item.lastAccessedAt <= options.accessDateRange!.end
      );
    }

    // Sort results
    if (options.sortBy) {
      results.sort((a, b) => {
        const aValue = a[options.sortBy!];
        const bValue = b[options.sortBy!];
        
        let comparison = 0;
        if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Limit results
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get items by tag
   * @param tag Tag to search for
   * @returns Array of items with the tag
   */
  getByTag(tag: string): StoredItem<T>[] {
    return this.query({ tags: [tag] });
  }

  /**
   * Update item TTL
   * @param key Item key
   * @param ttl New TTL in milliseconds
   * @returns True if TTL was updated
   */
  updateTtl(key: string, ttl: number): boolean {
    const item = this.items.get(key);
    if (!item) {
      return false;
    }

    item.expiresAt = new Date(Date.now() + ttl);
    this.isDirty = true;
    this.emit('ttlUpdated', key, ttl);
    
    return true;
  }

  /**
   * Get item metadata
   * @param key Item key
   * @returns Item metadata or undefined
   */
  getMetadata(key: string): StoredItem<T> | undefined {
    return this.items.get(key);
  }

  /**
   * Estimate the size of a value in bytes
   * @param value Value to estimate
   * @returns Estimated size in bytes
   */
  private estimateSize(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'string') {
      return value.length * 2; // Rough estimate for UTF-16
    }

    if (typeof value === 'number') {
      return 8; // 64-bit number
    }

    if (typeof value === 'boolean') {
      return 1;
    }

    if (value instanceof Date) {
      return 8;
    }

    if (Buffer.isBuffer(value)) {
      return value.length;
    }

    // For objects and arrays, use JSON string length as approximation
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 100; // Fallback estimate
    }
  }

  /**
   * Add key to access order (for LRU)
   * @param key Item key
   */
  private addToAccessOrder(key: string): void {
    if (this.config.enableLru) {
      this.accessOrder.push(key);
    }
  }

  /**
   * Remove key from access order
   * @param key Item key
   */
  private removeFromAccessOrder(key: string): void {
    if (this.config.enableLru) {
      const index = this.accessOrder.indexOf(key);
      if (index !== -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }

  /**
   * Evict least recently used item
   * @returns True if an item was evicted
   */
  private evictLru(): boolean {
    if (!this.config.enableLru || this.accessOrder.length === 0) {
      return false;
    }

    const keyToEvict = this.accessOrder[0];
    const success = this.delete(keyToEvict);
    
    if (success) {
      this.stats.lruEvictions++;
      this.emit('lruEviction', keyToEvict);
    }
    
    return success;
  }

  /**
   * Update tag statistics
   * @param tags Item tags
   * @param delta Change in count (+1 or -1)
   */
  private updateTagStats(tags: string[] | undefined, delta: number): void {
    if (!tags) return;
    
    for (const tag of tags) {
      this.stats.itemsByTag[tag] = (this.stats.itemsByTag[tag] || 0) + delta;
      if (this.stats.itemsByTag[tag] <= 0) {
        delete this.stats.itemsByTag[tag];
      }
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
    this.stats.missRate = total > 0 ? this.stats.totalMisses / total : 0;
  }

  /**
   * Update average item size
   */
  private updateAverageItemSize(): void {
    this.stats.averageItemSize = this.stats.totalItems > 0 ? 
      this.stats.totalMemoryUsage / this.stats.totalItems : 0;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired items
   */
  private cleanupExpiredItems(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.items) {
      if (item.expiresAt && item.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
      this.stats.expiredItemsCleanedUp++;
    }

    if (expiredKeys.length > 0) {
      this.emit('expiredItemsCleanedUp', expiredKeys.length);
      
      if (this.config.enableLogging) {
        console.log(`Cleaned up ${expiredKeys.length} expired items`);
      }
    }
  }

  /**
   * Start persistence interval
   */
  private startPersistence(): void {
    if (this.config.persistToDisk && this.config.persistenceFile) {
      this.persistenceInterval = setInterval(() => {
        if (this.isDirty) {
          this.saveToDisk().catch(error => {
            if (this.config.enableLogging) {
              console.error('Failed to persist to disk:', error);
            }
          });
        }
      }, this.config.persistenceInterval);
    }
  }

  /**
   * Save store to disk
   */
  private async saveToDisk(): Promise<void> {
    if (!this.config.persistenceFile) {
      return;
    }

    try {
      const data = {
        items: Array.from(this.items.entries()),
        accessOrder: this.accessOrder,
        stats: this.stats,
        timestamp: new Date().toISOString(),
      };

      const json = JSON.stringify(data);
      const dir = this.config.persistenceFile.substring(0, this.config.persistenceFile.lastIndexOf('/'));
      
      if (dir && !existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await writeFile(this.config.persistenceFile, json, 'utf8');
      this.isDirty = false;
      this.emit('persistedToDisk');

    } catch (error) {
      this.emit('persistenceError', error);
      throw error;
    }
  }

  /**
   * Load store from disk
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.config.persistenceFile || !existsSync(this.config.persistenceFile)) {
      return;
    }

    try {
      const json = await readFile(this.config.persistenceFile, 'utf8');
      const data = JSON.parse(json);

      // Restore items
      this.items.clear();
      for (const [key, item] of data.items) {
        // Convert date strings back to Date objects
        item.createdAt = new Date(item.createdAt);
        item.lastAccessedAt = new Date(item.lastAccessedAt);
        if (item.expiresAt) {
          item.expiresAt = new Date(item.expiresAt);
        }
        this.items.set(key, item);
      }

      // Restore access order
      this.accessOrder.length = 0;
      this.accessOrder.push(...data.accessOrder);

      // Restore stats
      Object.assign(this.stats, data.stats);

      this.emit('loadedFromDisk', this.items.size);

      if (this.config.enableLogging) {
        console.log(`Loaded ${this.items.size} items from disk`);
      }

    } catch (error) {
      this.emit('loadError', error);
      throw error;
    }
  }

  /**
   * Get current statistics
   * @returns Memory store statistics
   */
  getStats(): MemoryStoreStats {
    return { ...this.stats };
  }

  /**
   * Get store size
   * @returns Number of items in store
   */
  size(): number {
    return this.items.size;
  }

  /**
   * Check if store is empty
   * @returns True if store is empty
   */
  isEmpty(): boolean {
    return this.items.size === 0;
  }

  /**
   * Shutdown the store
   */
  async shutdown(): Promise<void> {
    // Stop intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
      this.persistenceInterval = undefined;
    }

    // Final persistence
    if (this.config.persistToDisk && this.isDirty) {
      await this.saveToDisk();
    }

    this.emit('shutdown');
  }
}