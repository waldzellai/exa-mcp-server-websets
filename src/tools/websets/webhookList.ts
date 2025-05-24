import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Webhook List Tool
 * 
 * List webhooks from Exa Websets. Supports pagination. Returns a list of webhooks.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'webhook_list');

ToolFactory.registerTool({
  name: toolName,
  description: "List webhooks from Exa Websets. Supports pagination. Returns a list of webhooks.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    cursor: z.string().optional().describe("Cursor for pagination"),
    limit: z.number().min(1).max(200).optional().describe("Number of results to return (1-200, default: 25)")
  },
  handler: async ({ apiKey, cursor, limit }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start("Listing webhooks");
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log(`Fetching webhooks with limit: ${limit || 25}`);
      if (cursor) {
        logger.log(`Using pagination cursor: ${cursor.substring(0, 20)}...`);
      }
      
      // List webhooks
      const result = await services.webhookService.listWebhooks({
        cursor,
        limit
      });
      
      const webhooks = result.webhooks || [];
      logger.log(`Retrieved ${webhooks.length} webhooks`);
      
      const responseData = {
        success: true,
        webhooks: webhooks.map(webhook => ({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          status: webhook.status,
          createdAt: webhook.createdAt,
          updatedAt: webhook.updatedAt,
          ...(webhook.metadata && { metadata: webhook.metadata })
        })),
        pagination: {
          hasMore: !!result.nextCursor,
          nextCursor: result.nextCursor,
          currentLimit: limit || 25,
          totalReturned: webhooks.length
        },
        summary: {
          totalWebhooks: webhooks.length,
          activeWebhooks: webhooks.filter(w => w.status === 'active').length,
          uniqueUrls: new Set(webhooks.map(w => w.url)).size,
          eventTypes: [...new Set(webhooks.flatMap(w => w.events))].sort()
        },
        nextSteps: [
          "Use websets_webhook_get to get details for specific webhooks",
          "Use websets_webhook_create to create new webhooks",
          result.nextCursor ? `Use cursor "${result.nextCursor}" to get next page` : null,
          "Monitor webhook attempts with websets_webhook_list_attempts"
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
      logger.log(`Failed to list webhooks: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to list webhooks",
            message: errorMessage,
            troubleshooting: [
              "Check that your API key has webhook access permissions",
              "Verify the cursor is valid if using pagination",
              "Ensure the limit is between 1-200 if specified",
              "Try again in a few moments if this is a temporary issue"
            ]
          }, null, 2)
        }],
        isError: true
      };
    }
  },
  enabled: true
});