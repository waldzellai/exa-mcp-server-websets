#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
// Removed yargs - no longer needed for tool selection

// Import only the tools we need
import websetsGuideTool from "./tools/websetsGuide.js";
import { log } from "./utils/logger.js";
import { toolRegistry } from "./tools/config.js";

// Import tools to register them
import "./tools/webSearch.js";
import "./tools/websetsManager.js";

dotenv.config();

// Create our simplified tool registry with three tools
const simplifiedRegistry = {
  web_search_exa: toolRegistry["web_search_exa"],
  websets_manager: toolRegistry["websets_manager"], 
  websets_guide: websetsGuideTool
};

// Check for API key after handling list-tools to allow listing without a key
const API_KEY = process.env.EXA_API_KEY;
if (!API_KEY) {
  throw new Error("EXA_API_KEY environment variable is required");
}

/**
 * Exa AI Websets MCP Server
 * 
 * This MCP server provides Exa AI's websets management capabilities and basic web search
 * functionality to AI assistants through the Model Context Protocol.
 * 
 * The server provides three essential tools:
 * - websets_manager: Comprehensive websets collection management
 * - web_search_exa: Real-time web searching capabilities
 * - websets_guide: Helpful guidance for using websets
 */

class ExaServer {
  private server: McpServer;
  private keepAliveInterval?: NodeJS.Timeout;

  constructor() {
    this.server = new McpServer({
      name: "exa-websets-server",
      version: "1.0.0"
    });
    
    log("Server initialized");
  }

  private setupTools(): string[] {
    // Register our two tools
    const registeredTools: string[] = [];
    
    Object.entries(simplifiedRegistry).forEach(([toolId, tool]) => {
      if (tool) {
        // Handle both formats - websetsGuide uses inputSchema/execute
        // while tools from registry use schema/handler
        const schema = (tool as any).inputSchema || tool.schema;
        const handler = (tool as any).execute || tool.handler;
        
        this.server.tool(
          tool.name,
          tool.description,
          schema,
          handler
        );
        registeredTools.push(toolId);
      }
    });
    
    return registeredTools;
  }

  async run(): Promise<void> {
    try {
      // Set up tools before connecting
      const registeredTools = this.setupTools();
      
      log(`Starting Exa MCP server with ${registeredTools.length} tools: ${registeredTools.join(', ')}`);
      
      const transport = new StdioServerTransport();
      
      // Handle connection errors
      transport.onerror = (error) => {
        log(`Transport error: ${error.message}`);
      };
      
      await this.server.connect(transport);
      log("Exa Websets MCP server running on stdio");
      
      // Set up keep-alive to prevent timeout
      this.setupKeepAlive();
    } catch (error) {
      log(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private setupKeepAlive(): void {
    // Send a heartbeat every 30 seconds to prevent timeout
    this.keepAliveInterval = setInterval(() => {
      // MCP protocol doesn't have explicit heartbeat, but we can log to show activity
      log("Server heartbeat - connection active");
    }, 30000);

    // Clean up on process exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    log("Server shutting down gracefully");
    process.exit(0);
  }
}

// Create and run the server with proper error handling
(async () => {
  try {
    const server = new ExaServer();
    await server.run();
  } catch (error) {
    log(`Fatal server error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();
// Export all components for library usage
export * from './api/index.js';
export * from './services/index.js';
export * from './events/index.js';
export * from './webhooks/index.js';
export * from './state/index.js';
export * from './types/websets.js';
export * from './config/websets.js';
export * from './utils/logger.js';

// Export the main server class for programmatic usage
export { ExaServer };