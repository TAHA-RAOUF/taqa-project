import React, { useState } from 'react';
import { Send, Bot, User, MessageCircle, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Bonjour! Je suis votre assistant IA TAMS. Je peux vous aider avec l\'analyse des anomalies, les recommandations de maintenance, et bien plus. Comment puis-je vous assister aujourd\'hui?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: getBotResponse(inputMessage),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };
  
  const getBotResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('anomalie') && lowerMessage.includes('critique')) {
      return 'Actuellement, vous avez 23 anomalies critiques en attente. La plus urgente concerne la canalisation C-402 avec un score de criticité de 9.1/10. Voulez-vous voir les détails?';
    }
    
    if (lowerMessage.includes('statistique') || lowerMessage.includes('rapport')) {
      return 'Voici un aperçu des statistiques: 84.5% de taux de traitement, 4.2 jours de délai moyen de résolution, et 156 anomalies ouvertes. Souhaitez-vous un rapport détaillé?';
    }
    
    if (lowerMessage.includes('maintenance') || lowerMessage.includes('planning')) {
      return 'Le prochain arrêt mineur est prévu du 15 au 18 janvier. 12 anomalies sont déjà planifiées. Je peux optimiser le planning pour inclure d\'autres anomalies compatibles.';
    }
    
    if (lowerMessage.includes('équipement') || lowerMessage.includes('p-101')) {
      return 'L\'équipement P-101 a une anomalie active avec des vibrations excessives. Statut: En cours de traitement. Criticité: Élevée. Responsable: Ahmed Bennani.';
    }
    
    return 'Je comprends votre question. Puis-je vous aider avec des informations sur les anomalies, les statistiques, la maintenance planifiée, ou des équipements spécifiques?';
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
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">En ligne</span>
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
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Anomalies ouvertes</span>
              <span className="font-semibold text-orange-600">156</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Critiques</span>
              <span className="font-semibold text-red-600">23</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Taux résolution</span>
              <span className="font-semibold text-green-600">84.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Temps moyen</span>
              <span className="font-semibold text-blue-600">4.2j</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};