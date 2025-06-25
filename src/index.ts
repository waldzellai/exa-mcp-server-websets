#!/usr/bin/env node

import { config } from "dotenv";
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Import only the tools we need
import websetsGuideTool from "./tools/websetsGuide.js";
import { toolRegistry } from "./tools/config.js";

// Import tools to register them
import "./tools/webSearch.js";
import "./tools/websetsManager.js";

// Import feature flags
import { featureFlags } from "./config/features.js";

// Import prompts
import {
  enrichmentWorkflow,
  horizontalProcess,
  integrationProcess,
  iterativeIntelligence,
  listMcpAssets,
  quickStart,
  websetAnalysisGuide,
  websetDiscovery,
  websetPortal,
  websetStatusCheck,
  webhookSetupGuide
} from "./prompts/index.js";

// Load environment variables
config();

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m"
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
export class ExaWebsetsServer {
  private app: express.Application;
  private server: McpServer;
  private activeSessions = new Map<string, StreamableHTTPServerTransport>();
  
  /**
   * Creates a new ExaWebsetsServer instance
   * 
   * @param apiKey Optional Exa API key
   */
  constructor(apiKey?: string) {
    // Set API key if provided
    if (apiKey) {
      process.env.EXA_API_KEY = apiKey;
    }
    
    // Build server capabilities based on feature flags
    const capabilities: any = {};
    
    if (featureFlags.isEnabled('logging')) {
      capabilities.logging = {};
    }
    
    if (featureFlags.isEnabled('sampling')) {
      capabilities.sampling = {};
    }
    
    // Initialize MCP server with capabilities
    this.server = new McpServer({
      name: "exa-websets-server",
      version: "1.0.4"
    }, {
      capabilities
    });
    
    // Initialize Express app
    this.app = express();
    this.app.use(express.json());
    
    // Setup server components
    this.registerTools();
    this.registerPrompts();
    this.registerProtocolHandlers();
  }

  /**
   * Register all tools with the MCP server
   */
  private registerTools(): void {
    // Create our simplified tool registry with three tools
    const simplifiedRegistry = {
      web_search_exa: toolRegistry["web_search_exa"],
      websets_manager: toolRegistry["websets_manager"],
      websets_guide: websetsGuideTool
    };
    
    // Register our tools
    Object.values(simplifiedRegistry).forEach(tool => {
      if (tool) {
        this.server.tool(
          tool.name,
          tool.description,
          tool.schema,
          tool.handler
        );
      }
    });
  }

