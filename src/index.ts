import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import only the tools we need
import websetsGuideTool from "./tools/websetsGuide.js";
import { toolRegistry } from "./tools/config.js";

// Import tools to register them
import "./tools/webSearch.js";
import "./tools/websetsManager.js";

// Configuration schema for Smithery - API key is optional to allow tool listing
export const configSchema = z.object({
  exaApiKey: z.string().optional().describe("The API key for accessing the Exa AI Websets and Search API.")
});

// Create our simplified tool registry with three tools
const simplifiedRegistry = {
  web_search_exa: toolRegistry["web_search_exa"],
  websets_manager: toolRegistry["websets_manager"], 
  websets_guide: websetsGuideTool
};

/**
 * Exa AI Websets MCP Server
 * 
 * This MCP server provides Exa AI's websets management capabilities and basic web search
 * functionality to AI assistants through the Model Context Protocol.
 * 
 * The server provides three essential tools:
 * - websets_manager: Comprehensive websets management
 * - web_search_exa: Real-time web searching capabilities
 * - websets_guide: Helpful guidance for using websets
 */

/**
 * Create and configure the MCP server instance
 */
function createServer(apiKey?: string): McpServer {
  // Store API key for later use - don't set it globally yet
  const storedApiKey = apiKey;
  
  const server = new McpServer({
    name: "exa-websets-server",
    version: "1.0.0"
  });
  
  // Register our tools with lazy API key validation
  Object.entries(simplifiedRegistry).forEach(([_toolId, tool]) => {
    if (tool) {
      // Handle both formats - websetsGuide uses inputSchema/execute
      // while tools from registry use schema/handler
      const schema = (tool as any).inputSchema || tool.schema;
      const originalHandler = (tool as any).execute || tool.handler;
      
      // Wrap handler to validate API key on first use
      const wrappedHandler = async (args: any, extra: any) => {
        // Set API key when tool is actually used
        if (storedApiKey) {
          process.env.EXA_API_KEY = storedApiKey;
        } else if (!process.env.EXA_API_KEY) {
          throw new Error("EXA_API_KEY is required to use this tool");
        }
        return originalHandler(args, extra);
      };
      
      server.tool(
        tool.name,
        tool.description,
        schema,
        wrappedHandler
      );
    }
  });
  
  return server;
}

/**
 * Default export for Smithery - creates and returns the server instance
 */
export default function ({ config }: { config?: { exaApiKey?: string } } = {}) {
  // Create server with optional API key - allows tool listing without config
  const server = createServer(config?.exaApiKey);
  return server.server;
}

// Export all components for library usage
export * from './api/index.js';
export * from './services/index.js';
export * from './events/index.js';
export * from './webhooks/index.js';
export * from './state/index.js';
export * from './types/websets.js';
export * from './config/websets.js';
export * from './utils/logger.js';