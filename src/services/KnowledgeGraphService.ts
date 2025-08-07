import { promises as fs } from 'fs';
import path from 'path';

export interface GraphEntity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface GraphRelation {
  from: string;
  to: string;
  relationType: string;
}

export interface KnowledgeGraph {
  entities: GraphEntity[];
  relations: GraphRelation[];
}

/**
 * Simple persistent knowledge graph store.
 *
 * Stores entities and relations in a newline-separated JSON file so the
 * graph can survive server restarts without requiring an external database.
 */
export class KnowledgeGraphService {
  private filePath: string;

  constructor(filePath?: string) {
    const defaultPath = path.join(process.cwd(), 'knowledge-graph.json');
    const resolved = filePath || process.env.KG_FILE_PATH || defaultPath;
    this.filePath = path.isAbsolute(resolved)
      ? resolved
      : path.join(process.cwd(), resolved);
  }

  private async loadGraph(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const lines = data.split('\n').filter(line => line.trim() !== '');
      return lines.reduce<KnowledgeGraph>((graph, line) => {
        const item = JSON.parse(line);
        if (item.type === 'entity') graph.entities.push(item as GraphEntity);
        if (item.type === 'relation') graph.relations.push(item as GraphRelation);
        return graph;
      }, { entities: [], relations: [] });
    } catch (err: any) {
      if (err && err.code === 'ENOENT') {
        return { entities: [], relations: [] };
      }
      throw err;
    }
  }

  private async saveGraph(graph: KnowledgeGraph): Promise<void> {
    const lines = [
      ...graph.entities.map(e => JSON.stringify({ type: 'entity', ...e })),
      ...graph.relations.map(r => JSON.stringify({ type: 'relation', ...r })),
    ];
    await fs.writeFile(this.filePath, lines.join('\n'));
  }

  async createEntities(entities: GraphEntity[]): Promise<GraphEntity[]> {
    const graph = await this.loadGraph();
    const newEntities = entities.filter(e => !graph.entities.some(ex => ex.name === e.name));
    graph.entities.push(...newEntities);
    await this.saveGraph(graph);
    return newEntities;
  }

  async createRelations(relations: GraphRelation[]): Promise<GraphRelation[]> {
    const graph = await this.loadGraph();
    const newRelations = relations.filter(r => !graph.relations.some(ex =>
      ex.from === r.from && ex.to === r.to && ex.relationType === r.relationType
    ));
    graph.relations.push(...newRelations);
    await this.saveGraph(graph);
    return newRelations;
  }

  async addObservations(observations: { entityName: string; contents: string[] }[])
    : Promise<{ entityName: string; addedObservations: string[] }[]> {
    const graph = await this.loadGraph();
    const results = observations.map(o => {
      const entity = graph.entities.find(e => e.name === o.entityName);
      if (!entity) {
        throw new Error(`Entity with name ${o.entityName} not found`);
      }
      const newObs = o.contents.filter(c => !entity.observations.includes(c));
      entity.observations.push(...newObs);
      return { entityName: o.entityName, addedObservations: newObs };
    });
    await this.saveGraph(graph);
    return results;
  }

  async deleteEntities(names: string[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.entities = graph.entities.filter(e => !names.includes(e.name));
    graph.relations = graph.relations.filter(r => !names.includes(r.from) && !names.includes(r.to));
    await this.saveGraph(graph);
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    const graph = await this.loadGraph();
    deletions.forEach(d => {
      const entity = graph.entities.find(e => e.name === d.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(o => !d.observations.includes(o));
      }
    });
    await this.saveGraph(graph);
  }

  async deleteRelations(relations: GraphRelation[]): Promise<void> {
    const graph = await this.loadGraph();
    graph.relations = graph.relations.filter(r => !relations.some(del =>
      r.from === del.from && r.to === del.to && r.relationType === del.relationType
    ));
    await this.saveGraph(graph);
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return this.loadGraph();
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    const filteredEntities = graph.entities.filter(e =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.entityType.toLowerCase().includes(query.toLowerCase()) ||
      e.observations.some(o => o.toLowerCase().includes(query.toLowerCase()))
    );
    const names = new Set(filteredEntities.map(e => e.name));
    const filteredRelations = graph.relations.filter(r =>
      names.has(r.from) && names.has(r.to)
    );
    return { entities: filteredEntities, relations: filteredRelations };
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const graph = await this.loadGraph();
    const filteredEntities = graph.entities.filter(e => names.includes(e.name));
    const nameSet = new Set(filteredEntities.map(e => e.name));
    const filteredRelations = graph.relations.filter(r =>
      nameSet.has(r.from) && nameSet.has(r.to)
    );
    return { entities: filteredEntities, relations: filteredRelations };
  }
}

export default KnowledgeGraphService;
