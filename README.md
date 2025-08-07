# Exa Websets MCP Server 🔍
[![npm version](https://badge.fury.io/js/exa-websets-mcp-server.svg)](https://www.npmjs.com/package/exa-websets-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa-websets)](https://smithery.ai/server/exa-websets)

A Model Context Protocol (MCP) server that provides Exa AI's websets management capabilities and web search functionality to AI assistants like Claude. This simplified server focuses on comprehensive content collection management through an intuitive interface.

## Features ✨

This MCP server provides three essential tools and seven agentic prompts:

### Tools
- **websets_manager**: A comprehensive tool for managing content collections, searches, and data enhancements
- **web_search_exa**: Real-time web search capabilities powered by Exa AI
- **websets_guide**: Helpful guidance and examples for using websets effectively
- **knowledge_graph**: Maintain connections between webset results in an onboard graph

### Prompts (NEW!)
Interactive workflows to guide you through websets operations:
- **list_mcp_assets**: Comprehensive list of all server capabilities
- **quick_start**: Get started quickly with creating your first webset
- **webset_discovery**: Discover and explore available websets
- **webset_status_check**: Monitor async webset operations with guided instructions
- **webset_analysis_guide**: Step-by-step guide for analyzing completed websets
- **webhook_setup_guide**: Configure webhooks for real-time notifications
- **enrichment_workflow**: Detailed workflow for enriching webset data with AI
- **horizontal_process**: Advanced workflow for creating multiple websets and building meta-datasets from cross-matches
- **webset_portal**: Deep-dive parallel research through webset URLs using Claude Code subagents
- **iterative_intelligence**: Self-improving research system with webset registry for fast retrieval and batch processing

### Why Choose This Server?

- **Simplified**: Just 3 tools instead of 20+ individual ones
- **Comprehensive**: The websets_manager handles all 20 websets operations in one tool
- **Guided**: Agentic prompts provide step-by-step workflows for complex operations
- **Fast**: No dynamic tool loading - all tools are immediately available
- **Reliable**: 100% operational coverage with graceful error handling
- **Smart Pagination**: Automatic handling of large responses to prevent token overflow
- **Auto-Polling**: Optional automatic polling for async operations (search, enhance)

## Remote Exa Websets MCP 🌐

Connect directly to Exa's hosted MCP server (instead of running it locally).

### Remote MCP URL

```
https://mcp.exa.ai/websets?exaApiKey=your-exa-api-key
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### Claude Desktop Configuration for Remote MCP

Add this to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "exa-websets": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.exa.ai/websets?exaApiKey=your-exa-api-key"
      ]
    }
  }
}
```

## Installation 📦

### NPM Installation

```bash
npm install -g exa-websets-mcp-server
```

### Using Smithery

To install the Exa Websets MCP server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/exa-websets):

```bash
npx -y @smithery/cli install exa-websets --client claude
```

## Configuration ⚙️

### For Claude Desktop

#### 1. Configure Claude Desktop to recognize the Exa Websets MCP server

You can find claude_desktop_config.json inside the settings of Claude Desktop app:

Open the Claude Desktop app and enable Developer Mode from the top-left menu bar. 

Once enabled, open Settings (also from the top-left menu bar) and navigate to the Developer Option, where you'll find the Edit Config button. Clicking it will open the claude_desktop_config.json file, allowing you to make the necessary edits. 

OR (if you want to open claude_desktop_config.json from terminal)

##### For macOS:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

##### For Windows:

```powershell
code %APPDATA%\Claude\claude_desktop_config.json
```

#### 2. Add the Exa Websets server configuration:

```json
{
  "mcpServers": {
    "exa-websets": {
      "command": "npx",
      "args": ["-y", "exa-websets-mcp-server"],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### For Claude Code

To configure this MCP server with Claude Code, use the following command:

```bash
# Install server locally first
npm install -g exa-websets-mcp-server

# Add to Claude Code with environment variable
claude mcp add exa-websets -e EXA_API_KEY=your-api-key-here -- npx exa-websets-mcp-server

# Or if you have built the project locally:
claude mcp add exa-websets -e EXA_API_KEY=your-api-key-here -- node /path/to/exa-websets-mcp-server/build/index.js
```

After adding the server, you can check its status with:

```bash
claude mcp list
```

Use the `/mcp` command within Claude Code to verify the server is connected.

#### 3. Restart Claude Desktop

For the changes to take effect:

1. Completely quit Claude Desktop (not just close the window)
2. Start Claude Desktop again
3. Look for the icon to verify the Exa Websets server is connected

## Using the Tools 🛠️

### websets_manager

The unified websets manager provides a single interface for all websets operations:

```
# Create a new content collection
operation: create_collection
collection: { searchQuery: "AI news", description: "Latest AI developments" }

# Search within a collection
operation: search_collection
resourceId: "collection-id"
search: { query: "breakthrough", maxResults: 10 }

# Enhance content with AI
operation: enhance_content
resourceId: "collection-id"
enhancement: { task: "Extract key findings from each article" }
```

### web_search_exa

Perform real-time web searches:

```
query: "latest AI developments"
numResults: 10
```

### websets_guide

Get help and examples for using websets:

```
topic: "getting_started"
```

Available topics:
- getting_started
- creating_collections
- searching_content
- enhancing_data
- setting_notifications
- workflow_examples
- troubleshooting
- best_practices

## Using Prompts 💬

Prompts provide interactive workflows that guide you through complex websets operations. They're especially useful for:
- Understanding the asynchronous nature of websets
- Learning best practices for different use cases
- Getting step-by-step instructions with example commands

To use a prompt in Claude, simply mention it:
- "Use the quick_start prompt to help me create my first webset"
- "Show me the webset_status_check for webset_abc123"

## Pagination and Polling Best Practices 📖

### Automatic Pagination

The server automatically handles large responses to prevent token overflow:

```javascript
// List activities - automatically paginated if no limit specified
operation: "list_activities"
// Returns manageable chunks that fit within token limits

// Or specify your own limit if you know what you need
operation: "list_activities"
query: { limit: 5 }
```

**How it works:**
- If you don't specify a limit, the server automatically paginates results
- Starts with small batches and adjusts based on response size
- Prevents "response too large" errors from MCP clients
- Works for activities, websets, and content items

### Automatic Polling for Async Operations

Search and enhancement operations can now wait for results automatically:

```javascript
// Search with automatic polling (waits up to 1 minute)
operation: "search_webset"
resourceId: "webset_123"
search: {
  query: "AI startups",
  advanced: {
    waitForResults: true  // Enable auto-polling
  }
}

// Enhancement with automatic polling (waits up to 2 minutes)
operation: "enhance_content"
resourceId: "webset_123"
enhancement: {
  task: "Extract company names and funding",
  advanced: {
    waitForResults: true  // Enable auto-polling
  }
}
```

**Polling intervals:**
- Search: Checks every 2 seconds for up to 1 minute
- Enhancement: Checks every 3 seconds for up to 2 minutes
- No exponential backoff - predictable, reasonable intervals
- Progress updates logged during polling

**When to use:**
- Enable `waitForResults` when you need results immediately
- Disable it (default) when running batch operations
- Polling stops as soon as operation completes or fails
- "Guide me through enrichment_workflow for my completed webset"

Each prompt provides contextual guidance, example commands, and best practices tailored to your specific situation.

## Using via NPX

Run the server directly with npx:

```bash
# Run the websets server
npx exa-websets-mcp-server
```

## Troubleshooting 🔧

### Common Issues

1. **Server Not Found**
   * Verify the npm package is correctly installed
   * Check Claude Desktop configuration syntax (json file)

2. **API Key Issues**
   * Confirm your EXA_API_KEY is valid
   * Check the EXA_API_KEY is correctly set in the configuration
   * Verify no spaces or quotes around the API key

3. **Connection Issues**
   * Restart Claude Desktop completely
   * Check Claude Desktop logs for error messages

4. **Events API Unavailable**
   * The events endpoint may return 500 errors
   * Use webhooks for event notifications instead
   * Monitor webset status through get_collection_status

## Changelog

### v1.0.5 (2025-06-20)
- Added automatic pagination for large responses to prevent token overflow
- Implemented optional auto-polling for async operations (search, enhance)
- Added `waitForResults` option for immediate results from async operations
- Improved activity list handling with smart pagination
- Added progress logging during polling operations
- No exponential backoff - uses predictable, reasonable polling intervals

### v1.0.4 (2025-06-06)
- Added stdio transport support for local MCP connections
- Fixed server startup for both Claude Desktop and Smithery deployments
- Improved compatibility with Claude Code
- Enhanced error handling and security checks
- Added comprehensive prompt system with 10 interactive workflows
- Improved package metadata for npm publishing

### v1.0.2 (2025-05-27)
- Fixed keep-alive mechanism to prevent connection timeouts
- Now sends MCP logging messages to maintain stdio connection
- Prevents Claude Desktop disconnections during idle periods

### v1.0.1 (2025-05-27)
- Fixed authentication header from 'Authorization: Bearer' to 'x-api-key'
- Resolved network errors in websets operations
- All tools now work correctly with Smithery deployment

### v1.0.0 (2025-05-27)
- Initial release with simplified architecture
- Three essential tools: websets_manager, web_search_exa, websets_guide
- 100% operational coverage for all websets operations

---

Built with ❤️ by team Exa