import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, Users, Wrench, AlertTriangle, Save, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Anomaly, ActionPlan, ActionItem } from '../../types';
import { planningIntegration, calculateActionPlanProgress } from '../../lib/planningUtils';
import toast from 'react-hot-toast';

interface ActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actionPlan: ActionPlan) => void;
  onUpdatePlanning?: (actionPlan: ActionPlan) => void;
  anomaly: Anomaly;
  existingActionPlan?: ActionPlan;
}

export const ActionPlanModal: React.FC<ActionPlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdatePlanning,
  anomaly,
  existingActionPlan
}) => {
  const [actionPlan, setActionPlan] = useState<ActionPlan>(
    existingActionPlan || {
      id: `plan-${Date.now()}`,
      anomalyId: anomaly.id,
      needsOutage: false,
      actions: [],
      totalDurationHours: 0,
      totalDurationDays: 0,
      estimatedCost: 0,
      priority: 3,
      comments: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      completionPercentage: 0
    }
  );

  const [newAction, setNewAction] = useState<Partial<ActionItem>>({
    action: '',
    responsable: '',
    pdrsDisponible: 'OUI',
    ressourcesInternes: '',
    ressourcesExternes: '',
    statut: 'planifie',
    dureeHeures: 0,
    dureeJours: 0,
    progression: 0
  });

  const responsableOptions = [
    { value: 'MC', label: 'MC - Maintenance Centrale' },
    { value: 'MP', label: 'MP - Maintenance Préventive' },
    { value: 'OP', label: 'OP - Opérateur' },
    { value: 'EXT', label: 'EXT - Prestataire Externe' },
    { value: 'ING', label: 'ING - Ingénieur' }
  ];

  const pdrsOptions = [
    { value: 'OUI', label: 'OUI' },
    { value: 'NON', label: 'NON' },
    { value: 'PARTIEL', label: 'PARTIEL' }
  ];

  const statutOptions = [
    { value: 'planifie', label: 'Planifié' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'termine', label: 'Terminé' },
    { value: 'reporte', label: 'Reporté' }
  ];

  const outageTypeOptions = [
    { value: 'force', label: 'Arrêt Forcé (1-3 jours)' },
    { value: 'minor', label: 'Arrêt Mineur (3-7 jours)' },
    { value: 'major', label: 'Arrêt Majeur (14-42 jours)' }
  ];

  useEffect(() => {
    calculateTotalDuration();
    updateCompletionPercentage();
  }, [actionPlan.actions]);

  const calculateTotalDuration = () => {
    const totalHours = actionPlan.actions.reduce((sum, action) => sum + action.dureeHeures, 0);
    const totalDays = actionPlan.actions.reduce((sum, action) => sum + action.dureeJours, 0);
    
    setActionPlan(prev => ({
      ...prev,
      totalDurationHours: totalHours,
      totalDurationDays: totalDays,
      updatedAt: new Date()
    }));
  };

  const updateCompletionPercentage = () => {
    const percentage = calculateActionPlanProgress(actionPlan);
    setActionPlan(prev => ({
      ...prev,
      completionPercentage: percentage
    }));
  };

  const addAction = () => {
    if (!newAction.action || !newAction.responsable) return;

    const action: ActionItem = {
      id: `action-${Date.now()}`,
      action: newAction.action || '',
      responsable: newAction.responsable || '',
      pdrsDisponible: newAction.pdrsDisponible || 'OUI',
      ressourcesInternes: newAction.ressourcesInternes || '',
      ressourcesExternes: newAction.ressourcesExternes || '',
      statut: newAction.statut || 'planifie',
      dureeHeures: newAction.dureeHeures || 0,
      dureeJours: newAction.dureeJours || 0,
      progression: 0
    };

    setActionPlan(prev => ({
      ...prev,
      actions: [...prev.actions, action]
    }));

    setNewAction({
      action: '',
      responsable: '',
      pdrsDisponible: 'OUI',
      ressourcesInternes: '',
      ressourcesExternes: '',
      statut: 'planifie',
      dureeHeures: 0,
      dureeJours: 0,
      progression: 0
    });
  };

  const removeAction = (actionId: string) => {
    setActionPlan(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.id !== actionId)
    }));
  };

  const updateAction = (actionId: string, field: keyof ActionItem, value: any) => {
    setActionPlan(prev => ({
      ...prev,
      actions: prev.actions.map(action => {
        if (action.id === actionId) {
          const updatedAction = { ...action, [field]: value };
          
          // Auto-update progression based on status
          if (field === 'statut') {
            switch (value) {
              case 'planifie':
                updatedAction.progression = 0;
                break;
              case 'en_cours':
                updatedAction.progression = 50;
                break;
              case 'termine':
                updatedAction.progression = 100;
                break;
              case 'reporte':
                updatedAction.progression = 0;
                break;
            }
          }
          
          return updatedAction;
        }
        return action;
      }),
      updatedAt: new Date()
    }));
  };

  const handleSave = async () => {
    // Update status based on completion
    let status: ActionPlan['status'] = 'draft';
    if (actionPlan.completionPercentage === 100) {
      status = 'completed';
    } else if (actionPlan.completionPercentage > 0) {
      status = 'in_progress';
    } else if (actionPlan.actions.length > 0) {
      status = 'approved';
    }
    
    const finalActionPlan = {
      ...actionPlan,
      status,
      updatedAt: new Date()
    };
    
    onSave(actionPlan);
    
    // Auto-update planning if outage is required
    if (actionPlan.needsOutage && onUpdatePlanning) {
      onUpdatePlanning(finalActionPlan);
      
      if (actionPlan.outageType === 'force') {
        toast.success('Plan d\'action sauvegardé et arrêt d\'urgence créé automatiquement');
      } else {
        toast.success('Plan d\'action sauvegardé et intégré au planning');
      }
    } else {
      toast.success('Plan d\'action sauvegardé avec succès');
    }
    
    onClose();
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'planifie': return 'info';
      case 'en_cours': return 'warning';
      case 'termine': return 'success';
      case 'reporte': return 'danger';
      default: return 'default';
    }
  };

  const getOutageDurationRange = (type: string) => {
    switch (type) {
      case 'force': return '1-3 jours';
      case 'minor': return '3-7 jours';
      case 'major': return '14-42 jours';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Wrench className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Plan d'Action</h2>
              <p className="text-sm text-gray-600">{anomaly.title}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Besoin d'Arrêt */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Planification d'Arrêt</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={actionPlan.needsOutage}
                      onChange={(e) => setActionPlan(prev => ({ ...prev, needsOutage: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Nécessite un arrêt de production</span>
                  </label>
                </div>

                {actionPlan.needsOutage && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type d'Arrêt</label>
                      <Select
                        options={outageTypeOptions}
                        value={actionPlan.outageType || ''}
                        onChange={(e) => setActionPlan(prev => ({ ...prev, outageType: e.target.value as any }))}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Durée Estimée (jours)</label>
                      <Input
                        type="number"
                        min="1"
                        max={actionPlan.outageType === 'force' ? '3' : actionPlan.outageType === 'minor' ? '7' : '42'}
                        value={actionPlan.outageDuration || ''}
                        onChange={(e) => setActionPlan(prev => ({ ...prev, outageDuration: parseInt(e.target.value) }))}
                      />
                      {actionPlan.outageType && (
                        <p className="text-xs text-gray-500 mt-1">
                          Plage recommandée: {getOutageDurationRange(actionPlan.outageType)}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Planifiée</label>
                      <Input
                        type="date"
                        value={actionPlan.plannedDate ? actionPlan.plannedDate.toISOString().slice(0, 10) : ''}
                        onChange={(e) => setActionPlan(prev => ({ 
                          ...prev, 
                          plannedDate: e.target.value ? new Date(e.target.value) : undefined 
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions à Réaliser</h3>
              
              {/* Tableau des actions existantes */}
              {actionPlan.actions.length > 0 && (
                <div className="mb-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PDRs</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ressources Int.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ressources Ext.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durée</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {actionPlan.actions.map((action) => (
                        <tr key={action.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <input
                                type="text"
                                value={action.action}
                                onChange={(e) => updateAction(action.id, 'action', e.target.value)}
                                className="w-full text-sm border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                              />
                              <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                                <div 
                                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${action.progression}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{action.progression}% terminé</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={action.responsable}
                              onChange={(e) => updateAction(action.id, 'responsable', e.target.value)}
                              className="text-sm border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                            >
                              {responsableOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.value}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={action.pdrsDisponible}
                              onChange={(e) => updateAction(action.id, 'pdrsDisponible', e.target.value)}
                              className="text-sm border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                            >
                              {pdrsOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.value}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={action.ressourcesInternes}
                              onChange={(e) => updateAction(action.id, 'ressourcesInternes', e.target.value)}
                              className="w-full text-sm border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                              placeholder="Ex: 1 mécanicien"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={action.ressourcesExternes}
                              onChange={(e) => updateAction(action.id, 'ressourcesExternes', e.target.value)}
                              className="w-full text-sm border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
                              placeholder="Ex: 1 chaudronnier"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <select
                                value={action.statut}
                                onChange={(e) => updateAction(action.id, 'statut', e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {statutOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <div className="mt-1">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={action.progression}
                                  onChange={(e) => updateAction(action.id, 'progression', parseInt(e.target.value))}
                                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-1">
                              <input
                                type="number"
                                min="0"
                                value={action.dureeJours}
                                onChange={(e) => updateAction(action.id, 'dureeJours', parseInt(e.target.value) || 0)}
                                className="w-12 text-xs border border-gray-300 rounded px-1 py-1"
                                placeholder="J"
                              />
                              <input
                                type="number"
                                min="0"
                                max="23"
                                value={action.dureeHeures}
                                onChange={(e) => updateAction(action.id, 'dureeHeures', parseInt(e.target.value) || 0)}
                                className="w-12 text-xs border border-gray-300 rounded px-1 py-1"
                                placeholder="H"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAction(action.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Formulaire nouvelle action */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Ajouter une nouvelle action</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <Input
                      placeholder="Description de l'action"
                      value={newAction.action || ''}
                      onChange={(e) => setNewAction(prev => ({ ...prev, action: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Select
                      options={responsableOptions}
                      value={newAction.responsable || ''}
                      onChange={(e) => setNewAction(prev => ({ ...prev, responsable: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Select
                      options={pdrsOptions}
                      value={newAction.pdrsDisponible || 'OUI'}
                      onChange={(e) => setNewAction(prev => ({ ...prev, pdrsDisponible: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Ressources internes"
                      value={newAction.ressourcesInternes || ''}
                      onChange={(e) => setNewAction(prev => ({ ...prev, ressourcesInternes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Ressources externes"
                      value={newAction.ressourcesExternes || ''}
                      onChange={(e) => setNewAction(prev => ({ ...prev, ressourcesExternes: e.target.value }))}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Jours"
                      value={newAction.dureeJours || ''}
                      onChange={(e) => setNewAction(prev => ({ ...prev, dureeJours: parseInt(e.target.value) || 0 }))}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="Heures"
                      value={newAction.dureeHeures || ''}
                      onChange={(e) => setNewAction(prev => ({ ...prev, dureeHeures: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Button onClick={addAction} disabled={!newAction.action || !newAction.responsable}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Résumé */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé du Plan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Durée Totale</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    {actionPlan.totalDurationDays}j {actionPlan.totalDurationHours}h
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Progression</span>
                  </div>
                  <div className="mt-1">
                    <p className="text-lg font-bold text-green-900">
                      {actionPlan.completionPercentage}%
                    </p>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${actionPlan.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Priorité</span>
                  </div>
                  <div className="mt-1">
                    <select
                      value={actionPlan.priority}
                      onChange={(e) => setActionPlan(prev => ({ ...prev, priority: parseInt(e.target.value) as any }))}
                      className="text-lg font-bold text-orange-900 bg-transparent border-none focus:outline-none"
                    >
                      <option value={1}>1 - Critique</option>
                      <option value={2}>2 - Élevée</option>
                      <option value={3}>3 - Normale</option>
                      <option value={4}>4 - Faible</option>
                      <option value={5}>5 - Différée</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Arrêt Requis</span>
                  </div>
                  <p className="text-lg font-bold text-purple-900 mt-1">
                    {actionPlan.needsOutage ? 'OUI' : 'NON'}
                  </p>
                  {actionPlan.needsOutage && actionPlan.outageType && (
                    <p className="text-xs text-purple-600 mt-1">
                      {actionPlan.outageType === 'force' ? 'Urgence' : 
                       actionPlan.outageType === 'minor' ? 'Mineur' : 'Majeur'}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Summary */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Résumé des Actions</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-lg font-bold text-blue-900">
                      {actionPlan.actions.filter(a => a.statut === 'planifie').length}
                    </div>
                    <div className="text-xs text-blue-600">Planifiées</div>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <div className="text-lg font-bold text-yellow-900">
                      {actionPlan.actions.filter(a => a.statut === 'en_cours').length}
                    </div>
                    <div className="text-xs text-yellow-600">En cours</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-lg font-bold text-green-900">
                      {actionPlan.actions.filter(a => a.statut === 'termine').length}
                    </div>
                    <div className="text-xs text-green-600">Terminées</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <div className="text-lg font-bold text-red-900">
                      {actionPlan.actions.filter(a => a.statut === 'reporte').length}
                    </div>
                    <div className="text-xs text-red-600">Reportées</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Commentaires</label>
                <textarea
                  value={actionPlan.comments}
                  onChange={(e) => setActionPlan(prev => ({ ...prev, comments: e.target.value }))}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Commentaires additionnels sur le plan d'action..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Planning Integration Alert */}
          {actionPlan.needsOutage && (
            <div className={`p-4 rounded-lg border ${
              actionPlan.outageType === 'force' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`w-5 h-5 ${
                  actionPlan.outageType === 'force' ? 'text-red-600' : 'text-blue-600'
                }`} />
                <span className={`font-medium ${
                  actionPlan.outageType === 'force' ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {actionPlan.outageType === 'force' 
                    ? 'Arrêt d\'urgence - Sera créé automatiquement'
                    : 'Sera intégré au planning existant ou créera un nouvel arrêt'
                  }
                </span>
              </div>
              <p className={`text-sm mt-1 ${
                actionPlan.outageType === 'force' ? 'text-red-700' : 'text-blue-700'
              }`}>
                {actionPlan.outageType === 'force' 
                  ? 'Un arrêt d\'urgence sera automatiquement ajouté au planning lors de la sauvegarde.'
                  : 'Le système recherchera automatiquement un créneau compatible ou créera un nouvel arrêt.'
                }
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder le Plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};