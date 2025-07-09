# 🔄 Anomalies Traitées - Relation Automatique avec Planning

## 📋 Fonctionnalité Implémentée

### **Relation Automatique Anomalie → Planning**

Quand une anomalie passe au statut **"treated"** (traitée), elle doit automatiquement être ajoutée au planning dans une fenêtre de maintenance compatible et ouverte.

## 🎯 Comment ça fonctionne

### 1. **Détection Automatique**
```typescript
// Auto-détection quand anomalies ou fenêtres changent
useEffect(() => {
  if (autoAssignmentEnabled && anomalies.length > 0 && maintenanceWindows.length > 0) {
    performAutoAssignment();
  }
}, [anomalies, maintenanceWindows, autoAssignmentEnabled]);
```

### 2. **Logique d'Assignation Smart**
L'algorithme `AutoPlanningService` :
- ✅ **Trouve les anomalies traitées** non assignées
- ✅ **Identifie les fenêtres ouvertes** (planned/in_progress)
- ✅ **Vérifie la compatibilité** type/criticité
- ✅ **Calcule la capacité disponible**
- ✅ **Assigne automatiquement** selon les priorités

### 3. **Règles de Compatibilité**
```
Anomalies CRITIQUES    → Fenêtres FORCE
Anomalies HAUTE        → Fenêtres MINOR/MAJOR  
Anomalies MOYENNE      → Fenêtres MINOR/MAJOR
Anomalies FAIBLE       → Fenêtres MINOR
```

### 4. **Priorités d'Assignation**
1. **Criticité** : Critical → High → Medium → Low
2. **Date création** : Plus anciennes en premier
3. **Fenêtre optimale** : Type exact → Date proche → Plus de capacité

## 🎮 Interface Utilisateur

### **Statut Visual en Temps Réel**
- 📊 **Panneau "Anomalies Traitées - Statut Planning"**
- 🟢 **Assignées** : Anomalies déjà planifiées
- 🔴 **Critiques Non Assignées** : Nécessitent arrêt forcé
- 🟠 **Haute Priorité** : À planifier en arrêt mineur
- 🟡 **Moyenne/Faible** : Peuvent attendre

### **Boutons d'Action**
- 🔄 **"Assigner Automatiquement"** : Force l'assignation manuelle
- ⚡ **"Créer Fenêtres"** : Crée des fenêtres pour anomalies non assignées
- 🎛️ **Toggle Auto-assign** : Active/Désactive l'assignation automatique

### **Feedback Utilisateur**
- ✅ **Toast Success** : "X anomalies traitées assignées automatiquement"
- ❌ **Toast Error** : "X anomalies non assignées - Fenêtres incompatibles"
- ℹ️ **Toast Info** : "Aucune anomalie traitée en attente d'assignation"

## 📊 Exemples Concrets

### **Cas 1: Anomalie Critique Traitée**
```
Anomalie P-101 → Status: "treated" → Criticité: "critical"
↓
Auto-détection → Recherche fenêtre "force" ouverte
↓
Si trouvée → Assignation automatique + Toast success
Si non trouvée → Suggestion création arrêt forcé
```

### **Cas 2: Plusieurs Anomalies Haute Priorité**
```
3 anomalies → Status: "treated" → Criticité: "high"
↓
Auto-détection → Recherche fenêtre "minor" avec capacité suffisante
↓
Si trouvée → Assignation des 3 + Calcul utilisation
Si non trouvée → Création automatique fenêtre "minor" 3 jours
```

### **Cas 3: Aucune Fenêtre Disponible**
```
Anomalies traitées détectées → Aucune fenêtre ouverte
↓
Affichage panneau d'alerte → Bouton "Créer Fenêtres"
↓
Création automatique selon criticité:
- Critical → Force (1 jour)
- High → Minor (3 jours)  
- Medium/Low → Minor (7 jours)
```

## 🔧 Configuration

### **Variables de Contrôle**
- `autoAssignmentEnabled` : Active/désactive l'assignation automatique
- `performAutoAssignment()` : Fonction déclencheur manuel
- `AutoPlanningService` : Service principal d'assignation

### **Intégration avec DataContext**
```typescript
// Mise à jour automatique des anomalies
updateAnomaly(anomaly.id, { maintenanceWindowId: window.id });

// Mise à jour automatique des fenêtres
updateMaintenanceWindow(window.id, updatedWindow);
```

## 🎯 Bénéfices Utilisateur

### **Gain de Temps**
- ✅ **Assignation automatique** dès qu'une anomalie est traitée
- ✅ **Pas de manipulation manuelle** pour les cas standards
- ✅ **Suggestions intelligentes** pour les cas complexes

### **Réduction d'Erreurs**
- ✅ **Vérification automatique** de compatibilité
- ✅ **Calcul automatique** de capacité disponible
- ✅ **Validation des contraintes** avant assignation

### **Visibilité Complète**
- ✅ **Statut temps réel** de toutes les anomalies traitées
- ✅ **Alertes visuelles** pour les anomalies critiques
- ✅ **Feedback immédiat** sur toutes les actions

## 🔄 Workflow Complet

```
1. Anomalie détectée → Status: "new"
2. Investigation → Status: "in_progress"  
3. Réparation → Status: "treated" ⚡ TRIGGER
4. Auto-détection → Recherche fenêtre compatible
5. Assignation automatique → maintenanceWindowId défini
6. Feedback utilisateur → Toast + Mise à jour UI
7. Planification visible → Calendrier mis à jour
8. Exécution → Status: "closed"
```

## 🎉 Résultat

**Relation complètement automatisée** entre anomalies traitées et planning de maintenance, avec :
- 🚀 **Assignation intelligente en temps réel**
- 🎯 **Interface visuelle claire et actionnable** 
- 🔧 **Contrôle utilisateur complet** (automatique + manuel)
- 📊 **Visibilité totale** sur le statut de planification
- ⚡ **Réactivité immédiate** aux changements de statut

L'utilisateur n'a plus besoin de faire manuellement le lien entre anomalies traitées et planning - le système s'en charge automatiquement ! 🎯
