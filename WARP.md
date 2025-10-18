# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Model Context Protocol (MCP) server providing Exa AI's websets management capabilities and web search functionality to AI assistants. Published as npm package `exa-websets-mcp-server`.

## Essential Development Commands

### Build and Development
```bash
npm run build          # Compile TypeScript to build/ directory (required after changes)
npm run watch          # Watch mode for continuous compilation
npm run dev            # Run with Smithery CLI inspector for debugging
```

### Testing
```bash
npm test               # Run all tests (currently disabled)
npm run test:watch     # Watch mode for tests
npm run test:coverage  # Generate coverage report (requires 90% coverage)
```

### Pre-commit Checklist
```bash
npm run build && npm test
```

### Running the Server
```bash
# As npm package (default)
npx exa-websets-mcp-server

# Local development
node build/index.js

# With specific transport mode
node build/index.js --stdio    # STDIO transport
node build/index.js --http 3456  # HTTP transport on custom port
```

## Architecture Overview

### Module System
- **ES Modules only** - all imports must include `.js` extension (TypeScript resolves .ts → .js)
- TypeScript with strict mode, Node16 module resolution
- Entry point: `src/index.ts` (CLI executable with shebang)

### Core Architecture Layers

**1. Tools Layer** (`src/tools/`)
- Tool registry system with dynamic registration via `toolRegistry` object
- Four essential tools: `websets_manager`, `web_search_exa`, `websets_guide`, `knowledge_graph`
- Each tool exports: `name`, `description`, `schema` (Zod), `handler` (async function)
- Unified websets_manager handles 20+ operations through single interface with operation enum

**2. Services Layer** (`src/services/`)
- Service classes extend `BaseService` for common functionality
- Factory pattern: `createServices(apiKey)` returns `ServiceContainer` with all services
- Services: WebsetService, SearchService, ItemService, EnrichmentService, EventService, WebhookService
- All services use dependency-injected `WebsetsApiClient`

**3. API Client** (`src/api/WebsetsApiClient.ts`)
- Centralized HTTP client wrapping axios
- Built-in rate limiting (10 req/sec default) via `RateLimiter` class
- Circuit breaker pattern (5 failure threshold, 60s timeout)
- Automatic retries with exponential backoff (3 attempts, 1s-10s delays)
- Token injection via `SecureTokenProvider` using `x-api-key` header
- Error handling through `ApiErrorHandler` with classification

**4. Prompts System** (`src/prompts/`)
- 11 agentic prompts for guided workflows (quick_start, webset_discovery, enrichment_workflow, etc.)
- Prompts provide step-by-step instructions with example commands
- Handle async operation patterns and best practices

**5. State Management** (`src/state/`)
- In-memory stores (no persistence) - state lost on restart
- `AsyncOperationManager` tracks long-running operations
- `MemoryStore` for webhooks and temporary data
- `ProgressTracker` for polling operations

### Key Architectural Patterns

**Automatic Pagination**
- Smart pagination prevents token overflow in MCP responses
- Auto-adjusts batch sizes based on response size
- Used in list operations (activities, websets, content items)

**Auto-Polling for Async Operations**
- Optional `waitForResults` flag in search/enhancement operations
- Search: 2s intervals, 1 min max timeout
- Enhancement: 3s intervals, 2 min max timeout
- No exponential backoff - predictable intervals

**Tool Registration**
- Tools self-register via side effects on import (see `src/tools/index.ts`)
- `toolRegistry` object populated at module load time
- Server accesses tools from registry in `registerTools()` method

## Critical Development Notes

### ES Module Requirements
- All relative imports MUST use `.js` extension even in TypeScript files
- Example: `import { foo } from './bar.js'` (not `./bar` or `./bar.ts`)
- Module system: Node16 with ES2022 target

### API Authentication
- Uses `x-api-key` header (NOT `Authorization: Bearer`)
- API key from `EXA_API_KEY` environment variable
- Injected via request interceptor in `WebsetsApiClient`

### Transport Modes
- Default (no args): HTTP mode on port 3000
- `--stdio`: STDIO transport for Claude Desktop/Code
- `--http [port]`: HTTP with custom port
- Keep-alive mechanism prevents STDIO connection timeouts

### Testing Setup
- Jest with ts-jest preset for ESM support
- Test environment uses fake timers by default
- Global test utils in `tests/setup.ts`
- Mock axios for API client tests
- 90% coverage threshold on all metrics (branches, functions, lines, statements)

### State and Lifecycle
- Websets operations are asynchronous (create → processing → completed)
- Server maintains operation mappings in Maps (searchToWebsetMap, enrichmentToWebsetMap)
- Events system disabled by default (can enable with WEBSETS_EVENTS_ENABLED=true)

### Configuration
- Default config in `src/config/websets.ts`
- Environment variable overrides for all settings
- Rate limits: 10 req/sec, circuit breaker: 5 failures
- Timeouts: 30s default, retries: 3 attempts

## Adding New Tools

1. Create tool file in `src/tools/` (e.g., `newTool.ts`)
2. Define tool with Zod schema and handler function
3. Register in `toolRegistry` object: `toolRegistry["tool_name"] = { ... }`
4. Import in `src/tools/index.ts` to trigger registration
5. Add to server's `registerTools()` method if needed in main tool set

## Common Patterns

### Service Creation
```typescript
const services = createServices(apiKey);
await services.websetService.createWebset(params);
```

### Request Logging
```typescript
const logger = createRequestLogger(requestId, 'operation_name');
logger.start('description');
// ... operation ...
logger.success('result');
```

### Pagination
```typescript
const items = await autoPaginate(
  async (limit, offset) => service.listItems({ limit, offset }),
  PAGINATION_DEFAULTS.maxResults
);
```

### Polling
```typescript
const result = await pollOperation(
  () => service.getStatus(id),
  (status) => status === 'completed',
  { interval: 2000, maxAttempts: 30 }
);
```

## Configuration Environment Variables

- `EXA_API_KEY` - Required API key for Exa services
- `WEBSETS_BASE_URL` - Override API base URL (default: https://api.exa.ai/websets/v0)
- `WEBSETS_TIMEOUT` - Request timeout in ms (default: 30000)
- `WEBSETS_RATE_LIMIT` - Requests per second (default: 10)
- `WEBSETS_EVENTS_ENABLED` - Enable event polling (default: false)
- `NODE_ENV` - Set to 'production' to disable debug logging

## Remote MCP Connection

Server can be accessed remotely via:
```
https://mcp.exa.ai/websets?exaApiKey=your-exa-api-key
```

Used with `mcp-remote` package in Claude Desktop config.
