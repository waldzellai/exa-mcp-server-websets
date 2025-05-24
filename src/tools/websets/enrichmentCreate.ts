import { z } from "zod";
import { ToolFactory, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { createServices } from "../../services/index.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Websets Enrichment Create Tool
 * 
 * Create an Enrichment for a Webset using Exa's Websets API.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.WEBSETS, 'enrichment_create');

ToolFactory.registerTool({
  name: toolName,
  description: "Create an Enrichment for a Webset using Exa's Websets API.",
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  schema: {
    apiKey: z.string().describe("Your Exa API key"),
    webset: z.string().describe("The Webset ID"),
    description: z.string().min(1).max(5000).describe("Description of the enrichment task to perform on each Webset Item"),
    format: z.enum(["text", "date", "number", "options", "email", "phone"]).optional().describe("Format of the enrichment response. If not provided, the best format is automatically selected based on the description"),
    options: z.array(z.object({
      label: z.string().describe("The label of the option")
    })).optional().describe("When the format is options, the different options for the enrichment agent to choose from"),
    metadata: z.record(z.string().max(1000)).optional().describe("Metadata key-value pairs")
  },
  handler: async ({ apiKey, webset, description, format, options, metadata }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(`Creating enrichment for webset: ${webset}`);
    
    try {
      // Create services with the provided API key
      const services = createServices(apiKey);
      
      logger.log(`Creating enrichment with description: "${description}"`);
      
      // Validate options format requirement
      if (format === "options" && (!options || options.length === 0)) {
        throw new Error("Options array is required when format is 'options'");
      }
      
      // Create the enrichment
      const result = await services.enrichmentService.createEnrichment({
        websetId: webset,
        description,
        format,
        options,
        metadata
      });
      
      logger.log(`Enrichment created successfully: ${result.id}`);
      
      const responseData = {
        success: true,
        enrichmentId: result.id,
        websetId: webset,
        status: result.status,
        description: result.description,
        format: result.format,
        createdAt: result.createdAt,
        ...(result.options && { options: result.options }),
        ...(result.metadata && { metadata: result.metadata }),
        message: "Enrichment created successfully and will begin processing existing Items",
        nextSteps: [
          `Monitor enrichment progress with websets_enrichment_get using enrichmentId "${result.id}"`,
          `Check webset status with websets_get_status using websetId "${webset}"`,
          "Enrichment data will be added to existing Items and applied to new Items automatically"
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
      logger.log(`Failed to create enrichment: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            error: "Failed to create enrichment",
            message: errorMessage,
            websetId: webset,
            troubleshooting: [
              "Verify the webset ID is correct and exists",
              "Check that your API key has access to this webset",
              "Ensure the description is between 1-5000 characters",
              "If format is 'options', provide at least one option with a label",
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