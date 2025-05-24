import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Enrichment Get Tool
 * 
 * Retrieve an Enrichment by ID from a Webset using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'enrichment_get');

ToolFactory.registerTool({
  name: toolName,
  description: "Retrieve an Enrichment by ID from a Webset using Exa's Websets API.",
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
    
    logger.start(`Getting enrichment: ${id} from webset: ${webset}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log("Fetching enrichment details");
      
      // Get the enrichment
      const result = await services.enrichmentService.getEnrichment(webset, id);
      
      logger.log(`Enrichment retrieved successfully: ${result.status}`);
      
      const responseData = {
        success: true,
        enrichment: {
          id: result.id,
          websetId: webset,
          status: result.status,
          description: result.description,
          format: result.format,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          ...(result.options && { options: result.options }),
          ...(result.metadata && { metadata: result.metadata })
        },
        statusInfo: {
          isComplete: services.enrichmentService.isEnrichmentComplete(result),
          isRunning: services.enrichmentService.isEnrichmentRunning(result),
          isCanceled: services.enrichmentService.isEnrichmentCanceled(result)
        }
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
      logger.log(`Failed to get enrichment: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to get enrichment",
            message: errorMessage,
            websetId: webset,
            enrichmentId: id,
            troubleshooting: [
              "Verify the webset ID and enrichment ID are correct",
              "Check that your API key has access to this webset",
              "Ensure the enrichment exists and hasn't been deleted",
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