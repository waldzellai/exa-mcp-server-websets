import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets List Tool
 * 
 * List all Websets using Exa's Websets API. Supports pagination.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'list');

ToolFactory.registerTool({
  name: toolName,
  description: "List all Websets using Exa's Websets API. Supports pagination.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    cursor: z.string().optional().describe("Pagination cursor"),
    limit: z.number().min(1).max(100).optional().describe("Number of Websets to return (1-100)")
  },
  handler: async ({ apiKey, cursor, limit }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start("Listing websets");
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log(`Fetching websets with limit: ${limit || 25}`);
      
      // List websets
      const result = await services.websetService.listWebsets(cursor, limit);
      
      logger.log(`Found ${result.data?.length || 0} websets`);
      
      const responseData = {
        success: true,
        websets: result.data?.map(webset => ({
          id: webset.id,
          status: webset.status,
          createdAt: webset.createdAt,
          updatedAt: webset.updatedAt,
          ...(webset.externalId && { externalId: webset.externalId }),
          metadata: webset.metadata,
          searchCount: webset.searches?.length || 0,
          enrichmentCount: webset.enrichments?.length || 0
        })) || [],
        pagination: {
          ...(result.nextCursor && { nextCursor: result.nextCursor }),
          hasMore: !!result.nextCursor,
          count: result.data?.length || 0
        },
        summary: {
          totalReturned: result.data?.length || 0,
          ...(result.nextCursor && { hasMore: true })
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
      logger.log(`Failed to list websets: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to list websets",
            message: errorMessage,
            troubleshooting: [
              "Verify your API key is valid and has Websets access",
              "Check if the cursor parameter is valid if provided",
              "Ensure limit is between 1 and 100 if specified",
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