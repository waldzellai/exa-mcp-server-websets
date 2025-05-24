import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Update Tool
 * 
 * Update a Webset's metadata using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'update');

ToolFactory.registerTool({
  name: toolName,
  description: "Update a Webset's metadata using Exa's Websets API.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The Webset ID to update"),
    metadata: z.record(z.string().max(1000)).optional().describe("Metadata key-value pairs to update")
  },
  handler: async ({ apiKey, id, metadata }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Updating webset: ${id}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log("Sending webset update request");
      
      // Update the webset
      const result = await services.websetService.updateWebset(id, { metadata });
      
      logger.log(`Webset updated successfully: ${result.id}`);
      
      const responseData = {
        success: true,
        websetId: result.id,
        status: result.status,
        updatedAt: result.updatedAt,
        metadata: result.metadata,
        message: "Webset updated successfully",
        changes: {
          ...(metadata && { metadata: "Updated" })
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
      logger.log(`Failed to update webset: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to update webset",
            message: errorMessage,
            websetId: id,
            troubleshooting: [
              "Verify the webset ID is correct",
              "Check that your API key has access to this webset",
              "Ensure the webset exists and hasn't been deleted",
              "Verify metadata values are strings with max 1000 characters",
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