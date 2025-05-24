import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Webhook Delete Tool
 * 
 * Delete a webhook from Exa Websets by ID. Returns the deleted webhook object on success.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'webhook_delete');

ToolFactory.registerTool({
  name: toolName,
  description: "Delete a webhook from Exa Websets by ID. Returns the deleted webhook object on success.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The ID of the webhook to delete")
  },
  handler: async ({ apiKey, id }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Deleting webhook: ${id}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      // Get webhook info before deletion
      let webhookInfo;
      try {
        webhookInfo = await services.webhookService.getWebhook(id);
        logger.log(`Current webhook URL: ${webhookInfo.url}`);
        logger.log(`Webhook events: ${webhookInfo.events.join(', ')}`);
      } catch (error) {
        logger.log("Could not fetch webhook info before deletion");
      }
      
      logger.log("Sending webhook deletion request");
      
      // Delete the webhook
      const result = await services.webhookService.deleteWebhook(id);
      
      logger.log(`Webhook deleted successfully: ${id}`);
      
      const responseData = {
        success: true,
        webhookId: id,
        message: "Webhook deleted successfully",
        deletedAt: new Date().toISOString(),
        ...(webhookInfo && {
          deletedWebhook: {
            url: webhookInfo.url,
            events: webhookInfo.events,
            status: webhookInfo.status,
            createdAt: webhookInfo.createdAt,
            ...(webhookInfo.metadata && { metadata: webhookInfo.metadata })
          }
        }),
        details: "The webhook has been permanently removed and will no longer receive events",
        impact: [
          "No more webhook events will be sent to the registered URL",
          "All webhook attempt history will be retained for audit purposes",
          "The webhook cannot be recovered after deletion"
        ],
        nextSteps: [
          "Create a new webhook if needed with websets_webhook_create",
          "List remaining webhooks with websets_webhook_list",
          "Monitor events with websets_event_list"
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
      logger.log(`Failed to delete webhook: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to delete webhook",
            message: errorMessage,
            webhookId: id,
            troubleshooting: [
              "Verify the webhook ID is correct",
              "Check that your API key has access to this webhook",
              "Ensure the webhook exists and hasn't already been deleted",
              "Try listing webhooks with websets_webhook_list to verify the ID",
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