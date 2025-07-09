import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Bonjour! Je suis votre assistant IA TAMS. Comment puis-je vous aider aujourd\'hui?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial connection
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Test connection to Supabase
      const { data: anomalies, error: anomaliesError } = await supabase
        .from('anomalies')
        .select('id')
        .limit(1);
        
      if (anomaliesError) throw anomaliesError;
      
      toast.success('Connecté à la base de données');
    } catch (error) {
      console.error('Failed to connect to database:', error);
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
      // Get specific data based on message content
      if (lowerMessage.includes('anomalie') || lowerMessage.includes('critique') || lowerMessage.includes('équipement')) {
        const { data: anomalies, error } = await supabase
          .from('anomalies')
          .select('*')
          .limit(5);
          
        if (!error && anomalies) {
          context.anomalies = anomalies;
        }
      }

      if (lowerMessage.includes('maintenance') || lowerMessage.includes('planning') || lowerMessage.includes('arrêt')) {
        const { data: maintenanceWindows, error } = await supabase
          .from('maintenance_windows')
          .select('*')
          .limit(5);
          
        if (!error && maintenanceWindows) {
          context.maintenanceWindows = maintenanceWindows;
        }
      }

      if (lowerMessage.includes('recherche') || lowerMessage.includes('trouve')) {
        const searchTerm = extractSearchTerm(message);
        if (searchTerm) {
          const { data: searchResults, error } = await supabase
            .from('anomalies')
            .select('*')
            .or(`description.ilike.%${searchTerm}%,num_equipement.ilike.%${searchTerm}%`)
            .limit(5);
            
          if (!error && searchResults) {
            context.searchResults = searchResults;
          }
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
    <div className="fixed inset-0 flex flex-col max-w-4xl mx-auto bg-white">
      {/* Chat Header - Fixed */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Assistant IA TAMS</h2>
            <p className="text-blue-100 text-sm">Intelligence artificielle pour la gestion des anomalies</p>
          </div>
        </div>
      </div>

      {/* Messages Container - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
        
        {/* Scroll to bottom element */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area - Fixed */}
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
              disabled={!inputMessage.trim() || isTyping}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};