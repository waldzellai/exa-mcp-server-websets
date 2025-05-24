import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Enrichment Delete Tool
 * 
 * Delete an Enrichment by ID from a Webset using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'enrichment_delete');

ToolFactory.registerTool({
  name: toolName,
  description: "Delete an Enrichment by ID from a Webset using Exa's Websets API.",
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
    
    logger.start(`Deleting enrichment: ${id} from webset: ${webset}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      // Get enrichment info before deletion
      let enrichmentInfo;
      try {
        enrichmentInfo = await services.enrichmentService.getEnrichment(webset, id);
        logger.log(`Current enrichment status: ${enrichmentInfo.status}`);
      } catch (error) {
        logger.log("Could not fetch enrichment info before deletion");
      }
      
      logger.log("Sending enrichment deletion request");
      
      // Delete the enrichment
      const result = await services.enrichmentService.deleteEnrichment(webset, id);
      
      logger.log(`Enrichment deleted successfully: ${id}`);
      
      const responseData = {
        success: true,
        enrichmentId: id,
        websetId: webset,
        message: "Enrichment deleted successfully",
        deletedAt: new Date().toISOString(),
        ...(enrichmentInfo && {
          deletedEnrichment: {
            description: enrichmentInfo.description,
            format: enrichmentInfo.format,
            status: enrichmentInfo.status,
            createdAt: enrichmentInfo.createdAt
          }
        }),
        details: "The enrichment has been permanently removed and will no longer process Items",
        impact: [
          "Existing enrichment data on Items will remain unchanged",
          "New Items will not receive this enrichment",
          "The enrichment cannot be recovered after deletion"
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
      logger.log(`Failed to delete enrichment: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to delete enrichment",
            message: errorMessage,
            websetId: webset,
            enrichmentId: id,
            troubleshooting: [
              "Verify the webset ID and enrichment ID are correct",
              "Check that your API key has access to this webset",
              "Ensure the enrichment exists and hasn't already been deleted",
              "Try canceling the enrichment first if it's currently running",
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