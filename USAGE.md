# Exa Websets MCP Server Usage

This MCP server supports both HTTP and STDIO transports.

## Running the Server

### HTTP Mode (Default)
For web-based clients or remote access:

```bash
# Run on default port 3000
node src/index.ts

# Or if built
node build/index.js

# Specify custom port with --http flag
node src/index.ts --http 8080
```

### STDIO Mode
For local use with MCP clients like Claude Desktop:

```bash
# Run in STDIO mode
node src/index.ts --stdio

# Or if built
node build/index.js --stdio
```

## How It Works

### HTTP Transport (Default)
- Provides a REST API at `/mcp`
- Default port: 3000
- Supports session management
- Handles:
  - POST `/mcp` - Client-to-server requests
  - GET `/mcp` - Server-to-client notifications (SSE)
  - DELETE `/mcp` - Session termination
- Requires `mcp-session-id` header for established sessions

### STDIO Transport
- Used for local process communication
- Must be explicitly enabled with `--stdio` flag
- Communicates via standard input/output
- Perfect for Claude Desktop and similar clients

## Environment Variables

- `EXA_API_KEY` - Your Exa API key for websets functionality

## Programmatic Usage

```typescript
import createServer from './src/index.js';

// Create server instance
const server = createServer('your-api-key');

// Connect to your chosen transport
await server.connect(transport);
```

## Available Tools

1. **web_search_exa** - Real-time web search
2. **websets_manager** - Comprehensive websets management
3. **websets_guide** - Helpful guidance for using websets

## Available Prompts

- `list_mcp_assets` - List all server capabilities
- `webset_discovery` - Discover available websets
- `webset_status_check` - Check async operation status
- `webset_analysis_guide` - Guide for analyzing websets
- `webhook_setup_guide` - Configure webhooks
- `quick_start` - Get started with websets
- `enrichment_workflow` - Enrich webset data
- `horizontal_process` - Create multiple websets
- `webset_portal` - Deep-dive research
- `iterative_intelligence` - Self-improving research 