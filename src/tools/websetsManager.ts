import { z } from "zod";
import { toolRegistry, ToolCategory, ServiceType } from "./config.js";
import { createServices } from "../services/index.js";
import { createRequestLogger } from "../utils/logger.js";
import { withKeepAlive } from "../utils/keepAlive.js";

/**
 * Unified Websets Manager Tool
 * 
 * A single tool that handles all websets operations with natural language descriptions
 * and simplified parameter structure. This reduces cognitive load compared to having
 * 20+ separate tools.
 */

// Operation schemas with progressive disclosure
const BaseOperationSchema = z.object({
  operation: z.enum([
    // Content Collection Operations
    "create_collection",
    "list_collections", 
    "get_collection_status",
    "update_collection",
    "delete_collection",
    "cancel_collection",
    
    // Content Search Operations
    "search_collection",
    "get_search_results",
    "cancel_search",
    
    // Data Enhancement Operations
    "enhance_content",
    "get_enhancement_results",
    "delete_enhancement",
    "cancel_enhancement",
    
    // Notification Operations
    "setup_notifications",
    "list_notifications",
    "get_notification_details",
    "remove_notifications",
    
    // Activity Monitoring
    "list_activities",
    "get_activity_details",
    
    // Content Management
    "list_content_items"
  ]).describe("What you want to do"),
  
  // Target resource ID (when working with existing resources)
  resourceId: z.string().optional().describe("ID of the collection, search, or enhancement to work with")
});

// Content Collection Parameters
const CollectionParamsSchema = z.object({
  searchQuery: z.string().describe("What you want to find (required for new collections)"),
  description: z.string().optional().describe("Human-readable description of this collection"),
  
  advanced: z.object({
    resultCount: z.number().min(1).max(1000).default(10).describe("How many items to find"),
    focusArea: z.enum(["company"]).optional().describe("What type of entities to focus on"),
    criteria: z.array(z.object({
      description: z.string().describe("Specific requirement or filter")
    })).optional().describe("Additional requirements for filtering results"),
    externalReference: z.string().optional().describe("Your own reference ID for tracking"),
    tags: z.record(z.string().max(1000)).optional().describe("Custom labels for organization")
  }).optional().describe("Advanced collection settings")
}).optional();

// Search Parameters  
const SearchParamsSchema = z.object({
  query: z.string().describe("What to search for within the collection"),
  maxResults: z.number().min(1).max(100).default(10).describe("Maximum number of results to return"),
  
  advanced: z.object({
    focusArea: z.object({
      type: z.literal("company").describe("Currently supports companies only")
    }).optional().describe("What type of entities to focus search on"),
    requirements: z.array(z.object({
      description: z.string().describe("Specific requirement for search results")
    })).optional().describe("Additional search requirements"),
    tags: z.record(z.string().max(1000)).optional().describe("Custom labels for this search")
  }).optional().describe("Advanced search settings")
}).optional();

// Enhancement Parameters
const EnhancementParamsSchema = z.object({
  task: z.string().describe("What kind of additional data you want to extract or analyze"),
  
  advanced: z.object({
    outputFormat: z.enum(["text", "date", "number", "options", "email", "phone"]).default("text").describe("Expected format of the results"),
    choices: z.array(z.object({
      label: z.string().describe("Possible answer option")
    })).optional().describe("Predefined answer choices (only for 'options' format)"),
    tags: z.record(z.string().max(1000)).optional().describe("Custom labels for this enhancement")
  }).optional().describe("Advanced enhancement settings")
}).optional();

// Notification Parameters
const NotificationParamsSchema = z.object({
  webhookUrl: z.string().url().describe("URL where notifications should be sent"),
  events: z.array(z.enum([
    "collection.created", "collection.completed", "collection.failed",
    "search.created", "search.completed", "search.failed", 
    "enhancement.created", "enhancement.completed", "enhancement.failed",
    "webhook.created", "webhook.failed",
    "item.created", "item.updated", "item.failed"
  ])).describe("Which events you want to be notified about"),
  
  advanced: z.object({
    tags: z.record(z.string().max(1000)).optional().describe("Custom labels for this notification setup")
  }).optional().describe("Advanced notification settings")
}).optional();

