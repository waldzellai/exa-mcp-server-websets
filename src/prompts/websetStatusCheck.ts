/**
 * Check and monitor status of async webset operations
 */

export async function websetStatusCheck(websetId: string): Promise<string> {
  if (!websetId) {
    return `Please provide a webset ID to check status. Use \`list_websets()\` to see available websets.`;
  }

  return `# 📊 Webset Status Check: ${websetId}

## 🔄 Monitoring Your Webset

I'll help you understand the current state of your webset and what actions you can take.

### Check Current Status:
\`\`\`
get_webset("${websetId}")
\`\`\`

### Understanding Status Information:

**Key Fields to Watch:**
• **status**: Current state (processing/completed/failed/partial)
• **itemCount**: Number of items collected so far
• **progress**: Percentage complete (if available)
• **startedAt**: When processing began
• **completedAt**: When processing finished (if complete)
• **estimatedCompletionTime**: Rough estimate for completion

### Status-Specific Actions:

**If Status = "processing" 🟡**
Your webset is still being created. Options:
• Wait and check again in 5-10 minutes
• Set up a webhook to get notified: \`register_webhook("https://your-url.com", ["webset.completed"])\`
• Check partial results: \`get_webset_items("${websetId}", 10)\`

**If Status = "completed" 🟢**
Your webset is ready! You can:
• View items: \`get_webset_items("${websetId}", 50)\`
• Export data: \`export_webset("${websetId}", "csv")\`
• Enrich data: \`enrich_webset("${websetId}", "summarize")\`
• Analyze: \`analyze_webset("${websetId}", "statistics")\`

**If Status = "failed" 🔴**
Something went wrong. Check:
• Error message in the response
• Try creating a new webset with adjusted parameters
• Contact support if the issue persists

**If Status = "partial" 🟠**
Some results available, but processing encountered issues:
• Access available items: \`get_webset_items("${websetId}", 100)\`
• Check error details in metadata
• Decide if partial results are sufficient

### Monitoring Best Practices:

**For Active Monitoring:**
\`\`\`javascript
// Check every 5 minutes
const checkInterval = setInterval(async () => {
  const status = await get_webset("${websetId}");
  console.log(\`Status: \${status.status}, Items: \${status.itemCount}\`);
  
  if (status.status === "completed" || status.status === "failed") {
    clearInterval(checkInterval);
  }
}, 300000); // 5 minutes
\`\`\`

**For Passive Monitoring:**
Set up a webhook to avoid polling:
\`\`\`
register_webhook("https://your-webhook-url.com", ["webset.completed", "webset.failed"], {
  websetId: "${websetId}"
})
\`\`\`

### Next Steps:
1. Run \`get_webset("${websetId}")\` to see current status
2. Based on status, choose appropriate actions from above
3. Consider setting up webhooks for future websets

Need help with a specific status? Let me know what you're seeing!`;
}