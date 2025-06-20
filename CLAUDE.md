# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides Exa AI's search capabilities and websets management to AI assistants. It's published as an npm package and can be run as a CLI tool.

## Essential Commands

```bash
# Build and Development
npm run build          # Compile TypeScript (required after changes)
npm run watch          # Watch mode for development
npm run inspector      # Debug with MCP inspector

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report

# Check before committing
npm run build && npm test
```

## Server Modes

The server supports multiple transport modes:
- **Default (no args)**: HTTP mode on port 3000 (MCP standard)
- `--stdio`: Use STDIO transport (when explicitly requested)
- `--http [port]`: Use HTTP transport with custom port

**Note**: If port 3000 is in use, specify a different port with `--http 3456`

## Architecture

### Module System
- Uses ES modules (not CommonJS) - all imports must include `.js` extension
- TypeScript with strict mode enabled
- Entry point: `src/index.ts` (CLI executable)

### Core Components

1. **Tools** (`src/tools/`): Individual MCP tools that can be selectively enabled
   - Each tool exports a default object with `name`, `description`, `inputSchema`, and `execute`
   - Tools are dynamically imported based on CLI arguments

2. **Services** (`src/services/`): Business logic layer
   - Extend `BaseService` for common functionality
   - Handle API operations and state management

3. **API Client** (`src/api/WebsetsApiClient.ts`): 
   - Centralized HTTP client with rate limiting
   - All API calls go through this client

4. **Events System** (`src/events/`):
   - `EventPoller`: Polls API for new events
   - `EventProcessor`: Processes events and triggers webhooks
   - `EventQueue`: Manages event processing order

5. **State Management** (`src/state/`):
   - In-memory stores for webhooks and operations
   - No persistent storage - state is lost on restart

### Key Patterns

- **Error Handling**: Use `ErrorHandler` class for consistent error responses
- **Rate Limiting**: Built into API client (300 req/min)
- **Async Operations**: Use `AsyncOperationManager` for tracking long-running tasks
- **Testing**: Mock axios in tests, use fixtures from `tests/fixtures/`

### Configuration

- **API Key**: Set `EXA_API_KEY` environment variable
- **Tool Selection**: Use `--tools` CLI argument (comma-separated list)
- **Test Thresholds**: 90% coverage required for all metrics

### Important Notes

- When adding new tools, register them in `src/tools/index.ts`
- All API responses follow Zod schemas in `src/types/websets.ts`
- Webhook URLs must be HTTPS in production
- Events are polled every 30 seconds when server is running