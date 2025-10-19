/**
 * Webhook Events Tool
 * 
 * Retrieve stored webhook events with filters and mark as read
 */

import { z } from 'zod';
import { getWebhookEventStore } from '../state/WebhookEventStore.js';

/**
 * Tool schema (plain object format for MCP server.tool())
 */
export const webhookEventsSchema = {
  types: z.array(z.string()).optional().describe('Filter by event types (e.g., ["webset.search.completed"])'),
  websetId: z.string().optional().describe('Filter by webset ID'),
  searchId: z.string().optional().describe('Filter by search ID'),
  from: z.string().optional().describe('Filter events after this ISO timestamp'),
  to: z.string().optional().describe('Filter events before this ISO timestamp'),
  unreadOnly: z.boolean().default(true).describe('Only return unread events'),
  limit: z.number().min(1).max(500).default(50).describe('Maximum number of events to return'),
  markAsRead: z.boolean().default(true).describe('Mark returned events as read'),
};

export type WebhookEventsInput = {
  types?: string[];
  websetId?: string;
  searchId?: string;
  from?: string;
  to?: string;
  unreadOnly?: boolean;
  limit?: number;
  markAsRead?: boolean;
};

/**
 * Tool handler
 */
export async function getWebhookEventsHandler(input: WebhookEventsInput) {
  const store = getWebhookEventStore();

  // Convert ISO strings to timestamps
  const from = input.from ? Date.parse(input.from) : undefined;
  const to = input.to ? Date.parse(input.to) : undefined;

  // Query events
  const events = store.get({
    types: input.types,
    websetId: input.websetId,
    searchId: input.searchId,
    from,
    to,
    unreadOnly: input.unreadOnly,
    limit: input.limit,
  });

  // Mark as read if requested
  let markedCount = 0;
  if (input.markAsRead && events.length > 0) {
    const eventIds = events.map(e => e.id);
    markedCount = store.markRead(eventIds);
  }

  // Get stats
  const stats = store.stats();

  // Format response
  const response = {
    events: events.map(e => ({
      id: e.id,
      type: e.type,
      createdAt: new Date(e.createdAt).toISOString(),
      data: e.payload.data,
      read: e.read,
    })),
    count: events.length,
    markedAsRead: markedCount,
    totalStored: stats.total,
    unreadCount: stats.unread,
  };

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(response, null, 2)
    }]
  };
}

/**
 * Tool registration object
 */
export const webhookEventsTool = {
  name: 'get_webhook_events',
  description: 'Retrieve stored webhook events with filters; optionally mark as read. Use this to check for real-time updates from Exa searches, enrichments, and other async operations.',
  schema: webhookEventsSchema,
  handler: getWebhookEventsHandler,
};
