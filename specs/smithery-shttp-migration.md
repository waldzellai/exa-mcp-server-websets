## Migration Plan: stdio to StreamableHTTP Transport

### Overview

We need to migrate the MCP server from stdio-only to support both stdio (for
local use) and StreamableHTTP (for Smithery deployment). According to Smithery
docs, this will allow the server to handle 10-100x more load and spin up
faster.

### Current Architecture Analysis

- Entry Point: src/index.ts - Currently a CLI executable using
StdioServerTransport
- Server Class: ExaServer - Tightly coupled to stdio transport
- Tools: Already modularized in src/tools/
- Services: Business logic is well-separated in src/services/

### Migration Steps

1. Refactor Server Architecture (High Priority)

  - Create a createServer() function that returns a configured MCP server
  instance
  - Make the server transport-agnostic by separating transport initialization
  from server logic
  - Support optional configSchema export for runtime configuration

2. Create Dual Entry Points

- Keep src/index.ts as the main entry point that can detect transport type
- Create separate initialization logic for stdio and shttp transports
- Use environment variables or CLI args to determine transport mode

3. Update Build Process

- Configure Smithery CLI to build both transport versions
- The CLI will automatically create:
    - .smithery/index.cjs for shttp deployment
    - Original build for stdio/npm usage

4. Update smithery.yaml

- Change from type: stdio to type: http in startCommand
- Update the commandFunction to work with shttp transport
- Ensure environment variables are properly passed

5. Testing Strategy

- Test stdio mode: npm run build && node build/index.js
- Test shttp mode: npx @smithery/cli build && node .smithery/index.cjs
- Verify all tools work in both modes

### Backward Compatibility

- Ensure existing stdio users aren't affected
- The npm package should continue to work as before
- Only Smithery deployments will use shttp

### Key Changes Required:

1. src/index.ts - Refactor to support both transports
2. smithery.yaml - Update to http transport
3. package.json - Add Smithery build scripts
4. .gitignore - Add .smithery/ directory
5. README.md - Document both usage modes

This migration will maintain full backward compatibility while enabling better
performance on Smithery platform. The dual-transport approach means local
users can continue using stdio while Smithery deployments benefit from shttp.