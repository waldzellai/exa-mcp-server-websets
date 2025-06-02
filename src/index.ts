import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

// Import only the tools we need
import websetsGuideTool from "./tools/websetsGuide.js";
import { log } from "./utils/logger.js";
import { toolRegistry } from "./tools/config.js";

// Import tools to register them
import "./tools/webSearch.js";
import "./tools/websetsManager.js";

// Configuration schema for Smithery
export const configSchema = z.object({
  exaApiKey: z.string().describe("The API key for accessing the Exa AI Websets and Search API.")
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
function createServer(apiKey: string): McpServer {
  // Set the API key in the environment for tools to use
  process.env.EXA_API_KEY = apiKey;
  
  const server = new McpServer({
    name: "exa-websets-server",
    version: "1.0.0"
  });
  
  // Register our tools
  Object.entries(simplifiedRegistry).forEach(([_toolId, tool]) => {
    if (tool) {
      // Handle both formats - websetsGuide uses inputSchema/execute
      // while tools from registry use schema/handler
      const schema = (tool as any).inputSchema || tool.schema;
      const handler = (tool as any).execute || tool.handler;
      
      server.tool(
        tool.name,
        tool.description,
        schema,
        handler
      );
    }
  });
  
  log(`Configured server with ${Object.keys(simplifiedRegistry).length} tools`);
  
  return server;
}

/**
 * Default export for Smithery - creates and returns the server instance
 */
export default function ({ config }: { config: { exaApiKey: string } }) {
  const server = createServer(config.exaApiKey);
  return server.server;
}

// Check if this is being run as a CLI (stdio mode)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Running as CLI - use stdio transport
  dotenv.config();
  
  const API_KEY = process.env.EXA_API_KEY;
  if (!API_KEY) {
    log("EXA_API_KEY environment variable is required");
    process.exit(1);
  }
  
  (async () => {
    try {
      const server = createServer(API_KEY);
      const transport = new StdioServerTransport();
      
      // Handle connection errors
      transport.onerror = (error) => {
        log(`Transport error: ${error.message}`);
      };
      
      await server.server.connect(transport);
      log("Exa Websets MCP server running on stdio");
      
      // Set up keep-alive to prevent timeout
      const keepAliveInterval = setInterval(async () => {
        try {
          await server.server.sendLoggingMessage({
            level: "debug",
            data: "Keep-alive heartbeat",
            logger: "server"
          });
        } catch (error) {
          log(`Failed to send heartbeat: ${error}`);
        }
      }, 30000);
      
      // Clean up on process exit
      const cleanup = () => {
        clearInterval(keepAliveInterval);
        log("Server shutting down gracefully");
        process.exit(0);
      };
      
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (error) {
      log(`Fatal server error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  })();
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