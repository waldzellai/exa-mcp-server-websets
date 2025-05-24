#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Import the tool registry system
import { toolRegistry, ToolFactory, ToolCategory, ServiceType } from "./tools/index.js";
import { log } from "./utils/logger.js";

dotenv.config();

// Parse command line arguments to determine which tools to enable
const argv = yargs(hideBin(process.argv))
  .option('tools', {
    type: 'string',
    description: 'Comma-separated list of tools or categories to enable. Categories: search, websets, unified. Use "unified" for simplified websets experience. If not specified, defaults to search + unified.',
    default: ''
  })
  .option('list-tools', {
    type: 'boolean',
    description: 'List all available tools and exit',
    default: false
  })
  .help()
  .argv;

// Convert comma-separated string to Set for easier lookups
const argvObj = argv as any;
const toolsString = argvObj['tools'] || '';
const specifiedTools = new Set<string>(
  toolsString ? toolsString.split(',').map((tool: string) => tool.trim()) : []
);

// Define tool categories for easier selection
const TOOL_CATEGORIES = {
  search: ['web_search_exa', 'research_paper_search', 'company_research', 'crawling', 'competitor_finder', 'linkedin_search', 'wikipedia_search_exa', 'github_search'],
  websets: Object.keys(toolRegistry).filter(key => toolRegistry[key].category === ToolCategory.WEBSETS && !['websets_manager', 'websets_guide'].includes(key)),
  unified: ['websets_manager', 'websets_guide'], // The simplified tools
  all: Object.keys(toolRegistry)
};

// Expand categories into individual tool names
function expandToolSelection(selection: Set<string>): Set<string> {
  const expanded = new Set<string>();
  
  selection.forEach(item => {
    if (TOOL_CATEGORIES[item as keyof typeof TOOL_CATEGORIES]) {
      // It's a category, add all tools in that category
      TOOL_CATEGORIES[item as keyof typeof TOOL_CATEGORIES].forEach(tool => expanded.add(tool));
    } else {
      // It's an individual tool name
      expanded.add(item);
    }
  });
  
  return expanded;
}

// Apply category expansion
const expandedTools = expandToolSelection(specifiedTools);

// List all available tools if requested
if (argvObj['list-tools']) {
  console.log("Available tool categories:");
  console.log("- search: All search tools (web search, research papers, GitHub, etc.)");
  console.log("- unified: Simplified websets manager + guide (RECOMMENDED)");
  console.log("- websets: Individual websets tools (legacy, complex)");
  console.log("- all: Every available tool");
  console.log();
  
  console.log("Individual tools:");
  
  Object.entries(toolRegistry).forEach(([id, tool]) => {
    const category = tool.category || 'uncategorized';
    console.log(`- ${id}: ${tool.name} (${category})`);
    console.log(`  Description: ${tool.description}`);
    console.log(`  Enabled by default: ${tool.enabled ? 'Yes' : 'No'}`);
    console.log();
  });
  
  console.log("Usage examples:");
  console.log("  --tools=unified           # Simplified manager + guide (recommended)");
  console.log("  --tools=search,unified    # Search tools + simplified websets");
  console.log("  --tools=search            # Only search tools"); 
  console.log("  --tools=websets           # All individual websets tools (complex)");
  console.log("  --tools=web_search_exa    # Only web search tool");
  console.log("  --tools=websets_guide     # Just the helpful guide tool");
  
  process.exit(0);
}

// Check for API key after handling list-tools to allow listing without a key
const API_KEY = process.env.EXA_API_KEY;
if (!API_KEY) {
  throw new Error("EXA_API_KEY environment variable is required");
}

/**
 * Exa AI Web Search MCP Server
 * 
 * This MCP server integrates Exa AI's search capabilities with Claude and other MCP-compatible clients.
 * Exa is a search engine and API specifically designed for up-to-date web searching and retrieval,
 * offering more recent and comprehensive results than what might be available in an LLM's training data.
 * 
 * The server provides tools that enable:
 * - Real-time web searching with configurable parameters
 * - Research paper searches
 * - And more to come!
 */

class ExaServer {
  private server: McpServer;
  private keepAliveInterval?: NodeJS.Timeout;

  constructor() {
    this.server = new McpServer({
      name: "exa-search-server",
      version: "0.3.10"
    });
    
    log("Server initialized");
  }

  private setupTools(): string[] {
    // Register tools based on specifications
    const registeredTools: string[] = [];
    
    Object.entries(toolRegistry).forEach(([toolId, tool]) => {
      let shouldRegister = false;
      
      if (expandedTools.size > 0) {
        // Specific tools/categories were provided
        shouldRegister = expandedTools.has(toolId);
      } else {
        // No specific tools provided - use default selection
        // Default: search tools + unified websets manager (simplified experience)
        const defaultTools = new Set([...TOOL_CATEGORIES.search, ...TOOL_CATEGORIES.unified]);
        shouldRegister = defaultTools.has(toolId);
      }
      
      if (shouldRegister) {
        this.server.tool(
          tool.name,
          tool.description,
          tool.schema,
          tool.handler
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
      log("Exa Search MCP server running on stdio");
      
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