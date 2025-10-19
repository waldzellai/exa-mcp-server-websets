/**
 * Webhook Event Store
 * 
 * In-memory, TTL-based storage for webhook events with deduplication
 * and filtering capabilities.
 */

/**
 * Minimal Exa event shape
 */
export interface ExaEvent<T = unknown> {
  /** Unique event ID */
  id: string;
  /** Event type (e.g., "webset.search.updated") */
  type: string;
  /** Event payload */
  data: T;
  /** ISO 8601 timestamp */
  createdAt: string;
}

/**
 * Stored event record with metadata
 */
export interface EventRecord {
  /** Event ID */
  id: string;
  /** Event type */
  type: string;
  /** Event creation timestamp (ms since epoch) */
  createdAt: number;
  /** Full event payload */
  payload: ExaEvent;
  /** Whether event has been read */
  read: boolean;
}

/**
 * Event query parameters
 */
export interface EventQueryParams {
  /** Filter by event types */
  types?: string[];
  /** Filter by webset ID (from event.data.websetId) */
  websetId?: string;
  /** Filter by search ID (from event.data.searchId or event.data.id for search events) */
  searchId?: string;
  /** Filter events after this timestamp (ms) */
  from?: number;
  /** Filter events before this timestamp (ms) */
  to?: number;
  /** Only return unread events */
  unreadOnly?: boolean;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Event store statistics
 */
export interface EventStoreStats {
  /** Total events stored */
  total: number;
  /** Unread events */
  unread: number;
  /** Events by type */
  byType: Record<string, number>;
}

/**
 * In-memory webhook event store
 */
export class WebhookEventStore {
  private readonly events = new Map<string, EventRecord>();
  private readonly eventsByType = new Map<string, Set<string>>();
  private readonly orderedIds: string[] = [];
  private readonly processedIds = new Map<string, number>(); // id -> expiresAt
  private readonly ttlMs: number;
  private readonly sweepInterval: NodeJS.Timeout;

  constructor(ttlMs: number = 3600000) { // 1 hour default
    this.ttlMs = ttlMs;
    
    // Start TTL sweeper (every 60 seconds)
    this.sweepInterval = setInterval(() => {
      this.purgeExpired();
    }, 60000);
  }

  /**
   * Add an event to the store
   * @returns true if added, false if duplicate or expired
   */
  add(event: ExaEvent): boolean {
    const now = Date.now();
    const eventTime = Date.parse(event.createdAt);

    // Check if event is too old
    if (isNaN(eventTime) || (now - eventTime) > this.ttlMs) {
      return false;
    }

    // Check for duplicate (with TTL check)
    const existingExpiry = this.processedIds.get(event.id);
    if (existingExpiry && existingExpiry > now) {
      return false; // Already processed and not expired
    }

    // Store event
    const record: EventRecord = {
      id: event.id,
      type: event.type,
      createdAt: eventTime,
      payload: event,
      read: false,
    };

    this.events.set(event.id, record);
    this.orderedIds.push(event.id);

    // Index by type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, new Set());
    }
    this.eventsByType.get(event.type)!.add(event.id);

    // Mark as processed with expiry
    this.processedIds.set(event.id, now + this.ttlMs);

    return true;
  }

  /**
   * Query events with filtering
   */
  get(params: EventQueryParams = {}): EventRecord[] {
    const {
      types,
      websetId,
      searchId,
      from,
      to,
      unreadOnly = false,
      limit = 100,
    } = params;

    let candidateIds: Set<string> | null = null;

    // Filter by type first (most selective)
    if (types && types.length > 0) {
      candidateIds = new Set<string>();
      for (const type of types) {
        const typeIds = this.eventsByType.get(type);
        if (typeIds) {
          for (const id of typeIds) {
            candidateIds.add(id);
          }
        }
      }
    }

    // Get events to filter
    const idsToCheck = candidateIds ? Array.from(candidateIds) : this.orderedIds;

    const results: EventRecord[] = [];

    for (const id of idsToCheck) {
      if (results.length >= limit) break;

      const record = this.events.get(id);
      if (!record) continue;

      // Filter by unread
      if (unreadOnly && record.read) continue;

      // Filter by time range
      if (from && record.createdAt < from) continue;
      if (to && record.createdAt > to) continue;

      // Filter by websetId in event data
      if (websetId) {
        const eventData = record.payload.data as any;
        if (!eventData || eventData.websetId !== websetId) continue;
      }

      // Filter by searchId in event data
      if (searchId) {
        const eventData = record.payload.data as any;
        // Check both searchId field and id field (for search events)
        if (!eventData || (eventData.searchId !== searchId && eventData.id !== searchId)) {
          continue;
        }
      }

      results.push(record);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.createdAt - a.createdAt);

    return results;
  }

  /**
   * Mark events as read
   * @returns number of events marked
   */
  markRead(ids: string[]): number {
    let marked = 0;
    for (const id of ids) {
      const record = this.events.get(id);
      if (record && !record.read) {
        record.read = true;
        marked++;
      }
    }
    return marked;
  }

  /**
   * Purge expired events and processed IDs
   */
  purgeExpired(): void {
    const now = Date.now();
    const cutoff = now - this.ttlMs;

    // Purge expired events
    const expiredIds: string[] = [];
    for (const [id, record] of this.events) {
      if (record.createdAt < cutoff) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      const record = this.events.get(id);
      if (record) {
        // Remove from type index
        const typeSet = this.eventsByType.get(record.type);
        if (typeSet) {
          typeSet.delete(id);
          if (typeSet.size === 0) {
            this.eventsByType.delete(record.type);
          }
        }

        // Remove from main store
        this.events.delete(id);

        // Remove from ordered list
        const idx = this.orderedIds.indexOf(id);
        if (idx !== -1) {
          this.orderedIds.splice(idx, 1);
        }
      }
    }

    // Purge expired processed IDs
    const expiredProcessed: string[] = [];
    for (const [id, expiresAt] of this.processedIds) {
      if (expiresAt < now) {
        expiredProcessed.push(id);
      }
    }

    for (const id of expiredProcessed) {
      this.processedIds.delete(id);
    }
  }

  /**
   * Get store statistics
   */
  stats(): EventStoreStats {
    const byType: Record<string, number> = {};
    let unread = 0;

    for (const record of this.events.values()) {
      if (!record.read) {
        unread++;
      }
      byType[record.type] = (byType[record.type] || 0) + 1;
    }

    return {
      total: this.events.size,
      unread,
      byType,
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.sweepInterval);
    this.events.clear();
    this.eventsByType.clear();
    this.orderedIds.length = 0;
    this.processedIds.clear();
  }
}

/**
 * Singleton instance (can be initialized once per server)
 */
let globalStore: WebhookEventStore | null = null;

export function getWebhookEventStore(ttlMs?: number): WebhookEventStore {
  if (!globalStore) {
    globalStore = new WebhookEventStore(ttlMs);
  }
  return globalStore;
}
