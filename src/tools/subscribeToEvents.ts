/**
 * Subscribe to Events Tool
 * 
 * Convenience tool for registering webhooks that point to this server's receiver endpoint.
 * Automatically constructs the webhook URL and uses configured secrets.
 */

import { z } from "zod";
import { toolRegistry, ToolCategory, ServiceType } from "./config.js";
import { createServices } from "../services/index.js";
import { createRequestLogger } from "../utils/logger.js";
import { createWebsetsConfig } from "../config/websets.js";

/**
 * Tool schema
 */
const SubscribeToEventsSchema = z.object({
  websetId: z.string().optional().describe("Webset ID to subscribe to events for (optional)"),
  eventTypes: z.array(z.string()).optional().describe("Event types to subscribe to (e.g., ['webset.search.completed', 'webset.item.enriched'])")
});

/**
 * Tool handler
 */
async function subscribeToEventsHandler(args: { websetId?: string; eventTypes?: string[] }) {
  const requestId = `subscribe_to_events-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const logger = createRequestLogger(requestId, 'subscribe_to_events');
  
  logger.start('Registering webhook subscription');
  
  try {
    // Load configuration
    const config = createWebsetsConfig();
    const webhookReceiverConfig = config.webhookReceiver;
    
    if (!webhookReceiverConfig) {
      throw new Error("Webhook receiver configuration not found");
    }
    
    // Validate required config
    const publicBaseUrl = webhookReceiverConfig.publicBaseUrl;
    if (!publicBaseUrl) {
      throw new Error(
        "PUBLIC_BASE_URL is required to construct webhook URL. " +
        "Please set it to your server's public URL (e.g., https://your-ngrok-id.ngrok.io)"
      );
    }
    
    const secrets = webhookReceiverConfig.secrets;
    if (!secrets || secrets.length === 0) {
      throw new Error(
        "WEBHOOK_SECRETS must contain at least one secret for webhook signature verification. " +
        "Please set WEBHOOK_SECRETS environment variable (comma-separated list)"
      );
    }
    
    // Construct webhook URL
    const webhookPath = webhookReceiverConfig.path || "/webhooks/exa";
    const normalizedBase = publicBaseUrl.replace(/\/$/, ""); // Remove trailing slash
    const normalizedPath = webhookPath.startsWith("/") ? webhookPath : `/${webhookPath}`;
    const webhookUrl = `${normalizedBase}${normalizedPath}`;
    
    // Use first configured secret for signing
    const secret = secrets[0];
    
    // Get API key
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error("EXA_API_KEY environment variable is required");
    }
    
    // Create services
    const services = createServices(apiKey);
    
    // Prepare request
    const createWebhookRequest: any = {
      url: webhookUrl,
      secret: secret,
      events: args.eventTypes || []
    };
    
    // Log attempt (omit secret)
    logger.log(`Creating webhook subscription: ${webhookUrl}`);
    
    // Call webhook service
    const webhook = await services.webhookService.createWebhook(createWebhookRequest);
    
    // Success log
    logger.complete();
    
    // Return normalized response
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          subscriptionId: webhook.id,
          webhookUrl: webhookUrl,
          eventTypes: webhook.events || args.eventTypes || [],
          status: webhook.status,
          message: "Webhook subscription created successfully. Events will be sent to the configured endpoint."
        }, null, 2)
      }]
    };
    
  } catch (error) {
    logger.error(error);
    
    // Re-throw with clear message
    const errorMessage = error instanceof Error ? error.message : "Unknown error creating webhook subscription";
    throw new Error(`Webhook subscription failed: ${errorMessage}`);
  }
}

/**
 * Register tool
 */
toolRegistry["subscribe_to_events"] = {
  name: "subscribe_to_events",
  description: "Register a webhook subscription with Exa that points to this server's receiver endpoint. Automatically uses PUBLIC_BASE_URL and WEBHOOK_SECRETS from configuration. Use this to receive real-time notifications about webset events like search completions, enrichment updates, and new content items.",
  schema: SubscribeToEventsSchema.shape,
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  enabled: true,
  handler: subscribeToEventsHandler
};
