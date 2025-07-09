import React from 'react';
import { ChatInterface } from '../components/chat/ChatInterface';

export const Chat: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Assistant IA TAQA</h1>
        <p className="text-gray-600">
          Posez des questions sur vos anomalies, obtenez des analyses et des recommandations intelligentes
        </p>
      </div>
      
      <ChatInterface />
    </div>
  );
};