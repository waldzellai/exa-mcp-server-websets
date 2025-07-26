import { z } from 'zod';
import { toolRegistry, ToolCategory, ServiceType } from './config.js';
import { createRequestLogger } from '../utils/logger.js';
import { Mem0Service, MemoryMessage } from '../services/Mem0Service.js';

const mem0ApiKey = process.env.MEM0_API_KEY || '';
const mem0Service = new Mem0Service(mem0ApiKey);

// Tool to store messages as a memory in Mem0
toolRegistry['integration_mem0_store'] = {
  name: 'integration_mem0_store',
  description: 'Store conversation messages as a memory in Mem0 to build a knowledge graph of webset rows.',
  schema: {
    messages: z.array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })
    ).nonempty().describe('Messages to store'),
    metadata: z.record(z.any()).optional().describe('Additional metadata such as websetId'),
    userId: z.string().optional().describe('User ID associated with this memory')
  },
  category: ToolCategory.INTEGRATION,
  service: ServiceType.INTEGRATION,
  handler: async ({ messages, metadata, userId }) => {
    const requestId = `mem0_store-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const logger = createRequestLogger(requestId, 'integration_mem0_store');
    logger.start('add memory');
    try {
      const data = await mem0Service.addMemory(messages as MemoryMessage[], { metadata, userId });
      logger.complete();
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    } catch (error: any) {
      logger.error(error);
      return { content: [{ type: 'text' as const, text: `Mem0 error: ${error.message}` }], isError: true };
    }
  },
  enabled: true
};
