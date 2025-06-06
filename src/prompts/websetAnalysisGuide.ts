/**
 * Guide for analyzing completed websets
 */

export async function websetAnalysisGuide(websetId: string): Promise<string> {
  if (!websetId) {
    return `Please provide a webset ID to analyze. Use \`list_websets()\` to see available completed websets.`;
  }

  return `# 📈 Webset Analysis Guide: ${websetId}

## 🎯 Analyzing Your Completed Webset

Let's explore the data in your webset and extract meaningful insights!

### Step 1: Understand Your Data
First, let's see what we're working with:

\`\`\`
// Get webset metadata
get_webset("${websetId}")

// Preview first 10 items
get_webset_items("${websetId}", 10)

// Get basic statistics
analyze_webset("${websetId}", "statistics")
\`\`\`

### Step 2: Explore the Content

**Browse Items:**
\`\`\`
// Get more items with pagination
get_webset_items("${websetId}", 50, 0)    // First 50
get_webset_items("${websetId}", 50, 50)   // Next 50
\`\`\`

**Search Within Webset:**
\`\`\`
// Find specific content
search_items("${websetId}", "keyword", {
  fields: ["title", "text"],
  limit: 20
})
\`\`\`

### Step 3: Enrich Your Data

**Available Enrichment Types:**

• **Summarization** - Get AI summaries of each item
\`\`\`
enrich_webset("${websetId}", "summarize", {
  maxLength: 200,
  style: "bullets"
})
\`\`\`

• **Categorization** - Auto-categorize items
\`\`\`
enrich_webset("${websetId}", "categorize", {
  categories: ["Technology", "Business", "Research", "News", "Other"]
})
\`\`\`

• **Entity Extraction** - Extract people, companies, locations
\`\`\`
enrich_webset("${websetId}", "entities", {
  types: ["person", "organization", "location"]
})
\`\`\`

• **Sentiment Analysis** - Analyze tone and sentiment
\`\`\`
enrich_webset("${websetId}", "sentiment")
\`\`\`

### Step 4: Export and Visualize

**Export Formats:**
\`\`\`
// CSV for spreadsheets
export_webset("${websetId}", "csv")

// JSON for programmatic use
export_webset("${websetId}", "json")

// Markdown for reports
export_webset("${websetId}", "markdown")
\`\`\`

### Step 5: Advanced Analysis

**Statistical Analysis:**
\`\`\`
analyze_webset("${websetId}", "statistics")
// Returns: item count, date ranges, domain distribution, etc.
\`\`\`

**Content Patterns:**
\`\`\`
analyze_webset("${websetId}", "patterns")
// Finds: common themes, recurring topics, key phrases
\`\`\`

**Link Analysis:**
\`\`\`
analyze_webset("${websetId}", "links")
// Maps: domain relationships, citation networks
\`\`\`

### 📊 Analysis Workflows

**For Market Research:**
1. Search for competitors/products
2. Enrich with categorization
3. Analyze sentiment
4. Export to CSV for further analysis

**For Content Curation:**
1. Browse and filter items
2. Enrich with summaries
3. Export as markdown
4. Share or publish curated list

**For Trend Analysis:**
1. Analyze patterns across items
2. Extract entities (companies, topics)
3. Track mentions over time
4. Identify emerging themes

### 💡 Pro Tips:

• **Large Websets**: Use pagination and search to navigate efficiently
• **Enrichment**: Can be applied to existing websets anytime
• **Caching**: Enrichment results are cached for reuse
• **Filters**: Combine multiple filters for precise results
• **Export**: Include enrichments in exports for complete data

### Next Actions:
1. Start with \`get_webset_items("${websetId}", 20)\` to preview
2. Choose relevant enrichments based on your use case
3. Export in your preferred format
4. Consider setting up regular refreshes for dynamic topics

What specific analysis would you like to perform?`;
}