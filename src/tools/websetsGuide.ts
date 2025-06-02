import { z } from "zod";
import { toolRegistry, ToolCategory, ServiceType } from "./config.js";

/**
 * Websets Guide Tool
 * 
 * Provides helpful guidance and examples for using the websets manager effectively.
 * This tool helps users understand workflows and see practical examples.
 */

toolRegistry["websets_guide"] = {
  name: "websets_guide",
  description: "Get helpful guidance, examples, and workflows for using Exa's content websets effectively. Learn how to create websets, search content, enhance data, and set up notifications with practical examples.",
  schema: {
    topic: z.enum([
      "getting_started",
      "creating_websets", 
      "searching_content",
      "enhancing_data",
      "setting_notifications",
      "workflow_examples",
      "troubleshooting",
      "best_practices"
    ]).describe("What you'd like guidance on")
  },
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  handler: async ({ topic }) => {
    const guides = {
      getting_started: {
        title: "Getting Started with Content Websets",
        content: `
**Welcome to Exa's Content Websets!**

Content websets help you gather, organize, and enhance web content at scale. 

**Available Operations:**
- \`create_webset\`, \`list_websets\`, \`get_webset_status\`, \`update_webset\`, \`delete_webset\`
- \`search_webset\`, \`get_search_results\`, \`cancel_search\`
- \`enhance_content\`, \`get_enhancement_results\`, \`delete_enhancement\`
- \`setup_notifications\`, \`list_notifications\`, \`remove_notifications\`
- \`list_content_items\`

Here's how to get started:

**Step 1: Create Your First Webset**
Use the websets_manager tool with operation "create_webset":
\`\`\`
operation: "create_webset"
webset: {
  searchQuery: "AI startups in San Francisco 2024",
  description: "Research on AI companies in SF",
  advanced: {
    resultCount: 20,
    focusArea: "company"
  }
}
\`\`\`

**Step 2: Monitor Progress**
Check status with operation "get_webset_status":
\`\`\`
operation: "get_webset_status"
resourceId: "your-webset-id"
\`\`\`

**Step 3: Explore Your Content**
Once complete, view items with operation "list_content_items":
\`\`\`
operation: "list_content_items"
resourceId: "your-webset-id"
\`\`\`

**Next Steps:**
- Search within your webset
- Enhance content with AI analysis
- Set up notifications for updates
        `
      },

      creating_websets: {
        title: "Creating Effective Content Websets",
        content: `
**Creating Content Websets**

Websets take 10-15 minutes to build but provide rich, organized content.

**Basic Webset:**
\`\`\`
operation: "create_webset"
webset: {
  searchQuery: "sustainable fashion brands",
  description: "Research on eco-friendly clothing companies"
}
\`\`\`

**Advanced Webset with Filters:**
\`\`\`
operation: "create_webset"
webset: {
  searchQuery: "fintech companies Series A funding",
  description: "Fintech startups that raised Series A in 2024",
  advanced: {
    resultCount: 50,
    focusArea: "company",
    criteria: [
      { description: "Must have raised Series A funding" },
      { description: "Founded after 2020" }
    ],
    tags: {
      "industry": "fintech",
      "funding_stage": "series_a"
    }
  }
}
\`\`\`

**Tips for Better Websets:**
- Be specific in your search query
- Use criteria to filter results
- Set appropriate result counts (10-100)
- Add descriptive tags for organization
        `
      },

      searching_content: {
        title: "Searching Within Websets",
        content: `
**Searching Your Websets**

Once a webset is complete, you can search within it for specific information.

**Basic Search:**
\`\`\`
operation: "search_webset"
resourceId: "your-webset-id"
search: {
  query: "pricing information",
  maxResults: 10
}
\`\`\`

**Advanced Search with Filters:**
\`\`\`
operation: "search_webset"
resourceId: "your-webset-id"
search: {
  query: "executive team leadership bios",
  maxResults: 20,
  advanced: {
    focusArea: { type: "company" },
    requirements: [
      { description: "Must mention C-level executives" },
      { description: "Include background information" }
    ]
  }
}
\`\`\`

**Getting Search Results:**
\`\`\`
operation: "get_search_results"
resourceId: "your-search-id"
\`\`\`

**Search Best Practices:**
- Use specific, descriptive queries
- Search for concepts, not just keywords
- Combine multiple searches for comprehensive coverage
        `
      },

      enhancing_data: {
        title: "Enhancing Content with AI",
        content: `
**Data Enhancement**

Transform raw content into structured, useful data with AI analysis.

**Basic Enhancement:**
\`\`\`
operation: "enhance_content"
resourceId: "your-webset-id"
enhancement: {
  task: "Extract company founding year and employee count"
}
\`\`\`

**Structured Enhancement with Options:**
\`\`\`
operation: "enhance_content"
resourceId: "your-webset-id"
enhancement: {
  task: "Categorize company by business model",
  advanced: {
    outputFormat: "options",
    choices: [
      { label: "B2B SaaS" },
      { label: "B2C Marketplace" },
      { label: "Enterprise Software" },
      { label: "Consumer App" },
      { label: "Other" }
    ]
  }
}
\`\`\`

**Specific Data Extraction:**
\`\`\`
operation: "enhance_content"
resourceId: "your-webset-id"
enhancement: {
  task: "Extract CEO email address",
  advanced: {
    outputFormat: "email"
  }
}
\`\`\`

**Enhancement Ideas:**
- Extract contact information
- Categorize content by type/industry
- Score content by relevance
- Extract key metrics or numbers
- Identify decision makers
        `
      },

      setting_notifications: {
        title: "Setting Up Notifications",
        content: `
**Webhook Notifications**

Get notified when websets, searches, or enhancements complete.

**Available Events:**
- \`webset.created\` - When a new webset is created
- \`webset.idle\` - When webset processing completes
- \`webset.deleted\` - When a webset is deleted
- \`webset.search.completed\` - When a search finishes
- \`webset.search.created\` - When a search starts
- \`webset.item.created\` - When new items are added
- \`webset.item.enriched\` - When items are enhanced

**Basic Notification Setup:**
\`\`\`
operation: "setup_notifications"
notification: {
  webhookUrl: "https://your-app.com/webhooks/exa",
  events: ["webset.idle", "webset.search.completed"]
}
\`\`\`

**Comprehensive Notifications:**
\`\`\`
operation: "setup_notifications"
notification: {
  webhookUrl: "https://your-app.com/webhooks/exa",
  events: [
    "webset.created", "webset.idle", "webset.deleted",
    "webset.search.completed", "webset.item.created"
  ],
  advanced: {
    tags: {
      "environment": "production",
      "team": "research"
    }
  }
}
\`\`\`

**Managing Notifications:**
- List all: operation "list_notifications"
- Get details: operation "get_notification_details"
- Remove: operation "remove_notifications"

**Webhook Requirements:**
- Must use HTTPS URLs
- Should return 2xx status codes
- Include signature verification for security
        `
      },

      workflow_examples: {
        title: "Complete Workflow Examples",
        content: `
**Example 1: Competitor Research Workflow**

1. **Create Webset:**
\`\`\`
operation: "create_webset"
webset: {
  searchQuery: "project management software companies",
  description: "Research competitors in PM space",
  advanced: { resultCount: 30, focusArea: "company" }
}
\`\`\`

2. **Search for Pricing:**
\`\`\`
operation: "search_webset"
resourceId: "webset-id"
search: { query: "pricing plans subscription costs" }
\`\`\`

3. **Extract Pricing Data:**
\`\`\`
operation: "enhance_content"
resourceId: "webset-id"
enhancement: {
  task: "Extract pricing information and plans",
  advanced: { outputFormat: "text" }
}
\`\`\`

**Example 2: Lead Generation Workflow**

1. **Create Target Company Webset:**
\`\`\`
operation: "create_webset"
webset: {
  searchQuery: "healthcare startups seed funding 2024",
  advanced: { 
    resultCount: 50,
    criteria: [{ description: "Recently funded startups" }]
  }
}
\`\`\`

2. **Find Decision Makers:**
\`\`\`
operation: "search_webset"
resourceId: "webset-id"  
search: { query: "founder CEO leadership team contact" }
\`\`\`

3. **Extract Contact Info:**
\`\`\`
operation: "enhance_content"
resourceId: "webset-id"
enhancement: {
  task: "Extract CEO name and company email",
  advanced: { outputFormat: "email" }
}
\`\`\`

**Example 3: Market Research Workflow**

1. **Create Industry Webset**
2. **Search for Market Size Data**
3. **Enhance with Trend Analysis**
4. **Set Up Monitoring Notifications**
        `
      },

      troubleshooting: {
        title: "Troubleshooting Common Issues",
        content: `
**Common Issues and Solutions**

**Webset Creation Issues:**
- ❌ "Webset failed": Try more specific search queries
- ❌ "No results found": Broaden your search terms
- ❌ "Timeout": Websets with 100+ results may take longer

**Search Issues:**
- ❌ "Search returned no results": Try broader query terms
- ❌ "Search taking too long": Reduce maxResults parameter

**Enhancement Issues:**  
- ❌ "Enhancement failed": Ensure task is clear and specific
- ❌ "Invalid format": Check outputFormat matches your data type

**Notification Issues:**
- ❌ "Webhook not receiving events": Verify HTTPS URL is accessible
- ❌ "Authentication errors": Check webhook signature validation

**API Issues:**
- ❌ "Authentication failed": Verify EXA_API_KEY is set correctly
- ❌ "Rate limiting": Space out requests, respect rate limits

**Best Practices:**
- Always check webset status before searching/enhancing
- Use descriptive resource IDs and tags for organization
- Monitor webhook endpoints for reliability
- Start with small websets to test workflows
        `
      },

      best_practices: {
        title: "Best Practices and Tips",
        content: `
**Best Practices for Content Websets**

**Webset Design:**
- 🎯 Be specific with search queries for better results
- 📊 Start with 10-20 results, scale up as needed
- 🏷️ Use tags and descriptions for organization
- ⏰ Plan for 10-15 minute webset build times

**Search Optimization:**
- 🔍 Search for concepts, not just keywords  
- 🎯 Use multiple targeted searches vs one broad search
- 📝 Be specific about what information you need
- 🔄 Iterate and refine search queries

**Enhancement Strategy:**
- 📋 Be very specific about what data to extract
- 🏗️ Use structured formats (options, email, etc.) when possible
- 🎯 One enhancement per specific data type
- ✅ Validate enhancement results before scaling

**Workflow Efficiency:**
- 🔄 Batch similar operations together
- 📊 Monitor progress with status checks
- 🔔 Use webhooks for long-running operations
- 📁 Organize with consistent naming conventions

**Resource Management:**
- 🏷️ Use meaningful resource IDs and descriptions
- 🧹 Clean up unused websets and enhancements
- 📊 Track usage with tags and metadata
- 🔍 Monitor activities with event listing

**Performance Tips:**
- ⚡ Use progressive disclosure - start simple, add complexity
- 🎯 Target specific data needs vs broad exploration
- 📦 Batch related enhancements together
- ⏰ Plan workflows around processing times

**Security Considerations:**
- 🔒 Use HTTPS for all webhook URLs
- 🔐 Implement webhook signature verification
- 🚫 Avoid logging sensitive data
- 🛡️ Validate all input parameters
        `
      }
    };

    const guide = guides[topic as keyof typeof guides];
    
    return {
      content: [{
        type: "text" as const,
        text: `# ${guide.title}\n\n${guide.content.trim()}\n\n---\n\n**Need more help?** Try other guide topics: ${Object.keys(guides).join(', ')}`
      }]
    };
  },
  enabled: true
};

export default toolRegistry["websets_guide"];