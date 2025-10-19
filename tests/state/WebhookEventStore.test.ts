/**
 * WebhookEventStore Tests
 * 
 * Comprehensive test coverage for in-memory event storage with TTL, deduplication, and filtering.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { WebhookEventStore, type ExaEvent } from '../../src/state/WebhookEventStore.js';

describe('WebhookEventStore', () => {
  let store: WebhookEventStore;
  
  beforeEach(() => {
    jest.useFakeTimers();
    // Use small TTL for faster tests (1 second)
    store = new WebhookEventStore(1000);
  });
  
  afterEach(() => {
    store.destroy();
    jest.useRealTimers();
  });
  
  describe('Event Storage and TTL', () => {
    it('should store events with TTL expiry', () => {
      const event: ExaEvent = {
        id: 'evt_1',
        type: 'webset.search.completed',
        data: { searchId: 's_123' },
        createdAt: new Date().toISOString()
      };
      
      // Add event
      const added = store.add(event);
      expect(added).toBe(true);
      
      // Event should be present
      const results = store.get({ types: ['webset.search.completed'] });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('evt_1');
      
      // Advance time beyond TTL
      jest.advanceTimersByTime(1100);
      
      // Trigger cleanup (automatic via setInterval every 60s, but we force it)
      jest.advanceTimersByTime(60000);
      
      // Event should be expired
      const afterExpiry = store.get({});
      expect(afterExpiry).toHaveLength(0);
    });
    
    it('should reject events that are already expired', () => {
      const oldEvent: ExaEvent = {
        id: 'evt_old',
        type: 'webset.completed',
        data: {},
        createdAt: new Date(Date.now() - 2000).toISOString() // 2 seconds ago, past TTL
      };
      
      const added = store.add(oldEvent);
      expect(added).toBe(false);
      
      const results = store.get({});
      expect(results).toHaveLength(0);
    });
  });
  
  describe('Deduplication', () => {
    it('should deduplicate events with same ID', () => {
      const event: ExaEvent = {
        id: 'evt_dup',
        type: 'webset.item.created',
        data: { itemId: 'i_123' },
        createdAt: new Date().toISOString()
      };
      
      // Add same event twice
      const first = store.add(event);
      const second = store.add(event);
      
      expect(first).toBe(true);
      expect(second).toBe(false); // Duplicate rejected
      
      // Only one event should exist
      const results = store.get({});
      expect(results).toHaveLength(1);
    });
    
    it('should allow same ID after TTL expiry', () => {
      const event: ExaEvent = {
        id: 'evt_reuse',
        type: 'webset.created',
        data: {},
        createdAt: new Date().toISOString()
      };
      
      // Add event
      store.add(event);
      
      // Advance past TTL and trigger cleanup
      jest.advanceTimersByTime(1100);
      jest.advanceTimersByTime(60000);
      
      // Now same ID can be added again
      const newEvent = { ...event, createdAt: new Date().toISOString() };
      const added = store.add(newEvent);
      expect(added).toBe(true);
    });
  });
  
  describe('Filtering', () => {
    beforeEach(() => {
      // Seed store with diverse events
      const events: ExaEvent[] = [
        {
          id: 'evt_1',
          type: 'webset.search.completed',
          data: { websetId: 'ws_1', searchId: 's_1' },
          createdAt: new Date(Date.now() - 500).toISOString()
        },
        {
          id: 'evt_2',
          type: 'webset.item.created',
          data: { websetId: 'ws_1', itemId: 'i_1' },
          createdAt: new Date(Date.now() - 400).toISOString()
        },
        {
          id: 'evt_3',
          type: 'webset.search.completed',
          data: { websetId: 'ws_2', searchId: 's_2' },
          createdAt: new Date(Date.now() - 300).toISOString()
        },
        {
          id: 'evt_4',
          type: 'webset.item.enriched',
          data: { websetId: 'ws_2', itemId: 'i_2' },
          createdAt: new Date(Date.now() - 200).toISOString()
        }
      ];
      
      events.forEach(e => store.add(e));
    });
    
    it('should filter by event types', () => {
      const results = store.get({ types: ['webset.search.completed'] });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'webset.search.completed')).toBe(true);
    });
    
    it('should filter by websetId', () => {
      const results = store.get({ websetId: 'ws_1' });
      expect(results).toHaveLength(2);
      expect(results.every(r => (r.payload.data as any).websetId === 'ws_1')).toBe(true);
    });
    
    it('should filter by searchId', () => {
      const results = store.get({ searchId: 's_2' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('evt_3');
    });
    
    it('should filter by time range', () => {
      const now = Date.now();
      const from = now - 450;
      const to = now - 250;
      
      const results = store.get({ from, to });
      expect(results).toHaveLength(2);
      expect(results.map(r => r.id).sort()).toEqual(['evt_2', 'evt_3']);
    });
    
    it('should filter by unread only', () => {
      // Mark some events as read
      store.markRead(['evt_1', 'evt_2']);
      
      const unreadResults = store.get({ unreadOnly: true });
      expect(unreadResults).toHaveLength(2);
      expect(unreadResults.map(r => r.id).sort()).toEqual(['evt_3', 'evt_4']);
      
      const allResults = store.get({ unreadOnly: false });
      expect(allResults).toHaveLength(4);
    });
    
    it('should combine multiple filters', () => {
      const results = store.get({
        types: ['webset.search.completed'],
        websetId: 'ws_2'
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('evt_3');
    });
    
    it('should respect limit parameter', () => {
      const results = store.get({ limit: 2 });
      expect(results).toHaveLength(2);
    });
    
    it('should return empty array for no matches', () => {
      const results = store.get({ types: ['nonexistent.type'] });
      expect(results).toHaveLength(0);
    });
  });
  
  describe('Mark as Read', () => {
    beforeEach(() => {
      const events: ExaEvent[] = [
        { id: 'evt_1', type: 'test.event', data: {}, createdAt: new Date().toISOString() },
        { id: 'evt_2', type: 'test.event', data: {}, createdAt: new Date().toISOString() },
        { id: 'evt_3', type: 'test.event', data: {}, createdAt: new Date().toISOString() }
      ];
      events.forEach(e => store.add(e));
    });
    
    it('should mark events as read', () => {
      const marked = store.markRead(['evt_1', 'evt_2']);
      expect(marked).toBe(2);
      
      const unread = store.get({ unreadOnly: true });
      expect(unread).toHaveLength(1);
      expect(unread[0].id).toBe('evt_3');
    });
    
    it('should not double-count already read events', () => {
      store.markRead(['evt_1']);
      const marked = store.markRead(['evt_1', 'evt_2']);
      expect(marked).toBe(1); // Only evt_2 was newly marked
    });
    
    it('should handle non-existent event IDs gracefully', () => {
      const marked = store.markRead(['nonexistent']);
      expect(marked).toBe(0);
    });
  });
  
  describe('Expiry Boundary Conditions', () => {
    it('should correctly expire only old events', () => {
      // Add events at different times
      const oldEvent: ExaEvent = {
        id: 'evt_old',
        type: 'test.old',
        data: {},
        createdAt: new Date(Date.now() - 500).toISOString()
      };
      store.add(oldEvent);
      
      // Advance time but not past TTL
      jest.advanceTimersByTime(600);
      
      const recentEvent: ExaEvent = {
        id: 'evt_recent',
        type: 'test.recent',
        data: {},
        createdAt: new Date().toISOString()
      };
      store.add(recentEvent);
      
      // Now old event should be past TTL (500 + 600 = 1100ms > 1000ms)
      // But recent event is fresh
      jest.advanceTimersByTime(60000); // Trigger cleanup
      
      const results = store.get({});
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('evt_recent');
    });
  });
  
  describe('Statistics', () => {
    it('should calculate correct statistics', () => {
      const events: ExaEvent[] = [
        { id: 'evt_1', type: 'type_a', data: {}, createdAt: new Date().toISOString() },
        { id: 'evt_2', type: 'type_a', data: {}, createdAt: new Date().toISOString() },
        { id: 'evt_3', type: 'type_b', data: {}, createdAt: new Date().toISOString() }
      ];
      events.forEach(e => store.add(e));
      
      store.markRead(['evt_1']);
      
      const stats = store.stats();
      expect(stats.total).toBe(3);
      expect(stats.unread).toBe(2);
      expect(stats.byType['type_a']).toBe(2);
      expect(stats.byType['type_b']).toBe(1);
    });
    
    it('should return correct stats for empty store', () => {
      const stats = store.stats();
      expect(stats.total).toBe(0);
      expect(stats.unread).toBe(0);
      expect(Object.keys(stats.byType)).toHaveLength(0);
    });
  });
  
  describe('Cleanup and Destroy', () => {
    it('should clean up expired processed IDs', () => {
      const event: ExaEvent = {
        id: 'evt_cleanup',
        type: 'test.event',
        data: {},
        createdAt: new Date().toISOString()
      };
      
      store.add(event);
      
      // Advance past TTL and trigger cleanup
      jest.advanceTimersByTime(1100);
      jest.advanceTimersByTime(60000);
      
      // Try adding same ID again - should succeed since processed ID was cleaned up
      const newEvent = { ...event, createdAt: new Date().toISOString() };
      const added = store.add(newEvent);
      expect(added).toBe(true);
    });
    
    it('should stop cleanup interval on destroy', () => {
      const event: ExaEvent = {
        id: 'evt_destroy',
        type: 'test.event',
        data: {},
        createdAt: new Date().toISOString()
      };
      
      store.add(event);
      store.destroy();
      
      // Store should be empty after destroy
      const stats = store.stats();
      expect(stats.total).toBe(0);
    });
  });
});
