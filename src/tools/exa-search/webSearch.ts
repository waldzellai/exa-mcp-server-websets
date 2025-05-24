import { z } from "zod";
import axios from "axios";
import { ToolFactory, EXA_API_CONFIG, ToolCategory, ServiceType, TOOL_NAMING } from "../config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../../types.js";
import { createRequestLogger } from "../../utils/logger.js";

/**
 * Exa Web Search Tool
 * 
 * Performs real-time web searches using Exa AI with content scraping capabilities.
 * Supports configurable result counts and returns content from relevant websites.
 */

const toolName = TOOL_NAMING.generateName(ServiceType.EXA_SEARCH, 'web_search');

ToolFactory.registerTool({
  name: toolName,
  description: "Search the web using Exa AI - performs real-time web searches and can scrape content from specific URLs. Supports configurable result counts and returns the content from the most relevant websites.",
  category: ToolCategory.SEARCH,
  service: ServiceType.EXA_SEARCH,
  schema: {
    query: z.string().describe("Search query"),
    numResults: z.number().optional().describe("Number of search results to return (default: 5)"),
    streamFormat: z.enum(["json", "jsonl"]).optional().describe("If provided, returns a stream in the specified format instead of a single response object"),
    batchSize: z.number().optional().describe("When streaming, the number of results to include in each batch (default: 1)")
  },
  handler: async ({ query, numResults, streamFormat, batchSize }, extra) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, toolName);
    
    logger.start(query);
    
    try {
      // Create a fresh axios instance for each request
      const axiosInstance = axios.create({
        baseURL: EXA_API_CONFIG.BASE_URL,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': process.env.EXA_API_KEY || ''
        },
        timeout: 25000
      });

      const searchRequest: ExaSearchRequest = {
        query,
        type: "auto",
        numResults: numResults || EXA_API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: EXA_API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'always'
        }
      };
      
      logger.log("Sending request to Exa API");
      
      const response = await axiosInstance.post<ExaSearchResponse>(
        EXA_API_CONFIG.ENDPOINTS.SEARCH,
        searchRequest,
        { timeout: 25000 }
      );
      
      logger.log("Received response from Exa API");

      if (!response.data || !response.data.results) {
        logger.log("Warning: Empty or invalid response from Exa API");
        return {
          content: [{
            type: "text" as const,
            text: "No search results found. Please try a different query."
          }]
        };
      }

      logger.log(`Found ${response.data.results.length} results`);
      
      // Handle streaming format if requested
      if (streamFormat) {
        const results = response.data.results;
        const batch = batchSize || 1;
        let output = '';
        
        for (let i = 0; i < results.length; i += batch) {
          const batchResults = results.slice(i, i + batch);
          const batchData = { ...response.data, results: batchResults };
          
          if (streamFormat === 'jsonl') {
            output += JSON.stringify(batchData) + '\n';
          } else {
            output += JSON.stringify(batchData, null, 2) + '\n---\n';
          }
        }
        
        const result = {
          content: [{
            type: "text" as const,
            text: output.trim()
          }]
        };
        
        logger.complete();
        return result;
      }
      
      // Standard JSON response
      const result = {
        content: [{
          type: "text" as const,
          text: JSON.stringify(response.data, null, 2)
        }]
      };
      
      logger.complete();
      return result;
    } catch (error) {
      logger.error(error);
      
      if (axios.isAxiosError(error)) {
        // Handle Axios errors specifically
        const statusCode = error.response?.status || 'unknown';
        const errorMessage = error.response?.data?.message || error.message;
        
        logger.log(`Axios error (${statusCode}): ${errorMessage}`);
        return {
          content: [{
            type: "text" as const,
            text: `Search error (${statusCode}): ${errorMessage}`
          }],
          isError: true,
        };
      }
      
      // Handle generic errors
      return {
        content: [{
          type: "text" as const,
          text: `Search error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true,
      };
    }
  },
  enabled: true
});