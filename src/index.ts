#!/usr/bin/env node

import { config } from "dotenv";
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import rateLimit from "express-rate-limit";

// Import only the tools we need
import websetsGuideTool from "./tools/websetsGuide.js";
import { toolRegistry } from "./tools/config.js";
import { webhookEventsTool } from "./tools/webhookEvents.js";

// Import tools to register them
import "./tools/webSearch.js";
import "./tools/websetsManager.js";
import "./tools/knowledgeGraph.js";

// Import feature flags
import { featureFlags } from "./config/features.js";

// Import webhook receiver utilities
import { getWebhookEventStore } from "./state/WebhookEventStore.js";
import { verifyExaSignature } from "./utils/security.js";
import { createWebsetsConfig } from "./config/websets.js";

// Import prompts
import {
  crmOrchestration,
  enrichmentWorkflow,
  hiringOrchestration,
  horizontalProcess,
  integrationProcess,
  iterativeIntelligence,
  listMcpAssets,
  marketingOrchestration,
  quickStart,
  websetAnalysisGuide,
  websetDiscovery,
  websetPortal,
  websetStatusCheck,
  webhookSetupGuide
} from "./prompts/index.js";

// Import resources
import {
  resolveOrchestrationResource,
  listOrchestrationResources
} from "./resources/index.js";

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
 * The server provides four essential tools:
 * - websets_manager: Comprehensive websets management
 * - web_search_exa: Real-time web searching capabilities
 * - websets_guide: Helpful guidance for using websets
 * - knowledge_graph: Onboard graph to track connections between webset results
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
    this.registerResources();
    this.registerProtocolHandlers();
  }

  /**
   * Register all tools with the MCP server
   */
  private registerTools(): void {
    // Create tool registry with webhook events tool
    const simplifiedRegistry = {
      web_search_exa: toolRegistry["web_search_exa"],
      websets_manager: toolRegistry["websets_manager"],
      websets_guide: websetsGuideTool,
      knowledge_graph: toolRegistry["knowledge_graph"],
      get_webhook_events: webhookEventsTool,
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
    
    // Orchestration Prompts - User-focused workflows for common use cases
    
    this.server.prompt("marketing_orchestration", "Competitor and brand monitoring orchestration",
      {
        companyName: z.string().describe("Your company name"),
        targetAudience: z.string().optional().describe("Target audience for monitoring"),
        timeframe: z.string().optional().describe("Time range for monitoring (e.g., '30d', '90d')")
      },
      async ({ companyName, targetAudience, timeframe }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: await marketingOrchestration(companyName, targetAudience, timeframe)
          }
        }]
      })
    );
    
    this.server.prompt("crm_orchestration", "Lead discovery and account-based marketing orchestration",
      {
        idealCustomerProfile: z.string().describe("Description of your ideal customer profile (ICP)"),
        region: z.string().optional().describe("Geographic region for lead search"),
        intentSignals: z.string().optional().describe("Intent signals to search for (e.g., hiring, funding, product launches)")
      },
      async ({ idealCustomerProfile, region, intentSignals }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: await crmOrchestration(idealCustomerProfile, region, intentSignals)
          }
        }]
      })
    );
    
    this.server.prompt("hiring_orchestration", "Recruiter and job seeker hiring orchestration",
      {
        mode: z.enum(["recruiter", "job_seeker"]).describe("Mode: 'recruiter' for candidate sourcing or 'job_seeker' for target company tracking"),
        role: z.string().describe("Job title or role to search for"),
        location: z.string().optional().describe("Location preference (e.g., 'Bay Area', 'Remote', 'NYC')"),
        seniority: z.string().optional().describe("Seniority level (e.g., 'junior', 'mid-level', 'senior', 'staff')"),
        keywords: z.string().optional().describe("Key skills or interests (comma-separated)")
      },
      async ({ mode, role, location, seniority, keywords }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: await hiringOrchestration(mode, role, location, seniority, keywords)
          }
        }]
      })
    );
  }

  /**
   * Register resources for orchestrations
   */
  private registerResources(): void {
    // Register a catch-all resource handler for websets:// URIs
    this.server.resource(
      "websets://orchestrations/*",
      "Orchestration resources (marketing, CRM, hiring)",
      async (uri: URL) => {
        const resource = await resolveOrchestrationResource(uri.toString());
        if (!resource) {
          throw new Error(`Failed to resolve resource: ${uri}`);
        }
        return {
          contents: [{
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text
          }]
        };
      }
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
    
  }

  /**
   * Get the internal MCP server instance
   */
  public getMcpServer(): McpServer {
    return this.server;
  }

  /**
   * Setup webhook receiver endpoint
   */
  private setupWebhookReceiver(config: ReturnType<typeof createWebsetsConfig>): void {
    const receiverConfig = config.webhookReceiver!;
    const webhookStore = getWebhookEventStore(receiverConfig.eventTtlMs);

    // Create rate limiter
    const limiter = rateLimit({
      windowMs: 60_000, // 1 minute
      max: receiverConfig.rateLimitRpm,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({ ok: false, error: 'rate_limit_exceeded' });
      },
    });

    // Webhook receiver route
    this.app.post(
      receiverConfig.path,
      express.raw({ type: 'application/json', limit: '1mb' }),
      limiter,
      async (req, res) => {
        try {
          const sigHeader = req.header('Exa-Signature') || '';
          const secrets = receiverConfig.secrets;
          const raw = req.body as Buffer;

          // Verify signature with at least one secret
          if (secrets.length === 0) {
            console.error('[Webhook] No secrets configured. Add WEBHOOK_SECRETS to env.');
            res.status(500).json({ ok: false, error: 'configuration_error' });
            return;
          }

          let verified = false;
          for (const secret of secrets) {
            const result = verifyExaSignature({
              header: sigHeader,
              secret,
              rawBody: raw,
              maxSkewSec: receiverConfig.maxSkewSec,
            });
            if (result.ok) {
              verified = true;
              break;
            }
          }

          if (!verified) {
            console.error('[Webhook] Signature verification failed');
            res.status(401).json({ ok: false, error: 'invalid_signature' });
            return;
          }

          // Parse JSON after signature validation
          const evt = JSON.parse(raw.toString('utf8'));

          // Basic shape checks
          if (!evt?.id || !evt?.type || !evt?.createdAt) {
            res.status(400).json({ ok: false, error: 'invalid_event_shape' });
            return;
          }

          // Discard very old events (defense-in-depth)
          const createdAtMs = Date.parse(evt.createdAt);
          if (isNaN(createdAtMs) || (Date.now() - createdAtMs) > receiverConfig.eventTtlMs) {
            res.status(202).json({ ok: true, ignored: 'expired' });
            return;
          }

          // Dedup + store
          const accepted = webhookStore.add(evt);
          
          if (accepted) {
            console.log(`[Webhook] Event received: ${evt.type} (${evt.id})`);
          } else {
            console.log(`[Webhook] Event duplicate/expired: ${evt.type} (${evt.id})`);
          }

          // Acknowledge immediately
          res.status(200).json({ ok: true });
        } catch (err) {
          console.error('[Webhook] Processing error:', err);
          // Never leak details; Exa will retry on 5xx
          res.status(500).json({ ok: false });
        }
      }
    );

    console.log(`${colors.bright}${colors.cyan}Webhook receiver${colors.reset} enabled at ${colors.green}${receiverConfig.path}${colors.reset}`);
    if (receiverConfig.publicBaseUrl) {
      console.log(`${colors.bright}${colors.blue}Public callback URL:${colors.reset} ${receiverConfig.publicBaseUrl}${receiverConfig.path}`);
    } else {
      console.log(`${colors.yellow}⚠️  PUBLIC_BASE_URL not set. Webhooks will not work until configured.${colors.reset}`);
    }
  }

  /**
   * Start the server with HTTP transport
   */
  public async startHttpServer(port: number = 3000): Promise<void> {
    try {
      // Trust proxy for ngrok/cloudflared
      this.app.set('trust proxy', 1);

      // Initialize webhook receiver if enabled
      const websetsConfig = createWebsetsConfig();
      if (websetsConfig.webhookReceiver?.enabled) {
        this.setupWebhookReceiver(websetsConfig);
      }

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
      console.error(`${colors.bright}${colors.magenta}Exa Websets MCP Server${colors.reset} started in ${colors.bright}STDIO mode${colors.reset}`);
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
      // STDIO mode when explicitly requested - use stderr for logging
      console.error(`${colors.bright}${colors.yellow}Starting in STDIO mode${colors.reset}`);
      await server.startStdioServer();
    } else {
      // Default to STDIO mode (MCP standard) - use stderr for logging
      console.error(`${colors.bright}${colors.yellow}Starting in STDIO mode (default)${colors.reset}`);
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
