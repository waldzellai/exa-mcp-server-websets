# Iterative Intelligence Example

This example demonstrates the most sophisticated workflow in our toolkit - a self-improving research system with fast webset retrieval.

## Key Innovation: Webset Registry

Since we can't access the Exa backend, we maintain our own registry that:
- **Indexes** all websets with searchable metadata
- **Tracks relationships** between websets across iterations
- **Enables fast retrieval** through multiple search methods
- **Supports batch processing** for scheduled updates

## Use Case: Tracking AI Industry Evolution

Let's say you want to continuously monitor and understand the AI industry's evolution.

### Step 1: Initial Setup

```
Use the iterative_intelligence prompt with:
- researchTopic: "AI industry landscape and emerging trends"
- iterations: "3"
- registryPath: "./ai-research-registry"
```

### Step 2: What the System Does

#### Iteration 1 - Broad Exploration
Creates websets for:
- "AI industry landscape and emerging trends overview comprehensive"
- "AI industry landscape and emerging trends latest developments 2024"
- "AI industry landscape and emerging trends key players companies organizations"
- "AI industry landscape and emerging trends challenges problems issues"

#### Iteration 2 - Gap Filling
Based on discoveries and gaps from iteration 1:
- "Generative AI market share analysis 2024"
- "AI regulation impact on startups"
- "OpenAI Microsoft relationship deep dive"

#### Iteration 3 - Deep Dives
Based on emerging questions:
- "AI chip shortage impact on industry growth"
- "Open source AI models vs proprietary comparison"
- "AI talent acquisition strategies Fortune 500"

### Step 3: Registry Structure

```
./ai-research-registry/
├── index.json          # Main webset index
├── tags.json           # Tag-based indexing
├── relationships.json  # Webset relationships
└── metadata/           # Detailed webset metadata
    ├── ws_abc123.json
    ├── ws_def456.json
    └── ...
```

### Step 4: Fast Retrieval Examples

#### Natural Language Search:
```javascript
// Find specific websets
const results = await retrieval.findByQuery(
  "AI regulation #policy iteration 2"
);

// Returns websets tagged with 'policy' from iteration 2
// that match 'AI regulation'
```

#### Relationship Navigation:
```javascript
// Get evolution of a topic
const lineage = await retrieval.getLineage("ws_initial_ai_123");

// Returns:
{
  ancestors: [],  // This was the first iteration
  descendants: [
    { id: "ws_gap_fill_456", iteration: 2 },
    { id: "ws_deep_dive_789", iteration: 3 }
  ]
}
```

#### Quick Patterns:
```javascript
// Today's research
const today = await quickFind.today();

// High-value websets
const valuable = await quickFind.highValue();

// Evolution chain
const chain = await quickFind.evolutionChain("ws_abc123");
```

### Step 5: Batch Processing Setup

Configure for automated updates:

```javascript
const batchConfig = {
  schedule: "0 2 * * *", // 2 AM daily
  topics: [
    {
      name: "AI industry landscape and emerging trends",
      iterations: 2,         // Fewer iterations for daily runs
      frequency: "daily",
      filters: {
        minRelevance: 0.8,
        requireSources: ["techcrunch", "reuters", "bloomberg"]
      }
    },
    {
      name: "AI safety and alignment research",
      iterations: 3,
      frequency: "weekly"
    }
  ],
  retentionDays: 30,
  registryPath: "./ai-research-registry"
};
```

### Step 6: Knowledge Graph Output

The system builds a knowledge graph showing:

```json
{
  "entities": {
    "OpenAI": {
      "type": "company",
      "mentions": 145,
      "relationships": ["Microsoft", "Anthropic", "GPT-4"],
      "sentiment": 0.72
    },
    "GPT-4": {
      "type": "technology",
      "mentions": 89,
      "relationships": ["OpenAI", "ChatGPT", "API"],
      "categories": ["LLM", "AI Model"]
    }
  },
  "relationships": [
    {
      "from": "OpenAI",
      "to": "Microsoft",
      "type": "partnership",
      "strength": 0.95,
      "sources": 23
    }
  ],
  "concepts": {
    "AI Safety": {
      "evolution": "increasing",
      "mentions": [45, 67, 89], // Per iteration
      "relatedEntities": ["Anthropic", "OpenAI", "DeepMind"]
    }
  }
}
```

## Advantages Over Simple Search

1. **Learning System** - Each iteration builds on previous discoveries
2. **Fast Retrieval** - Registry enables instant access to past research
3. **Relationship Aware** - Understands how topics evolve and connect
4. **Batch Ready** - Can run automatically on schedule
5. **Knowledge Building** - Creates a searchable knowledge base over time

## Best Practices

1. **Start Small** - Begin with 2-3 iterations to test
2. **Tag Strategically** - Good tags enable better retrieval
3. **Review Gaps** - Check what the system identifies as missing
4. **Monitor Evolution** - Track how topics change over iterations
5. **Clean Regularly** - Use retention policies to manage registry size

## Query Examples

```javascript
// Complex queries combining multiple criteria
const results = await registry.findWebsets({
  tags: ["funding", "series-b"],
  afterDate: "2024-01-01",
  query: "AI startups healthcare",
  iteration: 2
});

// Get all websets in an evolution chain
const fullChain = await retrieval.getEvolutionChain("ws_root_123");

// Find cross-references
const crossRefs = await retrieval.getRelated("ws_abc123", "crossReferences");
```

This workflow is ideal for:
- **Trend Monitoring** - Track how topics evolve over time
- **Competitive Intelligence** - Build comprehensive competitor knowledge
- **Research Projects** - Systematically explore complex topics
- **Market Analysis** - Understand market dynamics through iterations
- **Knowledge Management** - Build searchable research archives