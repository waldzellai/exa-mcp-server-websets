import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Event Get Tool
 * 
 * Get a single event by ID from Exa Websets. Returns the event object on success.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'event_get');

ToolFactory.registerTool({
  name: toolName,
  description: "Get a single event by ID from Exa Websets. Returns the event object on success.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The ID of the event to retrieve")
  },
  handler: async ({ apiKey, id }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start("Getting event");
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log(`Fetching event with ID: ${id}`);
      
      // Get event
      const event = await services.eventService.getEvent(id);
      
      logger.log(`Retrieved event: ${event.type}`);
      
      const responseData = {
        success: true,
        event: {
          id: event.id,
          type: event.type,
          createdAt: event.createdAt,
          data: event.data
        },
        eventDetails: {
          category: getEventCategory(event.type),
          isWebsetEvent: event.type.startsWith('webset.'),
          isSearchEvent: event.type.includes('search.'),
          isItemEvent: event.type.includes('item.'),
          websetId: event.data?.websetId || null,
          searchId: event.data?.searchId || null,
          itemId: event.data?.itemId || null
        },
        relatedActions: [
          "Use websets_event_list to see more events",
          event.data?.websetId ? `Use websets_webset_get_status to check webset ${event.data.websetId}` : null,
          event.data?.searchId ? `Use websets_search_get to check search ${event.data.searchId}` : null,
          event.data?.itemId ? `Use websets_item_get to check item ${event.data.itemId}` : null,
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
      logger.log(`Failed to get event: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to get event",
            message: errorMessage,
            eventId: id,
            troubleshooting: [
              "Check that the event ID is correct and exists",
              "Verify your API key has event access permissions",
              "Ensure the event hasn't been deleted or expired",
              "Try listing events with websets_event_list to find valid IDs",
              "Check that you have access to the webset associated with this event"
            ]
          }, null, 2)
        }],
        isError: true
      };
    }
  },
  enabled: true
});

/**
 * Get event category based on event type
 */
function getEventCategory(eventType: string): string {
  if (eventType.startsWith('webset.search.')) {
    return 'SEARCH';
  } else if (eventType.startsWith('webset.item.')) {
    return 'ITEM';
  } else if (eventType.startsWith('webset.')) {
    return 'WEBSET';
  }
  return 'UNKNOWN';
}