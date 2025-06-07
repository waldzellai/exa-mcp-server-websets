# Exa Websets MCP Server - Index.ts Revision Specification

## Overview

This document outlines a redesign of the `index.ts` file for the Exa Websets MCP server, adopting the cleaner architecture and conventions observed in the reddit-mcp server implementation.

## Current State Analysis

The current implementation has several areas that could benefit from improvement:

1. **Architecture**: Uses function-based approach rather than a class-based structure
2. **Code Organization**: Functionality is not clearly separated and modularized
3. **Error Handling**: Limited error handling with no consistent pattern
4. **Entry Point**: Main execution logic is mixed with server implementation
5. **Logging**: Basic console logging without standardized formatting

## Target State

### Key Goals

1. **Class-Based Architecture**: Encapsulate server functionality in an `ExaWebsetsServer` class
2. **Clean Separation of Concerns**: Separate server initialization, connection, and routing
3. **Improved Error Handling**: Consistent try/catch patterns with proper error reporting
4. **Colorful Console Logs**: Adopt colorful console logging like in reddit-mcp
5. **Simplified Entry Point**: Clean main function for server execution

### Proposed Structure

```typescript
#!/usr/bin/env node

import { config } from "dotenv";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
// Other imports...

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

// Import tools and prompts
import websetsGuideTool from "./tools/websetsGuide.js";
import { toolRegistry } from "./tools/config.js";
import { 
  listMcpAssets, websetDiscovery, websetStatusCheck,
  websetAnalysisGuide, webhookSetupGuide, quickStart,
  enrichmentWorkflow, horizontalProcess, websetPortal,
  iterativeIntelligence
} from "./prompts/index.js";

/**
 * Main Exa Websets MCP Server class
 */
export class ExaWebsetsServer {
  private app: express.Application;
  private server: McpServer;
  private activeSessions = new Map<string, StreamableHTTPServerTransport>();
  
  constructor(apiKey?: string) {
    // Set API key if provided
    if (apiKey) {
      process.env.EXA_API_KEY = apiKey;
    }
    
    // Initialize MCP server
    this.server = new McpServer({
      name: "exa-websets-server",
      version: "1.0.4"
    });
    
    // Initialize Express app
    this.app = express();
    this.app.use(express.json());
    
    // Setup server components
    this.registerTools();
    this.registerPrompts();
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
    // Register prompts - same implementation as current
    this.server.prompt("list_mcp_assets", "List all available MCP server capabilities including prompts, tools, and resources", async () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: await listMcpAssets()
        }
      }]
    }));
    
    // Other prompt registrations...
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
          
          // Create and connect the MCP server
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
        // Implementation unchanged
      });
      
      // Handle DELETE requests for session termination
      this.app.delete('/mcp', async (req, res) => {
        // Implementation unchanged
      });
      
      this.app.listen(port, () => {
        console.log(`${colors.bright}${colors.cyan}Exa Websets MCP Server ${colors.reset}${colors.bright}(HTTP)${colors.reset} ${colors.green}listening on port ${port}${colors.reset}`);
        console.log(`${colors.bright}${colors.blue}Connect via: ${colors.reset}http://localhost:${port}/mcp`);
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
    
    if (mode === '--stdio') {
      // STDIO mode when explicitly requested
      await server.startStdioServer();
    } else if (mode === '--http') {
      // HTTP mode with optional port
      const port = process.argv[3] ? parseInt(process.argv[3]) : 3000;
      await server.startHttpServer(port);
    } else {
      // Default to HTTP mode on port 3000
      await server.startHttpServer(3000);
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

// Default export for programmatic usage
export default function createServer(apiKey?: string): McpServer {
  const server = new ExaWebsetsServer(apiKey);
  return server['server']; // Return the internal McpServer instance
}
```

## Key Improvements

1. **Class Encapsulation**: 
   - All server functionality is encapsulated within the `ExaWebsetsServer` class
   - Maintains compatibility with existing code that imports `createServer`

2. **Modular Design**:
   - Clear method separation for registering tools and prompts
   - Separated HTTP and STDIO transport handling

3. **Colorful Console Output**:
   - Added color codes for more visually appealing and informative logs
   - Consistent formatting for different message types (errors, info, etc.)

4. **Error Handling**:
   - Consistent try/catch patterns
   - Proper error logging with colors
   - Clean process exit with status code on fatal errors

5. **Clean Entry Point**:
   - Separate `main()` function handles startup logic
   - Clear command-line argument parsing
   - Proper async/await pattern with catch blocks

6. **Compatibility**:
   - Maintains existing functionality
   - Preserves existing export pattern for backward compatibility

## Implementation Considerations

1. The design preserves all existing functionality while reorganizing it into a cleaner structure
2. Code that depends on importing `createServer` will continue to work
3. No changes to tool or prompt implementations are required
4. The existing API remains unchanged, this is purely a structural refactoring

## Next Steps

1. Implement the revised index.ts file
2. Add comprehensive unit tests for the server class
3. Consider further modularization of prompt registrations
4. Update documentation to reflect the new structure
5. Add health check endpoints similar to reddit-mcp implementation
