/**
 * CRM Orchestration: Lead Discovery and Account-Based Marketing
 * Helps sales and marketing teams find and enrich leads matching their ICP
 */

export async function crmOrchestration(
  idealCustomerProfile: string,
  region?: string,
  intentSignals?: string
): Promise<string> {
  const geo = region || "global";
  const signals = intentSignals || "hiring, funding, product launches";

  return `# 🎯 CRM Orchestration: Lead Discovery and Account-Based Marketing

## What This Solves

Discover high-quality leads that match your Ideal Customer Profile (ICP) and enrich them with intent signals, contact information, and engagement history. This orchestration helps sales and marketing teams:
- **Lead Discovery**: Find companies matching your ICP criteria
- **Intent Scoring**: Identify who's actively buying (hiring, fundraising, launching products)
- **Contact Enrichment**: Extract decision-maker names, titles, and email patterns
- **Account Deduplication**: Merge duplicate records across sources
- **Sales Sequence Planning**: Prioritize outreach based on intent signals

## When to Use

✅ Quarterly lead generation campaigns
✅ Account-based marketing (ABM) targeting
✅ Sales outreach list building
✅ Partner and channel partner discovery
✅ Win/loss analysis and competitive displacement

## 🎯 TL;DR Quick Steps

1. 🔍 **Define & Search**: Search for companies matching your ICP
2. 🧰 **Create Webset**: Organize prospects into a tracked collection
3. ✨ **Enrich**: Extract contact info, intent signals, and company details
4. 📊 **Score**: Rank leads by fit and intent
5. 📧 **Export**: Send to CRM or outreach platform

---

## 📋 Step-by-Step Workflow

### Step 1: Search for ICP-Matching Companies

Search for companies that fit your Ideal Customer Profile and show buying intent signals.

**Tool**: \`web_search_exa\`

**Parameters**:
\`\`\`json
{
  "query": "${idealCustomerProfile} (${signals}) location:${geo}",
  "numResults": 75,
  "timeRange": "30d",
  "waitForResults": true
}
\`\`\`

**Expected Output**: 
30-75 results with URLs and snippets mentioning companies matching your ICP with intent signals.

---

### Step 2: Create a Lead Webset

Create a persistent webset to track and manage qualified leads.

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "create_webset_from_search",
  "name": "ICP Leads - ${idealCustomerProfile} (${geo})",
  "description": "Leads matching ICP: ${idealCustomerProfile}. Intent signals: ${signals}. Region: ${geo}. Auto-enriched with contact info and intent scoring.",
  "searchQuery": "${idealCustomerProfile} (${signals}) location:${geo}",
  "timeRange": "30d",
  "maxResults": 150
}
\`\`\`

**Expected Output**:
\`\`\`json
{
  "websetId": "ws_leads_icp_456",
  "status": "processing",
  "createdAt": "2024-01-10T14:00:00Z",
  "estimatedCompletion": "2024-01-10T14:30:00Z"
}
\`\`\`

---

### Step 3: Check Webset Status & Completion

Monitor the webset until processing completes.

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "get_webset_status",
  "websetId": "ws_leads_icp_456"
}
\`\`\`

**Expected Output**:
\`\`\`json
{
  "websetId": "ws_leads_icp_456",
  "status": "completed",
  "itemCount": 142,
  "completedAt": "2024-01-10T14:28:00Z"
}
\`\`\`

---

### Step 4: Extract Company & Contact Details

Retrieve items and enrich with entity extraction to find company names, decision-makers, and contact patterns.

**Tool**: \`websets_manager\`

**Parameters** (Get items):
\`\`\`json
{
  "operation": "list_items",
  "websetId": "ws_leads_icp_456",
  "limit": 100,
  "offset": 0
}
\`\`\`

**Expected Output**: 
Array of 100 lead items with \`url\`, \`title\`, \`text\`, \`publishedDate\`, \`source\`.

**Tool**: \`websets_manager\`

**Parameters** (Enrich with entity extraction):
\`\`\`json
{
  "operation": "enhance_content",
  "websetId": "ws_leads_icp_456",
  "enhancements": [
    "extract_entities",
    "summarize",
    "classify_intent",
    "extract_contacts"
  ],
  "waitForResults": true,
  "advanced": {
    "outputFormat": "json",
    "entityTypes": ["company", "person", "email", "phone"]
  }
}
\`\`\`

**Expected Output**:
Each item enriched with:
- \`entities.company\`: ["Acme Corp", "TechCorp Inc", ...]\n- \`entities.person\`: ["John Smith (CEO)", "Jane Doe (VP Sales)", ...]\n- \`entities.email\`: ["john@acme.com", ...]\n- \`summary\`: Key takeaway from the article/page
- \`intent\`: "high" | "medium" | "low"
- \`intentType\`: "hiring" | "funding" | "product_launch" | "expansion"

---

### Step 5: Score and Tag Leads

Add scoring tags to prioritize high-intent, high-fit accounts.

**Tool**: \`knowledge_graph\`

**Parameters** (Create entities for each company):
\`\`\`json
{
  "operation": "create_entities",
  "entities": [
    {
      "name": "Acme Corp",
      "entityType": "company",
      "observations": [
        "ICP Fit: High (meets size, industry, tech stack criteria)",
        "Intent: High (posted 3 job openings this week)",
        "Decision Makers: John Smith (CEO), Jane Doe (VP Sales)",
        "Contact Email Pattern: firstname@acme.com",
        "Website: acme.com"
      ]
    }
  ]
}
\`\`\`

---

### Step 6: Deduplicate and Export

Remove duplicate companies and export to CRM or outreach platform.

**Tool**: \`websets_manager\`

**Parameters** (Get deduplicated list):
\`\`\`json
{
  "operation": "list_items",
  "websetId": "ws_leads_icp_456",
  "limit": 150,
  "offset": 0,
  "deduplicateBy": "company_domain"
}
\`\`\`

Then export for import into your CRM:

**Tool**: \`websets_manager\`

**Parameters**:
\`\`\`json
{
  "operation": "export_webset",
  "websetId": "ws_leads_icp_456",
  "format": "csv",
  "fields": ["company", "decision_makers", "intent_signal", "contact_email", "website", "source_url"]
}
\`\`\`

**Expected Output**: CSV with columns:
- company, decision_makers, intent_signal, contact_email, website, source_url

---

## 💡 Real-World Examples

### Example 1: Mid-Market SaaS Leads with Hiring Intent

**Goal**: Find 50-500 person SaaS companies actively hiring (indicating growth/funding).

**ICP Definition**: \`"SaaS company" (funding OR "Series A" OR "Series B" OR hiring OR "headcount") employees:50-500\`

**Enrichment Focus**: Extract company names, people, hiring announcements

**Expected Result**: 30-50 qualified leads with recent hiring posts, founder names, and funding news

---

### Example 2: Enterprise Companies with Product Launch Intent

**Goal**: Identify large enterprises launching new products (indicator of project budget).

**ICP Definition**: \`"enterprise software" OR "Fortune 500" ("new product" OR "product launch" OR "announcement" OR "press release") industry:technology\`

**Enrichment Focus**: Classify intent, extract decision-makers, summarize announcement

**Expected Result**: 15-30 hot leads with launch details and likely stakeholders

---

### Example 3: Vertical-Specific Lead Generation (e.g., Healthcare)

**Goal**: Find healthcare organizations expanding AI/ML capabilities.

**ICP Definition**: \`"healthcare company" OR "hospital system" OR "health network" ("AI" OR "machine learning" OR "analytics" OR "data") hiring:engineering\`

**Enrichment Focus**: Extract company size, location, IT leadership, funding status

**Expected Result**: 40-80 mid-market healthcare buyers with active AI initiatives

---

## 🎓 Best Practices

### Lead Definition & Targeting
- Define ICP with 4-6 core attributes (industry, size, location, technology, growth stage)
- Add intent signals to filter: hiring posts, funding announcements, job boards, product launches
- Use location/region constraints if relevant
- Refine search incrementally (start with 50 results, scale to 150+)

### Enrichment Pipeline
- Always run \`extract_entities\` first to get company/people data
- Follow with \`classify_intent\` to prioritize high-intent accounts
- Use \`summarize\` to create 1-line pitch preparation
- Add custom tags in knowledge_graph to categorize (e.g., "hot_lead", "warm", "nurture")

### Deduplication & Quality Control
- Export to CSV and run dedup in your CRM to merge duplicate companies
- Manually spot-check 10-15 leads for relevance
- Remove low-scoring or out-of-scope results before CRM import
- Document your ICP and search filters for future campaigns

### Outreach Sequencing
- Prioritize high-intent + high-fit leads (top 20%)
- Warm up medium-fit leads with content
- Save low-fit for future campaigns (nurture list)
- Re-run webset monthly to find new leads showing intent

### Multi-Touch Enrichment
- Layer multiple websets: one for hiring intent, one for funding, one for job board activity
- Use knowledge_graph to connect related signals (same person appearing in multiple contexts)
- Track engagement: did this lead respond? When? To what message type?

---

## ⚠️ Troubleshooting

### Issue: Too many/too few results

**Cause**: If too few/zero results, likely a technical error (API rate limit, network issue, service unavailability). If too many, query may need refinement.

**Solution**:
- If zero results:
  - Check API key is set correctly: \`echo $EXA_API_KEY\`
  - Verify network connectivity to Exa API
  - Retry after a few minutes (may be rate limited or service issue)
  - Contact support with webset ID and timestamp
- If too many results:
  - Add constraints (company size, industry, specific technology)
  - Narrow intent signals or use more specific phrases

### Issue: Low-quality leads in results

**Cause**: Search includes adjacent competitors or non-decision-makers.

**Solution**:
- Add negative filters: -"competitor name", -"media coverage", -"job board"
- Increase intent signal specificity
- Manually review and refine ICP definition

### Issue: Can't find contact information

**Cause**: Articles/sources don't mention email addresses directly.

**Solution**:
- Use \`extract_entities\` with \`includeEmails: true\`
- Follow up with LinkedIn search for decision-makers found by name
- Check company website domain and create email pattern (firstname@domain.com)

### Issue: Enrichment job times out

**Cause**: Webset too large (500+ items).

**Solution**:
- Split into smaller websets (200 items max)
- Prioritize top-scoring items first
- Run enrichment in batches

### Issue: Duplicate companies in export

**Cause**: Same company mentioned in multiple sources.

**Solution**:
- Use \`deduplicateBy: "company_domain"\` when listing items
- Run dedup in your CRM on company domain/name field before import

---

## ❓ FAQ

**Q: How often should I run lead generation campaigns?**
A: Monthly for active markets. Quarterly for stable verticals. Re-run when ICP changes or new signals emerge.

**Q: Can I combine multiple search queries in one webset?**
A: Yes! Use OR logic in your search: \`(ICP_criteria_1) OR (ICP_criteria_2)\`

**Q: How do I avoid spam/low-quality leads?**
A: Filter by credibility indicators—news sites, company blogs, press releases vs. forums. Increase intent signal specificity.

**Q: Can I track which leads become customers?**
A: Yes! Tag leads in knowledge_graph with your CRM ID, then track conversions back to source webset.

**Q: How long does this take?**
A: Webset creation: 10-30 min. Enrichment: 5-15 min. Export: <1 min. End-to-end: 30-60 min for 100-150 leads.

**Q: What if I want to nurture leads instead of hard-sell?**
A: Create a separate "nurture" webset with lower-intent signals (mentions of your industry, early-stage keywords), and export as a content audience list.

---

## 🚀 Next Steps

1. Define your ICP with concrete attributes and intent signals
2. Create your first lead webset (aim for 50-150 leads)
3. Enrich with entity extraction and intent classification
4. Deduplicate and manually review top 20% of leads
5. Export to CRM and set up outreach sequence
6. Track which webset-sourced leads convert

Ready to discover your next 100 qualified leads?`;
}
