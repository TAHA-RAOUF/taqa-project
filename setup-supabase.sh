#!/bin/bash

# TAMS Chat IA - Setup Script for Supabase Integration
# This script helps you set up the Supabase integration for the chat system

echo "🤖 TAMS Chat IA - Configuration Supabase"
echo "========================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📄 Création du fichier .env..."
    cp .env.example .env
    echo "✅ Fichier .env créé à partir de .env.example"
    echo "⚠️  Veuillez modifier .env avec vos credentials Supabase"
    echo ""
else
    echo "✅ Fichier .env trouvé"
fi

# Check if Supabase variables are set
if grep -q "your-project.supabase.co" .env; then
    echo "⚠️  Variables Supabase non configurées dans .env"
    echo "   Veuillez remplacer :"
    echo "   - VITE_SUPABASE_URL=https://your-project.supabase.co"
    echo "   - VITE_SUPABASE_ANON_KEY=your-anon-key"
    echo ""
else
    echo "✅ Variables Supabase configurées"
fi

# Check if dependencies are installed
echo "📦 Vérification des dépendances..."
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installées"
else
    echo "📦 Installation des dépendances..."
    npm install
fi

# Check if Supabase files exist
echo ""
echo "📋 Vérification des fichiers Supabase..."

if [ -f "supabase/migrations/001_create_chat_schema.sql" ]; then
    echo "✅ Migration SQL trouvée"
else
    echo "❌ Migration SQL manquante"
fi

if [ -f "supabase/functions/chat-ai/index.ts" ]; then
    echo "✅ Edge Function trouvée"
else
    echo "❌ Edge Function manquante"
fi

if [ -f "src/services/supabaseChatService.ts" ]; then
    echo "✅ Service Supabase trouvé"
else
    echo "❌ Service Supabase manquant"
fi

echo ""
echo "🚀 Prochaines étapes :"
echo "1. Configurez votre projet Supabase"
echo "2. Mettez à jour le fichier .env avec vos credentials"
echo "3. Appliquez la migration SQL dans Supabase"
echo "4. Déployez la fonction Edge 'chat-ai'"
echo "5. Démarrez le serveur avec 'npm run dev'"
echo ""
echo "📖 Guide complet : voir SUPABASE_SETUP_GUIDE.md"
echo ""
echo "💡 Test rapide : Ouvrez la console du navigateur et tapez 'testSupabaseChat()'"
