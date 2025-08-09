/**
 * List all MCP assets available in the Exa Websets server
 */

export async function listMcpAssets(): Promise<string> {
  return `# 🚀 Exa Websets MCP Server Assets

## 📝 Prompts
Interactive conversation starters and analysis guides:

• **list_mcp_assets** () - This comprehensive list of all MCP server capabilities
• **webset_discovery** () - Discover and explore available websets
• **webset_status_check** (websetId) - Check status of async webset operations
• **webset_analysis_guide** (websetId) - Guide for analyzing completed websets
• **webhook_setup_guide** () - Configure webhooks for webset notifications
• **quick_start** () - Get started quickly with creating your first webset
• **enrichment_workflow** (websetId) - Workflow for enriching webset data
• **horizontal_process** (searchCriteria, projectName?) - Create multiple websets and build meta-dataset from cross-matches (comma-separated queries)
• **webset_portal** (websetId, researchQuery, maxPortals?) - Deep-dive research through webset URLs using parallel subagents
• **iterative_intelligence** (researchTopic, iterations?, registryPath?) - Self-improving research with webset registry for fast retrieval

## 🔧 Tools
Webset management and analysis functions:

  ### Core Webset Operations
  • **websets_search** (query, limit) - Search the web and create new websets asynchronously
  • **websets_search_guide** () - Learn to use websets search effectively
  • **websets_manager** (action, params) - Advanced webset management operations
  • **knowledge_graph** (operation, params) - Maintain connections between webset results

### Webset Management
• **list_websets** () - List all your websets with status and metadata
• **get_webset** (websetId) - Get detailed info about a specific webset
• **get_webset_items** (websetId, limit, offset) - Retrieve items from a completed webset
• **delete_webset** (websetId) - Delete a webset and all its data
• **update_webset_metadata** (websetId, metadata) - Update webset metadata

### Item Operations
• **add_items** (websetId, items) - Add new items to an existing webset
• **update_item** (websetId, itemId, data) - Update a specific item
• **delete_item** (websetId, itemId) - Delete a specific item
• **search_items** (websetId, query, filters) - Search within webset items

### Enrichment & Analysis
• **enrich_webset** (websetId, enrichmentType, config) - Enrich webset with additional data
• **export_webset** (websetId, format) - Export webset data (CSV, JSON, etc.)
• **analyze_webset** (websetId, analysisType) - Run analytics on webset data

### Webhook Management
• **register_webhook** (url, events, config) - Register webhook for notifications
• **list_webhooks** () - List all registered webhooks
• **update_webhook** (webhookId, config) - Update webhook configuration
• **delete_webhook** (webhookId) - Remove a webhook
• **test_webhook** (webhookId) - Test webhook connectivity

### Event Monitoring
• **get_events** (websetId, limit) - Get recent events for a webset
• **get_event_details** (eventId) - Get detailed info about an event

## 📊 Key Concepts

### Asynchronous Nature
Websets are **highly asynchronous** - searches can take 20+ minutes to complete:
• Initial search triggers webset creation with status "processing"
• Use webhooks or polling to monitor progress
• Items become available as they're discovered
• Final status will be "completed" or "failed"

### Webset Lifecycle
1. **Creation**: Initiated via search or manual creation
2. **Processing**: Exa crawls and processes web data
3. **Enrichment**: Optional post-processing for additional data
4. **Completion**: All items collected and ready for use
5. **Export/Analysis**: Data ready for downstream use

### Best Practices
• Always check webset status before accessing items
• Use webhooks for efficient notification of completion
• Implement exponential backoff when polling status
• Handle partial results - items may be available before completion
• Use enrichment for additional metadata (summaries, tags, etc.)

---

**🎯 Quick Start:**
1. Use \`websets_search()\` to create a new webset from a search query
2. Register a webhook with \`register_webhook()\` to get notified on completion
3. Monitor status with \`webset_status_check(websetId)\` prompt
4. Once complete, retrieve items with \`get_webset_items()\`
5. Export or analyze results as needed

**💡 Pro Tips:**
• Websets can contain thousands of items - use pagination
• Enrichment can add significant value but increases processing time
• Webhooks are more efficient than polling for status updates
• Items are returned in relevance order by default
• Use the search_items tool for filtering within large websets`;
}