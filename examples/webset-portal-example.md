# Webset Portal Example

This example demonstrates how to use the `webset_portal` prompt for deep-dive parallel research through webset URLs.

## Use Case: Analyzing AI Company Funding Rounds

Let's say you have a webset about "AI startups Series B funding 2024" and you want to understand the strategic implications of these funding rounds.

### Step 1: Create and Complete a Webset

First, create a webset with relevant results:

```javascript
// Create webset
const webset = await websets_search("AI startups Series B funding 2024", 200);
const websetId = webset.websetId;

// Wait for completion (or use webhooks)
// ... webset processing ...
```

### Step 2: Invoke the Webset Portal Prompt

In Claude Code, you would say:

```
Use the webset_portal prompt with:
- websetId: "ws_abc123"
- researchQuery: "What are the strategic implications of these funding rounds for the AI industry?"
- maxPortals: "5"
```

### Step 3: What Happens Next

The portal workflow will:

1. **Identify Top Portals** - Find the 5 most relevant URLs that best match your research query
   - Prioritizes URLs that were "full matches" for the original search
   - Scores based on title, content, and entity relevance

2. **Launch Parallel Subagents** - Claude Code creates 5 subagents, each assigned to one portal URL
   - Each subagent receives specific research instructions
   - They work simultaneously for faster results

3. **Deep Research** - Each subagent:
   - Visits their assigned portal URL
   - Follows relevant links (up to 2 levels deep)
   - Extracts key information related to your research query
   - Identifies quotes, data points, and facts
   - Assesses source credibility

4. **Synthesis** - The main agent combines all findings:
   - Groups insights by theme
   - Identifies patterns across sources
   - Flags contradictions
   - Generates recommendations

### Step 4: Example Output

Your final report will include:

```markdown
# 📊 Webset Portal Analysis Report

**Research Query:** What are the strategic implications of these funding rounds for the AI industry?
**Webset ID:** ws_abc123
**Analysis Date:** January 10, 2024
**Portals Analyzed:** 5

## 🎯 Executive Summary

Analysis of 5 key sources reveals that Series B funding in AI startups during 2024 indicates a shift toward enterprise applications, with healthcare and financial services leading adoption...

## 🔍 Key Insights

### Industry Consolidation
**Summary:** The funding rounds suggest market consolidation, with larger rounds going to established players rather than new entrants.
**Confidence Level:** 8/10
**Supporting Sources:** 5 portals
- https://techcrunch.com/2024/01/ai-series-b-analysis (Credibility: 9/10)
- https://venturebeat.com/ai/funding-trends-2024 (Credibility: 8/10)
...

### Strategic Focus Areas
**Summary:** Funded companies are pivoting from general AI to specialized vertical solutions.
**Confidence Level:** 9/10
...

## 📋 Supporting Evidence

- "Series B rounds in 2024 averaged $85M, up 40% from 2023" - TechCrunch
- "Healthcare AI startups captured 35% of all Series B funding" - VentureBeat
- "Enterprise buyers are driving demand for specialized AI solutions" - Forbes
...

## ⚠️ Contradictions & Discrepancies

1. TechCrunch reports average round size of $85M while PitchBook shows $72M
   - Possible explanation: Different inclusion criteria for dataset

## 🤔 Emerging Questions

1. How will regulatory changes in EU and US affect these funded companies?
2. What's driving the shift from B2C to B2B AI applications?
3. Will consolidation continue or will we see new entrants in H2 2024?

## 💡 Recommendations

### Recommendation 1: Monitor Vertical Specialization
The trend toward specialized AI solutions suggests opportunities for targeted investments...

**Next Steps:**
- Track performance metrics of vertical-focused AI companies
- Analyze customer acquisition costs by vertical
- Identify underserved verticals with high potential
```

### Step 5: Subagent Research Example

Here's what one subagent might discover:

```javascript
// Subagent #3 researching: https://techcrunch.com/2024/01/ai-healthcare-series-b
{
  taskId: "portal_research_3",
  portal: "https://techcrunch.com/2024/01/ai-healthcare-series-b",
  findings: {
    keyFindings: [
      "Healthcare AI Series B rounds average $95M, higher than general AI",
      "FDA approval process creating moat for funded companies",
      "Partnership with health systems key to Series B success"
    ],
    supportingEvidence: [
      {
        quote: "Companies with FDA clearance raised 3x more than those without",
        source: "TechCrunch analysis",
        relevance: 0.95
      }
    ],
    credibilityScore: 9,
    relatedLinks: [
      "https://techcrunch.com/2024/01/fda-ai-medical-devices",
      "https://example.com/health-system-ai-partnerships"
    ],
    summary: "Healthcare AI companies securing Series B have regulatory moats and health system partnerships as key differentiators"
  }
}
```

## Benefits of Portal Analysis

1. **Parallel Processing** - Multiple subagents research simultaneously
2. **Deep Context** - Goes beyond surface-level information
3. **Cross-Validation** - Multiple sources verify findings
4. **Focused Research** - Each portal investigated for specific insights
5. **Structured Output** - Organized findings ready for decision-making

## Tips for Best Results

- **Be Specific** with your research query - the more focused, the better
- **Choose Quality Websets** - Ensure your webset has high-quality, relevant URLs
- **Limit Portal Count** - 3-5 deep dives often better than 10 shallow ones
- **Time Management** - Set realistic expectations (5-10 minutes total)
- **Iterative Refinement** - Use findings to create new, more targeted websets

## Common Research Queries

- "What are the competitive advantages of these companies?"
- "How do these companies plan to achieve profitability?"
- "What technologies are they using that differentiate them?"
- "Who are the key decision makers and what's their background?"
- "What market trends are driving these investments?"