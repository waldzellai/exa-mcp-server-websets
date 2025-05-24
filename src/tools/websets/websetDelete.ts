import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Delete Tool
 * 
 * Delete a Webset by ID using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'delete');

ToolFactory.registerTool({
  name: toolName,
  description: "Delete a Webset by ID using Exa's Websets API.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The Webset ID to delete")
  },
  handler: async ({ apiKey, id }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Deleting webset: ${id}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      // Get webset info before deletion for confirmation
      let websetInfo;
      try {
        websetInfo = await services.websetService.getWebset(id);
        logger.log(`Found webset to delete: ${websetInfo.status}`);
      } catch (error) {
        logger.log("Could not fetch webset info before deletion");
      }
      
      logger.log("Sending webset deletion request");
      
      // Delete the webset
      const result = await services.websetService.deleteWebset(id);
      
      logger.log(`Webset deleted successfully: ${id}`);
      
      const responseData = {
        success: true,
        websetId: id,
        message: "Webset deleted successfully",
        deletedAt: new Date().toISOString(),
        warning: "This action cannot be undone. The Webset and all its Items are no longer available.",
        ...(websetInfo && {
          deletedWebset: {
            status: websetInfo.status,
            createdAt: websetInfo.createdAt,
            ...(websetInfo.externalId && { externalId: websetInfo.externalId })
          }
        })
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
      logger.log(`Failed to delete webset: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to delete webset",
            message: errorMessage,
            websetId: id,
            troubleshooting: [
              "Verify the webset ID is correct",
              "Check that your API key has access to this webset",
              "Ensure the webset exists and hasn't already been deleted",
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