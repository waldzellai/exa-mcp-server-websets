import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets List Items Tool
 * 
 * Stream all Items for a Webset using Exa's Websets API. This tool retrieves
 * the items found and enriched by a completed webset.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'list_items');

/**
 * Format response data as readable text
 */
function formatAsText(data: any): string {
  let text = `Webset Items (${data.itemCount} items)\n`;
  text += `Webset ID: ${data.websetId}\n`;
  
  if (data.summary) {
    text += `\nSummary:\n`;
    text += `- Total Items: ${data.summary.totalItems}\n`;
    text += `- Verified: ${data.summary.verifiedItems} (${data.summary.verificationRate}%)\n`;
    text += `- Enriched: ${data.summary.enrichedItems} (${data.summary.enrichmentRate}%)\n`;
  }
  
  text += `\nItems:\n`;
  data.items.forEach((item: any, index: number) => {
    text += `\n${index + 1}. ${item.title}\n`;
    text += `   URL: ${item.url}\n`;
    text += `   Status: ${item.verification.status}\n`;
    text += `   Entity: ${item.entity.type}\n`;
    if (item.content) {
      text += `   Content: ${item.content}\n`;
    }
  });
  
  if (data.pagination.hasMore) {
    text += `\nMore items available. Use cursor: ${data.pagination.nextCursor}\n`;
  }
  
  return text;
}

ToolFactory.registerTool({
  name: toolName,
  description: "Stream all Items for a Webset using Exa's Websets API. This tool retrieves the items found and enriched by a completed webset.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    websetId: z.string().describe("The Webset ID to get items from"),
    batchSize: z.number().min(1).max(100).optional().describe("Number of items to fetch per batch (1-100, default: 50)"),
    limit: z.number().optional().describe("Maximum number of items to return"),
    cursor: z.string().optional().describe("Pagination cursor for retrieving the next page of results"),
    includeEnrichments: z.boolean().optional().describe("Whether to include enrichment data in the response (default: true)"),
    streamFormat: z.enum(["text", "json"]).optional().describe("Format for the response (default: json)")
  },
  handler: async ({ apiKey, websetId, batchSize = 50, limit, cursor, includeEnrichments = true, streamFormat = "json" }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Listing items for webset: ${websetId}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log(`Fetching items with batchSize: ${batchSize}, limit: ${limit || 'unlimited'}`);
      
      // Get the items
      const result = await services.itemService.listItems(websetId, cursor, limit, batchSize);
      
      logger.log(`Retrieved ${result.data.length} items`);
      
      // Process items based on format preference
      let processedItems = result.data.map(item => {
        const processedItem: any = {
          id: item.id,
          websetId: item.websetId,
          searchId: item.searchId,
          url: item.url,
          title: item.title,
          content: item.content.substring(0, 500) + (item.content.length > 500 ? '...' : ''), // Truncate long content
          entity: item.entity,
          verification: item.verification,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
        
        // Include enrichments if requested
        if (includeEnrichments && item.enrichments) {
          processedItem.enrichments = item.enrichments;
        }
        
        // Include metadata if present
        if (item.metadata && Object.keys(item.metadata).length > 0) {
          processedItem.metadata = item.metadata;
        }
        
        return processedItem;
      });
      
      // Build response data
      const responseData: any = {
        success: true,
        websetId: websetId,
        itemCount: result.data.length,
        hasMore: result.hasMore,
        ...(result.nextCursor && { nextCursor: result.nextCursor }),
        items: processedItems,
        pagination: {
          batchSize: batchSize,
          hasMore: result.hasMore,
          ...(result.nextCursor && { nextCursor: result.nextCursor }),
          ...(cursor && { currentCursor: cursor })
        }
      };
      
      // Add summary statistics
      if (processedItems.length > 0) {
        const verifiedCount = processedItems.filter(item => item.verification.status === 'verified').length;
        const enrichedCount = processedItems.filter(item => item.enrichments && Object.keys(item.enrichments).length > 0).length;
        
        responseData.summary = {
          totalItems: processedItems.length,
          verifiedItems: verifiedCount,
          enrichedItems: enrichedCount,
          verificationRate: Math.round((verifiedCount / processedItems.length) * 100),
          enrichmentRate: Math.round((enrichedCount / processedItems.length) * 100)
        };
      }
      
      // Add next steps
      const nextSteps = [];
      if (result.hasMore) {
        nextSteps.push(`Use the nextCursor "${result.nextCursor}" to fetch more items`);
      }
      nextSteps.push(`Use websets_get_item to get full details for specific items`);
      if (processedItems.some(item => item.verification.status === 'unverified')) {
        nextSteps.push("Consider reviewing unverified items for accuracy");
      }
      responseData.nextSteps = nextSteps;
      
      const response = {
        content: [{
          type: "text" as const,
          text: streamFormat === "json" 
            ? JSON.stringify(responseData, null, 2)
            : formatAsText(responseData)
        }]
      };
      
      logger.complete();
      return response;
      
    } catch (error) {
      logger.error(error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.log(`Failed to list items: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to list webset items",
            message: errorMessage,
            websetId: websetId,
            troubleshooting: [
              "Verify the webset ID is correct",
              "Check that your API key has access to this webset",
              "Ensure the webset exists and has completed processing",
              "Try reducing the batch size if you're hitting limits",
              "Check if the webset has any items to retrieve"
            ]
          }, null, 2)
        }],
        isError: true
      };
    }
  },
  enabled: true
});