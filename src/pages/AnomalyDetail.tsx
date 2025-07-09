import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Wrench,
  Save, 
  X, 
  Paperclip, 
  MessageSquare, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
  Edit
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ActionPlanModal } from '../components/anomalies/ActionPlanModal';
import { useData } from '../contexts/DataContext';
import { formatDateTime, getCriticalityColor, calculateCriticality } from '../lib/utils';
import { ActionPlan } from '../types';
import { planningIntegration } from '../lib/planningUtils';
import toast from 'react-hot-toast';

export const AnomalyDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAnomalyById, updateAnomaly, addActionPlan, updateActionPlan, actionPlans } = useData();
  
  // Find the anomaly (in a real app, this would be fetched from an API)
  const anomaly = id ? getAnomalyById(id) : undefined;
  
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [actionPlan, setActionPlan] = useState<ActionPlan | undefined>(anomaly?.actionPlan);
  const [editingScores, setEditingScores] = useState(false);
  const [aiScores, setAiScores] = useState({
    fiabiliteScore: anomaly?.fiabiliteScore || 0,
    integriteScore: anomaly?.integriteScore || 0,
    disponibiliteScore: anomaly?.disponibiliteScore || 0,
    processSafetyScore: anomaly?.processSafetyScore || 0,
    criticalityLevel: anomaly?.criticalityLevel || 'low'
  });
  const [userScores, setUserScores] = useState({
    fiabiliteScore: anomaly?.fiabiliteScore || 0,
    integriteScore: anomaly?.integriteScore || 0,
    disponibiliteScore: anomaly?.disponibiliteScore || 0,
    processSafetyScore: anomaly?.processSafetyScore || 0,
    criticalityLevel: anomaly?.criticalityLevel || 'low'
  });
  const [useUserScores, setUseUserScores] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: anomaly?.status || 'new',
    priority: anomaly?.priority || 1,
    estimatedHours: anomaly?.estimatedHours || 0
  });

  const statusOptions = [
    { value: 'new', label: 'Nouveau' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'treated', label: 'Traité' },
    { value: 'closed', label: 'Fermé' }
  ];
  
  if (!anomaly) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Anomalie non trouvée</h2>
        <p className="text-gray-600 mb-4">L'anomalie demandée n'existe pas ou a été supprimée.</p>
        <Button onClick={() => navigate('/anomalies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'new': return 'info';
      case 'in_progress': return 'warning';
      case 'treated': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const handleSaveActionPlan = (actionPlan: any) => {
    // In a real app, this would save the action plan via API
    console.log('Saving action plan:', actionPlan);
    
    if (actionPlan.id && actionPlans.find(p => p.id === actionPlan.id)) {
      updateActionPlan(actionPlan.id, actionPlan);
    } else {
      addActionPlan(actionPlan);
    }
    
    setActionPlan(actionPlan);
    toast.success('Plan d\'action sauvegardé avec succès');
  };

  const handleUpdatePlanning = (actionPlan: ActionPlan) => {
    // In a real app, this would update the planning via API
    console.log('Updating planning with action plan:', actionPlan);
    
    if (actionPlan.outageType === 'force') {
      // Create urgent outage
      const urgentWindow = planningIntegration.createUrgentOutage(actionPlan);
      console.log('Created urgent maintenance window:', urgentWindow);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    // In a real app, this would make an API call
    toast.success('Commentaire ajouté');
    setNewComment('');
  };

  const handleScoreChange = (field: keyof typeof userScores, value: number) => {
    const newScores = { ...userScores, [field]: value };
    const newCriticality = calculateCriticality(newScores);
    setUserScores({ ...newScores, criticalityLevel: newCriticality });
  };

  const handleSaveScores = () => {
    setEditingScores(false);
    toast.success('Scores de criticité mis à jour');
  };

  const currentScores = useUserScores ? userScores : aiScores;

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Header */}
<div className="flex items-center justify-between">
  <div className="flex items-center space-x-4">
    <Button variant="ghost" onClick={() => navigate('/anomalies')}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Retour
    </Button>
    <div className="flex items-center space-x-3">
      <div className={`w-3 h-3 rounded-full ${getCriticalityColor(anomaly.criticalityLevel)}`} />
      <h1 className="text-2xl font-bold text-gray-900">Détail de l'Anomalie</h1>
    </div>
  </div>

  <div className="flex space-x-2">
    <Button 
      onClick={() => setShowActionPlan(true)}
      variant={actionPlan ? 'outline' : 'primary'}
    >
      <Wrench className="h-4 w-4 mr-2" />
      {actionPlan ? 'Modifier Plan' : 'Plan d\'Action'}
    </Button>

    {actionPlan && (
      <div className="flex items-center space-x-2">
        <Badge variant={
          actionPlan.status === 'completed' ? 'success' :
          actionPlan.status === 'in_progress' ? 'warning' :
          actionPlan.status === 'approved' ? 'info' : 'default'
        }>
          {actionPlan.completionPercentage}% terminé
        </Badge>
        {actionPlan.needsOutage && (
          <Badge variant="warning">
            Arrêt requis
          </Badge>
        )}
      </div>
    )}
  </div>
</div>

        

      {/* Action Plan Modal */}
      <ActionPlanModal
        isOpen={showActionPlan}
        onClose={() => setShowActionPlan(false)}
        onSave={handleSaveActionPlan}
        onUpdatePlanning={handleUpdatePlanning}
        anomaly={anomaly}
        existingActionPlan={actionPlan}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Informations Générales</span>
                {actionPlan && (
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">Plan d'action:</div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${actionPlan.completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {actionPlan.completionPercentage}%
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                <p className="text-gray-900">{anomaly.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <p className="text-gray-900">{anomaly.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Équipement</label>
                  <p className="text-gray-900">{anomaly.equipmentId}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
                  <p className="text-gray-900">{anomaly.service}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Responsable</label>
                  <p className="text-gray-900">{anomaly.responsiblePerson}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Plan Summary */}
          {actionPlan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  <span>Plan d'Action</span>
                  <Badge variant={
                    actionPlan.status === 'completed' ? 'success' :
                    actionPlan.status === 'in_progress' ? 'warning' :
                    actionPlan.status === 'approved' ? 'info' : 'default'
                  }>
                    {actionPlan.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-600">Actions Totales</div>
                    <div className="text-xl font-bold text-blue-900">{actionPlan.actions.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-green-600">Terminées</div>
                    <div className="text-xl font-bold text-green-900">
                      {actionPlan.actions.filter(a => a.statut === 'termine').length}
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-sm text-yellow-600">En Cours</div>
                    <div className="text-xl font-bold text-yellow-900">
                      {actionPlan.actions.filter(a => a.statut === 'en_cours').length}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm text-purple-600">Durée Totale</div>
                    <div className="text-xl font-bold text-purple-900">
                      {actionPlan.totalDurationDays}j {actionPlan.totalDurationHours}h
                    </div>
                  </div>
                </div>
                
                {actionPlan.needsOutage && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">
                        Arrêt {actionPlan.outageType} requis - {actionPlan.outageDuration} jour(s)
                      </span>
                    </div>
                    {actionPlan.plannedDate && (
                      <div className="text-xs text-orange-700 mt-1">
                        Planifié pour: {actionPlan.plannedDate.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-2">Progression globale</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${actionPlan.completionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {actionPlan.completionPercentage}% terminé
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Predictions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Analyse de Criticité</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUseUserScores(!useUserScores)}
                  >
                    {useUserScores ? 'Voir IA' : 'Voir Utilisateur'}
                  </Button>
                  {!editingScores ? (
                    <Button variant="outline" size="sm" onClick={() => setEditingScores(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingScores(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={handleSaveScores}>
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center space-x-4">
                <Badge variant={useUserScores ? 'info' : 'default'}>
                  {useUserScores ? 'Scores Utilisateur' : 'Prédictions IA'}
                </Badge>
                {useUserScores && (
                  <span className="text-sm text-gray-500">
                    Dernière modification: {new Date().toLocaleDateString()}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg relative">
                  <p className="text-sm text-blue-600 mb-1">Fiabilité & Intégrité</p>
                  {editingScores && useUserScores ? (
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={((userScores.fiabiliteScore + userScores.integriteScore) / 2).toFixed(1)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        handleScoreChange('fiabiliteScore', value);
                        handleScoreChange('integriteScore', value);
                      }}
                      className="w-full text-center text-2xl font-bold text-blue-900 bg-transparent border-b-2 border-blue-300 focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-blue-900">{((currentScores.fiabiliteScore + currentScores.integriteScore) / 2).toFixed(1)}</p>
                  )}
                  <div className="text-xs text-blue-600 mt-1">/5</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg relative">
                  <p className="text-sm text-orange-600 mb-1">Disponibilité</p>
                  {editingScores && useUserScores ? (
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={userScores.disponibiliteScore}
                      onChange={(e) => handleScoreChange('disponibiliteScore', parseFloat(e.target.value))}
                      className="w-full text-center text-2xl font-bold text-orange-900 bg-transparent border-b-2 border-orange-300 focus:outline-none focus:border-orange-500"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-orange-900">{currentScores.disponibiliteScore}</p>
                  )}
                  <div className="text-xs text-orange-600 mt-1">/5</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg relative">
                  <p className="text-sm text-purple-600 mb-1">Sécurité</p>
                  {editingScores && useUserScores ? (
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={userScores.processSafetyScore}
                      onChange={(e) => handleScoreChange('processSafetyScore', parseFloat(e.target.value))}
                      className="w-full text-center text-2xl font-bold text-purple-900 bg-transparent border-b-2 border-purple-300 focus:outline-none focus:border-purple-500"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-purple-900">{currentScores.processSafetyScore}</p>
                  )}
                  <div className="text-xs text-purple-600 mt-1">/5</div>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-center space-x-4">
                <Badge variant={getBadgeVariant(currentScores.criticalityLevel)} className="text-lg px-4 py-2">
                  Criticité: {currentScores.criticalityLevel}
                </Badge>
                <div className="text-sm text-gray-500">
                  Score moyen: {(((currentScores.fiabiliteScore + currentScores.integriteScore) / 2 + currentScores.disponibiliteScore + currentScores.processSafetyScore) / 3).toFixed(1)}/5
                </div>
              </div>
              
              {useUserScores && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Ces scores ont été modifiés manuellement et remplacent les prédictions IA.
                    </span>
                  </div>
                </div>
              )}
              
              {!useUserScores && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Scores générés automatiquement par l'intelligence artificielle.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Comparison */}
          {useUserScores && (
            <Card>
              <CardHeader>
                <CardTitle>Comparaison IA vs Utilisateur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { key: 'fiabiliteIntegrite', label: 'Fiabilité & Intégrité', color: 'blue' },
                    { key: 'disponibiliteScore', label: 'Disponibilité', color: 'orange' },
                    { key: 'processSafetyScore', label: 'Sécurité', color: 'purple' }
                  ].map(({ key, label, color }) => {
                    let aiValue, userValue;
                    
                    if (key === 'fiabiliteIntegrite') {
                      aiValue = (aiScores.fiabiliteScore + aiScores.integriteScore) / 2;
                      userValue = (userScores.fiabiliteScore + userScores.integriteScore) / 2;
                    } else {
                      aiValue = aiScores[key as keyof typeof aiScores] as number;
                      userValue = userScores[key as keyof typeof userScores] as number;
                    }
                    
                    const diff = userValue - aiValue;
                    
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-500">IA: {aiValue.toFixed(1)}</div>
                          <div className="text-sm font-medium">Utilisateur: {userValue.toFixed(1)}</div>
                          <div className={`text-sm font-medium ${
                            diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Commentaires & REX</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add Comment */}
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ajouter un commentaire ou un retour d'expérience..."
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                    Ajouter
                  </Button>
                </div>

                {/* Existing Comments */}
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">Ahmed Bennani</span>
                      <span className="text-xs text-gray-500">Il y a 2 heures</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Inspection visuelle effectuée. Vibrations confirmées au niveau du palier côté accouplement.
                      Recommandation: Remplacement du roulement lors du prochain arrêt mineur.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-900">Système IA</span>
                      <span className="text-xs text-blue-500">Il y a 1 jour</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Analyse prédictive: Probabilité de défaillance dans les 30 jours: 78%.
                      Recommandation de planification urgente.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Statut & Priorité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                {isEditing ? (
                  <Select
                    options={statusOptions}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  />
                ) : (
                  <Badge variant={getStatusVariant(anomaly.status)}>
                    {statusOptions.find(s => s.value === anomaly.status)?.label}
                  </Badge>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  />
                ) : (
                  <p className="text-gray-900">Priorité {anomaly.priority || 1}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heures estimées</label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) })}
                  />
                ) : (
                  <p className="text-gray-900">{anomaly.estimatedHours || 0}h</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Chronologie</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Anomalie créée</p>
                    <p className="text-xs text-gray-500">{formatDateTime(anomaly.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Analyse IA effectuée</p>
                    <p className="text-xs text-gray-500">{formatDateTime(anomaly.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Dernière mise à jour</p>
                    <p className="text-xs text-gray-500">{formatDateTime(anomaly.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Paperclip className="h-5 w-5" />
                <span>Pièces jointes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <Paperclip className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">inspection_report.pdf</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <Paperclip className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">vibration_analysis.xlsx</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  Ajouter un fichier
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};