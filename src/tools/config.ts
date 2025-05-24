import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolRegistry {
  name: string;        // Unique name for the tool
  description: string; // Human-readable description
  schema: z.ZodRawShape;      // Zod schema for tool parameters
  handler: (
    args: { [key: string]: any }, 
    extra: any
  ) => Promise<{
    content: {
      type: "text";
      text: string;
    }[];
    isError?: boolean;
  }>;   // Function to execute when tool is called
  enabled: boolean;    // Whether the tool is enabled by default
  category: ToolCategory; // Tool category for organization
  service: ServiceType;   // Which service this tool belongs to
}

export enum ToolCategory {
  SEARCH = 'search',
  WEBSETS = 'websets',
  ITEMS = 'items',
  ENRICHMENTS = 'enrichments',
  WEBHOOKS = 'webhooks',
  EVENTS = 'events',
  INTEGRATION = 'integration',
  MONITORING = 'monitoring'
}

export enum ServiceType {
  EXA_SEARCH = 'exa_search',
  WEBSETS = 'websets',
  INTEGRATION = 'integration'
}

// Configuration for Exa Search API
export const EXA_API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search'
  },
  DEFAULT_NUM_RESULTS: 5,
  DEFAULT_MAX_CHARACTERS: 3000
} as const;

// Configuration for Websets API
export const WEBSETS_API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    WEBSETS: '/websets',
    SEARCHES: '/searches',
    ITEMS: '/items',
    ENRICHMENTS: '/enrichments',
    WEBHOOKS: '/webhooks',
    EVENTS: '/events'
  },
  DEFAULT_LIMIT: 25,
  DEFAULT_TIMEOUT: 30000
} as const;

// Tool registry that will be populated by tool modules
export const toolRegistry: Record<string, ToolRegistry> = {};

/**
 * Tool factory for creating and registering tools
 */
export class ToolFactory {
  /**
   * Register a tool in the registry
   */
  static registerTool(tool: ToolRegistry): void {
    if (toolRegistry[tool.name]) {
      console.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }
    toolRegistry[tool.name] = tool;
  }

  /**
   * Get all tools by category
   */
  static getToolsByCategory(category: ToolCategory): ToolRegistry[] {
    return Object.values(toolRegistry).filter(tool => tool.category === category);
  }

  /**
   * Get all tools by service
   */
  static getToolsByService(service: ServiceType): ToolRegistry[] {
    return Object.values(toolRegistry).filter(tool => tool.service === service);
  }

  /**
   * Get enabled tools only
   */
  static getEnabledTools(): ToolRegistry[] {
    return Object.values(toolRegistry).filter(tool => tool.enabled);
  }

  /**
   * Get tool by name
   */
  static getTool(name: string): ToolRegistry | undefined {
    return toolRegistry[name];
  }

  /**
   * List all registered tool names
   */
  static listToolNames(): string[] {
    return Object.keys(toolRegistry);
  }

  /**
   * Get tool statistics
   */
  static getToolStats(): {
    total: number;
    enabled: number;
    byCategory: Record<ToolCategory, number>;
    byService: Record<ServiceType, number>;
  } {
    const tools = Object.values(toolRegistry);
    const stats = {
      total: tools.length,
      enabled: tools.filter(t => t.enabled).length,
      byCategory: {} as Record<ToolCategory, number>,
      byService: {} as Record<ServiceType, number>
    };

    // Initialize counters
    Object.values(ToolCategory).forEach(cat => stats.byCategory[cat] = 0);
    Object.values(ServiceType).forEach(svc => stats.byService[svc] = 0);

    // Count tools
    tools.forEach(tool => {
      stats.byCategory[tool.category]++;
      stats.byService[tool.service]++;
    });

    return stats;
  }
}

/**
 * Tool naming conventions
 */
export const TOOL_NAMING = {
  EXA_PREFIX: 'exa_',
  WEBSETS_PREFIX: 'websets_',
  INTEGRATION_PREFIX: 'integration_',
  
  // Generate tool name with proper prefix
  generateName(service: ServiceType, operation: string): string {
    switch (service) {
      case ServiceType.EXA_SEARCH:
        return `${this.EXA_PREFIX}${operation}`;
      case ServiceType.WEBSETS:
        return `${this.WEBSETS_PREFIX}${operation}`;
      case ServiceType.INTEGRATION:
        return `${this.INTEGRATION_PREFIX}${operation}`;
      default:
        return operation;
    }
  }
} as const;