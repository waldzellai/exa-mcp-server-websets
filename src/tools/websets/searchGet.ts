import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Search Get Tool
 * 
 * Retrieve a Search by ID from a Webset using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'search_get');

ToolFactory.registerTool({
  name: toolName,
  description: "Retrieve a Search by ID from a Webset using Exa's Websets API.",
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
    
    logger.start(`Getting search: ${id} from webset: ${webset}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log("Fetching search details");
      
      // Get the search
      const result = await services.searchService.getSearch(webset, id);
      
      logger.log(`Search retrieved successfully: ${result.status}`);
      
      const responseData = {
        success: true,
        search: {
          id: result.id,
          websetId: webset,
          status: result.status,
          query: result.query,
          count: result.count,
          entity: result.entity,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          ...(result.criteria && { criteria: result.criteria }),
          ...(result.metadata && { metadata: result.metadata }),
          ...(result.progress && {
            progress: {
              completion: result.progress.completion,
              found: result.progress.found
            }
          })
        },
        statusInfo: {
          isComplete: services.searchService.isSearchComplete(result),
          isRunning: services.searchService.isSearchRunning(result),
          isCanceled: services.searchService.isSearchCanceled(result),
          progressPercentage: services.searchService.getSearchProgress(result),
          resultsFound: services.searchService.getSearchResultsCount(result)
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
      logger.log(`Failed to get search: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to get search",
            message: errorMessage,
            websetId: webset,
            searchId: id,
            troubleshooting: [
              "Verify the webset ID and search ID are correct",
              "Check that your API key has access to this webset",
              "Ensure the search exists and hasn't been deleted",
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