// Update Parameters
const UpdateParamsSchema = z.object({
  description: z.string().optional().describe("New description for the collection"),
  tags: z.record(z.string().max(1000)).optional().describe("Updated custom labels")
}).optional();

// Query Parameters (for listing operations)
const QueryParamsSchema = z.object({
  limit: z.number().min(1).max(100).default(25).describe("Maximum number of items to return"),
  offset: z.number().min(0).default(0).describe("Number of items to skip"),
  status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]).optional().describe("Filter by status")
}).optional();

// Combined schema
const WebsetsManagerSchema = BaseOperationSchema.extend({
  // Operation-specific parameters
  collection: CollectionParamsSchema,
  search: SearchParamsSchema,
  enhancement: EnhancementParamsSchema,
  notification: NotificationParamsSchema,
  update: UpdateParamsSchema,
  query: QueryParamsSchema
});

// Register the unified tool
toolRegistry["websets_manager"] = {
  name: "websets_manager",
  description: "Manage content collections, searches, and data enhancements using Exa's platform. This single tool handles creating collections of web content, searching within them, enhancing data with AI, and setting up notifications. Much simpler than using separate tools for each operation.",
  schema: WebsetsManagerSchema.shape,
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  handler: async (args) => {
    const { operation, resourceId, collection, search, enhancement, notification, update, query } = args;
    
    const requestId = `websets_manager-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logger = createRequestLogger(requestId, 'websets_manager');
    
    logger.start(`${operation} operation`);
    
    try {
      // Get API key from environment (no more repetition in parameters!)
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        throw new Error("EXA_API_KEY environment variable is required");
      }
      
      const services = createServices(apiKey);
      
      // Route to appropriate operation handler
      switch (operation) {
        case "create_collection":
          return await handleCreateCollection(services, collection, logger);
        
        case "list_collections":
          return await handleListCollections(services, query, logger);
          
        case "get_collection_status":
          return await handleGetCollectionStatus(services, resourceId, logger);
          
        case "update_collection":
          return await handleUpdateCollection(services, resourceId, update, logger);
          
        case "delete_collection":
          return await handleDeleteCollection(services, resourceId, logger);
          
        case "cancel_collection":
          return await handleCancelCollection(services, resourceId, logger);
          
        case "search_collection":
          return await handleSearchCollection(services, resourceId, search, logger);
          
        case "get_search_results":
          return await handleGetSearchResults(services, resourceId, logger);
          
        case "cancel_search":
          return await handleCancelSearch(services, resourceId, logger);
          
        case "enhance_content":
          return await handleEnhanceContent(services, resourceId, enhancement, logger);
          
        case "get_enhancement_results":
          return await handleGetEnhancementResults(services, resourceId, logger);
          
        case "delete_enhancement":
          return await handleDeleteEnhancement(services, resourceId, logger);
          
        case "cancel_enhancement":
          return await handleCancelEnhancement(services, resourceId, logger);
          
        case "setup_notifications":
          return await handleSetupNotifications(services, notification, logger);
          
        case "list_notifications":
          return await handleListNotifications(services, query, logger);
          
        case "get_notification_details":
          return await handleGetNotificationDetails(services, resourceId, logger);
          
        case "remove_notifications":
          return await handleRemoveNotifications(services, resourceId, logger);
          
        case "list_activities":
          return await handleListActivities(services, query, logger);
          
        case "get_activity_details":
          return await handleGetActivityDetails(services, resourceId, logger);
          
        case "list_content_items":
          return await handleListContentItems(services, resourceId, query, logger);
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
    } catch (error) {
      logger.error(error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.log(`Operation failed: ${errorMessage}`);
      
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: false,
            operation,
            error: errorMessage,
            help: getOperationHelp(operation)
          }, null, 2)
        }],
        isError: true
      };
    }
  },
  enabled: true
};

// Operation handlers with user-friendly responses
async function handleCreateCollection(services: any, params: any, logger: any) {
  if (!params?.searchQuery) {
    throw new Error("searchQuery is required to create a collection");
  }
  
  const request = {
    search: {
      query: params.searchQuery,
      count: params.advanced?.resultCount || 10,
      ...(params.advanced?.focusArea && { entity: { type: params.advanced.focusArea } }),
      ...(params.advanced?.criteria && { criteria: params.advanced.criteria })
    },
    ...(params.advanced?.externalReference && { externalId: params.advanced.externalReference }),
    ...(params.advanced?.tags && { metadata: params.advanced.tags })
  };
  
  logger.log(`Creating collection for: "${params.searchQuery}"`);
  
  // Use keep-alive for long-running operation
  const result = await withKeepAlive(
    'Creating webset collection',
    async (keepAlive) => {
      keepAlive.sendProgress('Initializing collection creation', 10);
      const webset = await services.websetService.createWebset(request);
      keepAlive.sendProgress('Collection created, processing will continue in background', 100);
      return webset;
    },
    {
      interval: 5000,
      enableLogging: true
    }
  );
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Content collection created successfully! This will take 10-15 minutes to process.",
        collectionId: result.id,
        status: result.status,
        searchQuery: params.searchQuery,
        expectedResults: params.advanced?.resultCount || 10,
        nextSteps: [
          `Check progress: use operation "get_collection_status" with resourceId "${result.id}"`,
          `When complete: use operation "list_content_items" with resourceId "${result.id}" to see results`
        ]
      }, null, 2)
    }]
  };
}

async function handleListCollections(services: any, params: any, logger: any) {
  logger.log("Listing all collections");
  const result = await services.websetService.listWebsets({
    limit: params?.limit || 25,
    offset: params?.offset || 0
  });
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: `Found ${result.data.length} content collections`,
        collections: result.data.map((ws: any) => ({
          id: ws.id,
          status: ws.status,
          description: ws.description || "No description",
          itemCount: ws.itemCount || 0,
          createdAt: ws.createdAt,
          searchQuery: ws.search?.query || "Unknown query"
        })),
        pagination: {
          limit: params?.limit || 25,
          offset: params?.offset || 0,
          hasMore: result.data.length === (params?.limit || 25)
        }
      }, null, 2)
    }]
  };
}

async function handleGetCollectionStatus(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to check collection status");
  }
  
  logger.log(`Getting status for collection: ${resourceId}`);
  const result = await services.websetService.getWebsetStatus(resourceId);
  
  const statusMessages = {
    pending: "Collection is queued for processing",
    processing: "Collection is being built (this takes 10-15 minutes)",
    completed: "Collection is ready! You can now search and enhance the content.",
    failed: "Collection creation failed. Please try again or contact support.",
    cancelled: "Collection creation was cancelled"
  };
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        collectionId: resourceId,
        status: result.status,
        message: statusMessages[result.status as keyof typeof statusMessages] || `Status: ${result.status}`,
        details: {
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          itemCount: result.itemCount || 0,
          searchQuery: result.search?.query,
          ...(result.error && { error: result.error })
        },
        ...(result.status === "completed" && {
          nextSteps: [
            `Search within collection: use operation "search_collection" with resourceId "${resourceId}"`,
            `View content: use operation "list_content_items" with resourceId "${resourceId}"`,
            `Enhance data: use operation "enhance_content" with resourceId "${resourceId}"`
          ]
        })
      }, null, 2)
    }]
  };
}

async function handleSearchCollection(services: any, resourceId: string | undefined, params: any, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to search within a collection");
  }
  if (!params?.query) {
    throw new Error("query is required to search within a collection");
  }
  
  const request = {
    websetId: resourceId,
    query: params.query,
    count: params.maxResults || 10,
    ...(params.advanced?.focusArea && { entity: params.advanced.focusArea }),
    ...(params.advanced?.requirements && { criteria: params.advanced.requirements }),
    ...(params.advanced?.tags && { metadata: params.advanced.tags })
  };
  
  logger.log(`Searching collection ${resourceId} for: "${params.query}"`);
  const result = await services.searchService.createSearch(request);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Search started successfully!",
        searchId: result.id,
        collectionId: resourceId,
        query: params.query,
        status: result.status,
        nextSteps: [
          `Check results: use operation "get_search_results" with resourceId "${result.id}"`
        ]
      }, null, 2)
    }]
  };
}

// Helper function to provide operation-specific help
function getOperationHelp(operation: string): string[] {
  const helpMap: Record<string, string[]> = {
    "create_collection": [
      "Provide a searchQuery describing what content you want to collect",
      "Optionally specify resultCount in advanced settings",
      "Collection creation takes 10-15 minutes to complete"
    ],
    "search_collection": [
      "Provide resourceId of the collection to search within",
      "Provide query describing what to find in the collection"
    ],
    "enhance_content": [
      "Provide resourceId of the collection to enhance",
      "Provide task describing what additional data you want to extract"
    ]
  };
  
  return helpMap[operation] || [
    "Check the operation name and required parameters",
    "Ensure resourceId is provided when working with existing resources"
  ];
}

async function handleUpdateCollection(services: any, resourceId: string | undefined, params: any, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to update a collection");
  }
  
  const updateData: any = {};
  if (params?.description) updateData.description = params.description;
  if (params?.tags) updateData.metadata = params.tags;
  
  if (Object.keys(updateData).length === 0) {
    throw new Error("At least one field (description or tags) must be provided for update");
  }
  
  logger.log(`Updating collection: ${resourceId}`);
  await services.websetService.updateWebset(resourceId, updateData);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Collection updated successfully",
        collectionId: resourceId,
        updatedFields: Object.keys(updateData)
      }, null, 2)
    }]
  };
}

async function handleDeleteCollection(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to delete a collection");
  }
  
  logger.log(`Deleting collection: ${resourceId}`);
  await services.websetService.deleteWebset(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Collection deleted successfully",
        deletedCollectionId: resourceId
      }, null, 2)
    }]
  };
}

async function handleCancelCollection(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to cancel a collection");
  }
  
  logger.log(`Cancelling collection: ${resourceId}`);
  const result = await services.websetService.cancelWebset(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Collection creation cancelled",
        collectionId: resourceId,
        status: result.status
      }, null, 2)
    }]
  };
}

async function handleGetSearchResults(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to get search results");
  }
  
  logger.log(`Getting search results: ${resourceId}`);
  const result = await services.searchService.getSearch(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        searchId: resourceId,
        status: result.status,
        query: result.query,
        collectionId: result.websetId,
        resultCount: result.count,
        createdAt: result.createdAt,
        ...(result.status === "completed" && result.results && {
          results: result.results
        })
      }, null, 2)
    }]
  };
}

async function handleCancelSearch(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to cancel a search");
  }
  
  logger.log(`Cancelling search: ${resourceId}`);
  const result = await services.searchService.cancelSearch(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Search cancelled",
        searchId: resourceId,
        status: result.status
      }, null, 2)
    }]
  };
}

async function handleEnhanceContent(services: any, resourceId: string | undefined, params: any, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to enhance content");
  }
  if (!params?.task) {
    throw new Error("task is required to specify what enhancement you want");
  }
  
  const request = {
    websetId: resourceId,
    description: params.task,
    ...(params.advanced?.outputFormat && { format: params.advanced.outputFormat }),
    ...(params.advanced?.choices && { options: params.advanced.choices }),
    ...(params.advanced?.tags && { metadata: params.advanced.tags })
  };
  
  logger.log(`Creating enhancement for collection ${resourceId}: "${params.task}"`);
  const result = await services.enrichmentService.createEnrichment(request);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Content enhancement started successfully!",
        enhancementId: result.id,
        collectionId: resourceId,
        task: params.task,
        status: result.status,
        nextSteps: [
          `Check results: use operation "get_enhancement_results" with resourceId "${result.id}"`
        ]
      }, null, 2)
    }]
  };
}

async function handleGetEnhancementResults(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to get enhancement results");
  }
  
  logger.log(`Getting enhancement results: ${resourceId}`);
  const result = await services.enrichmentService.getEnrichment(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        enhancementId: resourceId,
        status: result.status,
        task: result.description,
        collectionId: result.websetId,
        createdAt: result.createdAt,
        ...(result.status === "completed" && result.results && {
          results: result.results
        })
      }, null, 2)
    }]
  };
}

async function handleDeleteEnhancement(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to delete an enhancement");
  }
  
  logger.log(`Deleting enhancement: ${resourceId}`);
  await services.enrichmentService.deleteEnrichment(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Enhancement deleted successfully",
        deletedEnhancementId: resourceId
      }, null, 2)
    }]
  };
}

async function handleCancelEnhancement(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to cancel an enhancement");
  }
  
  logger.log(`Cancelling enhancement: ${resourceId}`);
  const result = await services.enrichmentService.cancelEnrichment(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Enhancement cancelled",
        enhancementId: resourceId,
        status: result.status
      }, null, 2)
    }]
  };
}

async function handleSetupNotifications(services: any, params: any, logger: any) {
  if (!params?.webhookUrl) {
    throw new Error("webhookUrl is required to setup notifications");
  }
  if (!params?.events || params.events.length === 0) {
    throw new Error("At least one event must be specified for notifications");
  }
  
  const request = {
    url: params.webhookUrl,
    events: params.events,
    ...(params.advanced?.tags && { metadata: params.advanced.tags })
  };
  
  logger.log(`Setting up notifications for ${params.events.length} event types`);
  const result = await services.webhookService.createWebhook(request);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Notifications setup successfully!",
        notificationId: result.id,
        webhookUrl: params.webhookUrl,
        events: params.events,
        createdAt: result.createdAt
      }, null, 2)
    }]
  };
}

async function handleListNotifications(services: any, params: any, logger: any) {
  logger.log("Listing all notifications");
  const result = await services.webhookService.listWebhooks({
    limit: params?.limit || 25,
    offset: params?.offset || 0
  });
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: `Found ${result.data.length} notification setups`,
        notifications: result.data.map((webhook: any) => ({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          createdAt: webhook.createdAt
        }))
      }, null, 2)
    }]
  };
}

async function handleGetNotificationDetails(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to get notification details");
  }
  
  logger.log(`Getting notification details: ${resourceId}`);
  const result = await services.webhookService.getWebhook(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        notificationId: resourceId,
        url: result.url,
        events: result.events,
        createdAt: result.createdAt,
        ...(result.metadata && { tags: result.metadata })
      }, null, 2)
    }]
  };
}

async function handleRemoveNotifications(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to remove notifications");
  }
  
  logger.log(`Removing notifications: ${resourceId}`);
  await services.webhookService.deleteWebhook(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: "Notifications removed successfully",
        removedNotificationId: resourceId
      }, null, 2)
    }]
  };
}

async function handleListActivities(services: any, params: any, logger: any) {
  logger.log("Listing recent activities");
  const result = await services.eventService.listEvents({
    limit: params?.limit || 25,
    offset: params?.offset || 0
  });
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        message: `Found ${result.data.length} recent activities`,
        activities: result.data.map((event: any) => ({
          id: event.id,
          type: event.type,
          resourceId: event.resourceId,
          status: event.status,
          createdAt: event.createdAt,
          description: event.description || "No description"
        }))
      }, null, 2)
    }]
  };
}

async function handleGetActivityDetails(services: any, resourceId: string | undefined, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to get activity details");
  }
  
  logger.log(`Getting activity details: ${resourceId}`);
  const result = await services.eventService.getEvent(resourceId);
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        activityId: resourceId,
        type: result.type,
        status: result.status,
        resourceId: result.resourceId,
        createdAt: result.createdAt,
        details: result.data || {},
        description: result.description || "No description"
      }, null, 2)
    }]
  };
}

async function handleListContentItems(services: any, resourceId: string | undefined, params: any, logger: any) {
  if (!resourceId) {
    throw new Error("resourceId is required to list content items");
  }
  
  logger.log(`Listing content items for collection: ${resourceId}`);
  const result = await services.itemService.listItems(resourceId, {
    limit: params?.limit || 25,
    offset: params?.offset || 0
  });
  
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        success: true,
        collectionId: resourceId,
        message: `Found ${result.data.length} content items`,
        items: result.data.map((item: any) => ({
          id: item.id,
          title: item.title || "No title",
          url: item.url,
          snippet: item.text ? item.text.substring(0, 200) + "..." : "No content preview",
          createdAt: item.createdAt
        })),
        pagination: {
          limit: params?.limit || 25,
          offset: params?.offset || 0,
          hasMore: result.data.length === (params?.limit || 25)
        }
      }, null, 2)
    }]
  };
}

export default toolRegistry["websets_manager"];