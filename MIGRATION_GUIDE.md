# Progressive MCP Compliance Migration Guide

This guide explains how to progressively adopt MCP-compliant features in the Exa Websets MCP Server while maintaining backward compatibility.

## Overview

The progressive approach allows you to:
- Maintain full backward compatibility
- Enable features incrementally
- Test new capabilities without breaking existing integrations
- Migrate at your own pace

## Default Behavior Changes

### Transport Mode (Breaking Change - Phase 1)
**Old behavior**: Server defaulted to HTTP mode on port 3000
**New behavior**: Server defaults to STDIO mode (MCP standard)

To maintain old behavior:
```bash
# Explicitly use HTTP mode
npx exa-websets-mcp-server --http 3000
```

To use new default (STDIO):
```bash
# Just run without arguments
npx exa-websets-mcp-server
```

## Feature Flags

All new features are **disabled by default**. Enable them using environment variables:

### 1. Enhanced Error Format
Provides MCP-compliant error responses with proper error codes.

```bash
# Enable enhanced errors
export MCP_FEATURE_ENHANCED_ERRORS=true
```

**Benefits**:
- Standardized error codes
- Better error categorization
- Improved debugging information

**Migration**:
- Test with enhanced errors enabled
- Update error handling in your client code
- No changes needed to existing code if disabled

### 2. Resources (Coming Soon)
Enables MCP resource capabilities for discovering server-provided data.

```bash
# Enable resources
export MCP_FEATURE_RESOURCES=true
```

**Benefits**:
- Discover available guides and templates
- Access server-provided content
- Better integration with MCP clients

**Status**: Stub implementation ready, full implementation pending

### 3. Progress Notifications (Coming Soon)
Enables real-time progress updates for long-running operations.

```bash
# Enable progress notifications
export MCP_FEATURE_PROGRESS_NOTIFICATIONS=true
```

**Benefits**:
- Track webset creation progress
- Monitor async operations
- Better user experience

**Status**: Infrastructure ready, implementation pending

### 4. Advanced Logging (Coming Soon)
Enables dynamic log level control.

```bash
# Enable logging features
export MCP_FEATURE_LOGGING=true
```

**Benefits**:
- Change log levels at runtime
- Better debugging capabilities
- Reduced log noise in production

**Status**: Handler registered, implementation pending

### 5. Sampling/Completion (Coming Soon)
Enables AI model sampling features.

```bash
# Enable sampling
export MCP_FEATURE_SAMPLING=true
```

**Benefits**:
- AI-assisted completions
- Better integration with AI tools
- Enhanced user experience

**Status**: Handler registered, implementation pending

## Migration Steps

### Step 1: Test Current Integration
Ensure your current integration works with the new version:
```bash
# Test with all features disabled (default)
npx exa-websets-mcp-server --http 3000
```

### Step 2: Enable Features Individually
Test each feature one at a time:
```bash
# Test enhanced errors
export MCP_FEATURE_ENHANCED_ERRORS=true
npx exa-websets-mcp-server --http 3000

# Test resources (when implemented)
export MCP_FEATURE_RESOURCES=true
npx exa-websets-mcp-server --http 3000
```

### Step 3: Update Client Code
Update your client to handle new features:
- Handle new error format when enhanced errors are enabled
- Use resource discovery when resources are enabled
- Subscribe to progress events when notifications are enabled

### Step 4: Enable All Features
Once tested, enable all desired features:
```bash
export MCP_FEATURE_ENHANCED_ERRORS=true
export MCP_FEATURE_RESOURCES=true
export MCP_FEATURE_PROGRESS_NOTIFICATIONS=true
npx exa-websets-mcp-server
```

## Checking Enabled Features

The server logs enabled features on startup:
```
Starting in STDIO mode (default)
Enabled features: enhancedErrors, resources
```

You can also check programmatically using the ping handler:
```json
{
  "jsonrpc": "2.0",
  "method": "ping",
  "id": 1
}
```

## Backward Compatibility

- All existing tools work without modification
- Legacy error format is used by default
- HTTP transport still available with `--http` flag
- No breaking changes to tool interfaces

## Troubleshooting

### Server starts in STDIO mode instead of HTTP
**Solution**: Use `--http` flag explicitly
```bash
npx exa-websets-mcp-server --http 3000
```

### Enhanced errors not working
**Solution**: Ensure environment variable is set
```bash
export MCP_FEATURE_ENHANCED_ERRORS=true
```

### Resources not appearing
**Solution**: Feature not fully implemented yet. Check logs for status.

## Future Features

The following features are planned for future releases:
- Full resource implementation with websets guides and templates
- Progress notifications for async operations
- Dynamic logging control
- AI-assisted sampling/completion

## Support

For issues or questions about migration:
1. Check the [GitHub repository](https://github.com/your-repo)
2. Review the [MCP specification](https://modelcontextprotocol.org)
3. Open an issue for migration problems