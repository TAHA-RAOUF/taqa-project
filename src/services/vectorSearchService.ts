import { CloudClient, Collection } from 'chromadb';
import { supabase } from '../lib/supabase';
import OpenAI from 'openai';

// Initialize ChromaDB client
const chromaClient = new CloudClient({
  apiKey: import.meta.env.VITE_CHROMA_API_KEY,
  tenant: import.meta.env.VITE_CHROMA_TENANT,
  database: import.meta.env.VITE_CHROMA_DATABASE
});

// Initialize OpenAI client for embeddings
// Using the real OpenAI API for embeddings (not OpenRouter)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_LLM_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Collections will be initialized in the service
let anomalyCollection: Collection | null = null;
let maintenanceCollection: Collection | null = null;
let knowledgeCollection: Collection | null = null;

// Function to initialize collections
const initCollections = async () => {
  try {
    anomalyCollection = await chromaClient.getOrCreateCollection({
      name: "anomalies",
      metadata: { description: "Anomaly data and embeddings" }
    });
    
    maintenanceCollection = await chromaClient.getOrCreateCollection({
      name: "maintenance",
      metadata: { description: "Maintenance window data and embeddings" }
    });
    
    knowledgeCollection = await chromaClient.getOrCreateCollection({
      name: "knowledge",
      metadata: { description: "Knowledge base data and embeddings" }
    });
    
    console.log("ChromaDB collections initialized successfully");
  } catch (error) {
    console.error("Failed to initialize ChromaDB collections:", error);
  }
};

// Initialize collections
initCollections();

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: any;
}

