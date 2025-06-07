/**
 * Integration process for connecting a single webset with external systems
 */

export async function integrationProcess(
  websetId: string,
  targetSystem: string
): Promise<string> {
  if (!websetId) {
    return `Please provide a valid webset ID for integration. Example:
\`\`\`
websetId: "ws_abc123"
targetSystem: "slack"
\`\`\``;
  }

  return `# 🔌 Webset Integration: ${targetSystem.toUpperCase()}

## 🎯 Single Webset Integration with ${targetSystem.charAt(0).toUpperCase() + targetSystem.slice(1)}

This workflow will help you integrate webset \`${websetId}\` with ${targetSystem}, enabling automated data flows and operational connections.

## System Compatibility Check

\`\`\`javascript
// Verify webset exists and is ready for integration
const websetStatus = await get_webset(${JSON.stringify(websetId)});

if (websetStatus.status !== "completed") {
  console.warn(\`Webset ${websetId} is not ready for integration (status: \${websetStatus.status})\`);
  return false;
}

// Check target system connectivity
const targetSystemConfig = {
  system: ${JSON.stringify(targetSystem)},
  apiVersion: "latest",
  requiredPermissions: ["read", "write"]
};

// Validate connection
const connectionTest = await test_connection(targetSystemConfig);
console.log(\`Connection to ${targetSystem}: \${connectionTest ? "SUCCESS" : "FAILED"}\`);
\`\`\`

## Integration Setup

### Step 1: Configure Integration Parameters

\`\`\`javascript
// Define integration configuration
const integrationConfig = {
  websetId: ${JSON.stringify(websetId)},
  targetSystem: ${JSON.stringify(targetSystem)},
  syncOptions: {
    frequency: "daily",     // Options: "realtime", "hourly", "daily", "weekly"
    dataFlow: "bidirectional", // Options: "export", "import", "bidirectional"
    format: "json"          // Options: "json", "csv", "xml"
  },
  mappings: [
    // Map webset fields to target system fields
    { from: "webset.title", to: "${targetSystem}.name" },
    { from: "webset.url", to: "${targetSystem}.source_url" },
    { from: "webset.content", to: "${targetSystem}.description" }
  ]
};
\`\`\`

### Step 2: Create Integration Connection

\`\`\`javascript
// Register the integration
const integration = await register_integration({
  name: \`${websetId}-to-${targetSystem}\`,
  config: integrationConfig,
  webhookUrl: "https://your-app.com/integration-events",
  errorHandling: {
    retryCount: 3,
    notifyOnFailure: true
  }
});

console.log(\`Integration created: \${integration.id}\`);
\`\`\`

## Data Transfer Setup

### Export Data from Webset

\`\`\`javascript
// Full export of webset data
async function exportWebsetData() {
  // Get all items from the webset
  const items = await get_webset_items(${JSON.stringify(websetId)}, 1000);
  
  // Transform items into the format expected by ${targetSystem}
  const transformedItems = items.map(item => ({
    id: item.id,
    title: item.title,
    url: item.url,
    summary: item.summary,
    content: item.content,
    metadata: {
      source: "Exa Webset",
      websetId: ${JSON.stringify(websetId)},
      exportedAt: new Date().toISOString()
    }
  }));
  
  return transformedItems;
}
\`\`\`

### Import to Target System

\`\`\`javascript
// Import data to ${targetSystem}
async function importToTargetSystem(data) {
  // Create batch import job
  const importJob = await create_import_job(${JSON.stringify(targetSystem)}, {
    data: data,
    options: {
      updateExisting: true,
      chunkSize: 100,
      validateBeforeImport: true
    }
  });
  
  return importJob;
}

// Execute the full export-import process
async function syncData() {
  try {
    console.log("Beginning data sync process...");
    
    // Export data from webset
    const data = await exportWebsetData();
    console.log(\`Exported \${data.length} items from webset\`);
    
    // Import to target system
    const importJob = await importToTargetSystem(data);
    console.log(\`Import job created: \${importJob.id}\`);
    
    // Monitor import progress
    await monitorImportJob(importJob.id);
    
    return true;
  } catch (error) {
    console.error("Sync failed:", error);
    return false;
  }
}
\`\`\`

## Automated Updates

### Set Up Change Detection

\`\`\`javascript
// Register webhook for webset updates
const webhook = await register_webhook(
  "https://your-app.com/webset-updates",
  ["webset.items.added", "webset.items.updated", "webset.items.deleted"],
  {
    filters: {
      websetId: ${JSON.stringify(websetId)}
    }
  }
);

// Process webhook events
function processWebhookEvent(event) {
  switch(event.type) {
    case "webset.items.added":
      syncNewItems(event.data.items);
      break;
    case "webset.items.updated":
      updateExistingItems(event.data.items);
      break;
    case "webset.items.deleted":
      removeItems(event.data.itemIds);
      break;
  }
}
\`\`\`

## Monitoring & Maintenance

\`\`\`javascript
// Health check function
async function checkIntegrationHealth() {
  const websetHealth = await check_webset_health(${JSON.stringify(websetId)});
  const targetSystemHealth = await check_system_health(${JSON.stringify(targetSystem)});
  const syncStatus = await get_last_sync_status(\`${websetId}-to-${targetSystem}\`);
  
  return {
    webset: websetHealth,
    targetSystem: targetSystemHealth,
    lastSync: syncStatus,
    overall: websetHealth.healthy && targetSystemHealth.healthy ? "healthy" : "issues-detected"
  };
}

// Set up daily health checks
schedule_recurring_task(
  "daily-health-check",
  "0 9 * * *",  // Every day at 9am
  checkIntegrationHealth
);
\`\`\`

## ${targetSystem.toUpperCase()}-Specific Integration Code

${getTargetSystemSpecificCode(targetSystem)}

## 📊 Complete Integration Example

\`\`\`javascript
// Full integration implementation
async function setupIntegration() {
  try {
    // 1. Check compatibility
    const compatible = await checkCompatibility();
    if (!compatible) {
      throw new Error("Compatibility check failed");
    }
    
    // 2. Set up integration
    const config = await configureIntegration();
    const integration = await registerIntegration(config);
    
    // 3. Initial data sync
    await performInitialSync();
    
    // 4. Set up automated updates
    await configureAutomatedUpdates();
    
    // 5. Set up monitoring
    await setupMonitoring();
    
    console.log(\`
      ✅ Integration complete!
      - Webset: ${websetId}
      - Target System: ${targetSystem}
      - Integration ID: \${integration.id}
      - Status: Active
    \`);
    
    return integration;
    
  } catch (error) {
    console.error("Integration setup failed:", error);
    throw error;
  }
}

// Run the integration setup
await setupIntegration();
\`\`\`

## 💡 Best Practices

1. **Error Handling**: Implement comprehensive error handling for all integration points
2. **Idempotency**: Ensure operations can be safely retried without duplicating data
3. **Throttling**: Respect API rate limits of the target system
4. **Validation**: Validate data before sending to prevent integration errors
5. **Monitoring**: Set up alerts for integration failures
6. **Authentication**: Securely store and rotate API credentials

## 🎯 Next Steps

1. Configure your specific ${targetSystem} credentials
2. Customize the field mappings for your specific use case
3. Set up appropriate error notifications
4. Test with a small dataset before running full integration

Ready to start? Begin with:
\`\`\`
websetId: ${JSON.stringify(websetId)}
targetSystem: ${JSON.stringify(targetSystem)}
\`\`\``;
}