  /**
   * Register all prompts with the MCP server
   */
  private registerPrompts(): void {
    // Register prompts
    this.server.prompt("list_mcp_assets", "List all available MCP server capabilities including prompts, tools, and resources", async () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await listMcpAssets()
        }
      }]
    }));
    
    this.server.prompt("webset_discovery", "Discover and explore available websets", async () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await websetDiscovery()
        }
      }]
    }));
    
    this.server.prompt("webset_status_check", "Check status of async webset operations", 
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
    
    this.server.prompt("webset_analysis_guide", "Guide for analyzing completed websets",
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
    
    this.server.prompt("webhook_setup_guide", "Configure webhooks for webset notifications", async () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await webhookSetupGuide()
        }
      }]
    }));
    
    this.server.prompt("quick_start", "Get started quickly with creating your first webset", async () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await quickStart()
        }
      }]
    }));
    
    this.server.prompt("enrichment_workflow", "Workflow for enriching webset data",
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
    
    this.server.prompt("integration_process", "Process for integrating a webset with external systems",
      { 
        websetId: z.string().describe("The ID of the webset to integrate"),
        targetSystem: z.string().describe("The target system for integration")
      },
      async ({ websetId, targetSystem }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: await integrationProcess(websetId, targetSystem)
          }
        }]
      })
    );
    
    this.server.prompt("horizontal_process", "Process for analyzing multiple websets horizontally",
      { 
        searchCriteria: z.string().describe("Comma-separated list of search terms to create and analyze websets"),
        projectName: z.string().optional().describe("Name for the horizontal analysis project")
      },
      async ({ searchCriteria, projectName }) => {
        // Transform comma-separated string to array inline
        const criteriaArray = searchCriteria.split(',').map(s => s.trim());
        
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: await horizontalProcess(criteriaArray, projectName)
            }
          }]
        };
      }
    );
    
    this.server.prompt("webset_portal", "Portal for webset management",
      {
        websetId: z.string().describe("The ID of the webset to manage"),
        researchQuery: z.string().optional().describe("Research query for analyzing the webset")
      },
      async ({ websetId, researchQuery }) => {
        // Provide a default value when researchQuery is undefined
        const queryToUse = researchQuery || "General webset analysis";
        
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: await websetPortal(websetId, queryToUse)
            }
          }]
        };
      }
    ); 
    
    this.server.prompt("iterative_intelligence", "Research assistant for iterative webset improvement",
      { 
        researchTopic: z.string().describe("Topic to research"),
        iterations: z.string().optional().describe("Number of research iterations"),
        registryPath: z.string().optional().describe("Optional registry path")
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
  }

  /**
   * Register protocol handlers for MCP compliance
   */
  private registerProtocolHandlers(): void {
    // Access the underlying server protocol for advanced handlers
    const protocol = this.server.server;
    
    // Always register ping handler (required by MCP)
    protocol.setRequestHandler(
      z.object({
        method: z.literal('ping')
      }),
      async () => {
        return {};
      }
    );
    
    // Register logging handler only if feature is enabled
    if (featureFlags.isEnabled('logging')) {
      protocol.setRequestHandler(
        z.object({
          method: z.literal('logging/setLevel'),
          params: z.object({
            level: z.string()
          }).optional()
        }),
        async (request) => {
          // TODO: Implement logging level changes
          return {
            success: true,
            message: "Logging level change acknowledged (not yet implemented)"
          };
        }
      );
    }
    
    // Register sampling handler only if feature is enabled
    if (featureFlags.isEnabled('sampling')) {
      protocol.setRequestHandler(
        z.object({
          method: z.literal('sampling/createMessage'),
          params: z.any().optional()
        }),
        async (request) => {
          // TODO: Implement sampling
          return {
            success: true,
            message: "Sampling acknowledged (not yet implemented)"
          };
        }
      );
    }
  }

  /**
   * Get the internal MCP server instance
   */
  public getMcpServer(): McpServer {
    return this.server;
  }

  /**
   * Start the server with HTTP transport
   */
  public async startHttpServer(port: number = 3000): Promise<void> {
    try {
      // Handle POST requests for client-to-server communication
      this.app.post('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        
        // Case 1: Existing session - reuse transport
        if (sessionId && this.activeSessions.has(sessionId)) {
          const existingTransport = this.activeSessions.get(sessionId)!;
          await existingTransport.handleRequest(req, res, req.body);
          return;
        }
        
        // Case 2: New session - create transport
        if (!sessionId && isInitializeRequest(req.body)) {
          const newTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
              // Store the new session
              this.activeSessions.set(newSessionId, newTransport);
            }
          });
          
          // Clean up when session closes
          newTransport.onclose = () => {
            if (newTransport.sessionId) {
              this.activeSessions.delete(newTransport.sessionId);
            }
          };
          
          // Connect the MCP server to the transport
          await this.server.connect(newTransport);
          
          // Handle the initialization request
          await newTransport.handleRequest(req, res, req.body);
          return;
        }
        
        // Case 3: Invalid request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided or not an initialization request',
          },
          id: null,
        });
      });
      
      // Handle GET requests for server-to-client notifications via SSE
      this.app.get('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        
        if (!sessionId || !this.activeSessions.has(sessionId)) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        const transport = this.activeSessions.get(sessionId)!;
        await transport.handleRequest(req, res);
      });
      
      // Handle DELETE requests for session termination
      this.app.delete('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        
        if (!sessionId || !this.activeSessions.has(sessionId)) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        const transport = this.activeSessions.get(sessionId)!;
        await transport.handleRequest(req, res);
      });
      
      // Add health endpoint like in reddit-mcp
      this.app.get('/health', (req, res) => {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        res.json({
          service: "Exa Websets MCP Server",
          version: "1.0.4",
          transport: "http",
          endpoints: {
            mcp: `${baseUrl}/mcp`,
            health: `${baseUrl}/health`,
          },
          status: "healthy"
        });
      });
      
      this.app.listen(port, () => {
        console.log(`${colors.bright}${colors.cyan}Exa Websets MCP Server ${colors.reset}${colors.bright}(HTTP)${colors.reset} ${colors.green}listening on port ${port}${colors.reset}`);
        console.log(`${colors.bright}${colors.blue}Connect via: ${colors.reset}http://localhost:${port}/mcp`);
        console.log(`${colors.bright}${colors.green}Health check: ${colors.reset}http://localhost:${port}/health`);
      });
    } catch (error) {
      console.error(`${colors.bright}${colors.red}Failed to start HTTP server:${colors.reset}`, error);
      process.exit(1);
    }
  }

  /**
   * Start the server with STDIO transport
   */
  public async startStdioServer(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log(`${colors.bright}${colors.magenta}Exa Websets MCP Server${colors.reset} started in ${colors.bright}STDIO mode${colors.reset}`);
    } catch (error) {
      console.error(`${colors.bright}${colors.red}Failed to start STDIO server:${colors.reset}`, error);
      process.exit(1);
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    const mode = process.argv[2];
    const server = new ExaWebsetsServer(process.env.EXA_API_KEY);
    
    if (mode === '--http') {
      // HTTP mode with optional port
      const port = process.env.PORT ? parseInt(process.env.PORT) : 
                   process.argv[3] ? parseInt(process.argv[3]) : 3000;
      console.log(`${colors.bright}${colors.yellow}Starting in HTTP mode on port ${port}${colors.reset}`);
      await server.startHttpServer(port);
    } else if (mode === '--stdio') {
      // STDIO mode when explicitly requested
      console.log(`${colors.bright}${colors.yellow}Starting in STDIO mode${colors.reset}`);
      await server.startStdioServer();
    } else {
      // Default to STDIO mode (MCP standard)
      console.log(`${colors.bright}${colors.yellow}Starting in STDIO mode (default)${colors.reset}`);
      await server.startStdioServer();
    }
  } catch (error) {
    console.error(`${colors.bright}${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`${colors.bright}${colors.red}Unhandled error:${colors.reset}`, error);
    process.exit(1);
  });
}

/**
 * Create and configure the MCP server instance
 * This function is maintained for backward compatibility
 */
function createServer(apiKey?: string): McpServer {
  const server = new ExaWebsetsServer(apiKey);
  return server.getMcpServer();
}

// Export configSchema for Smithery
export const configSchema = z.object({
  exaApiKey: z.string().describe("The API key for accessing the Exa AI Websets and Search API")
});

// Default export for Smithery - function that accepts config
export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  try {
    // Create server with API key from config
    const server = new ExaWebsetsServer(config.exaApiKey);
    return server.getMcpServer();
  } catch (e) {
    console.error(e);
    throw e;
  }
}
