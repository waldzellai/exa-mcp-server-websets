import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Get Status Tool
 * 
 * Check the status of a Webset creation process and retrieve results when complete. 
 * Use this after creating a webset with the create_webset tool.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'get_status');

ToolFactory.registerTool({
  name: toolName,
  description: "Check the status of a Webset creation process and retrieve results when complete. Use this after creating a webset with the create_webset tool.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    websetId: z.string().describe("The Webset ID to check status for"),
    expand: z.string().optional().describe("Optional expand parameter, e.g., 'items' to include full results"),
    includeDetails: z.boolean().optional().describe("Whether to include detailed results. Default: true")
  },
  handler: async ({ apiKey, websetId, expand, includeDetails = true }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Checking status for webset: ${websetId}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log("Fetching webset status");
      
      // Get the webset status
      const webset = await services.websetService.getWebset(websetId);
      
      logger.log(`Webset status: ${webset.status}`);
      
      // Build response based on status
      let responseData: any = {
        success: true,
        websetId: webset.id,
        status: webset.status,
        createdAt: webset.createdAt,
        updatedAt: webset.updatedAt,
        ...(webset.externalId && { externalId: webset.externalId }),
        metadata: webset.metadata
      };
      
      // Add search information
      if (webset.searches && webset.searches.length > 0) {
        responseData.searches = webset.searches.map(search => ({
          id: search.id,
          status: search.status,
          query: search.query,
          count: search.count,
          progress: search.progress,
          ...(search.canceledAt && { canceledAt: search.canceledAt }),
          ...(search.canceledReason && { canceledReason: search.canceledReason })
        }));
      }
      
      // Add enrichment information
      if (webset.enrichments && webset.enrichments.length > 0) {
        responseData.enrichments = webset.enrichments.map(enrichment => ({
          id: enrichment.id,
          status: enrichment.status,
          description: enrichment.description,
          format: enrichment.format,
          ...(enrichment.title && { title: enrichment.title })
        }));
      }
      
      // Add status-specific information and next steps
      switch (webset.status) {
        case 'running':
          responseData.message = "Webset is currently running. Check back in a few minutes.";
          responseData.nextSteps = [
            "Wait for the webset to complete processing",
            `Check status again with websets_get_status and websetId "${websetId}"`,
            "Monitor progress through the searches array"
          ];
          break;
          
        case 'idle':
          responseData.message = "Webset has completed processing and is ready for use.";
          responseData.nextSteps = [
            `Use websets_list_items with websetId "${websetId}" to retrieve results`,
            "Create additional searches if needed",
            "Set up enrichments to enhance the data"
          ];
          
          // If includeDetails is true and expand includes items, get item count
          if (includeDetails) {
            try {
              const itemsPreview = await services.itemService.listItems(websetId, undefined, 1);
              responseData.itemCount = itemsPreview.data?.length || 0;
              responseData.hasItems = (itemsPreview.data?.length || 0) > 0;
            } catch (error) {
              logger.log("Could not fetch item preview");
            }
          }
          break;
          
        case 'paused':
          responseData.message = "Webset processing has been paused.";
          responseData.nextSteps = [
            "Resume the webset if needed",
            "Check for any errors or issues",
            "Contact support if the pause was unexpected"
          ];
          break;
          
        default:
          responseData.message = `Webset status: ${webset.status}`;
          responseData.nextSteps = [
            "Check the status again in a few minutes",
            "Review any error messages or logs"
          ];
      }
      
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
      logger.log(`Failed to get webset status: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to get webset status",
            message: errorMessage,
            websetId: websetId,
            troubleshooting: [
              "Verify the webset ID is correct",
              "Check that your API key has access to this webset",
              "Ensure the webset exists and hasn't been deleted",
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