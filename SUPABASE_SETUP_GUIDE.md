# Guide d'installation Supabase pour le Chat IA TAMS

## Configuration Supabase

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez l'URL du projet et la clé API anonyme

### 2. Variables d'environnement

Créez un fichier `.env` dans la racine du projet avec :

```bash
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000/api/v1

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Installation des dépendances

Les dépendances sont déjà installées dans le projet :
- `@supabase/supabase-js`
- `react-hot-toast` (pour les notifications)

### 4. Configuration de la base de données

#### Option A : Via l'interface Supabase

1. Allez dans votre dashboard Supabase
2. Dans l'onglet "SQL Editor"
3. Copiez et exécutez le contenu du fichier `supabase/migrations/001_create_chat_schema.sql`

#### Option B : Via Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Lier votre projet
supabase init
supabase link --project-ref your-project-ref

# Appliquer les migrations
supabase db push
```

### 5. Configuration de la fonction Edge

1. Dans votre dashboard Supabase, allez dans "Edge Functions"
2. Créez une nouvelle fonction nommée `chat-ai`
3. Copiez le contenu du fichier `supabase/functions/chat-ai/index.ts`
4. Ou utilisez la CLI :

```bash
supabase functions deploy chat-ai
```

### 6. Configuration des politiques de sécurité (RLS)

Les politiques sont automatiquement créées par la migration, mais vous pouvez les personnaliser :

- **chat_messages** : Les utilisateurs peuvent voir/créer leurs propres messages
- **anomalies** : Tous les utilisateurs authentifiés peuvent lire/écrire
- **maintenance_windows** : Tous les utilisateurs authentifiés peuvent lire/écrire

## Fonctionnalités du Chat IA

### 1. Interactions avec la base de données

Le chat peut :
- Récupérer des statistiques en temps réel
- Rechercher des anomalies par équipement
- Afficher les fenêtres de maintenance
- Analyser les données historiques

### 2. Types de requêtes supportées

- **Anomalies critiques** : "Quelles sont les anomalies critiques ?"
- **Statistiques** : "Montre-moi les statistiques"
- **Équipements** : "Statut de l'équipement P-101"
- **Maintenance** : "Prochain arrêt maintenance"
- **Recherche** : "Recherche vibration"

### 3. Contexte intelligent

Le système enrichit automatiquement le contexte avec :
- Statistiques actuelles
- Anomalies pertinentes
- Fenêtres de maintenance
- Résultats de recherche

## Test et débogage

### 1. Test de connexion

Le composant `ChatInterface` affiche :
- ✅ **Connecté à Supabase** si la connexion fonctionne
- ❌ **Déconnecté** si la connexion échoue

### 2. Console de débogage

Ouvrez la console du navigateur pour voir :
- Les logs de connexion
- Les erreurs de requête
- Les réponses de l'IA

### 3. Données de test

La migration inclut des données de test :
- 5 anomalies d'exemple
- 3 fenêtres de maintenance
- Différents niveaux de criticité

## Mode de fonctionnement

### 1. Avec Supabase (Production)

- Utilise la fonction Edge pour l'IA
- Données en temps réel depuis la base
- Historique des conversations sauvegardé

### 2. Mode fallback

Si Supabase n'est pas disponible :
- Utilise les réponses de fallback
- Affiche un indicateur de déconnexion
- Fonctionne avec les données locales

## Dépannage

### Problèmes courants

1. **Erreur de connexion** : Vérifiez les variables d'environnement
2. **Fonction Edge non trouvée** : Déployez la fonction `chat-ai`
3. **Pas de données** : Vérifiez que la migration a été appliquée
4. **Erreurs RLS** : Vérifiez les politiques de sécurité

### Logs utiles

```javascript
// Test de connexion
const { data, error } = await supabase.from('anomalies').select('count');
console.log('Connection test:', { data, error });

// Test de la fonction Edge
const { data, error } = await supabase.functions.invoke('chat-ai', {
  body: { message: 'test', context: {} }
});
console.log('Edge function test:', { data, error });
```

## Prochaines étapes

1. **Authentification** : Ajouter l'authentification utilisateur
2. **Notifications** : Intégrer les notifications temps réel
3. **Analytics** : Ajouter des métriques d'utilisation
4. **LLM avancé** : Intégrer OpenAI ou un autre LLM
