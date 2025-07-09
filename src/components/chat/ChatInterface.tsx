import React, { useState, useEffect } from 'react';
import { Send, Bot, User, MessageCircle, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabaseChatService } from '../../services/supabaseChatService';
import { useChatLogging } from '../../hooks/useLogging';
import { toast } from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export const ChatInterface: React.FC = () => {
  const { logMessageSent, logAIResponse, logError } = useChatLogging();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Bonjour! Je suis votre assistant IA TAMS connecté à votre base de données. Je peux vous aider avec l\'analyse des anomalies en temps réel, les recommandations de maintenance, et bien plus. Comment puis-je vous assister aujourd\'hui?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  // Load initial data and check connection
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Test connection and load statistics
      const stats = await supabaseChatService.getStatisticsForAI();
      setStatistics(stats);
      setIsConnected(true);
      toast.success('Connecté à la base de données TAMS');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      setIsConnected(false);
      toast.error('Erreur de connexion à la base de données');
    }
  };
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsTyping(true);
    
    const startTime = Date.now();
    
    try {
      // Log the user message
      await logMessageSent(currentMessage, currentMessage.length);
      
      // Get AI response from Supabase service
      const context = await buildMessageContext(currentMessage);
      const response = await supabaseChatService.getAIResponse(currentMessage, context);
      
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botResponse]);
      
      // Save conversation to database
      await supabaseChatService.saveChatMessage(currentMessage, response, context);
      
      // Log the AI response
      const duration = Date.now() - startTime;
      await logAIResponse(response.length, duration);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Log the error
      await logError(error as Error, 'chat-message-processing');
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Désolé, je rencontre une difficulté pour traiter votre demande. Veuillez réessayer.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
      toast.error('Erreur lors du traitement de votre message');
    } finally {
      setIsTyping(false);
    }
  };

  const buildMessageContext = async (message: string) => {
    const lowerMessage = message.toLowerCase();
    const context: any = {};

    try {
      // Always include current statistics
      context.statistics = await supabaseChatService.getStatisticsForAI();

      // Get specific data based on message content
      if (lowerMessage.includes('anomalie') || lowerMessage.includes('critique') || lowerMessage.includes('équipement')) {
        let filters: any = { limit: 5 };
        
        if (lowerMessage.includes('critique')) {
          filters.criticality = 'critical';
        }
        
        // Extract equipment ID if mentioned
        const equipmentMatch = message.match(/[A-Z]-\d+/i);
        if (equipmentMatch) {
          filters.equipment = equipmentMatch[0].toUpperCase();
        }

        context.anomalies = await supabaseChatService.getAnomaliesForAI(filters);
      }

      if (lowerMessage.includes('maintenance') || lowerMessage.includes('planning') || lowerMessage.includes('arrêt')) {
        context.maintenanceWindows = await supabaseChatService.getMaintenanceWindowsForAI();
      }

      if (lowerMessage.includes('recherche') || lowerMessage.includes('trouve')) {
        const searchTerm = extractSearchTerm(message);
        if (searchTerm) {
          context.searchResults = await supabaseChatService.searchAnomalies(searchTerm);
        }
      }

    } catch (error) {
      console.error('Error building context:', error);
    }

    return context;
  };

  const extractSearchTerm = (message: string): string | null => {
    const searchPatterns = [
      /recherche\s+(.+)/i,
      /trouve\s+(.+)/i,
      /cherche\s+(.+)/i,
      /information\s+sur\s+(.+)/i
    ];

    for (const pattern of searchPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  };
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Bot className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Assistant IA TAMS</h2>
            <p className="text-blue-100">Intelligence artificielle pour la gestion des anomalies</p>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <span>Conversation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connecté à Supabase' : 'Déconnecté'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Messages Container */}
          <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}>
                  {message.type === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
                
                {/* Message Bubble */}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Tapez votre message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="pr-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputMessage.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions & Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Questions */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <span>Questions Rapides</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'Anomalies critiques ouvertes?',
              'Délai moyen de résolution?',
              'Prochain arrêt maintenance?',
              'Statut équipement P-101?'
            ].map((question, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(question)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm text-gray-700 hover:text-blue-700 transition-colors"
              >
                {question}
              </button>
            ))}
          </CardContent>
        </Card>
        
        {/* AI Capabilities */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Bot className="h-5 w-5 text-cyan-500" />
              <span>Capacités IA</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { icon: '🔍', text: 'Recherche intelligente' },
              { icon: '📊', text: 'Analyse de tendances' },
              { icon: '🔧', text: 'Recommandations maintenance' },
              { icon: '📋', text: 'Génération de rapports' }
            ].map((capability, index) => (
              <div key={index} className="flex items-center space-x-3 p-2">
                <span className="text-lg">{capability.icon}</span>
                <span className="text-sm text-gray-700">{capability.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live Stats */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Statistiques Live</span>
              {!isConnected && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statistics ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Anomalies ouvertes</span>
                  <span className="font-semibold text-orange-600">{statistics.openAnomalies}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Critiques</span>
                  <span className="font-semibold text-red-600">{statistics.criticalAnomalies}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Taux résolution</span>
                  <span className="font-semibold text-green-600">{statistics.treatmentRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Temps moyen</span>
                  <span className="font-semibold text-blue-600">{statistics.averageResolutionTime}j</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Chargement...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};