/**
 * Guide for setting up webhooks for webset notifications
 */

export async function webhookSetupGuide(): Promise<string> {
  return `# 🔔 Webhook Setup Guide

## 🎯 Automate Your Webset Notifications

Webhooks let you receive real-time notifications when webset events occur, eliminating the need for polling.

### Why Use Webhooks?

• **Efficiency**: No need to repeatedly check status
• **Real-time**: Get notified instantly when events occur
• **Scalable**: Handle multiple websets without overhead
• **Reliable**: Automatic retries for failed deliveries

### Step 1: Register a Webhook

Basic webhook registration:
\`\`\`
register_webhook("https://your-app.com/webhook", ["webset.completed"])
\`\`\`

With all event types:
\`\`\`
register_webhook("https://your-app.com/webhook", [
  "webset.completed",
  "webset.failed", 
  "webset.items.added",
  "webset.enrichment.completed"
], {
  name: "My Production Webhook",
  secret: "your-webhook-secret"
})
\`\`\`

### Step 2: Configure Your Endpoint

Your webhook endpoint should:

**1. Accept POST requests**
\`\`\`javascript
app.post('/webhook', (req, res) => {
  const event = req.body;
  
  // Verify webhook signature (if using secrets)
  const signature = req.headers['x-exa-signature'];
  if (!verifySignature(signature, req.body, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the event
  console.log('Received event:', event.type);
  
  // Always respond quickly
  res.status(200).send('OK');
  
  // Process async if needed
  processWebhookAsync(event);
});
\`\`\`

**2. Respond quickly (< 5 seconds)**
**3. Handle retries idempotently**
**4. Verify signatures for security**

### Step 3: Event Types & Payloads

**webset.completed**
\`\`\`json
{
  "type": "webset.completed",
  "websetId": "ws_abc123",
  "timestamp": "2024-01-10T10:00:00Z",
  "data": {
    "itemCount": 150,
    "processingTime": 1200,
    "status": "completed"
  }
}
\`\`\`

**webset.failed**
\`\`\`json
{
  "type": "webset.failed",
  "websetId": "ws_abc123",
  "timestamp": "2024-01-10T10:00:00Z",
  "data": {
    "error": "Rate limit exceeded",
    "itemsCollected": 50
  }
}
\`\`\`

**webset.items.added**
\`\`\`json
{
  "type": "webset.items.added",
  "websetId": "ws_abc123",
  "timestamp": "2024-01-10T10:00:00Z",
  "data": {
    "newItems": 25,
    "totalItems": 75
  }
}
\`\`\`

### Step 4: Manage Webhooks

**List your webhooks:**
\`\`\`
list_webhooks()
\`\`\`

**Update configuration:**
\`\`\`
update_webhook("webhook_id", {
  events: ["webset.completed", "webset.enrichment.completed"],
  paused: false
})
\`\`\`

**Test connectivity:**
\`\`\`
test_webhook("webhook_id")
\`\`\`

**Delete when no longer needed:**
\`\`\`
delete_webhook("webhook_id")
\`\`\`

### Step 5: Best Practices

**Security:**
• Use HTTPS endpoints only
• Implement signature verification
• Whitelist Exa's IP addresses
• Use unique secrets per webhook

**Reliability:**
• Implement idempotent handlers
• Log all received events
• Set up alerting for failures
• Have a fallback polling mechanism

**Performance:**
• Respond immediately, process async
• Queue events for processing
• Implement proper error handling
• Monitor webhook performance

### Example: Complete Workflow

\`\`\`javascript
// 1. Register webhook
const webhook = await register_webhook(
  "https://api.myapp.com/exa-webhook",
  ["webset.completed", "webset.failed"],
  { secret: process.env.WEBHOOK_SECRET }
);

// 2. Create webset
const webset = await websets_search("AI startups 2024");

// 3. Your webhook will be called when complete
// No need to poll!

// 4. In your webhook handler:
async function handleWebhook(event) {
  if (event.type === "webset.completed") {
    // Fetch and process items
    const items = await get_webset_items(event.websetId, 1000);
    await processItems(items);
  }
}
\`\`\`

### Troubleshooting

**Webhook not receiving events?**
• Check endpoint is publicly accessible
• Verify events are correctly specified
• Use \`test_webhook()\` to debug
• Check webhook logs in Exa dashboard

**Getting duplicate events?**
• Implement idempotency using event IDs
• Check if multiple webhooks are registered
• Ensure handler isn't triggering retries

Ready to set up your webhook? Start with \`register_webhook()\`!`;
}