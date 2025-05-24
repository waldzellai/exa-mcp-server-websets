import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Enrichment Cancel Tool
 * 
 * Cancel a running Enrichment by ID using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'enrichment_cancel');

ToolFactory.registerTool({
  name: toolName,
  description: "Cancel a running Enrichment by ID using Exa's Websets API.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Enrichment ID")
  },
  handler: async ({ apiKey, webset, id }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Canceling enrichment: ${id} from webset: ${webset}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      // Get enrichment status before cancellation
      let enrichmentInfo;
      try {
        enrichmentInfo = await services.enrichmentService.getEnrichment(webset, id);
        logger.log(`Current enrichment status: ${enrichmentInfo.status}`);
      } catch (error) {
        logger.log("Could not fetch enrichment info before cancellation");
      }
      
      logger.log("Sending enrichment cancellation request");
      
      // Cancel the enrichment
      const result = await services.enrichmentService.cancelEnrichment(webset, id);
      
      logger.log(`Enrichment canceled successfully: ${id}`);
      
      const responseData = {
        success: true,
        enrichmentId: id,
        websetId: webset,
        status: result.status,
        message: "Enrichment canceled successfully",
        canceledAt: new Date().toISOString(),
        ...(enrichmentInfo && {
          previousStatus: enrichmentInfo.status,
          enrichmentDetails: {
            description: enrichmentInfo.description,
            format: enrichmentInfo.format,
            createdAt: enrichmentInfo.createdAt
          }
        }),
        details: "The enrichment operation has been stopped and will not continue processing",
        impact: [
          "Items already enriched will keep their enrichment data",
          "Items not yet processed will not receive this enrichment",
          "The enrichment can be deleted or a new one created if needed"
        ],
        nextSteps: [
          `Use websets_enrichment_get with enrichmentId "${id}" to confirm cancellation`,
          "Review any partial enrichment results that may have been generated",
          "Create a new enrichment if needed with websets_enrichment_create"
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
      logger.log(`Failed to cancel enrichment: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to cancel enrichment",
            message: errorMessage,
            websetId: webset,
            enrichmentId: id,
            troubleshooting: [
              "Verify the webset ID and enrichment ID are correct",
              "Check that your API key has access to this webset",
              "Ensure the enrichment exists and is currently running",
              "The enrichment may already be completed or canceled",
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