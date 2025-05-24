import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Webhook Create Tool
 * 
 * Create a webhook for Exa Websets events. Registers a webhook for the specified events and URL.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'webhook_create');

const webhookEventTypes = [
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
  description: "Create a webhook for Exa Websets events. Registers a webhook for the specified events and URL. Returns the webhook object on success.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    events: z.array(z.enum(webhookEventTypes)).describe("Events to trigger the webhook"),
    url: z.string().url().describe("The URL to send the webhook to"),
    metadata: z.record(z.string().max(1000)).optional().describe("Key-value metadata to associate with the webhook")
  },
  handler: async ({ apiKey, events, url, metadata }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Creating webhook for URL: ${url}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log(`Creating webhook for ${events.length} event types`);
      logger.log(`Events: ${events.join(', ')}`);
      
      // Create the webhook
      const result = await services.webhookService.createWebhook({
        events,
        url,
        metadata
      });
      
      logger.log(`Webhook created successfully: ${result.id}`);
      
      const responseData = {
        success: true,
        webhook: {
          id: result.id,
          url: result.url,
          events: result.events,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          status: result.status,
          ...(result.metadata && { metadata: result.metadata })
        },
        message: "Webhook created successfully and is now active",
        details: {
          eventCount: events.length,
          subscribedEvents: events,
          webhookUrl: url,
          deliveryInfo: "Webhook events will be delivered via HTTP POST requests"
        },
        nextSteps: [
          `Monitor webhook deliveries with websets_webhook_list_attempts using webhookId "${result.id}"`,
          `Update webhook settings with websets_webhook_update using webhookId "${result.id}"`,
          "Ensure your webhook endpoint can handle POST requests and return 2xx status codes",
          "Check webhook events with websets_event_list to see available events"
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
      logger.log(`Failed to create webhook: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to create webhook",
            message: errorMessage,
            providedUrl: url,
            providedEvents: events,
            troubleshooting: [
              "Verify the webhook URL is accessible and accepts POST requests",
              "Check that your API key has webhook creation permissions",
              "Ensure all event types are valid webhook events",
              "Verify metadata values are strings with max 1000 characters",
              "Test your webhook endpoint manually before registering",
              "Try again in a few moments if this is a temporary issue"
            ],
            supportedEvents: webhookEventTypes
          }, null, 2)
        }],
        isError: true
      };
    }
  },
  enabled: true
});