/**
 * Workflow guide for enriching webset data
 */

export async function enrichmentWorkflow(websetId: string): Promise<string> {
  if (!websetId) {
    return `Please provide a webset ID to enrich. Use \`list_websets()\` to see available websets.`;
  }

  return `# 🔮 Enrichment Workflow: ${websetId}

## 🎨 Transform Your Raw Data into Insights

Enrichment adds AI-powered analysis to your webset items, turning raw web data into structured, actionable insights.

### Available Enrichment Types

#### 1. 📝 Summarization
Create concise summaries of each item:

\`\`\`
enrich_webset("${websetId}", "summarize", {
  style: "bullets",        // "bullets" | "paragraph" | "tldr"
  maxLength: 200,         // Characters per summary
  focusOn: "key_points"   // What to emphasize
})
\`\`\`

**Use cases:**
• Quick overview of long articles
• Executive summaries for reports  
• Content preview for curation

#### 2. 🏷️ Categorization
Automatically categorize items:

\`\`\`
enrich_webset("${websetId}", "categorize", {
  categories: [
    "Technology",
    "Business", 
    "Research",
    "Tutorial",
    "News",
    "Other"
  ],
  multiLabel: true  // Allow multiple categories per item
})
\`\`\`

**Use cases:**
• Organize search results
• Filter by category later
• Understand content distribution

#### 3. 🔍 Entity Extraction
Extract people, companies, locations, and more:

\`\`\`
enrich_webset("${websetId}", "entities", {
  types: ["person", "organization", "location", "product"],
  includeMetadata: true  // Add confidence scores
})
\`\`\`

**Use cases:**
• Build relationship graphs
• Track company mentions
• Geographic analysis

#### 4. 💭 Sentiment Analysis
Analyze tone and sentiment:

\`\`\`
enrich_webset("${websetId}", "sentiment", {
  aspects: ["overall", "product", "price", "service"],
  includeEmotions: true  // Joy, anger, fear, etc.
})
\`\`\`

**Use cases:**
• Brand monitoring
• Review analysis
• Market sentiment

#### 5. 🏷️ Tag Generation
Generate relevant tags:

\`\`\`
enrich_webset("${websetId}", "tags", {
  maxTags: 10,
  style: "specific"  // "broad" | "specific" | "technical"
})
\`\`\`

**Use cases:**
• Improve searchability
• Content organization
• Trend identification

#### 6. ❓ Q&A Extraction
Extract questions and answers:

\`\`\`
enrich_webset("${websetId}", "qa", {
  extractQuestions: true,
  extractAnswers: true,
  pairMatching: true
})
\`\`\`

**Use cases:**
• FAQ generation
• Knowledge base building
• Customer insight mining

### Enrichment Strategies

#### Strategy 1: Layer Multiple Enrichments
\`\`\`javascript
// First, categorize
await enrich_webset("${websetId}", "categorize", {
  categories: ["Technical", "Business", "Marketing"]
});

// Then summarize based on category
await enrich_webset("${websetId}", "summarize", {
  style: "bullets",
  customPrompts: {
    "Technical": "Focus on technical specifications",
    "Business": "Emphasize business impact",
    "Marketing": "Highlight market positioning"
  }
});
\`\`\`

#### Strategy 2: Conditional Enrichment
\`\`\`javascript
// Check content type first
const items = await get_webset_items("${websetId}", 10);
const hasReviews = items.some(item => 
  item.text.includes("review") || item.text.includes("rating")
);

if (hasReviews) {
  // Apply sentiment analysis for reviews
  await enrich_webset("${websetId}", "sentiment", {
    aspects: ["product", "service", "value"]
  });
}
\`\`\`

#### Strategy 3: Progressive Enhancement
\`\`\`javascript
// Start with fast enrichments
await enrich_webset("${websetId}", "tags", { maxTags: 5 });

// Add detailed analysis for top items
const items = await search_items("${websetId}", "", {
  sortBy: "relevance",
  limit: 50
});

await enrich_webset("${websetId}", "summarize", {
  itemIds: items.map(i => i.id),  // Only top 50
  style: "detailed"
});
\`\`\`

### Monitoring Enrichment Progress

Check enrichment status:
\`\`\`
get_webset("${websetId}")
// Look for enrichments.{type}.status
\`\`\`

Set up webhook for completion:
\`\`\`
register_webhook("https://your-app.com/webhook", 
  ["webset.enrichment.completed"],
  { websetId: "${websetId}" }
)
\`\`\`

### Working with Enriched Data

#### Access Enrichments:
\`\`\`javascript
const items = await get_webset_items("${websetId}", 20);

items.forEach(item => {
  console.log("Original:", item.title);
  console.log("Summary:", item.enrichments?.summary);
  console.log("Category:", item.enrichments?.category);
  console.log("Sentiment:", item.enrichments?.sentiment);
  console.log("Entities:", item.enrichments?.entities);
});
\`\`\`

#### Filter by Enrichment:
\`\`\`
search_items("${websetId}", "", {
  filters: {
    "enrichments.category": "Technology",
    "enrichments.sentiment.overall": "positive"
  }
})
\`\`\`

#### Export with Enrichments:
\`\`\`
export_webset("${websetId}", "csv", {
  includeEnrichments: true,
  enrichmentFields: ["summary", "category", "sentiment.overall"]
})
\`\`\`

### Cost Optimization Tips

1. **Sample First**: Test enrichments on a subset
\`\`\`
const sampleItems = await get_webset_items("${websetId}", 10);
// Analyze sample before full enrichment
\`\`\`

2. **Selective Enrichment**: Only enrich what you need
\`\`\`
enrich_webset("${websetId}", "summarize", {
  filter: { minTextLength: 500 }  // Skip short items
})
\`\`\`

3. **Reuse Enrichments**: Enrichments are cached
\`\`\`
// Second export uses cached enrichments
export_webset("${websetId}", "json")
\`\`\`

### Next Steps

1. Choose enrichments based on your use case
2. Start with a small test batch
3. Monitor progress via webhooks
4. Export enriched data for analysis

Ready to enrich? Start with:
\`\`\`
enrich_webset("${websetId}", "summarize", { style: "bullets" })
\`\`\``;
}