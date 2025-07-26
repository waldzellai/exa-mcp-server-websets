import axios from 'axios';
import { log } from '../utils/logger.js';

export interface MemoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AddMemoryOptions {
  userId?: string;
  agentId?: string;
  appId?: string;
  metadata?: Record<string, any>;
}

export class Mem0Service {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.mem0.ai') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async addMemory(messages: MemoryMessage[], options: AddMemoryOptions = {}) {
    const payload = {
      messages,
      ...options,
      version: 'v2',
      output_format: 'v1.1'
    };
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/memories/`,
        payload,
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      return response.data;
    } catch (error: any) {
      log(`Mem0 addMemory error: ${error.message}`);
      throw error;
    }
  }
}
