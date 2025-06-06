/**
 * Quick start guide for creating your first webset
 */

export async function quickStart(): Promise<string> {
  return `# 🚀 Quick Start: Create Your First Webset

## 🎯 From Zero to Webset in 5 Minutes

Welcome! Let's create your first webset and understand how Exa's powerful web data collection works.

### What is a Webset?

A **webset** is a collection of web pages gathered from a search query. Think of it as:
• A spreadsheet of web results
• Much larger than regular search (100s-1000s of results)
• Enrichable with AI-powered analysis
• Exportable in multiple formats

### Step 1: Create Your First Webset

Let's start with a simple search:

\`\`\`
websets_search("best productivity tools 2024", 100)
\`\`\`

This will:
1. Start an asynchronous search process
2. Return a webset ID immediately (e.g., "ws_abc123")
3. Begin collecting up to 100 relevant web pages
4. Process for 10-30 minutes in the background

**Example Response:**
\`\`\`json
{
  "websetId": "ws_abc123",
  "status": "processing",
  "query": "best productivity tools 2024",
  "createdAt": "2024-01-10T10:00:00Z"
}
\`\`\`

### Step 2: Monitor Progress

Since websets are asynchronous, you have two options:

**Option A: Set up a webhook (recommended)**
\`\`\`
register_webhook("https://your-app.com/webhook", ["webset.completed"])
\`\`\`

**Option B: Check status manually**
\`\`\`
get_webset("ws_abc123")
\`\`\`

### Step 3: Access Your Results

Once status is "completed", retrieve your data:

\`\`\`
// Get first 20 items
get_webset_items("ws_abc123", 20)

// Each item contains:
{
  "id": "item_123",
  "url": "https://example.com/article",
  "title": "10 Best Productivity Tools",
  "text": "Full article content...",
  "publishedDate": "2024-01-05",
  "author": "Jane Doe",
  "score": 0.95
}
\`\`\`

### Step 4: Enhance Your Data (Optional)

Add AI-powered enrichments:

\`\`\`
// Add summaries
enrich_webset("ws_abc123", "summarize", {
  maxLength: 150
})

// Categorize results
enrich_webset("ws_abc123", "categorize", {
  categories: ["Free", "Paid", "Freemium"]
})
\`\`\`

### Step 5: Export Your Webset

Get your data in the format you need:

\`\`\`
// For spreadsheets
export_webset("ws_abc123", "csv")

// For developers
export_webset("ws_abc123", "json")

// For reports
export_webset("ws_abc123", "markdown")
\`\`\`

### 🎓 Complete Example Workflow

Here's everything together:

\`\`\`javascript
// 1. Create webset
const result = await websets_search("sustainable fashion brands", 200);
const websetId = result.websetId;

// 2. Set up notification
await register_webhook("https://myapp.com/webhook", ["webset.completed"]);

// 3. Wait for completion (or use webhook)
let status = "processing";
while (status === "processing") {
  await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 min
  const webset = await get_webset(websetId);
  status = webset.status;
}

// 4. Get and enrich results
const items = await get_webset_items(websetId, 50);
await enrich_webset(websetId, "summarize");

// 5. Export for analysis
const csvData = await export_webset(websetId, "csv");
\`\`\`

### 📚 Common Use Cases

**Market Research:**
\`websets_search("electric vehicle startups funding", 500)\`

**Competitor Analysis:**
\`websets_search("CRM software reviews comparisons", 300)\`

**Content Curation:**
\`websets_search("machine learning tutorials beginners", 200)\`

**News Monitoring:**
\`websets_search("renewable energy news 2024", 1000)\`

### 💡 Pro Tips for Beginners

1. **Start Small**: Begin with 100-200 results to understand the process
2. **Be Specific**: More specific queries yield better results
3. **Use Webhooks**: More efficient than polling for large websets
4. **Enrich Wisely**: Enrichments add value but increase processing time
5. **Export Early**: You can export partial results while processing

### ❓ FAQs

**Q: How long does a webset take?**
A: Typically 10-30 minutes depending on size and complexity

**Q: What's the maximum size?**
A: Up to 10,000 results per webset

**Q: Can I cancel a webset?**
A: Yes, use \`delete_webset(websetId)\` while processing

**Q: Are results real-time?**
A: Results are fresh but collected over the processing period

### Next Steps

1. Try creating a webset with your own query
2. Experiment with different enrichment types  
3. Set up webhooks for production use
4. Explore advanced filtering and search options

Ready? Start with:
\`\`\`
websets_search("your topic here", 100)
\`\`\`

Happy searching! 🎉`;
}