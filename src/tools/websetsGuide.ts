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
  description: "Get helpful guidance, examples, and workflows for using Exa's content collections effectively. Learn how to create collections, search content, enhance data, and set up notifications with practical examples.",
  schema: {
    topic: z.enum([
      "getting_started",
      "creating_collections", 
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
        title: "Getting Started with Content Collections",
        content: `
**Welcome to Exa's Content Collections!**

Content collections help you gather, organize, and enhance web content at scale. Here's how to get started:

**Step 1: Create Your First Collection**
Use the websets_manager tool with operation "create_collection":
\`\`\`
operation: "create_collection"
collection: {
  searchQuery: "AI startups in San Francisco 2024",
  description: "Research on AI companies in SF",
  advanced: {
    resultCount: 20,
    focusArea: "company"
  }
}
\`\`\`

**Step 2: Monitor Progress**
Check status with operation "get_collection_status":
\`\`\`
operation: "get_collection_status"
resourceId: "your-collection-id"
\`\`\`

**Step 3: Explore Your Content**
Once complete, view items with operation "list_content_items":
\`\`\`
operation: "list_content_items"
resourceId: "your-collection-id"
\`\`\`

**Next Steps:**
- Search within your collection
- Enhance content with AI analysis
- Set up notifications for updates
        `
      },

      creating_collections: {
        title: "Creating Effective Content Collections",
        content: `
**Creating Content Collections**

Collections take 10-15 minutes to build but provide rich, organized content.

**Basic Collection:**
\`\`\`
operation: "create_collection"
collection: {
  searchQuery: "sustainable fashion brands",
  description: "Research on eco-friendly clothing companies"
}
\`\`\`

**Advanced Collection with Filters:**
\`\`\`
operation: "create_collection"
collection: {
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

**Tips for Better Collections:**
- Be specific in your search query
- Use criteria to filter results
- Set appropriate result counts (10-100)
- Add descriptive tags for organization
        `
      },

      searching_content: {
        title: "Searching Within Collections",
        content: `
**Searching Your Collections**

Once a collection is complete, you can search within it for specific information.

**Basic Search:**
\`\`\`
operation: "search_collection"
resourceId: "your-collection-id"
search: {
  query: "pricing information",
  maxResults: 10
}
\`\`\`

**Advanced Search with Filters:**
\`\`\`
operation: "search_collection"
resourceId: "your-collection-id"
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
resourceId: "your-collection-id"
enhancement: {
  task: "Extract company founding year and employee count"
}
\`\`\`

**Structured Enhancement with Options:**
\`\`\`
operation: "enhance_content"
resourceId: "your-collection-id"
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
resourceId: "your-collection-id"
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

Get notified when collections, searches, or enhancements complete.

**Basic Notification Setup:**
\`\`\`
operation: "setup_notifications"
notification: {
  webhookUrl: "https://your-app.com/webhooks/exa",
  events: ["collection.completed", "search.completed"]
}
\`\`\`

**Comprehensive Notifications:**
\`\`\`
operation: "setup_notifications"
notification: {
  webhookUrl: "https://your-app.com/webhooks/exa",
  events: [
    "collection.created", "collection.completed", "collection.failed",
    "search.completed", "enhancement.completed"
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

1. **Create Collection:**
\`\`\`
operation: "create_collection"
collection: {
  searchQuery: "project management software companies",
  description: "Research competitors in PM space",
  advanced: { resultCount: 30, focusArea: "company" }
}
\`\`\`

2. **Search for Pricing:**
\`\`\`
operation: "search_collection"
resourceId: "collection-id"
search: { query: "pricing plans subscription costs" }
\`\`\`

3. **Extract Pricing Data:**
\`\`\`
operation: "enhance_content"
resourceId: "collection-id"
enhancement: {
  task: "Extract pricing information and plans",
  advanced: { outputFormat: "text" }
}
\`\`\`

**Example 2: Lead Generation Workflow**

1. **Create Target Company Collection:**
\`\`\`
operation: "create_collection"
collection: {
  searchQuery: "healthcare startups seed funding 2024",
  advanced: { 
    resultCount: 50,
    criteria: [{ description: "Recently funded startups" }]
  }
}
\`\`\`

2. **Find Decision Makers:**
\`\`\`
operation: "search_collection"
resourceId: "collection-id"  
search: { query: "founder CEO leadership team contact" }
\`\`\`

3. **Extract Contact Info:**
\`\`\`
operation: "enhance_content"
resourceId: "collection-id"
enhancement: {
  task: "Extract CEO name and company email",
  advanced: { outputFormat: "email" }
}
\`\`\`

**Example 3: Market Research Workflow**

1. **Create Industry Collection**
2. **Search for Market Size Data**
3. **Enhance with Trend Analysis**
4. **Set Up Monitoring Notifications**
        `
      },

      troubleshooting: {
        title: "Troubleshooting Common Issues",
        content: `
**Common Issues and Solutions**

**Collection Creation Issues:**
- ❌ "Collection failed": Try more specific search queries
- ❌ "No results found": Broaden your search terms
- ❌ "Timeout": Collections with 100+ results may take longer

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
- Always check collection status before searching/enhancing
- Use descriptive resource IDs and tags for organization
- Monitor webhook endpoints for reliability
- Start with small collections to test workflows
        `
      },

      best_practices: {
        title: "Best Practices and Tips",
        content: `
**Best Practices for Content Collections**

**Collection Design:**
- 🎯 Be specific with search queries for better results
- 📊 Start with 10-20 results, scale up as needed
- 🏷️ Use tags and descriptions for organization
- ⏰ Plan for 10-15 minute collection build times

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
- 🧹 Clean up unused collections and enhancements
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