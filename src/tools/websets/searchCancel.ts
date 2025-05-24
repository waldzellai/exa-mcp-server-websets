import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Search Cancel Tool
 * 
 * Cancel a running Search by ID using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'search_cancel');

ToolFactory.registerTool({
  name: toolName,
  description: "Cancel a running Search by ID using Exa's Websets API.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    id: z.string().describe("The Search ID")
  },
  handler: async ({ apiKey, webset, id }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Canceling search: ${id} from webset: ${webset}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      // Get search status before cancellation
      let searchInfo;
      try {
        searchInfo = await services.searchService.getSearch(webset, id);
        logger.log(`Current search status: ${searchInfo.status}`);
      } catch (error) {
        logger.log("Could not fetch search info before cancellation");
      }
      
      logger.log("Sending search cancellation request");
      
      // Cancel the search
      const result = await services.searchService.cancelSearch(webset, id);
      
      logger.log(`Search canceled successfully: ${id}`);
      
      const responseData = {
        success: true,
        searchId: id,
        websetId: webset,
        status: result.status,
        message: "Search canceled successfully",
        canceledAt: new Date().toISOString(),
        ...(searchInfo && {
          previousStatus: searchInfo.status,
          progress: searchInfo.progress && {
            completion: searchInfo.progress.completion,
            found: searchInfo.progress.found
          }
        }),
        details: "The search operation has been stopped and will not continue processing",
        nextSteps: [
          `Use websets_search_get with searchId "${id}" to confirm cancellation`,
          "Review any partial results that may have been generated",
          "Create a new search if needed with websets_search_create"
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
      logger.log(`Failed to cancel search: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to cancel search",
            message: errorMessage,
            websetId: webset,
            searchId: id,
            troubleshooting: [
              "Verify the webset ID and search ID are correct",
              "Check that your API key has access to this webset",
              "Ensure the search exists and is currently running",
              "The search may already be completed or canceled",
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