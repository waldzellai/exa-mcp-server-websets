/**
 * Horizontal process workflow for creating and analyzing multiple websets
 */

export async function horizontalProcess(
  searchCriteria: string[],
  projectName: string = "horizontal-analysis"
): Promise<string> {
  if (!searchCriteria || searchCriteria.length < 2) {
    return `Please provide at least 2 search criteria for horizontal analysis. Example:
\`\`\`
searchCriteria: "AI startups Series A funding, machine learning healthcare companies, autonomous vehicle investments 2024"
projectName: "ai-investment-analysis"
\`\`\``;
  }

  const criteriaList = searchCriteria.map((c, i) => `${i + 1}. "${c}"`).join('\n');

  return `# 🔄 Horizontal Process Workflow: ${projectName}

## 🎯 Multi-Webset Analysis & Meta-Dataset Creation

This workflow will help you create multiple websets, monitor for cross-matches, and build a comprehensive meta-dataset for analysis.

### Your Search Criteria:
${criteriaList}

## Phase 1: Initialize Multiple Websets

Let's create websets for each search criterion:

\`\`\`javascript
// Create websets array to track all operations
const websets = [];
const searchCriteria = ${JSON.stringify(searchCriteria)};

// Launch all websets in parallel
for (const criterion of searchCriteria) {
  const result = await websets_search(criterion, 500);
  websets.push({
    id: result.websetId,
    query: criterion,
    status: "processing",
    createdAt: new Date().toISOString()
  });
  console.log(\`Created webset \${result.websetId} for: \${criterion}\`);
}

// Save webset tracking data
const projectData = {
  projectName: "${projectName}",
  websets: websets,
  createdAt: new Date().toISOString(),
  metaWebset: [],
  lastChecked: null
};
\`\`\`

## Phase 2: Set Up Monitoring Infrastructure

### Option A: Webhook-Based Monitoring (Recommended)
\`\`\`javascript
// Register a webhook for all webset completions
const webhook = await register_webhook(
  "https://your-app.com/horizontal-webhook",
  ["webset.completed", "webset.items.added"],
  {
    metadata: {
      project: "${projectName}",
      websetIds: websets.map(w => w.id)
    }
  }
);
\`\`\`

### Option B: Polling-Based Monitoring
\`\`\`javascript
// Monitor function to check all websets
async function monitorWebsets() {
  const allCompleted = [];
  
  for (const webset of projectData.websets) {
    const status = await get_webset(webset.id);
    webset.status = status.status;
    webset.itemCount = status.itemCount;
    
    if (status.status === "completed") {
      allCompleted.push(webset.id);
    }
  }
  
  projectData.lastChecked = new Date().toISOString();
  console.log(\`Progress: \${allCompleted.length}/\${projectData.websets.length} completed\`);
  
  return allCompleted.length === projectData.websets.length;
}

// Run monitoring every 5 minutes
const monitorInterval = setInterval(async () => {
  const isComplete = await monitorWebsets();
  if (isComplete) {
    clearInterval(monitorInterval);
    await processCompletedWebsets();
  }
}, 300000); // 5 minutes
\`\`\`

## Phase 3: Cross-Match Analysis

Once all websets are complete, find matches across datasets:

\`\`\`javascript
async function findCrossMatches() {
  const allItems = {};
  const matchCriteria = {
    domain: true,      // Match by domain
    title: 0.8,        // 80% similarity threshold
    entities: true     // Match by extracted entities
  };
  
  // Load all items from each webset
  for (const webset of projectData.websets) {
    const items = await get_webset_items(webset.id, 1000);
    allItems[webset.id] = items;
  }
  
  // Find cross-matches
  const metaMatches = [];
  
  // Compare items across all websets
  for (let i = 0; i < projectData.websets.length - 1; i++) {
    for (let j = i + 1; j < projectData.websets.length; j++) {
      const matches = findMatches(
        allItems[projectData.websets[i].id],
        allItems[projectData.websets[j].id],
        matchCriteria
      );
      
      matches.forEach(match => {
        metaMatches.push({
          matchId: generateMatchId(),
          sources: [
            { websetId: projectData.websets[i].id, query: projectData.websets[i].query },
            { websetId: projectData.websets[j].id, query: projectData.websets[j].query }
          ],
          items: match.items,
          matchScore: match.score,
          matchedOn: match.criteria
        });
      });
    }
  }
  
  return metaMatches;
}
\`\`\`

## Phase 4: Build Meta-Webset

Create a comprehensive meta-dataset with enriched data:

\`\`\`javascript
async function buildMetaWebset(matches) {
  const metaWebset = {
    projectName: "${projectName}",
    searchCriteria: ${JSON.stringify(searchCriteria)},
    createdAt: new Date().toISOString(),
    stats: {
      totalWebsets: projectData.websets.length,
      totalMatches: matches.length,
      uniqueDomains: new Set(),
      matchTypes: {}
    },
    entries: []
  };
  
  // Process each match
  for (const match of matches) {
    // Enrich match data
    const enrichedMatch = {
      ...match,
      enrichments: {},
      validation: {},
      factCheck: {}
    };
    
    // Extract and enrich URLs
    const urls = extractUrls(match.items);
    
    // Add entity extraction
    if (urls.length > 0) {
      enrichedMatch.enrichments.entities = await extractEntities(match.items);
      enrichedMatch.enrichments.summary = await generateSummary(match.items);
    }
    
    // Add to meta-webset
    metaWebset.entries.push(enrichedMatch);
    
    // Update stats
    urls.forEach(url => metaWebset.stats.uniqueDomains.add(new URL(url).hostname));
  }
  
  // Save meta-webset
  projectData.metaWebset = metaWebset;
  return metaWebset;
}
\`\`\`

## Phase 5: Analysis & Fact-Checking

Perform analysis on the meta-webset:

\`\`\`javascript
// 1. Statistical Analysis
async function analyzeMetaWebset(metaWebset) {
  const analysis = {
    domainDistribution: {},
    temporalPatterns: {},
    entityNetwork: {},
    confidenceScores: {}
  };
  
  // Analyze domain distribution
  metaWebset.entries.forEach(entry => {
    entry.items.forEach(item => {
      const domain = new URL(item.url).hostname;
      analysis.domainDistribution[domain] = 
        (analysis.domainDistribution[domain] || 0) + 1;
    });
  });
  
  return analysis;
}

// 2. Fact-Checking Via URL Analysis
async function factCheckEntries(metaWebset, sampleSize = 10) {
  const factChecks = [];
  const sample = metaWebset.entries.slice(0, sampleSize);
  
  for (const entry of sample) {
    const urls = extractUrls(entry.items);
    
    for (const url of urls.slice(0, 3)) { // Check up to 3 URLs per entry
      // Use web search to verify claims
      const verification = await websets_search(
        \`site:\${new URL(url).hostname} "\${entry.enrichments.summary}"\`,
        5
      );
      
      factChecks.push({
        entryId: entry.matchId,
        url: url,
        verificationWebsetId: verification.websetId,
        status: "pending"
      });
    }
  }
  
  return factChecks;
}
\`\`\`

## Phase 6: Export & Storage

Save the meta-webset for future use:

\`\`\`javascript
// Export function
async function exportMetaWebset(metaWebset, format = "json") {
  const exportPath = \`./projects/${projectName}/\`;
  
  // Create project structure
  const projectStructure = {
    metadata: {
      version: "1.0",
      created: metaWebset.createdAt,
      lastUpdated: new Date().toISOString(),
      format: "horizontal-process-v1"
    },
    config: {
      searchCriteria: metaWebset.searchCriteria,
      matchingRules: matchCriteria,
      enrichmentTypes: ["entities", "summary"]
    },
    data: metaWebset
  };
  
  // Save main dataset
  const filename = \`\${exportPath}meta-webset-\${Date.now()}.json\`;
  await saveToFile(filename, JSON.stringify(projectStructure, null, 2));
  
  // Create index for quick lookups
  const index = {
    byDomain: {},
    byEntity: {},
    byMatchScore: {}
  };
  
  metaWebset.entries.forEach(entry => {
    // Index by various criteria for fast retrieval
    entry.items.forEach(item => {
      const domain = new URL(item.url).hostname;
      if (!index.byDomain[domain]) index.byDomain[domain] = [];
      index.byDomain[domain].push(entry.matchId);
    });
  });
  
  await saveToFile(\`\${exportPath}index.json\`, JSON.stringify(index, null, 2));
  
  console.log(\`Meta-webset saved to: \${filename}\`);
  return filename;
}
\`\`\`

## Phase 7: Retrieval & Query Interface

Enable querying of your meta-webset:

\`\`\`javascript
// Query examples
const queries = {
  // Find all matches from specific domain
  byDomain: (domain) => 
    metaWebset.entries.filter(e => 
      e.items.some(i => new URL(i.url).hostname === domain)
    ),
  
  // Find high-confidence matches
  byConfidence: (minScore) =>
    metaWebset.entries.filter(e => e.matchScore >= minScore),
  
  // Find by entity
  byEntity: (entityName) =>
    metaWebset.entries.filter(e =>
      e.enrichments?.entities?.includes(entityName)
    ),
  
  // Complex queries
  complexQuery: (filters) => {
    return metaWebset.entries.filter(entry => {
      return filters.every(filter => filter(entry));
    });
  }
};

// Usage examples:
queries.byDomain("techcrunch.com");
queries.byConfidence(0.9);
queries.byEntity("OpenAI");
queries.complexQuery([
  e => e.matchScore > 0.8,
  e => e.sources.length >= 2,
  e => e.enrichments?.entities?.includes("AI")
]);
\`\`\`

## 📊 Complete Workflow Example

\`\`\`javascript
// Full horizontal process implementation
async function runHorizontalProcess() {
  try {
    // 1. Create websets
    console.log("Phase 1: Creating websets...");
    const websetIds = await createMultipleWebsets(searchCriteria);
    
    // 2. Monitor progress
    console.log("Phase 2: Monitoring progress...");
    await waitForCompletion(websetIds);
    
    // 3. Find matches
    console.log("Phase 3: Finding cross-matches...");
    const matches = await findCrossMatches();
    
    // 4. Build meta-webset
    console.log("Phase 4: Building meta-webset...");
    const metaWebset = await buildMetaWebset(matches);
    
    // 5. Analyze
    console.log("Phase 5: Analyzing data...");
    const analysis = await analyzeMetaWebset(metaWebset);
    
    // 6. Export
    console.log("Phase 6: Exporting results...");
    const exportPath = await exportMetaWebset(metaWebset);
    
    console.log(\`
      ✅ Horizontal process complete!
      - Total matches found: \${matches.length}
      - Unique domains: \${metaWebset.stats.uniqueDomains.size}
      - Results saved to: \${exportPath}
    \`);
    
    return { metaWebset, analysis, exportPath };
    
  } catch (error) {
    console.error("Horizontal process failed:", error);
    throw error;
  }
}

// Run the process
await runHorizontalProcess();
\`\`\`

## 💡 Best Practices

1. **Parallel Processing**: Create all websets simultaneously for efficiency
2. **Smart Matching**: Use multiple criteria (domain, title, entities) for accuracy
3. **Incremental Updates**: Process matches as websets complete, don't wait for all
4. **Error Handling**: Implement retry logic for failed websets
5. **Resource Management**: Use pagination for large datasets
6. **Caching**: Cache enrichments to avoid redundant API calls

## 🎯 Next Steps

1. Start with 2-3 related search queries to test the workflow
2. Adjust matching criteria based on your use case
3. Add custom enrichments relevant to your analysis
4. Set up automated refresh cycles for dynamic topics

Ready to start? Begin with:
\`\`\`
searchCriteria: "your first search, your second search, your third search"
projectName: "your-project-name"
\`\`\``;
}