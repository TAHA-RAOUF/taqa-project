import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Edit,
  Save,
  BarChart3,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { MaintenanceWindow, Anomaly, ActionPlan } from '../../../types';
import { formatDate } from '../../../lib/utils';

interface WindowDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  window: MaintenanceWindow | null;
  anomalies: Anomaly[];
  actionPlans: ActionPlan[];
  onUpdateWindow: (windowId: string, updates: Partial<MaintenanceWindow>) => void;
  mode: 'view' | 'edit';
  onSwitchMode: (mode: 'view' | 'edit') => void;
}

export const WindowDetailModal: React.FC<WindowDetailModalProps> = ({
  isOpen,
  onClose,
  window,
  anomalies,
  actionPlans,
  onUpdateWindow,
  mode,
  onSwitchMode
}) => {
  const [editData, setEditData] = useState<Partial<MaintenanceWindow>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (window && mode === 'edit') {
      setEditData({
        type: window.type,
        durationDays: window.durationDays,
        startDate: window.startDate,
        endDate: window.endDate,
        description: window.description,
        status: window.status
      });
    }
  }, [window, mode]);

  if (!isOpen || !window) return null;

  // Get assigned anomalies for this window
  const assignedAnomalies = anomalies.filter(a => a.maintenanceWindowId === window.id);
  const relatedActionPlans = actionPlans.filter(ap => 
    assignedAnomalies.some(anomaly => anomaly.id === ap.anomalyId)
  );

  // Calculate statistics
  const totalEstimatedHours = relatedActionPlans.reduce((sum, plan) => 
    sum + (plan.totalDurationDays * 8), 0); // Assuming 8 hours per day
  
  const criticalityStats = assignedAnomalies.reduce((stats, anomaly) => {
    stats[anomaly.criticalityLevel] = (stats[anomaly.criticalityLevel] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  const utilization = window.durationDays > 0 
    ? (totalEstimatedHours / (window.durationDays * 24)) * 100 
    : 0;

  const handleSave = async () => {
    if (!window.id) return;
    
    setIsLoading(true);
    try {
      await onUpdateWindow(window.id, editData);
      onSwitchMode('view');
    } catch (error) {
      console.error('Error updating window:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'force': return 'bg-red-100 text-red-800';
      case 'major': return 'bg-blue-100 text-blue-800';
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCriticalityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl w-[98vw] h-[98vh] overflow-y-auto transform transition-all duration-300 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="p-4 bg-white rounded-lg shadow-sm flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-3xl font-semibold text-gray-900 truncate">
                {mode === 'edit' ? 'Modifier' : 'Détails'} - Fenêtre de Maintenance
              </h2>
              <p className="text-lg text-gray-600 mt-2">
                {mode === 'edit' ? 'Modifiez les paramètres de la fenêtre' : 'Informations détaillées de la fenêtre'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {mode === 'view' ? (
              <Button
                variant="outline"
                size="lg"
                onClick={() => onSwitchMode('edit')}
                className="flex items-center gap-3 hover:bg-blue-50 hover:border-blue-300 transition-colors text-lg px-6 py-3"
              >
                <Edit className="h-6 w-6" />
                Modifier
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onSwitchMode('view')}
                  disabled={isLoading}
                  className="hover:bg-gray-50 transition-colors text-lg px-6 py-3"
                >
                  Annuler
                </Button>
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 transition-colors text-lg px-6 py-3"
                >
                  {isLoading ? (
                    <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Save className="h-6 w-6" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={onClose}
              className="hover:bg-red-50 hover:text-red-600 transition-colors h-12 w-12 p-0"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="p-8 space-y-8 bg-gray-50">
          {/* Progress indicators for edit mode */}
          {mode === 'edit' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center gap-3 text-blue-800">
                <Edit className="h-6 w-6" />
                <span className="font-medium text-lg">Mode d'édition activé</span>
              </div>
              <p className="text-base text-blue-600 mt-2">
                Modifiez les champs souhaités puis cliquez sur "Sauvegarder" pour enregistrer vos changements.
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-6">
            {/* Window Details */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Informations de Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-base">
                {mode === 'edit' ? (
                  <>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={editData.type || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="force">Arrêt Forcé</option>
                        <option value="major">Majeur</option>
                        <option value="minor">Mineur</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Durée (jours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={editData.durationDays || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, durationDays: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Date de début
                      </label>
                      <input
                        type="datetime-local"
                        value={editData.startDate?.toISOString().slice(0, 16) || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Date de fin
                      </label>
                      <input
                        type="datetime-local"
                        value={editData.endDate?.toISOString().slice(0, 16) || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, endDate: new Date(e.target.value) }))}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        Statut
                      </label>
                      <select
                        value={editData.status || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as any }))}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="planned">Planifié</option>
                        <option value="in_progress">En cours</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-base text-gray-500">Type:</span>
                      <Badge className={getTypeColor(window.type)}>{window.type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base text-gray-500">Durée:</span>
                      <span className="text-base font-medium">{window.durationDays} jours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base text-gray-500">Début:</span>
                      <span className="text-base font-medium">{formatDate(window.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base text-gray-500">Fin:</span>
                      <span className="text-base font-medium">{formatDate(window.endDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base text-gray-500">Statut:</span>
                      <Badge className={getStatusColor(window.status)}>{window.status}</Badge>
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {mode === 'edit' ? (
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                    />
                  ) : (
                    <p className="text-base text-gray-900">{window.description || 'Aucune description'}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Statistiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-blue-700">Anomalies</span>
                      <span className="text-3xl font-bold text-blue-900">{assignedAnomalies.length}</span>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-green-700">Heures Est.</span>
                      <span className="text-3xl font-bold text-green-900">{totalEstimatedHours}h</span>
                    </div>
                  </div>
                </div>

                {/* Utilization with visual indicator */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium text-gray-700">Taux d'utilisation</span>
                    <span className={`text-base font-bold ${
                      utilization > 90 ? 'text-red-600' : 
                      utilization > 70 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-500 ${
                        utilization > 90 ? 'bg-red-500' : 
                        utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                  <div className="text-base text-gray-500">
                    {utilization > 90 ? 'Surcharge - Risque de retard' : 
                     utilization > 70 ? 'Bien utilisé' : 'Capacité disponible'}
                  </div>
                </div>
                
                {/* Criticality breakdown with enhanced visuals */}
                <div className="space-y-4">
                  <span className="text-base font-medium text-gray-700">Répartition par criticité</span>
                  <div className="space-y-3">
                    {Object.entries(criticalityStats).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className={getCriticalityColor(level)} variant="default">
                            {level}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-medium">{count}</span>
                          <div className="w-10 h-3 bg-gray-200 rounded-full">
                            <div 
                              className={`h-3 rounded-full ${getCriticalityColor(level).replace('text-white', '').split(' ')[0]}`}
                              style={{ width: `${(count / assignedAnomalies.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assigned Anomalies */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  Anomalies Assignées
                </div>
                <Badge variant="info" className="bg-orange-100 text-orange-800 text-base px-3 py-1">
                  {assignedAnomalies.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedAnomalies.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-6 opacity-30" />
                  <p className="font-medium text-xl">Aucune anomalie assignée</p>
                  <p className="text-base mt-2">Cette fenêtre de maintenance est disponible pour de nouvelles assignations</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {assignedAnomalies.map((anomaly, index) => {
                    const actionPlan = relatedActionPlans.find(ap => ap.anomalyId === anomaly.id);
                    return (
                      <div 
                        key={anomaly.id} 
                        className="p-6 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-200 bg-white"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-6">
                              <div className="flex-shrink-0">
                                <div className={`w-4 h-4 rounded-full ${getCriticalityColor(anomaly.criticalityLevel).replace('text-white', '').split(' ')[0]} mt-2`} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-2 text-lg">
                                  {anomaly.title}
                                </h4>
                                <div className="flex items-center gap-4 text-base text-gray-600 mb-4">
                                  <span className="bg-gray-100 px-3 py-2 rounded text-sm">{anomaly.equipmentId}</span>
                                  <span>•</span>
                                  <span>{anomaly.service}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge className={getCriticalityColor(anomaly.criticalityLevel)} variant="default">
                                    {anomaly.criticalityLevel}
                                  </Badge>
                                  {actionPlan && (
                                    <div className="flex items-center gap-3 text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded">
                                      <Clock className="h-4 w-4" />
                                      <span>{actionPlan.totalDurationDays} jours</span>
                                      <span>•</span>
                                      <span>Priorité {actionPlan.priority}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
