/**
 * Types and interfaces for MCP prompts system
 */

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

export interface PromptResult {
  messages: PromptMessage[];
  description?: string;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export type PromptHandler = (...args: any[]) => Promise<string>;

export interface PromptRegistry {
  [name: string]: {
    definition: PromptDefinition;
    handler: PromptHandler;
  };
}