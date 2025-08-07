import { z } from 'zod';
import { toolRegistry, ToolCategory, ServiceType } from './config.js';
import { createRequestLogger } from '../utils/logger.js';
import KnowledgeGraphService from '../services/KnowledgeGraphService.js';

const knowledgeGraph = new KnowledgeGraphService();

const KnowledgeGraphSchema = z.object({
  operation: z.enum([
    'create_entities',
    'create_relations',
    'add_observations',
    'delete_entities',
    'delete_observations',
    'delete_relations',
    'read_graph',
    'search_nodes',
    'open_nodes'
  ]),
  entities: z.array(z.object({
    name: z.string(),
    entityType: z.string(),
    observations: z.array(z.string()).default([])
  })).optional(),
  relations: z.array(z.object({
    from: z.string(),
    to: z.string(),
    relationType: z.string()
  })).optional(),
  observations: z.array(z.object({
    entityName: z.string(),
    contents: z.array(z.string())
  })).optional(),
  deletions: z.array(z.object({
    entityName: z.string(),
    observations: z.array(z.string())
  })).optional(),
  names: z.array(z.string()).optional(),
  query: z.string().optional()
});

toolRegistry['knowledge_graph'] = {
  name: 'knowledge_graph',
  description: 'Maintain an onboard knowledge graph of webset results.',
  schema: KnowledgeGraphSchema.shape,
  category: ToolCategory.WEBSETS,
  service: ServiceType.WEBSETS,
  handler: async (args) => {
    const { operation, entities, relations, observations, deletions, names, query } = args;
    const requestId = `knowledge_graph-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const logger = createRequestLogger(requestId, 'knowledge_graph');
    logger.start(operation);
    try {
      switch (operation) {
        case 'create_entities':
          return { content: [{ type: 'text', text: JSON.stringify(await knowledgeGraph.createEntities(entities || []), null, 2) }] };
        case 'create_relations':
          return { content: [{ type: 'text', text: JSON.stringify(await knowledgeGraph.createRelations(relations || []), null, 2) }] };
        case 'add_observations':
          return { content: [{ type: 'text', text: JSON.stringify(await knowledgeGraph.addObservations(observations || []), null, 2) }] };
        case 'delete_entities':
          await knowledgeGraph.deleteEntities(names || []);
          return { content: [{ type: 'text', text: 'Entities deleted successfully' }] };
        case 'delete_observations':
          await knowledgeGraph.deleteObservations(deletions || []);
          return { content: [{ type: 'text', text: 'Observations deleted successfully' }] };
        case 'delete_relations':
          await knowledgeGraph.deleteRelations(relations || []);
          return { content: [{ type: 'text', text: 'Relations deleted successfully' }] };
        case 'read_graph':
          return { content: [{ type: 'text', text: JSON.stringify(await knowledgeGraph.readGraph(), null, 2) }] };
        case 'search_nodes':
          return { content: [{ type: 'text', text: JSON.stringify(await knowledgeGraph.searchNodes(query || ''), null, 2) }] };
        case 'open_nodes':
          return { content: [{ type: 'text', text: JSON.stringify(await knowledgeGraph.openNodes(names || []), null, 2) }] };
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error: any) {
      logger.error(error);
      return { content: [{ type: 'text', text: `Knowledge graph error: ${error.message}` }], isError: true };
    }
  },
  enabled: true
};

export default toolRegistry['knowledge_graph'];
