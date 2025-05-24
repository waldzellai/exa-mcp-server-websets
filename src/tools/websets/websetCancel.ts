import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Cancel Tool
 * 
 * Cancel a running Webset by ID using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'cancel');

ToolFactory.registerTool({
  name: toolName,
  description: "Cancel a running Webset by ID using Exa's Websets API.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    id: z.string().describe("The Webset ID to cancel")
  },
  handler: async ({ apiKey, id }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Canceling webset: ${id}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      // Get webset status before cancellation
      let websetInfo;
      try {
        websetInfo = await services.websetService.getWebset(id);
        logger.log(`Current webset status: ${websetInfo.status}`);
      } catch (error) {
        logger.log("Could not fetch webset info before cancellation");
      }
      
      logger.log("Sending webset cancellation request");
      
      // Cancel the webset
      const result = await services.websetService.cancelWebset(id);
      
      logger.log(`Webset canceled successfully: ${id}`);
      
      const responseData = {
        success: true,
        websetId: id,
        message: "Webset operations canceled successfully",
        canceledAt: new Date().toISOString(),
        details: "All enrichment and search operations have been stopped and the Webset is now marked as 'idle'",
        ...(websetInfo && {
          previousStatus: websetInfo.status,
          runningOperations: {
            searches: websetInfo.searches?.filter(s => s.status === 'running').length || 0,
            enrichments: websetInfo.enrichments?.filter(e => e.status === 'pending').length || 0
          }
        }),
        nextSteps: [
          `Use websets_get_status with websetId "${id}" to confirm cancellation`,
          "Review any partial results that may have been generated",
          "Restart operations if needed with new searches or enrichments"
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
      logger.log(`Failed to cancel webset: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to cancel webset",
            message: errorMessage,
            websetId: id,
            troubleshooting: [
              "Verify the webset ID is correct",
              "Check that your API key has access to this webset",
              "Ensure the webset exists and has running operations to cancel",
              "The webset may already be idle or completed",
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