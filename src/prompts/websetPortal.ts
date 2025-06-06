/**
 * Webset Portal - Deep-dive parallel research through webset URLs
 */

export async function websetPortal(
  websetId: string,
  researchQuery: string,
  maxPortals: number = 5
): Promise<string> {
  if (!websetId) {
    return `Please provide a webset ID to analyze. Use \`list_websets()\` to see available websets.`;
  }

  if (!researchQuery) {
    return `Please provide a research query describing what insights you're looking for.`;
  }

  return `# 🌐 Webset Portal: Deep-Dive Parallel Research

## 🎯 Analyzing Webset: ${websetId}
## 🔍 Research Focus: "${researchQuery}"
## 🚀 Max Parallel Portals: ${maxPortals}

This workflow will identify the most relevant URLs in your webset and conduct parallel deep-dive research through each "portal" to synthesize comprehensive insights.

## Phase 1: Identify Portal Candidates

First, let's find the most relevant URLs based on your research query:

\`\`\`javascript
// Step 1: Load webset items and analyze relevance
async function identifyPortals() {
  // Get webset metadata to understand original search
  const websetInfo = await get_webset("${websetId}");
  const originalQuery = websetInfo.searchQuery;
  
  // Fetch items from the webset
  const items = await get_webset_items("${websetId}", 100);
  
  // Score each item based on relevance to research query
  const scoredItems = items.map(item => {
    let relevanceScore = 0;
    
    // Check title relevance
    const titleMatch = calculateSimilarity(item.title, "${researchQuery}");
    relevanceScore += titleMatch * 0.3;
    
    // Check content relevance
    const contentMatch = calculateSimilarity(item.text, "${researchQuery}");
    relevanceScore += contentMatch * 0.3;
    
    // Bonus for original query match (these are your "full matches")
    const originalMatch = calculateSimilarity(item.title + " " + item.text, originalQuery);
    relevanceScore += originalMatch * 0.4;
    
    return {
      ...item,
      relevanceScore,
      portalUrl: item.url,
      portalReason: determineRelevanceReason(item, "${researchQuery}")
    };
  });
  
  // Sort by relevance and take top candidates
  const topPortals = scoredItems
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, ${maxPortals})
    .filter(item => item.relevanceScore > 0.7); // Quality threshold
  
  console.log(\`Identified \${topPortals.length} high-relevance portals\`);
  return topPortals;
}

// Helper to determine why this URL is relevant
function determineRelevanceReason(item, query) {
  const reasons = [];
  
  // Check for exact entity matches
  const entities = extractEntities(item.text);
  const queryEntities = extractEntities(query);
  const matchedEntities = entities.filter(e => queryEntities.includes(e));
  
  if (matchedEntities.length > 0) {
    reasons.push(\`Contains entities: \${matchedEntities.join(', ')}\`);
  }
  
  // Check for domain authority
  const domain = new URL(item.url).hostname;
  if (isAuthorativeDomain(domain)) {
    reasons.push(\`Authoritative source: \${domain}\`);
  }
  
  // Check for recency
  if (item.publishedDate && isRecent(item.publishedDate)) {
    reasons.push('Recent publication');
  }
  
  return reasons.join('; ');
}
\`\`\`

## Phase 2: Prepare Parallel Research Tasks

Create research tasks for Claude Code subagents:

\`\`\`javascript
// Step 2: Define research tasks for each portal
async function prepareResearchTasks(portals) {
  const researchTasks = portals.map((portal, index) => ({
    taskId: \`portal_research_\${index + 1}\`,
    portalUrl: portal.portalUrl,
    portalTitle: portal.title,
    relevanceScore: portal.relevanceScore,
    relevanceReason: portal.portalReason,
    
    // Research instructions for subagent
    instructions: \`
      Research Task: Portal Analysis #\${index + 1}
      
      URL: \${portal.portalUrl}
      Context: \${portal.title}
      
      Research Query: "${researchQuery}"
      
      Your mission:
      1. Visit the portal URL and extract key information
      2. Follow relevant links (max depth: 2) for additional context
      3. Focus on finding information related to: "${researchQuery}"
      4. Extract specific data points, quotes, and facts
      5. Identify any contradictions or confirmations with other sources
      6. Note any new leads or references worth exploring
      
      Deliverables:
      - Key findings related to the research query
      - Supporting evidence (quotes, data, facts)
      - Credibility assessment of the source
      - Related links worth further investigation
      - Summary of insights gained
    \`,
    
    // Expected output structure
    outputSchema: {
      portalUrl: portal.portalUrl,
      keyFindings: [],
      supportingEvidence: [],
      credibilityScore: 0,
      relatedLinks: [],
      summary: "",
      metadata: {}
    }
  }));
  
  return researchTasks;
}
\`\`\`

## Phase 3: Execute Parallel Research (Claude Code Subagents)

**For Claude Code execution:**

\`\`\`javascript
// Step 3: Launch parallel subagents
async function executeParallelResearch(researchTasks) {
  console.log(\`Launching \${researchTasks.length} parallel research agents...\`);
  
  // Claude Code will create subagents for each task
  const subagentPromises = researchTasks.map(async (task) => {
    console.log(\`🔍 Subagent \${task.taskId} researching: \${task.portalUrl}\`);
    
    // Each subagent will:
    // 1. Use web_search_exa or websets_search for deep dive
    // 2. Create a focused mini-webset if needed
    // 3. Analyze content specific to research query
    // 4. Return structured findings
    
    return await executeSubagentResearch(task);
  });
  
  // Wait for all subagents to complete
  const results = await Promise.all(subagentPromises);
  
  console.log('✅ All portal research completed');
  return results;
}

// Subagent research execution
async function executeSubagentResearch(task) {
  try {
    // Deep dive into the portal
    const portalContent = await web_search_exa(
      \`site:\${new URL(task.portalUrl).hostname} ${researchQuery}\`,
      10
    );
    
    // Extract and analyze findings
    const findings = await analyzePortalContent(portalContent, task);
    
    // Enrich with additional context if needed
    if (findings.relatedLinks.length > 0) {
      const additionalContext = await exploreRelatedLinks(
        findings.relatedLinks.slice(0, 3),
        task.instructions
      );
      findings.additionalContext = additionalContext;
    }
    
    return {
      taskId: task.taskId,
      portal: task.portalUrl,
      findings: findings,
      completedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(\`Error in subagent \${task.taskId}:\`, error);
    return {
      taskId: task.taskId,
      portal: task.portalUrl,
      error: error.message,
      completedAt: new Date().toISOString()
    };
  }
}
\`\`\`

## Phase 4: Synthesize Research Findings

Combine all parallel research into cohesive insights:

\`\`\`javascript
// Step 4: Synthesize findings from all portals
async function synthesizeFindings(portalResults, originalQuery) {
  const synthesis = {
    researchQuery: "${researchQuery}",
    websetId: "${websetId}",
    timestamp: new Date().toISOString(),
    portalsAnalyzed: portalResults.length,
    
    // Core insights organized by theme
    insights: {},
    
    // Evidence supporting each insight
    evidence: {},
    
    // Contradictions found across sources
    contradictions: [],
    
    // New questions raised
    emergingQuestions: [],
    
    // Actionable recommendations
    recommendations: []
  };
  
  // Group findings by theme
  const themeGroups = groupFindingsByTheme(portalResults);
  
  // For each theme, synthesize insights
  for (const [theme, findings] of Object.entries(themeGroups)) {
    synthesis.insights[theme] = {
      summary: generateThemeSummary(findings),
      confidence: calculateConfidenceLevel(findings),
      sources: findings.map(f => ({
        url: f.portal,
        credibility: f.findings.credibilityScore
      }))
    };
    
    // Collect supporting evidence
    synthesis.evidence[theme] = findings
      .flatMap(f => f.findings.supportingEvidence)
      .filter(e => e.relevance > 0.8);
  }
  
  // Identify contradictions
  synthesis.contradictions = findContradictions(portalResults);
  
  // Extract emerging questions
  synthesis.emergingQuestions = extractEmergingQuestions(portalResults);
  
  // Generate recommendations
  synthesis.recommendations = generateRecommendations(synthesis);
  
  return synthesis;
}
\`\`\`

## Phase 5: Generate Analytical Report

Create a comprehensive report with insights:

\`\`\`javascript
// Step 5: Generate the final analytical report
async function generateAnalyticalReport(synthesis) {
  const report = \`
# 📊 Webset Portal Analysis Report

**Research Query:** "${researchQuery}"  
**Webset ID:** ${websetId}  
**Analysis Date:** \${new Date().toLocaleDateString()}  
**Portals Analyzed:** \${synthesis.portalsAnalyzed}

## 🎯 Executive Summary

\${generateExecutiveSummary(synthesis)}

## 🔍 Key Insights

\${Object.entries(synthesis.insights).map(([theme, insight]) => \`
### \${theme}

**Summary:** \${insight.summary}

**Confidence Level:** \${insight.confidence}/10

**Supporting Sources:** \${insight.sources.length} portals
\${insight.sources.map(s => \`- \${s.url} (Credibility: \${s.credibility}/10)\`).join('\\n')}
\`).join('\\n')}

## 📋 Supporting Evidence

\${formatEvidence(synthesis.evidence)}

## ⚠️ Contradictions & Discrepancies

\${formatContradictions(synthesis.contradictions)}

## 🤔 Emerging Questions

Based on this research, the following questions warrant further investigation:

\${synthesis.emergingQuestions.map((q, i) => \`\${i + 1}. \${q}\`).join('\\n')}

## 💡 Recommendations

\${synthesis.recommendations.map((r, i) => \`
### Recommendation \${i + 1}: \${r.title}

\${r.description}

**Next Steps:**
\${r.nextSteps.map(step => \`- \${step}\`).join('\\n')}
\`).join('\\n')}

## 📊 Research Methodology

- **Portal Selection:** Top \${synthesis.portalsAnalyzed} URLs by relevance score
- **Research Depth:** 2-level deep dive from each portal
- **Analysis Method:** Parallel subagent research with synthesis
- **Quality Control:** Cross-validation across multiple sources

## 🔗 Further Research Paths

\${generateFurtherResearchPaths(synthesis)}
\`;

  return report;
}
\`\`\`

## 📝 Complete Workflow Example

\`\`\`javascript
// Full portal research workflow
async function runWebsetPortalAnalysis() {
  try {
    console.log("🌐 Starting Webset Portal Analysis...");
    
    // Phase 1: Identify portals
    const portals = await identifyPortals();
    console.log(\`Found \${portals.length} relevant portals\`);
    
    // Phase 2: Prepare tasks
    const tasks = await prepareResearchTasks(portals);
    
    // Phase 3: Execute parallel research
    console.log("🚀 Launching parallel research agents...");
    const results = await executeParallelResearch(tasks);
    
    // Phase 4: Synthesize findings
    console.log("🔄 Synthesizing research findings...");
    const synthesis = await synthesizeFindings(results);
    
    // Phase 5: Generate report
    console.log("📄 Generating analytical report...");
    const report = await generateAnalyticalReport(synthesis);
    
    // Save report
    const reportPath = \`./reports/portal-analysis-\${Date.now()}.md\`;
    await saveToFile(reportPath, report);
    
    console.log(\`
    ✅ Portal Analysis Complete!
    - Portals analyzed: \${portals.length}
    - Insights discovered: \${Object.keys(synthesis.insights).length}
    - Report saved to: \${reportPath}
    \`);
    
    return { synthesis, report, reportPath };
    
  } catch (error) {
    console.error("Portal analysis failed:", error);
    throw error;
  }
}
\`\`\`

## 💡 Usage Tips

1. **Quality over Quantity**: Better to deeply analyze 3-5 highly relevant portals than skim 20
2. **Leverage Parallelism**: Claude Code's subagents can research simultaneously
3. **Follow the Thread**: Let subagents explore 2-3 levels deep from each portal
4. **Cross-Validate**: Look for confirmations and contradictions across sources
5. **Time Management**: Set time limits for each subagent (e.g., 5 minutes per portal)

## 🎯 Best Use Cases

- **Deep Company Research**: Analyze multiple sources about a specific company
- **Technology Assessment**: Understand a technology through various expert sources  
- **Market Intelligence**: Gather insights from industry publications and analyses
- **Academic Research**: Cross-reference findings across scholarly sources
- **Competitive Analysis**: Deep dive into competitor information from multiple angles

Ready to start portal analysis? The system will:
1. Identify the most relevant URLs from your webset
2. Launch parallel research through each portal
3. Synthesize findings into actionable insights
4. Generate a comprehensive analytical report`;
}