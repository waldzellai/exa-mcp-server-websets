# Exa MCP Server 🔍
[![npm version](https://badge.fury.io/js/exa-mcp-server.svg)](https://www.npmjs.com/package/exa-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa)](https://smithery.ai/server/exa)

A Model Context Protocol (MCP) server lets AI assistants like Claude use the Exa AI Search API for web searches. This setup allows AI models to get real-time web information in a safe and controlled way.

## Remote Exa MCP 🌐

Connect directly to Exa's hosted MCP server (instead of running it locally).

### Remote Exa MCP URL

```
https://mcp.exa.ai/mcp?exaApiKey=your-exa-api-key
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### Claude Desktop Configuration for Remote MCP

Add this to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.exa.ai/mcp?exaApiKey=your-exa-api-key"
      ]
    }
  }
}
```

### NPM Installation

```bash
npm install -g exa-mcp-server
```

### Using Smithery

To install the Exa MCP server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/exa):

```bash
npx -y @smithery/cli install exa --client claude
```

## Configuration ⚙️

### For Claude Desktop

#### 1. Configure Claude Desktop to recognize the Exa MCP server

You can find claude_desktop_config.json inside the settings of Claude Desktop app:

Open the Claude Desktop app and enable Developer Mode from the top-left menu bar. 

Once enabled, open Settings (also from the top-left menu bar) and navigate to the Developer Option, where you'll find the Edit Config button. Clicking it will open the claude_desktop_config.json file, allowing you to make the necessary edits. 

OR (if you want to open claude_desktop_config.json from terminal)

##### For macOS:

1. Open your Claude Desktop configuration:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

##### For Windows:

1. Open your Claude Desktop configuration:

```powershell
code %APPDATA%\Claude\claude_desktop_config.json
```

#### 2. Add the Exa server configuration:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
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
npm install -g exa-mcp-server

# Add to Claude Code with environment variable
claude mcp add exa-websets -e EXA_API_KEY=your-api-key-here -- npx exa-mcp-server

# Or if you have built the project locally:
claude mcp add exa-websets -e EXA_API_KEY=your-api-key-here -- node /path/to/exa-mcp-server-websets/build/index.js
```

You can also specify which tools to enable:

```bash
# Enable specific tools only
claude mcp add exa-websets -e EXA_API_KEY=your-api-key-here -- npx exa-mcp-server --tools=web_search_exa,research_paper_search

# Enable all websets tools
claude mcp add exa-websets -e EXA_API_KEY=your-api-key-here -- npx exa-mcp-server --tools=websets
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

After adding the server, you can check its status with:

```bash
claude mcp list
```

Use the `/mcp` command within Claude Code to verify the server is connected.

### 3. Available Tools & Tool Selection

The Exa MCP server includes the following tools, which can be enabled by adding the `--tools`:

#### Search Tools
- **web_search_exa**: Performs real-time web searches with optimized results and content extraction.
- **research_paper_search**: Specialized search focused on academic papers and research content.
- **company_research**: Comprehensive company research tool that crawls company websites to gather detailed information about businesses.
- **crawling**: Extracts content from specific URLs, useful for reading articles, PDFs, or any web page when you have the exact URL.
- **competitor_finder**: Identifies competitors of a company by searching for businesses offering similar products or services.
- **linkedin_search**: Search LinkedIn for companies and people using Exa AI. Simply include company names, person names, or specific LinkedIn URLs in your query.
- **wikipedia_search_exa**: Search and retrieve information from Wikipedia articles on specific topics, giving you accurate, structured knowledge from the world's largest encyclopedia.
- **github_search**: Search GitHub repositories using Exa AI - performs real-time searches on GitHub.com to find relevant repositories, issues, and GitHub accounts.

#### Websets Tools
- **webset_create**: Create new websets for organizing and managing collections of web content.
- **webset_delete**: Delete existing websets when they're no longer needed.
- **webset_list**: List all your websets to see what collections you have.
- **webset_update**: Update webset metadata like name and description.
- **webset_get_status**: Check the current status of a webset and its processing progress.
- **webset_cancel**: Cancel webset operations that are in progress.
- **webset_list_items**: List all items within a specific webset.
- **search_create**: Create new searches within websets to find specific content.
- **search_get**: Retrieve results from previously created searches.
- **search_cancel**: Cancel search operations that are running.
- **enrichment_create**: Create enrichment tasks to enhance webset content with additional data.
- **enrichment_get**: Get results from enrichment operations.
- **enrichment_delete**: Remove enrichment data when no longer needed.
- **enrichment_cancel**: Cancel enrichment operations in progress.
- **webhook_create**: Set up webhooks to receive notifications about webset events.
- **webhook_list**: List all configured webhooks.
- **webhook_get**: Get details about a specific webhook.
- **webhook_delete**: Remove webhooks that are no longer needed.
- **event_list**: List events that have occurred in your websets.
- **event_get**: Get detailed information about a specific event.

You can choose which tools to enable by adding the `--tools` parameter to your configuration:

#### Tool Categories

You can enable tools by category or individually:

- `--tools=search` - Enable all search tools
- `--tools=websets` - Enable all websets management tools  
- `--tools=search,websets` - Enable both categories
- `--tools=web_search_exa,webset_create` - Enable specific tools

#### Claude Desktop Configuration Examples

Enable all search tools:
```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "--tools=search"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Enable all websets tools:
```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "--tools=websets"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Enable specific tools:
```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "--tools=web_search_exa,webset_create,webset_list"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

If you don't specify any tools, all tools enabled by default will be used.

#### 4. Restart Claude Desktop

For the changes to take effect:

1. Completely quit Claude Desktop (not just close the window)
2. Start Claude Desktop again
3. Look for the icon to verify the Exa server is connected

## Using via NPX

If you prefer to run the server directly, you can use npx:

```bash
# Run with all tools enabled by default
npx exa-mcp-server

# Enable specific tools only
npx exa-mcp-server --tools=web_search_exa

# Enable multiple tools
npx exa-mcp-server --tools=web_search_exa,research_paper_search

# List all available tools
npx exa-mcp-server --list-tools
```

## Troubleshooting 🔧

### Common Issues

1. **Server Not Found**
   * Verify the npm link is correctly set up
   * Check Claude Desktop configuration syntax (json file)

2. **API Key Issues**
   * Confirm your EXA_API_KEY is valid
   * Check the EXA_API_KEY is correctly set in the Claude Desktop config
   * Verify no spaces or quotes around the API key

3. **Connection Issues**
   * Restart Claude Desktop completely
   * Check Claude Desktop logs:

<br>

---

Built with ❤️ by team Exa