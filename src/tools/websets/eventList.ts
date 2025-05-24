import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Event List Tool
 * 
 * Stream events that have occurred in the Exa Websets system. Supports filtering by event types 
 * and real-time streaming of events. Returns events in descending order by creation time.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'event_list');

const eventTypes = [
  "webset.created",
  "webset.deleted", 
  "webset.paused",
  "webset.idle",
  "webset.search.created",
  "webset.search.canceled",
  "webset.search.completed",
  "webset.search.updated",
  "webset.export.created",
  "webset.export.completed",
  "webset.item.created",
  "webset.item.enriched"
] as const;

ToolFactory.registerTool({
  name: toolName,
  description: "Stream events that have occurred in the Exa Websets system. Supports filtering by event types and real-time streaming of events. Returns events in descending order by creation time.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    cursor: z.string().optional().describe("Cursor for pagination"),
    limit: z.number().min(1).max(100).optional().describe("Maximum total number of events to return"),
    types: z.array(z.enum(eventTypes)).optional().describe("Event types to filter by"),
    streamFormat: z.enum(["jsonl", "json"]).optional().describe("Format for streaming: 'jsonl' (default) for line-delimited JSON or 'json' for a complete JSON array"),
    batchSize: z.number().min(1).max(100).optional().describe("Number of events to process in each batch (1-100, default: 25)")
  },
  handler: async ({ apiKey, cursor, limit, types, streamFormat, batchSize }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start("Listing events");
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log(`Fetching events with limit: ${limit || 'unlimited'}`);
      if (cursor) {
        logger.log(`Using pagination cursor: ${cursor.substring(0, 20)}...`);
      }
      if (types && types.length > 0) {
        logger.log(`Filtering by event types: ${types.join(', ')}`);
      }
      
      // List events
      const result = await services.eventService.listEvents({
        cursor,
        limit,
        types,
        streamFormat,
        batchSize
      });
      
      const events = result.events || [];
      logger.log(`Retrieved ${events.length} events`);
      
      const responseData = {
        success: true,
        events: events.map(event => ({
          id: event.id,
          type: event.type,
          createdAt: event.createdAt,
          data: event.data
        })),
        pagination: {
          hasMore: !!result.nextCursor,
          nextCursor: result.nextCursor,
          currentLimit: limit,
          totalReturned: events.length
        },
        summary: {
          totalEvents: events.length,
          eventTypes: [...new Set(events.map(e => e.type))].sort(),
          timeRange: events.length > 0 ? {
            earliest: events[events.length - 1]?.createdAt,
            latest: events[0]?.createdAt
          } : null,
          websetIds: [...new Set(events.map(e => e.data?.websetId).filter(Boolean))]
        },
        streamInfo: {
          format: streamFormat || 'jsonl',
          batchSize: batchSize || 25,
          isStreaming: !!streamFormat
        },
        nextSteps: [
          "Use websets_event_get to get details for specific events",
          result.nextCursor ? `Use cursor "${result.nextCursor}" to get next page` : null,
          "Filter by specific event types using the 'types' parameter",
          "Set up webhooks with websets_webhook_create to receive real-time events"
        ].filter(Boolean)
      };
      
      const response = {
        content: [{
          type: "text" as const,
          text: JSON.stringify(responseData, null, 2)
        }]
      };
      
      logger.complete();
      return response;
      
    } catch (error) {
      logger.error(error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.log(`Failed to list events: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to list events",
            message: errorMessage,
            troubleshooting: [
              "Check that your API key has event access permissions",
              "Verify the cursor is valid if using pagination",
              "Ensure event types are valid if filtering",
              "Check that limit and batchSize are within valid ranges",
              "Try again in a few moments if this is a temporary issue"
            ],
            supportedEventTypes: eventTypes
          }, null, 2)
        }],
        isError: true
      };
    }
  },
  enabled: true
});