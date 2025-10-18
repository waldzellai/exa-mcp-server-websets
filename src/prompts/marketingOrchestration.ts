/**
 * Marketing Orchestration: Competitor and Brand Monitoring
 * Helps teams discover brand mentions, track competitors, and monitor industry trends
 */

export async function marketingOrchestration(
  companyName: string,
  targetAudience?: string,
  timeframe?: string
): Promise<string> {
  const audience = targetAudience || "general market";
  const period = timeframe || "30d";

  return `# 📈 Marketing Orchestration: Competitor and Brand Monitoring

## What This Solves

Track your brand's presence online, monitor competitor activity, and discover emerging industry trends. This orchestration helps marketing teams:
- **Share of Voice**: Monitor mention frequency vs. competitors
- **Brand Health**: Track sentiment and perception shifts
- **Content Gaps**: Identify topics your competitors cover but you don't
- **Influencer Discovery**: Find who's talking about your space
- **Market Intelligence**: Stay ahead of industry movements

## When to Use

✅ Weekly/monthly brand health checks
✅ Competitive win/loss analysis
✅ Crisis management and reputation monitoring
✅ Content strategy planning
✅ Market positioning research

## 🎯 TL;DR Quick Steps

1. 🔍 **Search**: Find brand mentions and competitor references across the web
2. 🧰 **Create Webset**: Organize results into a tracked collection
3. ✨ **Enrich**: Add AI analysis (sentiment, entities, summaries)
4. 📊 **Analyze**: Build graphs to visualize relationships
5. 🔔 **Monitor**: Set up weekly alerts

---

## 📋 Step-by-Step Workflow

### Step 1: Initial Search for Brand Mentions

Start by searching for your company name and competitor references across web and news sources.

**Tool**: \`web_search_exa\`

**Parameters**:
\`\`\`json
{
  "query": "${companyName} OR competitors site:news.ycombinator.com OR site:producthunt.com OR site:twitter.com",
  "numResults": 50,
  "timeRange": "${period}",
  "waitForResults": true
}
\`\`\`

**Expected Output**: 
List of 25-50 results with URLs, titles, and snippets mentioning your company or competitors.

---

### Step 2: Create a Persistent Webset

Once you have search results, create a webset to track this data over time.

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "create_webset_from_search",
  "name": "${companyName} - Brand Monitor (${period})",
  "description": "Tracking brand mentions, competitor activity, and industry sentiment for ${companyName} across news, blogs, and social platforms. Target audience: ${audience}.",
  "searchQuery": "${companyName} OR competitors site:news.ycombinator.com OR site:producthunt.com OR site:twitter.com",
  "timeRange": "${period}",
  "maxResults": 100
}
\`\`\`

**Expected Output**:
\`\`\`json
{
  "websetId": "ws_brand_monitor_123",
  "status": "processing",
  "createdAt": "2024-01-10T10:00:00Z",
  "estimatedCompletion": "2024-01-10T10:30:00Z"
}
\`\`\`

**Note**: Websets are asynchronous. Processing typically takes 10-30 minutes depending on query complexity.

---

### Step 3: Check Webset Status (Optional - if not using webhooks)

Poll the webset status until it completes.

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "get_webset_status",
  "websetId": "ws_brand_monitor_123"
}
\`\`\`

**Expected Output**:
\`\`\`json
{
  "websetId": "ws_brand_monitor_123",
  "status": "completed",
  "itemCount": 87,
  "completedAt": "2024-01-10T10:25:00Z"
}
\`\`\`

---

### Step 4: Retrieve and Enrich Items

Once completed, fetch the items and add AI enrichments (summaries, entity extraction, sentiment).

**Tool**: \`websets_manager\`

**Parameters** (Get items):
\`\`\`json
{
  "operation": "list_items",
  "websetId": "ws_brand_monitor_123",
  "limit": 50,
  "offset": 0
}
\`\`\`

**Expected Output**: 
Array of 50 items with \`url\`, \`title\`, \`text\`, \`publishedDate\`, \`author\`, \`score\`.

**Tool**: \`websets_manager\`

**Parameters** (Enrich):
\`\`\`json
{
  "operation": "enhance_content",
  "websetId": "ws_brand_monitor_123",
  "enhancements": [
    "summarize",
    "extract_entities",
    "classify_sentiment",
    "identify_topics"
  ],
  "waitForResults": true,
  "advanced": {
    "outputFormat": "json"
  }
}
\`\`\`

**Expected Output**:
Each item now includes:
- \`summary\`: 1-2 sentence summary
- \`entities\`: [\`company\`, \`person\`, \`product\`, \`topic\`]
- \`sentiment\`: "positive" | "negative" | "neutral"
- \`topics\`: ["AI", "Product Launch", ...]

---

### Step 5: Build a Knowledge Graph (Optional - for visualization)

Connect entities to understand relationships between companies, people, and topics.

**Tool**: \`knowledge_graph\`

**Parameters**:
\`\`\`json
{
  "operation": "create_entities",
  "names": ["${companyName}", "Competitor A", "Competitor B"],
  "entityType": "company"
}
\`\`\`

Then add observations from your webset:

**Tool**: \`knowledge_graph\`

**Parameters**:
\`\`\`json
{
  "operation": "add_observations",
  "entityName": "${companyName}",
  "contents": [
    "Mentioned in 23 articles this month",
    "Sentiment: 65% positive",
    "Top topics: AI, Security, Enterprise",
    "Key influencers: @alice, @bob"
  ]
}
\`\`\`

---

## 💡 Real-World Examples

### Example 1: Share of Voice Analysis

**Goal**: Compare how often your company is mentioned vs. top 3 competitors.

**Search Query**:
\`\`\`
("${companyName}" OR "Competitor A" OR "Competitor B" OR "Competitor C") site:news.ycombinator.com OR site:producthunt.com OR site:techcrunch.com
\`\`\`

**Enrichment Focus**: Extract company names and count mentions

**Expected Insight**: "CompanyA: 34 mentions, CompanyB: 28 mentions, CompanyC: 18 mentions, Competitor1: 12 mentions"

---

### Example 2: Sentiment Tracking Over Time

**Goal**: Monitor if brand perception is improving or declining.

**Search Query**:
\`\`\`
"${companyName}" reviews OR feedback OR experience (good OR bad OR amazing OR terrible)
\`\`\`

**Enrichment Focus**: Classify sentiment, extract topics

**Expected Insight**: "Positive sentiment trending up 15% week-over-week. Top complaint: onboarding complexity."

---

### Example 3: Content Gap Discovery

**Goal**: Find topics competitors are covering that you should address.

**Search Query**:
\`\`\`
"Competitor A" tutorial OR guide OR how-to -"${companyName}"
\`\`\`

**Enrichment Focus**: Extract topics, summarize

**Expected Insight**: "Competitors publishing 3x more content on 'Machine Learning Ops'. Opportunity to create beginner guides."

---

## 🎓 Best Practices

### Rate Limiting & Performance
- Start with 50-100 results to test queries
- Scale to 500+ results once query is refined
- Use \`waitForResults: false\` for non-blocking creation
- Set up webhooks instead of polling for better efficiency

### Enrichment Strategy
- Run enrichments in batches (50-100 items per batch)
- Prioritize \`summarize\` and \`extract_entities\` first
- Add \`classify_sentiment\` for brand health tracking
- Use \`identify_topics\` for content gap analysis

### Monitoring Loop
- Run brand monitor websets weekly
- Compare week-over-week trends
- Set alerts for unusual spikes (positive or negative)
- Archive completed websets monthly for historical analysis

### Deduplication
- Use \`deduplicate_urls\` flag when creating webset to avoid duplicate domains
- Tag items by source (news, blog, social) for filtering

---

## ⚠️ Troubleshooting

### Issue: Webset returns 0 or very few results

**Cause**: Likely a technical error (API rate limit, network issue, service unavailability).

**Solution**:
- Check API key is set correctly: \`echo $EXA_API_KEY\`
- Verify network connectivity to Exa API
- Check recent API status page
- Retry the webset creation after waiting a few minutes
- If persists, contact support with webset ID and timestamp

### Issue: Enrichment times out

**Cause**: Webset too large (1000+ items).

**Solution**:
- Split into smaller websets (500 items max per enrichment)
- Use \`waitForResults: false\` and check status later
- Enrich high-priority items first (filter by score)

### Issue: No API key error

**Cause**: \`EXA_API_KEY\` environment variable not set.

**Solution**:
\`\`\`bash
export EXA_API_KEY="your-api-key-here"
\`\`\`

### Issue: Sentiment classification looks inaccurate

**Cause**: Short snippets or ambiguous language.

**Solution**:
- Request full text extraction in search (\`includeText: true\`)
- Manually review 10-20 items and refine query
- Use \`classify_intent\` instead for B2B content

---

## ❓ FAQ

**Q: How often should I run brand monitoring?**
A: Weekly is recommended for active markets. Monthly for stable niches. Adjust based on industry news velocity.

**Q: Can I track multiple competitors in one webset?**
A: Yes! Use OR logic: \`"Company A" OR "Company B" OR "Company C"\`

**Q: How long do websets stay available?**
A: Indefinitely—archive and revisit anytime. Exa retains websets for historical analysis.

**Q: Can I export the results?**
A: Yes! Use \`export_webset\` with \`csv\`, \`json\`, or \`markdown\` format.

**Q: What if I want real-time alerts?**
A: Set up a webhook to notify when new mentions appear. See \`webhook_setup_guide\` prompt.

**Q: Can I combine brand monitoring with other websets?**
A: Yes! Use \`knowledge_graph\` to connect separate brand, competitor, and industry websets.

---

## 🚀 Next Steps

1. Customize the company name and target audience for your organization
2. Run your first brand monitor webset
3. Set up a weekly scheduled task to recreate the webset
4. Create enrichment rules to automatically tag and score items
5. Build a dashboard to visualize share of voice and sentiment trends

Ready to start? Run the prompt again with your company details, or jump straight to creating your first webset!`;
}
