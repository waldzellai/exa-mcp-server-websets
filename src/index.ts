#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Import only the tools we need
import websetsGuideTool from "./tools/websetsGuide.js";
import { toolRegistry } from "./tools/config.js";

// Import tools to register them
import "./tools/webSearch.js";
import "./tools/websetsManager.js";

// Import prompts
import {
  listMcpAssets,
  websetDiscovery,
  websetStatusCheck,
  websetAnalysisGuide,
  webhookSetupGuide,
  quickStart,
  enrichmentWorkflow,
  horizontalProcess,
  websetPortal,
  iterativeIntelligence
} from "./prompts/index.js";

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
  
  // Register prompts
  server.prompt("list_mcp_assets", "List all available MCP server capabilities including prompts, tools, and resources", async () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: await listMcpAssets()
      }
    }]
  }));
  
  server.prompt("webset_discovery", "Discover and explore available websets", async () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: await websetDiscovery()
      }
    }]
  }));
  
  server.prompt("webset_status_check", "Check status of async webset operations", 
    { websetId: z.string().describe("The ID of the webset to check") },
    async ({ websetId }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await websetStatusCheck(websetId)
        }
      }]
    })
  );
  
  server.prompt("webset_analysis_guide", "Guide for analyzing completed websets",
    { websetId: z.string().describe("The ID of the webset to analyze") },
    async ({ websetId }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await websetAnalysisGuide(websetId)
        }
      }]
    })
  );
  
  server.prompt("webhook_setup_guide", "Configure webhooks for webset notifications", async () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: await webhookSetupGuide()
      }
    }]
  }));
  
  server.prompt("quick_start", "Get started quickly with creating your first webset", async () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: await quickStart()
      }
    }]
  }));
  
  server.prompt("enrichment_workflow", "Workflow for enriching webset data",
    { websetId: z.string().describe("The ID of the webset to enrich") },
    async ({ websetId }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await enrichmentWorkflow(websetId)
        }
      }]
    })
  );
  
  server.prompt("horizontal_process", "Create multiple websets and analyze cross-matches to build a meta-dataset",
    { 
      searchCriteria: z.string().describe("Comma-separated list of search queries to create websets from"),
      projectName: z.string().optional().describe("Name for the horizontal analysis project")
    },
    async ({ searchCriteria, projectName }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await horizontalProcess(
            searchCriteria.split(',').map(s => s.trim()),
            projectName
          )
        }
      }]
    })
  );
  
  server.prompt("webset_portal", "Deep-dive research through webset URLs using parallel subagents",
    {
      websetId: z.string().describe("The ID of the webset containing URLs to research"),
      researchQuery: z.string().describe("What insights you're looking for"),
      maxPortals: z.string().optional().describe("Maximum number of URLs to research in parallel (default: 5)")
    },
    async ({ websetId, researchQuery, maxPortals }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await websetPortal(
            websetId,
            researchQuery,
            maxPortals ? parseInt(maxPortals) : undefined
          )
        }
      }]
    })
  );
  
  server.prompt("iterative_intelligence", "Self-improving research system with webset registry for fast retrieval",
    {
      researchTopic: z.string().describe("The research topic to explore iteratively"),
      iterations: z.string().optional().describe("Number of research iterations (default: 3)"),
      registryPath: z.string().optional().describe("Path to webset registry (default: ./webset-registry)")
    },
    async ({ researchTopic, iterations, registryPath }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await iterativeIntelligence(
            researchTopic,
            iterations ? parseInt(iterations) : undefined,
            registryPath
          )
        }
      }]
    })
  );
  
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

// Run the server if this file is executed directly
// This check works in ESM but will be ignored in CommonJS builds
try {
  // @ts-ignore - import.meta might not exist in some environments
  if (typeof import.meta?.url !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
    const transport = new StdioServerTransport();
    const server = createServer(process.env.EXA_API_KEY);
    
    server.server.connect(transport);
  }
} catch {
  // Ignore errors in CommonJS environments
}