/**
 * Helper function to generate target system specific integration code
 */
function getTargetSystemSpecificCode(targetSystem: string): string {
  // Generate system-specific code examples based on the target system
  const systemExamples: Record<string, string> = {
    slack: `
### Slack-Specific Integration

\`\`\`javascript
// Configure Slack API client
const slackClient = new SlackAPI({
  token: process.env.SLACK_API_TOKEN,
  channel: "websets-updates"
});

// Post webset item to Slack channel
async function postToSlack(item) {
  return await slackClient.chat.postMessage({
    channel: "websets-updates",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: item.title
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: item.summary || "No summary available"
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: \`Source: <\${item.url}|View original>\`
          }
        ]
      }
    ]
  });
}

// Setup Slash command for webset queries
function setupSlashCommand() {
  // Configure slash command handler
  app.post('/slack/commands/webset', async (req, res) => {
    const query = req.body.text;
    const results = await searchWebset(websetId, query);
    
    // Format and return results
    res.json({
      response_type: "in_channel",
      blocks: formatSearchResultsForSlack(results)
    });
  });
}
\`\`\``,
    
    airtable: `
### Airtable-Specific Integration

\`\`\`javascript
// Configure Airtable client
const Airtable = require('airtable');
const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base('YOUR_BASE_ID');
const table = base('Webset Data');

// Sync webset item to Airtable
async function syncToAirtable(item) {
  // Check if record exists
  const existingRecords = await table.select({
    filterByFormula: \`{WebsetItemId} = '\${item.id}'\`
  }).firstPage();
  
  if (existingRecords.length > 0) {
    // Update existing record
    return await table.update(existingRecords[0].id, {
      "Title": item.title,
      "URL": item.url,
      "Summary": item.summary,
      "Content": item.content,
      "Last Updated": new Date().toISOString()
    });
  } else {
    // Create new record
    return await table.create({
      "WebsetItemId": item.id,
      "Title": item.title,
      "URL": item.url,
      "Summary": item.summary,
      "Content": item.content,
      "Added Date": new Date().toISOString()
    });
  }
}

// Setup bidirectional sync
function setupBidirectionalSync() {
  // Listen for Airtable webhook events
  app.post('/airtable/webhook', async (req, res) => {
    const record = req.body.record;
    
    // If edited in Airtable, update the webset
    await updateWebsetItem(websetId, {
      id: record.fields.WebsetItemId,
      title: record.fields.Title,
      url: record.fields.URL,
      // other fields...
    });
    
    res.sendStatus(200);
  });
}
\`\`\``,
    
    notion: `
### Notion-Specific Integration

\`\`\`javascript
// Configure Notion client
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = 'YOUR_DATABASE_ID';

// Create webset item in Notion
async function createNotionPage(item) {
  return await notion.pages.create({
    parent: {
      database_id: databaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: item.title,
            },
          },
        ],
      },
      URL: {
        url: item.url,
      },
      Summary: {
        rich_text: [
          {
            text: {
              content: item.summary || "",
            },
          },
        ],
      },
      WebsetId: {
        rich_text: [
          {
            text: {
              content: websetId,
            },
          },
        ],
      },
      ItemId: {
        rich_text: [
          {
            text: {
              content: item.id,
            },
          },
        ],
      },
    },
    children: [
      {
        object: "block",
        paragraph: {
          rich_text: [
            {
              text: {
                content: item.content || "No content available",
              },
            },
          ],
        },
      },
    ],
  });
}

// Query Notion database for webset items
async function queryNotionWebsetItems() {
  return await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "WebsetId",
      rich_text: {
        equals: websetId,
      },
    },
  });
}
\`\`\``,

    zapier: `
### Zapier-Specific Integration

\`\`\`javascript
// Zapier integration via webhooks
const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/your-unique-hook";

// Send data to Zapier webhook
async function sendToZapier(data) {
  const response = await fetch(ZAPIER_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return response.ok;
}

// Create webhook endpoint for Zapier to send data back
function setupZapierInboundWebhook() {
  app.post('/api/zapier/webhook', express.json(), async (req, res) => {
    try {
      // Process data from Zapier
      const zapierData = req.body;
      
      // Update local data or trigger actions
      await processZapierData(zapierData);
      
      res.status(200).send({success: true});
    } catch (error) {
      console.error('Error processing Zapier webhook:', error);
      res.status(500).send({error: 'Failed to process Zapier data'});
    }
  });
}

// Example of sending daily digest to Zapier
async function sendDailyDigest() {
  // Get latest webset items
  const latestItems = await get_webset_items(websetId, 10, {
    sortBy: 'added',
    sortDirection: 'desc'
  });
  
  // Send to Zapier for further automation
  await sendToZapier({
    event: 'daily_digest',
    websetId: websetId,
    items: latestItems,
    timestamp: new Date().toISOString()
  });
}
\`\`\``,

    default: `
### Integration with ${targetSystem}

Configure your specific ${targetSystem} integration with appropriate authentication and API calls.

\`\`\`javascript
// Example ${targetSystem} integration
async function setupTargetSystemIntegration() {
  // 1. Configure API client for ${targetSystem}
  const client = new ${targetSystem.charAt(0).toUpperCase() + targetSystem.slice(1)}Client({
    apiKey: process.env.${targetSystem.toUpperCase()}_API_KEY,
    // other configuration options
  });
  
  // 2. Define data mapping function
  function mapWebsetItemToTargetSystem(item) {
    return {
      // Map webset fields to ${targetSystem} fields
      // Customize this based on ${targetSystem}'s API requirements
      id: item.id,
      title: item.title,
      description: item.summary,
      link: item.url,
      content: item.content,
      metadata: {
        source: "Exa Webset",
        sourceId: websetId
      }
    };
  }
  
  // 3. Create import function
  async function importItem(item) {
    const mappedItem = mapWebsetItemToTargetSystem(item);
    return await client.createItem(mappedItem);
  }
  
  // 4. Sync all items
  async function syncAllItems() {
    const items = await get_webset_items(websetId);
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(item => importItem(item)));
      console.log(\`Processed batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(items.length/batchSize)}\`);
    }
  }
  
  return {
    syncAllItems,
    importItem
  };
}
\`\`\``
  };
  
  // Return system-specific example if available, otherwise return default
  return systemExamples[targetSystem.toLowerCase()] || systemExamples.default;
}
