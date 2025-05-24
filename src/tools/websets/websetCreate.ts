import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";
import { CreateWebsetRequest, SearchEntity, SearchCriteria, EnrichmentOption } from "../../types/websets.js";

/**
 * Websets Create Tool
 * 
 * Creates a new Webset using Exa's Websets API. This tool initiates the webset 
 * creation process and returns immediately with a tracking ID. Webset creation 
 * typically takes 10-15 minutes to complete in the background.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'create');

ToolFactory.registerTool({
  name: toolName,
  description: "Create a Webset using Exa's Websets API. This tool initiates the webset creation process and returns immediately with a tracking ID. Webset creation typically takes 10-15 minutes to complete in the background.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    search: z.object({
      query: z.string().describe("Your search query. Required string describing what to look for."),
      count: z.number().min(1).optional().describe("Number of items to find. Default: 10"),
      entity: z.object({
        type: z.enum(["company"]).describe("Entity type. Currently only 'company' is supported")
      }).optional().describe("Entity the Webset will return results for"),
      criteria: z.array(z.object({
        description: z.string().describe("Description of the criterion")
      })).optional().describe("Criteria for evaluating results")
    }).describe("Search parameters for the Webset"),
    enrichments: z.array(z.object({
      description: z.string().describe("Description of the enrichment task"),
      format: z.enum(["text", "date", "number", "options", "email", "phone"]).optional().describe("Format of the enrichment response"),
      options: z.array(z.object({
        label: z.string().describe("Label for the option")
      })).optional().describe("Options for the enrichment"),
      metadata: z.record(z.string().max(1000)).optional().describe("Metadata for the enrichment")
    })).optional().describe("Array of enrichment objects"),
    externalId: z.string().optional().describe("External identifier for the Webset"),
    metadata: z.record(z.string().max(1000)).optional().describe("Metadata key-value pairs")
  },
  handler: async ({ apiKey, search, enrichments, externalId, metadata }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Creating webset with query: ${search.query}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      // Build the webset creation request
      const createRequest = {
        search: {
          query: search.query,
          count: search.count || 10,
          ...(search.entity && { entity: search.entity }),
          ...(search.criteria && { criteria: search.criteria })
        },
        ...(enrichments && { enrichments }),
        ...(externalId && { externalId }),
        ...(metadata && { metadata })
      };
      
      logger.log("Sending webset creation request");
      
      // Create the webset
      const result = await services.websetService.createWebset(createRequest);
      
      logger.log(`Webset creation initiated with ID: ${result.id}`);
      
      const response = {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            websetId: result.id,
            status: result.status,
            message: "Webset creation initiated successfully. This process typically takes 10-15 minutes to complete.",
            trackingInfo: {
              id: result.id,
              status: result.status,
              createdAt: result.createdAt,
              ...(result.externalId && { externalId: result.externalId })
            },
            nextSteps: [
              `Use websets_get_status with websetId "${result.id}" to check progress`,
              "Monitor the webset creation process using the status endpoint",
              "Once complete, use websets_list_items to retrieve results"
            ]
          }, null, 2)
        }]
      };
      
      logger.complete();
      return response;
      
    } catch (error) {
      logger.error(error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.log(`Webset creation failed: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Webset creation failed",
            message: errorMessage,
            troubleshooting: [
              "Verify your API key is valid and has Websets access",
              "Check that your search query is properly formatted",
              "Ensure entity type is 'company' if specified",
              "Verify enrichment formats are valid"
            ]
          }, null, 2)
        }],
        isError: true
      };
    }
  },
  enabled: true
});