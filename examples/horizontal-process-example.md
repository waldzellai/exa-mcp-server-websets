# Horizontal Process Example

This example demonstrates how to use the `horizontal_process` prompt to create multiple websets and build a meta-dataset from cross-matches.

## Use Case: AI Investment Analysis

Let's say you want to analyze AI companies across different funding stages and sectors to find companies that appear in multiple contexts.

### Step 1: Invoke the Horizontal Process Prompt

In Claude, you would say:

```
Use the horizontal_process prompt with:
- searchCriteria: "AI startups Series A 2024, machine learning healthcare funding, autonomous vehicle investments recent"
- projectName: "ai-investment-crossover"
```

### Step 2: Follow the Workflow

The prompt will guide you through:

1. **Creating Multiple Websets** - Each search query becomes its own webset
2. **Monitoring Progress** - Track the async processing of all websets
3. **Finding Cross-Matches** - Identify companies/domains that appear in multiple searches
4. **Building Meta-Dataset** - Combine matches into a structured JSON dataset
5. **Enrichment & Analysis** - Add summaries, entities, and perform fact-checking
6. **Export & Storage** - Save the final meta-webset for future use

### Step 3: Example Output Structure

Your final meta-webset will look like:

```json
{
  "projectName": "ai-investment-crossover",
  "searchCriteria": [
    "AI startups Series A 2024",
    "machine learning healthcare funding",
    "autonomous vehicle investments recent"
  ],
  "createdAt": "2024-01-10T10:00:00Z",
  "stats": {
    "totalWebsets": 3,
    "totalMatches": 15,
    "uniqueDomains": 42,
    "matchTypes": {
      "exact_domain": 8,
      "title_similarity": 5,
      "entity_match": 2
    }
  },
  "entries": [
    {
      "matchId": "match_001",
      "sources": [
        {
          "websetId": "ws_abc123",
          "query": "AI startups Series A 2024"
        },
        {
          "websetId": "ws_def456",
          "query": "machine learning healthcare funding"
        }
      ],
      "items": [
        {
          "url": "https://example.com/ai-health-startup",
          "title": "AI Health Startup Raises $50M Series A",
          "text": "...",
          "enrichments": {
            "summary": "Healthcare AI company focused on diagnostics...",
            "entities": ["AI Health Inc", "Series A", "$50M"],
            "sentiment": "positive"
          }
        }
      ],
      "matchScore": 0.92,
      "matchedOn": ["domain", "entities"]
    }
    // ... more matches
  ]
}
```

### Step 4: Query Your Meta-Dataset

Once created, you can query your meta-dataset:

```javascript
// Find all healthcare AI companies
const healthcareAI = metaWebset.entries.filter(entry =>
  entry.enrichments.entities.some(e => e.includes("healthcare"))
);

// Find high-confidence cross-sector matches
const crossSector = metaWebset.entries.filter(entry =>
  entry.matchScore > 0.9 && entry.sources.length >= 2
);

// Get all companies from specific domain
const techCrunchMentions = metaWebset.entries.filter(entry =>
  entry.items.some(item => item.url.includes("techcrunch.com"))
);
```

## Benefits of Horizontal Process

1. **Comprehensive Coverage** - Capture companies/topics from multiple angles
2. **Cross-Validation** - Companies appearing in multiple searches are likely more relevant
3. **Rich Context** - Each match includes context from multiple sources
4. **Structured Output** - JSON format enables programmatic analysis
5. **Fact-Checking** - Built-in verification through multiple sources

## Common Use Cases

- **Investment Research**: Find companies across different funding stages/sectors
- **Competitive Analysis**: Track competitors across news, reviews, and industry reports
- **Market Research**: Identify trends appearing across multiple data sources
- **Academic Research**: Cross-reference topics across different publications
- **Brand Monitoring**: Track mentions across different contexts and sentiments

## Tips

- Start with 2-3 focused queries to test the workflow
- Use specific search terms for better matches
- Allow 20-30 minutes for processing multiple large websets
- Set up webhooks to avoid constant polling
- Export results immediately after completion for backup