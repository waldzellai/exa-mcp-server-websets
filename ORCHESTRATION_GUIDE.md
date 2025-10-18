# Exa Websets Orchestration Workflows

Three powerful orchestration prompts guide you through common use cases for Exa's websets platform. These prompts provide step-by-step workflows with parameterized guidance tailored to your specific needs.

## Quick Access

All orchestrations are available as MCP prompts and can be accessed through any compatible MCP client.

### 1. Marketing Orchestration
**For**: Competitor monitoring, brand health tracking, share of voice analysis

**Prompt Name**: `marketing_orchestration`

**Parameters**:
- `companyName` (required): Your company name
- `targetAudience` (optional): Target audience segment for monitoring
- `timeframe` (optional): Time range for monitoring (e.g., '30d', '90d')

**Example MCP Call**:
```json
{
  "method": "prompts/get",
  "params": {
    "name": "marketing_orchestration",
    "arguments": {
      "companyName": "TechCorp",
      "targetAudience": "Enterprise DevOps",
      "timeframe": "30d"
    }
  }
}
```

**What You'll Get**:
- Step-by-step competitor monitoring workflow
- Competitor discovery queries
- Brand health tracking methodology
- Share of voice analysis approach
- Content gap identification
- Ready-to-use tool commands

---

### 2. CRM Orchestration
**For**: Lead discovery, account-based marketing, intent scoring

**Prompt Name**: `crm_orchestration`

**Parameters**:
- `idealCustomerProfile` (required): Description of your ideal customer profile (ICP)
- `region` (optional): Geographic region for lead search (e.g., 'North America', 'Europe')
- `intentSignals` (optional): Comma-separated intent signals (e.g., 'hiring,funding,product launches')

**Example MCP Call**:
```json
{
  "method": "prompts/get",
  "params": {
    "name": "crm_orchestration",
    "arguments": {
      "idealCustomerProfile": "Mid-market SaaS with 50-500 employees",
      "region": "North America",
      "intentSignals": "hiring,funding"
    }
  }
}
```

**What You'll Get**:
- Lead discovery workflow with search strategies
- ICP matching criteria and scoring
- Intent signal identification
- Enrichment strategies for lead data
- CRM integration guidelines
- Ready-to-use search and enrichment commands

---

### 3. Hiring Orchestration
**For**: Recruiter candidate sourcing and job seeker target company tracking

**Prompt Name**: `hiring_orchestration`

**Parameters**:
- `mode` (required): Either `"recruiter"` or `"job_seeker"`
- `role` (required): Job title or role to search for
- `location` (optional): Location preference (e.g., 'Remote', 'Bay Area', 'NYC')
- `seniority` (optional): Seniority level (e.g., 'junior', 'mid-level', 'senior')
- `keywords` (optional): Comma-separated key skills/interests

**Example - Recruiter Mode**:
```json
{
  "method": "prompts/get",
  "params": {
    "name": "hiring_orchestration",
    "arguments": {
      "mode": "recruiter",
      "role": "Senior Software Engineer",
      "location": "Remote",
      "seniority": "senior",
      "keywords": "Go,Kubernetes,distributed systems"
    }
  }
}
```

**Example - Job Seeker Mode**:
```json
{
  "method": "prompts/get",
  "params": {
    "name": "hiring_orchestration",
    "arguments": {
      "mode": "job_seeker",
      "role": "Product Manager",
      "location": "San Francisco",
      "keywords": "AI/ML,B2B,SaaS"
    }
  }
}
```

**What You'll Get**:
- **Recruiter Mode**: Passive candidate sourcing workflow, search strategies, networking approaches
- **Job Seeker Mode**: Target company tracking, company research methodology, networking strategies
- Comprehensive search queries
- Enrichment approaches
- Ready-to-use tool commands

---

## How These Prompts Work

Each orchestration prompt:
1. **Explains the workflow** - Clear step-by-step approach tailored to your parameters
2. **Provides search queries** - Ready-to-use JSON examples for websets_manager tool
3. **Includes examples** - Real-world scenarios showing how to use each step
4. **Offers best practices** - Tips for optimal results with your specific use case
5. **Suggests enrichments** - How to enhance and analyze results
6. **Troubleshoots** - Common issues and how to resolve them

---

## Integration with Other Tools

These orchestrations work seamlessly with the following MCP tools:

- **websets_manager**: Create websets, search within them, and enrich data
- **web_search_exa**: Perform real-time web searches for discovery
- **knowledge_graph**: Track connections and insights across multiple websets

---

## Example Workflow: Marketing Use Case

A marketer wants to monitor a competitor (Acme Corp) in the DevOps space over 30 days:

1. **Call the orchestration**:
   ```json
   {
     "method": "prompts/get",
     "params": {
       "name": "marketing_orchestration",
       "arguments": {
         "companyName": "Your Company",
         "targetAudience": "DevOps",
         "timeframe": "30d"
       }
     }
   }
   ```

2. **Follow the workflow steps** provided in the response:
   - Create a webset for Acme Corp competitor mentions
   - Search for Acme Corp announcements and press releases
   - Monitor for product launches
   - Track mentions in tech communities
   - Analyze share of voice vs competitors

3. **Use the provided tool calls** to execute each step with websets_manager and web_search_exa

4. **Enrich and analyze** using the suggested enrichment strategies

5. **Iterate** based on findings to refine your research

---

## Support and Troubleshooting

### Common Issues

**Issue**: "I'm not getting relevant results"
- **Solution**: Review the "Troubleshooting" section in the orchestration for query refinement tips
- **Next Step**: Try using different intent signals or search keywords

**Issue**: "Results are too broad or too narrow"
- **Solution**: Adjust your parameters (e.g., narrow the region, add more specific keywords)
- **Next Step**: Create separate websets for different segments

**Issue**: "I need more context on a specific step"
- **Solution**: Each orchestration includes an "Examples" section with real-world scenarios
- **Next Step**: Look for examples matching your specific use case

---

## Best Practices

1. **Start with core parameters** - Use the required parameters first, then add optional ones
2. **Review all examples** - Each orchestration includes 3+ real-world examples
3. **Use the workflow iteratively** - Complete one step, review results, adjust next step
4. **Combine with enrichment** - Use websets_manager enrichment features for deeper insights
5. **Track with knowledge_graph** - Connect findings across multiple websets for better analysis

---

## Future Enhancements

We're continuously improving these orchestrations:
- [ ] Integration with CRM platforms (Salesforce, HubSpot)
- [ ] Advanced filtering and deduplication
- [ ] Scheduled webset updates and monitoring
- [ ] Automated alerting on key findings
- [ ] Custom industry-specific workflows

