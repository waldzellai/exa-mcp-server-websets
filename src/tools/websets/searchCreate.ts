import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Search Create Tool
 * 
 * Create a Search for a Webset using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'search_create');

ToolFactory.registerTool({
  name: toolName,
  description: "Create a Search for a Webset using Exa's Websets API.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    count: z.number().min(1).describe("Number of results to attempt to find"),
    query: z.string().min(1).max(5000).describe("Search query"),
    entity: z.object({
      type: z.literal("company").describe("Entity type. Currently only 'company' is supported")
    }).describe("Entity object"),
    criteria: z.array(z.object({
      description: z.string().describe("Description of the criterion")
    })).optional().describe("Array of criteria objects"),
    metadata: z.record(z.string().max(1000)).optional().describe("Metadata key-value pairs")
  },
  handler: async ({ apiKey, webset, count, query, entity, criteria, metadata }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Creating search for webset: ${webset}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log(`Creating search with query: "${query}" for ${count} results`);
      
      // Create the search
      const result = await services.searchService.createSearch({
        websetId: webset,
        count,
        query,
        entity,
        criteria,
        metadata
      });
      
      logger.log(`Search created successfully: ${result.id}`);
      
      const responseData = {
        success: true,
        searchId: result.id,
        websetId: webset,
        status: result.status,
        query: result.query,
        count: result.count,
        entity: result.entity,
        createdAt: result.createdAt,
        ...(result.criteria && { criteria: result.criteria }),
        ...(result.metadata && { metadata: result.metadata }),
        message: "Search created successfully and will begin processing",
        nextSteps: [
          `Monitor search progress with websets_search_get using searchId "${result.id}"`,
          `Check webset status with websets_get_status using websetId "${webset}"`,
          "Results will be available as Items once the search completes"
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
      logger.log(`Failed to create search: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to create search",
            message: errorMessage,
            websetId: webset,
            troubleshooting: [
              "Verify the webset ID is correct and exists",
              "Check that your API key has access to this webset",
              "Ensure the query is between 1-5000 characters",
              "Verify the count is a positive number",
              "Check that entity type is 'company'",
              "Ensure metadata values are strings with max 1000 characters",
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