export class VectorSearchService {
  /**
   * Generate embedding for a text query using OpenAI's embeddings API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use OpenAI's dedicated embedding model
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',  // Using the latest embedding model
        input: text,
        encoding_format: 'float', // Get floating point embeddings
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
      
      // First try ChromaDB
      if (anomalyCollection) {
        try {
          const results = await anomalyCollection.query({
            queryEmbeddings: [embedding],
            nResults: matchCount
          });
          
          if (results.ids[0]?.length > 0) {
            const validResults: SearchResult[] = [];
            
            for (let i = 0; i < results.ids[0].length; i++) {
              const id = results.ids[0][i];
              const similarity = 1 - (results.distances?.[0]?.[i] || 0);
              
              // Only include results above threshold
              if (similarity >= matchThreshold) {
                validResults.push({
                  id,
                  content: results.documents?.[0]?.[i] || '',
                  similarity,
                  metadata: results.metadatas?.[0]?.[i] || {}
                });
              }
            }
            
            if (validResults.length > 0) {
              return validResults;
            }
          }
        } catch (chromaError) {
          console.error('ChromaDB error, falling back to Supabase:', chromaError);
        }
      }
      
      // Fall back to Supabase
      const { data, error } = await supabase.rpc('search_similar_anomalies', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.anomaly_id,
        content: item.content || '',  // Ensure content is never undefined
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
      
      // First try ChromaDB
      if (maintenanceCollection) {
        try {
          const results = await maintenanceCollection.query({
            queryEmbeddings: [embedding],
            nResults: matchCount
          });
          
          if (results.ids[0]?.length > 0) {
            const validResults: SearchResult[] = [];
            
            for (let i = 0; i < results.ids[0].length; i++) {
              const id = results.ids[0][i];
              const similarity = 1 - (results.distances?.[0]?.[i] || 0);
              
              // Only include results above threshold
              if (similarity >= matchThreshold) {
                validResults.push({
                  id,
                  content: results.documents?.[0]?.[i] || '',
                  similarity,
                  metadata: results.metadatas?.[0]?.[i] || {}
                });
              }
            }
            
            if (validResults.length > 0) {
              return validResults;
            }
          }
        } catch (chromaError) {
          console.error('ChromaDB error, falling back to Supabase:', chromaError);
        }
      }
      
      // Fall back to Supabase
      const { data, error } = await supabase.rpc('search_similar_maintenance', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.maintenance_window_id,
        content: item.content || '',  // Ensure content is never undefined
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
      
      // First try ChromaDB
      if (knowledgeCollection) {
        try {
          const results = await knowledgeCollection.query({
            queryEmbeddings: [embedding],
            nResults: matchCount
          });
          
          if (results.ids[0]?.length > 0) {
            const validResults: SearchResult[] = [];
            
            for (let i = 0; i < results.ids[0].length; i++) {
              const id = results.ids[0][i];
              const similarity = 1 - (results.distances?.[0]?.[i] || 0);
              
              // Only include results above threshold
              if (similarity >= matchThreshold) {
                const metadata = results.metadatas?.[0]?.[i] || {};
                const title = metadata.title || 'Document sans titre';
                
                validResults.push({
                  id,
                  content: results.documents?.[0]?.[i] || '',
                  similarity,
                  metadata: { title, ...metadata }
                });
              }
            }
            
            if (validResults.length > 0) {
              return validResults;
            }
          }
        } catch (chromaError) {
          console.error('ChromaDB error, falling back to Supabase:', chromaError);
        }
      }
      
      // Fall back to Supabase
      const { data, error } = await supabase.rpc('search_knowledge_base', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        content: item.content || '',  // Ensure content is never undefined
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
      
      // Store in ChromaDB if available
      if (anomalyCollection) {
        try {
          await anomalyCollection.add({
            ids: [anomalyId],
            embeddings: [embedding],
            metadatas: [{ type: 'anomaly' }],
            documents: [content]
          });
        } catch (chromaError) {
          console.error('ChromaDB error when storing anomaly embedding:', chromaError);
        }
      }
      
      // Also keep in Supabase for backwards compatibility
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
      
      // Store in ChromaDB if available
      if (maintenanceCollection) {
        try {
          await maintenanceCollection.add({
            ids: [maintenanceId],
            embeddings: [embedding],
            metadatas: [{ type: 'maintenance' }],
            documents: [content]
          });
        } catch (chromaError) {
          console.error('ChromaDB error when storing maintenance embedding:', chromaError);
        }
      }
      
      // Also keep in Supabase for backwards compatibility
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
      const fullContent = `${title}\n${content}`;
      const embedding = await this.generateEmbedding(fullContent);
      
      // Store in ChromaDB if available
      if (knowledgeCollection) {
        try {
          await knowledgeCollection.add({
            ids: [crypto.randomUUID()],
            embeddings: [embedding],
            metadatas: [{ 
              type: 'knowledge', 
              title, 
              ...metadata || {} 
            }],
            documents: [fullContent]
          });
        } catch (chromaError) {
          console.error('ChromaDB error when storing knowledge embedding:', chromaError);
        }
      }
      
      // Also keep in Supabase for backwards compatibility
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

  /**
   * Migrate existing embeddings from Supabase to ChromaDB
   */
  async migrateEmbeddingsToChromaDB(): Promise<void> {
    try {
      console.log("Starting migration of embeddings to ChromaDB...");
      
      // Ensure collections are initialized
      if (!anomalyCollection || !maintenanceCollection || !knowledgeCollection) {
        console.log("Waiting for ChromaDB collections to initialize...");
        await initCollections();
        // Wait a bit to ensure collections are initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 1. Migrate anomaly embeddings
      console.log("Migrating anomaly embeddings...");
      const { data: anomalyEmbeddings, error: anomalyError } = await supabase
        .from('anomaly_embeddings')
        .select('*');
        
      if (anomalyError) {
        console.error("Error fetching anomaly embeddings:", anomalyError);
      } else if (anomalyEmbeddings && anomalyEmbeddings.length > 0 && anomalyCollection) {
        const batchSize = 100;
        for (let i = 0; i < anomalyEmbeddings.length; i += batchSize) {
          const batch = anomalyEmbeddings.slice(i, i + batchSize);
          try {
            await anomalyCollection.add({
              ids: batch.map(item => item.anomaly_id),
              embeddings: batch.map(item => item.embedding),
              metadatas: batch.map(() => ({ type: 'anomaly' })),
              documents: batch.map(item => item.content || '')
            });
            console.log(`Migrated anomaly embeddings batch ${i / batchSize + 1}`);
          } catch (error) {
            console.error(`Error migrating anomaly embeddings batch ${i / batchSize + 1}:`, error);
          }
        }
      }
      
      // 2. Migrate maintenance embeddings
      console.log("Migrating maintenance embeddings...");
      const { data: maintenanceEmbeddings, error: maintenanceError } = await supabase
        .from('maintenance_embeddings')
        .select('*');
        
      if (maintenanceError) {
        console.error("Error fetching maintenance embeddings:", maintenanceError);
      } else if (maintenanceEmbeddings && maintenanceEmbeddings.length > 0 && maintenanceCollection) {
        const batchSize = 100;
        for (let i = 0; i < maintenanceEmbeddings.length; i += batchSize) {
          const batch = maintenanceEmbeddings.slice(i, i + batchSize);
          try {
            await maintenanceCollection.add({
              ids: batch.map(item => item.maintenance_window_id),
              embeddings: batch.map(item => item.embedding),
              metadatas: batch.map(() => ({ type: 'maintenance' })),
              documents: batch.map(item => item.content || '')
            });
            console.log(`Migrated maintenance embeddings batch ${i / batchSize + 1}`);
          } catch (error) {
            console.error(`Error migrating maintenance embeddings batch ${i / batchSize + 1}:`, error);
          }
        }
      }
      
      // 3. Migrate knowledge embeddings
      console.log("Migrating knowledge embeddings...");
      const { data: knowledgeEmbeddings, error: knowledgeError } = await supabase
        .from('knowledge_embeddings')
        .select('*');
        
      if (knowledgeError) {
        console.error("Error fetching knowledge embeddings:", knowledgeError);
      } else if (knowledgeEmbeddings && knowledgeEmbeddings.length > 0 && knowledgeCollection) {
        const batchSize = 100;
        for (let i = 0; i < knowledgeEmbeddings.length; i += batchSize) {
          const batch = knowledgeEmbeddings.slice(i, i + batchSize);
          try {
            await knowledgeCollection.add({
              ids: batch.map(item => item.id),
              embeddings: batch.map(item => item.embedding),
              metadatas: batch.map(item => ({ 
                type: 'knowledge',
                title: item.title,
                ...item.metadata || {}
              })),
              documents: batch.map(item => `${item.title}\n${item.content || ''}`)
            });
            console.log(`Migrated knowledge embeddings batch ${i / batchSize + 1}`);
          } catch (error) {
            console.error(`Error migrating knowledge embeddings batch ${i / batchSize + 1}:`, error);
          }
        }
      }
      
      console.log("Migration of embeddings to ChromaDB completed");
    } catch (error) {
      console.error("Error during migration to ChromaDB:", error);
    }
  }

}

export const vectorSearchService = new VectorSearchService();
