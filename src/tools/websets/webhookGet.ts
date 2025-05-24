import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Webhook Get Tool
 * 
 * Get a webhook by ID from Exa Websets. Returns the webhook object on success.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'webhook_get');

ToolFactory.registerTool({
  name: toolName,
  description: "Get a webhook by ID from Exa Websets. Returns the webhook object on success.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The ID of the webhook to retrieve")
  },
  handler: async ({ apiKey, id }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Getting webhook: ${id}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log("Fetching webhook details");
      
      // Get the webhook
      const result = await services.webhookService.getWebhook(id);
      
      logger.log(`Webhook retrieved successfully: ${result.status}`);
      
      const responseData = {
        success: true,
        webhook: {
          id: result.id,
          url: result.url,
          events: result.events,
          status: result.status,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          ...(result.metadata && { metadata: result.metadata })
        },
        webhookInfo: {
          isActive: result.status === 'active',
          eventCount: result.events.length,
          subscribedEvents: result.events,
          lastUpdated: result.updatedAt
        },
        nextSteps: [
          `List webhook attempts with websets_webhook_list_attempts using webhookId "${id}"`,
          `Update webhook with websets_webhook_update using webhookId "${id}"`,
          `Delete webhook with websets_webhook_delete using webhookId "${id}"`,
          "Monitor webhook events with websets_event_list"
        ]
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
      logger.log(`Failed to get webhook: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to get webhook",
            message: errorMessage,
            webhookId: id,
            troubleshooting: [
              "Verify the webhook ID is correct",
              "Check that your API key has access to this webhook",
              "Ensure the webhook exists and hasn't been deleted",
              "Try listing all webhooks with websets_webhook_list",
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