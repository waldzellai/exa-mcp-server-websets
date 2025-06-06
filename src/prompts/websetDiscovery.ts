/**
 * Discover and explore available websets
 */

import { WebsetService } from '../services/WebsetService.js';

export async function websetDiscovery(): Promise<string> {
  try {
    // In a real implementation, this would fetch actual websets
    // For now, we'll provide a template response
    return `# 📁 Webset Discovery

## 🔍 Discovering Your Websets

Let me help you explore the websets available in your account.

### Available Commands:
• \`list_websets()\` - View all your websets with current status
• \`get_webset(websetId)\` - Get detailed information about a specific webset
• \`websets_search("your query")\` - Create a new webset from a search

### Understanding Webset States:
• **🟡 Processing** - Webset is being created (can take 20+ minutes)
• **🟢 Completed** - Ready for use with all items available
• **🔴 Failed** - Something went wrong during creation
• **🟠 Partial** - Some items available, still processing

### What Would You Like to Do?

**Option 1: View Existing Websets**
Run \`list_websets()\` to see all your websets with:
- Creation date and current status
- Number of items collected
- Search query used
- Processing time

**Option 2: Create a New Webset**
Use \`websets_search("your topic")\` to start a new search. Examples:
- \`websets_search("AI startups funding 2024")\`
- \`websets_search("sustainable fashion brands")\`
- \`websets_search("remote work tools productivity")\`

**Option 3: Check Specific Webset**
If you have a webset ID, use:
- \`get_webset("webset_id")\` for metadata
- \`get_webset_items("webset_id", 10)\` for first 10 items
- \`webset_status_check("webset_id")\` for detailed status

### 💡 Pro Tips:
• Websets can contain thousands of results - more than regular search
• Each item includes URL, title, text content, and metadata
• Use specific queries for better results
• Consider enrichment options for additional data

Ready to explore? Start with \`list_websets()\` to see what's available!`;
  } catch (error) {
    return `Error discovering websets: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}