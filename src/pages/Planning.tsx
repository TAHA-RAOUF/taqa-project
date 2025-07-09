import React, { useState, useEffect } from 'react';
import { Calendar, Settings, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CalendarView } from '../components/planning/CalendarView';
import { IntelligentPlanning } from '../components/planning/IntelligentPlanning';
import { useData } from '../contexts/DataContext';
import { useIntelligentPlanning } from '../hooks/useIntelligentPlanning';
import { MaintenanceWindow } from '../types';
import { planningIntegration } from '../lib/planningUtils';
import toast from 'react-hot-toast';

export const Planning: React.FC = () => {
  const { 
    anomalies, 
    maintenanceWindows, 
    actionPlans, 
    addMaintenanceWindow, 
    updateMaintenanceWindow,
    updateAnomaly 
  } = useData();

  const intelligentPlanning = useIntelligentPlanning();
  const [activeTab, setActiveTab] = useState<'calendar' | 'intelligent'>('calendar');
  
  // Auto-scheduling status indicator
  useEffect(() => {
    if (intelligentPlanning.schedulingInProgress) {
      toast.loading('Auto-scheduling in progress...', { id: 'auto-schedule' });
    } else {
      toast.dismiss('auto-schedule');
    }
  }, [intelligentPlanning.schedulingInProgress]);
  
  const handleSchedule = (windowId: string, anomalyId: string) => {
    console.log('Schedule anomaly:', anomalyId, 'to window:', windowId);
  };
  
  const handleCreateWindow = () => {
    console.log('Create new maintenance window');
  };

  const handleUpdateWindows = (windowData: MaintenanceWindow) => {
    // Auto-assign compatible anomalies to the new window
    const { updatedWindow, updatedAnomalies } = planningIntegration.assignAnomaliesToWindow(windowData, anomalies);
    
    if (maintenanceWindows.find(w => w.id === windowData.id)) {
      // Update existing window
      updateMaintenanceWindow(windowData.id, updatedWindow);
    } else {
      // Add new window
      addMaintenanceWindow(updatedWindow);
    }
    
    // Update anomalies with window assignments
    updatedAnomalies.forEach(anomaly => {
      if (anomaly.maintenanceWindowId !== anomalies.find(a => a.id === anomaly.id)?.maintenanceWindowId) {
        updateAnomaly(anomaly.id, { maintenanceWindowId: anomaly.maintenanceWindowId });
      }
    });
    
    const assignedCount = updatedWindow.assignedAnomalies?.length || 0;
    if (assignedCount > 0) {
      toast.success(`Fenêtre créée avec ${assignedCount} anomalie(s) assignée(s) automatiquement`);
    } else {
      toast.success('Fenêtre de maintenance créée');
    }
  };

  const handleOptimizeWithAI = () => {
    const { suggestions } = planningIntegration.calculateOptimalScheduling(actionPlans, maintenanceWindows);
    
    if (suggestions.length > 0) {
      toast.success(`${suggestions.length} suggestions d'optimisation trouvées`);
      console.log('AI Optimization suggestions:', suggestions);
    } else {
      toast('Aucune optimisation possible pour le moment');
    }
  };

  const handleIntelligentScheduleComplete = (results: any[]) => {
    // Refresh the data context when intelligent scheduling completes
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      // You can add a method to refresh data in DataContext
      console.log('Intelligent scheduling completed:', results);
    }
  };

  const handleWindowCreate = (newWindow: MaintenanceWindow) => {
    addMaintenanceWindow(newWindow);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning Intelligent</h1>
          <p className="text-gray-600">Système interactif de planification avec IA pour l'assignation automatique</p>
        </div>
        <div className="flex space-x-2">
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <Button
              variant={activeTab === 'calendar' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('calendar')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Planning
            </Button>
            <Button
              variant={activeTab === 'intelligent' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('intelligent')}
            >
              <Zap className="h-4 w-4 mr-2" />
              IA Automatique
            </Button>
          </div>
          <Button variant="outline" onClick={handleOptimizeWithAI}>
            <Settings className="h-4 w-4 mr-2" />
            Optimiser IA
          </Button>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${
              intelligentPlanning.autoScheduleEnabled ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-600">
              Auto-schedule: {intelligentPlanning.autoScheduleEnabled ? 'ON' : 'OFF'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => intelligentPlanning.setAutoScheduleEnabled(!intelligentPlanning.autoScheduleEnabled)}
            >
              {intelligentPlanning.autoScheduleEnabled ? 'Désactiver' : 'Activer'}
            </Button>
          </div>
        </div>
      </div>
      
      {activeTab === 'calendar' ? (
        <CalendarView 
          anomalies={anomalies}
          maintenanceWindows={maintenanceWindows}
          onScheduleAnomaly={handleSchedule}
          onCreateWindow={handleCreateWindow}
          onUpdateWindows={handleUpdateWindows}
          actionPlans={actionPlans}
        />
      ) : (
        <IntelligentPlanning
          onScheduleComplete={handleIntelligentScheduleComplete}
          onWindowCreate={handleWindowCreate}
          anomalies={anomalies}
          maintenanceWindows={maintenanceWindows}
        />
      )}
    </div>
  );
};