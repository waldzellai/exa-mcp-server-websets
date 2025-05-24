# Integration Documentation

## Event System and Webhook Management Integration

This document outlines the integration of the event system and webhook management components into the main MCP server.

### Components Integrated

#### 1. Event System Components
- **EventService**: Main service for event management
- **EventPoller**: Polls for new events from the Exa API
- **EventProcessor**: Processes events and triggers webhooks
- **EventQueue**: In-memory event queue with persistence
- **EventTypes**: Type definitions for all event types

#### 2. Webhook System Components
- **WebhookService**: Main service for webhook management
- **WebhookRegistry**: Manages webhook registrations
- **WebhookSender**: Handles webhook delivery with retry logic
- **WebhookValidator**: Validates webhook payloads and signatures
- **WebhookAttemptTracker**: Tracks delivery attempts and failures

#### 3. State Management Components
- **AsyncOperationManager**: Manages long-running operations
- **MemoryStore**: In-memory storage with optional persistence
- **ProgressTracker**: Tracks operation progress

### Export Structure

#### Main Exports (`src/index.ts`)
```typescript
export * from './api/index.js';
export * from './services/index.js';
export * from './events/index.js';
export * from './webhooks/index.js';
export * from './state/index.js';
export * from './types/websets.js';
export * from './config/websets.js';
export * from './utils/logger.js';
export { ExaServer };
```

#### Service Container (`src/services/index.ts`)
```typescript
export interface ServiceContainer {
  websetService: WebsetService;
  searchService: SearchService;
  itemService: ItemService;
  enrichmentService: EnrichmentService;
  eventService: EventService;
  webhookService: WebhookService;
}
```

### Configuration Integration

The event system and webhook management are configured through the main `WebsetsConfig` interface:

```typescript
export interface WebsetsConfig {
  // ... existing config
  events?: EventSystemConfig;
  webhooks?: WebhookSystemConfig;
}
```

#### Event System Configuration
```typescript
export interface EventSystemConfig {
  enabled: boolean;
  pollingInterval: number;
  batchSize: number;
  maxQueueSize: number;
  processingConcurrency: number;
  processingTimeout: number;
  maxRetries: number;
  retryDelay: number;
  eventTypes: string[];
}
```

#### Webhook System Configuration
```typescript
export interface WebhookSystemConfig {
  enabled: boolean;
  maxAttempts: number;
  deliveryTimeout: number;
  retryDelay: number;
  maxRetryDelay: number;
  validateSignatures: boolean;
  secret?: string;
}
```

### MCP Tool Integration Points

#### 1. Event Management Tools
- `list_events`: Stream events with filtering
- `get_event`: Get specific event details
- Event filtering by type, date range, and status

#### 2. Webhook Management Tools
- `create_webhook`: Register new webhooks
- `list_webhooks`: List registered webhooks
- `update_webhook`: Modify webhook configuration
- `delete_webhook`: Remove webhooks
- `list_webhook_attempts`: View delivery attempts

#### 3. Service Integration
All services are available through the service container:
```typescript
const services = createServices(apiKey);
const eventService = services.eventService;
const webhookService = services.webhookService;
```

### API Surface for Tool Consumption

#### EventService API
```typescript
class EventService extends BaseService {
  async listEvents(options?: ListEventsOptions): Promise<Event[]>
  async getEvent(eventId: string): Promise<Event>
  async startPolling(): Promise<void>
  async stopPolling(): Promise<void>
  async processEvents(): Promise<void>
}
```

#### WebhookService API
```typescript
class WebhookService extends BaseService {
  async createWebhook(webhook: CreateWebhookRequest): Promise<Webhook>
  async listWebhooks(options?: ListWebhooksOptions): Promise<Webhook[]>
  async getWebhook(webhookId: string): Promise<Webhook>
  async updateWebhook(webhookId: string, updates: UpdateWebhookRequest): Promise<Webhook>
  async deleteWebhook(webhookId: string): Promise<void>
  async listWebhookAttempts(webhookId: string, options?: ListAttemptsOptions): Promise<WebhookAttempt[]>
}
```

### Build Verification

✅ **Build Status**: All components build successfully
✅ **Exports**: All new components properly exported
✅ **Dependencies**: No circular dependencies detected
✅ **Integration**: Clean integration with existing codebase

### Build Output Structure
```
build/
├── events/
│   ├── EventPoller.js
│   ├── EventProcessor.js
│   ├── EventQueue.js
│   ├── EventTypes.js
│   └── index.js
├── webhooks/
│   ├── WebhookAttemptTracker.js
│   ├── WebhookRegistry.js
│   ├── WebhookSender.js
│   ├── WebhookValidator.js
│   └── index.js
├── state/
│   ├── AsyncOperationManager.js
│   ├── MemoryStore.js
│   ├── ProgressTracker.js
│   └── index.js
└── services/
    ├── EventService.js
    ├── WebhookService.js
    └── index.js
```

### Usage Examples

#### Basic Service Setup
```typescript
import { createServices } from 'exa-mcp-server-websets';

const services = createServices('your-api-key');

// Enable event system
const config = {
  events: {
    enabled: true,
    pollingInterval: 5000,
    batchSize: 50
  },
  webhooks: {
    enabled: true,
    maxAttempts: 3
  }
};
```

#### Event Processing
```typescript
// Start event polling
await services.eventService.startPolling();

// List recent events
const events = await services.eventService.listEvents({
  limit: 10,
  types: ['webset.created', 'webset.completed']
});
```

#### Webhook Management
```typescript
// Create a webhook
const webhook = await services.webhookService.createWebhook({
  url: 'https://your-app.com/webhooks',
  events: ['webset.created', 'webset.completed'],
  metadata: { source: 'mcp-integration' }
});

// List webhook attempts
const attempts = await services.webhookService.listWebhookAttempts(webhook.id);
```

### Next Steps

The integration is complete and ready for MCP tool implementation. The next phase should focus on:

1. **MCP Tool Implementation**: Create MCP tools that consume these services
2. **Error Handling**: Implement comprehensive error handling for tool operations
3. **Testing**: Add integration tests for the complete system
4. **Documentation**: Create user-facing documentation for MCP tool usage