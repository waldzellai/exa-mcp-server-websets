# Exa Websets MCP Server 🔍
[![npm version](https://badge.fury.io/js/exa-websets-mcp-server.svg)](https://www.npmjs.com/package/exa-websets-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa-websets)](https://smithery.ai/server/exa-websets)

A Model Context Protocol (MCP) server that provides Exa AI's websets management capabilities and web search functionality to AI assistants like Claude. This simplified server focuses on comprehensive content collection management through an intuitive interface.

## Features ✨

This MCP server provides three essential tools:

- **websets_manager**: A comprehensive tool for managing content collections, searches, and data enhancements
- **web_search_exa**: Real-time web search capabilities powered by Exa AI
- **websets_guide**: Helpful guidance and examples for using websets effectively

### Why Choose This Server?

- **Simplified**: Just 3 tools instead of 20+ individual ones
- **Comprehensive**: The websets_manager handles all 20 websets operations in one tool
- **Fast**: No dynamic tool loading - all tools are immediately available
- **Reliable**: 100% operational coverage with graceful error handling

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