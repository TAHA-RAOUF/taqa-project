import OpenAI from 'openai';

// Initialize OpenAI client with OpenRouter configuration
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  baseURL: import.meta.env.VITE_LLM_API_URL,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

const MODEL = import.meta.env.VITE_LLM_MODEL || 'qwen/qwen3-32b:free';

export class LLMService {
  async getChatCompletion(message: string, context?: any): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';
    } catch (error) {
      console.error('LLM Service Error:', error);
      throw new Error('Erreur lors de la communication avec le modèle de langage');
    }
  }

  private buildSystemPrompt(context?: any): string {
    let systemPrompt = `Vous êtes un assistant IA spécialisé dans la gestion des anomalies industrielles pour le système TAMS (Maintenance et Anomalies).

Votre rôle :
- Analyser les anomalies industrielles et fournir des recommandations
- Aider à la planification de la maintenance
- Répondre aux questions sur les équipements et les données
- Communiquer en français de manière professionnelle et claire

Instructions :
- Utilisez un ton professionnel mais accessible
- Fournissez des réponses précises et actionables
- Si vous n'avez pas assez d'informations, demandez des clarifications
- Référencez les données contextuelles quand disponibles`;

    if (context) {
      systemPrompt += '\n\nDonnées contextuelles disponibles:\n';
      
      if (context.statistics) {
        systemPrompt += `\nStatistiques actuelles:
- Anomalies ouvertes: ${context.statistics.openAnomalies || 0}
- Anomalies critiques: ${context.statistics.criticalAnomalies || 0}
- Taux de traitement: ${context.statistics.treatmentRate || 0}%
- Temps moyen de résolution: ${context.statistics.averageResolutionTime || 0} jours`;
      }

      if (context.anomalies && context.anomalies.length > 0) {
        systemPrompt += '\n\nAnomalies récentes:';
        context.anomalies.forEach((anomaly: any, index: number) => {
          systemPrompt += `\n${index + 1}. ${anomaly.num_equipement}: ${anomaly.description} (Status: ${anomaly.status}, Criticité: ${anomaly.final_criticality_level || 'N/A'})`;
        });
      }

      if (context.maintenanceWindows && context.maintenanceWindows.length > 0) {
        systemPrompt += '\n\nFenêtres de maintenance planifiées:';
        context.maintenanceWindows.forEach((window: any, index: number) => {
          systemPrompt += `\n${index + 1}. ${window.name}: ${new Date(window.start_time).toLocaleDateString('fr-FR')} - ${new Date(window.end_time).toLocaleDateString('fr-FR')}`;
        });
      }

      if (context.searchResults && context.searchResults.length > 0) {
        systemPrompt += '\n\nRésultats de recherche:';
        context.searchResults.forEach((result: any, index: number) => {
          systemPrompt += `\n${index + 1}. ${result.num_equipement}: ${result.description}`;
        });
      }
    }

    return systemPrompt;
  }

  async getAnomalyAnalysis(anomaly: any): Promise<string> {
    const prompt = `Analysez cette anomalie et fournissez des recommandations:

Équipement: ${anomaly.num_equipement}
Description: ${anomaly.description}
Service: ${anomaly.service}
Status: ${anomaly.status}
Scores de criticité:
- Fiabilité/Intégrité: ${anomaly.final_fiabilite_integrite_score || 'N/A'}
- Disponibilité: ${anomaly.final_disponibilite_score || 'N/A'}
- Sécurité des processus: ${anomaly.final_process_safety_score || 'N/A'}
- Niveau de criticité: ${anomaly.final_criticality_level || 'N/A'}

Fournissez une analyse détaillée et des recommandations d'action.`;

    return this.getChatCompletion(prompt);
  }

  async getMaintenanceRecommendations(equipment: string, anomalies: any[]): Promise<string> {
    const prompt = `Analysez les anomalies suivantes pour l'équipement ${equipment} et proposez un plan de maintenance:

${anomalies.map((a, i) => `${i + 1}. ${a.description} (Criticité: ${a.final_criticality_level})`).join('\n')}

Proposez des recommandations de maintenance préventive et corrective.`;

    return this.getChatCompletion(prompt);
  }
}

export const llmService = new LLMService();
