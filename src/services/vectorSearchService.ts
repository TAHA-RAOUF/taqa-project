import OpenAI from 'openai';
import { supabase } from '../lib/supabase';

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  baseURL: import.meta.env.VITE_LLM_API_URL,
  dangerouslyAllowBrowser: true
});

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: any;
}

export class VectorSearchService {
  /**
   * Generate embedding for a text query
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Search for similar anomalies using vector similarity
   */
  async searchSimilarAnomalies(
    query: string, 
    matchThreshold: number = 0.7, 
    matchCount: number = 5
  ): Promise<SearchResult[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      
      const { data, error } = await supabase.rpc('search_similar_anomalies', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.anomaly_id,
        content: item.content,
        similarity: item.similarity,
        metadata: item.anomaly_data
      }));
    } catch (error) {
      console.error('Error searching similar anomalies:', error);
      return [];
    }
  }

  /**
   * Search for similar maintenance windows
   */
  async searchSimilarMaintenance(
    query: string, 
    matchThreshold: number = 0.7, 
    matchCount: number = 5
  ): Promise<SearchResult[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      
      const { data, error } = await supabase.rpc('search_similar_maintenance', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.maintenance_window_id,
        content: item.content,
        similarity: item.similarity,
        metadata: item.maintenance_data
      }));
    } catch (error) {
      console.error('Error searching similar maintenance:', error);
      return [];
    }
  }

  /**
   * Search knowledge base
   */
  async searchKnowledgeBase(
    query: string, 
    matchThreshold: number = 0.7, 
    matchCount: number = 5
  ): Promise<SearchResult[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      
      const { data, error } = await supabase.rpc('search_knowledge_base', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        content: item.content,
        similarity: item.similarity,
        metadata: { title: item.title, ...item.metadata }
      }));
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  /**
   * Get comprehensive context for a query using vector search
   */
  async getContextForQuery(query: string): Promise<{
    anomalies: SearchResult[];
    maintenance: SearchResult[];
    knowledge: SearchResult[];
  }> {
    try {
      const [anomalies, maintenance, knowledge] = await Promise.all([
        this.searchSimilarAnomalies(query, 0.6, 3),
        this.searchSimilarMaintenance(query, 0.6, 2),
        this.searchKnowledgeBase(query, 0.6, 3)
      ]);

      return { anomalies, maintenance, knowledge };
    } catch (error) {
      console.error('Error getting context for query:', error);
      return { anomalies: [], maintenance: [], knowledge: [] };
    }
  }

  /**
   * Store anomaly embedding
   */
  async storeAnomalyEmbedding(anomalyId: string, content: string): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);
      
      const { error } = await supabase
        .from('anomaly_embeddings')
        .upsert({
          anomaly_id: anomalyId,
          content,
          embedding
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing anomaly embedding:', error);
    }
  }

  /**
   * Store maintenance window embedding
   */
  async storeMaintenanceEmbedding(maintenanceId: string, content: string): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);
      
      const { error } = await supabase
        .from('maintenance_embeddings')
        .upsert({
          maintenance_window_id: maintenanceId,
          content,
          embedding
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing maintenance embedding:', error);
    }
  }

  /**
   * Store knowledge base embedding
   */
  async storeKnowledgeEmbedding(
    title: string, 
    content: string, 
    metadata?: any
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(`${title}\n${content}`);
      
      const { error } = await supabase
        .from('knowledge_embeddings')
        .insert({
          title,
          content,
          embedding,
          metadata: metadata || {}
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing knowledge embedding:', error);
    }
  }
}

export const vectorSearchService = new VectorSearchService();
