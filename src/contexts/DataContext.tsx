import React, { createContext, useContext, useState, useEffect } from 'react';
import { Anomaly, MaintenanceWindow, ActionPlan } from '../types';
import { mockMaintenanceWindows } from '../data/mockData';
import { anomalyService } from '../services/anomalyService';
import { generateId } from '../lib/utils';
import toast from 'react-hot-toast';

interface DataContextType {
  // Anomalies
  anomalies: Anomaly[];
  addAnomaly: (anomaly: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAnomaly: (id: string, updates: Partial<Anomaly>) => void;
  deleteAnomaly: (id: string) => void;
  
  // Maintenance Windows
  maintenanceWindows: MaintenanceWindow[];
  addMaintenanceWindow: (window: Omit<MaintenanceWindow, 'id'>) => void;
  updateMaintenanceWindow: (id: string, updates: Partial<MaintenanceWindow>) => void;
  deleteMaintenanceWindow: (id: string) => void;
  
  // Action Plans
  actionPlans: ActionPlan[];
  addActionPlan: (plan: Omit<ActionPlan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateActionPlan: (id: string, updates: Partial<ActionPlan>) => void;
  deleteActionPlan: (id: string) => void;
  
  // Utility functions
  getAnomalyById: (id: string) => Anomaly | undefined;
  getMaintenanceWindowById: (id: string) => MaintenanceWindow | undefined;
  getActionPlanById: (id: string) => ActionPlan | undefined;
  
  // Statistics
  getAnomalyStats: () => Promise<{
    total: number;
    open: number;
    critical: number;
    assigned: number;
    unassigned: number;
  }>;
  
  // Additional properties
  isLoading: boolean;
  useBackend: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useBackend, setUseBackend] = useState(true);

  // Initialize data from Supabase
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Load anomalies directly from Supabase
        const anomaliesResponse = await anomalyService.getAllAnomalies({ per_page: 1000 });
        
        setAnomalies(anomaliesResponse);
        setMaintenanceWindows(mockMaintenanceWindows); // Use mock data for now
        setActionPlans([]); // Empty for now
        setUseBackend(true);
        
        toast.success(`${anomaliesResponse.length} anomalies chargées depuis Supabase`);
      } catch (error) {
        console.error('Failed to load data from Supabase:', error);
        setUseBackend(false);
        setAnomalies([]);
        setMaintenanceWindows(mockMaintenanceWindows);
        setActionPlans([]);
        
        toast.error('Erreur lors du chargement des données Supabase');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);

  // Anomaly functions
  const addAnomaly = async (anomalyData: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAnomaly = await anomalyService.createAnomaly(anomalyData);
      if (newAnomaly) {
        setAnomalies(prev => [newAnomaly, ...prev]);
        toast.success('Anomalie créée avec succès');
        return;
      }
    } catch (error) {
      console.error('Failed to create anomaly:', error);
      toast.error('Erreur lors de la création de l\'anomalie');
    }
  };

  const updateAnomaly = async (id: string, updates: Partial<Anomaly>) => {
    try {
      const updatedAnomaly = await anomalyService.updateAnomaly(id, updates);
      if (updatedAnomaly) {
        setAnomalies(prev => prev.map(anomaly => 
          anomaly.id === id ? updatedAnomaly : anomaly
        ));
        toast.success('Anomalie mise à jour avec succès');
        return;
      }
    } catch (error) {
      console.error('Failed to update anomaly:', error);
      toast.error('Erreur lors de la mise à jour de l\'anomalie');
    }
  };

  const deleteAnomaly = async (id: string) => {
    try {
      const success = await anomalyService.deleteAnomaly(id);
      if (success) {
        setAnomalies(prev => prev.filter(anomaly => anomaly.id !== id));
        toast.success('Anomalie supprimée avec succès');
        return;
      }
    } catch (error) {
      console.error('Failed to delete anomaly:', error);
      toast.error('Erreur lors de la suppression de l\'anomalie');
    }
  };

  // Maintenance Window functions
  const addMaintenanceWindow = async (windowData: Omit<MaintenanceWindow, 'id'>) => {
    // For now, just use local creation until maintenance service is updated
    const newWindow: MaintenanceWindow = {
      ...windowData,
      id: generateId()
    };
    setMaintenanceWindows(prev => [...prev, newWindow]);
  };

  const updateMaintenanceWindow = async (id: string, updates: Partial<MaintenanceWindow>) => {
    // For now, just use local update until maintenance service is updated
    setMaintenanceWindows(prev => prev.map(window => 
      window.id === id ? { ...window, ...updates } : window
    ));
  };

  const deleteMaintenanceWindow = async (id: string) => {
    // Update local state
    setMaintenanceWindows(prev => prev.filter(window => window.id !== id));
    // Remove window assignment from anomalies
    setAnomalies(prev => prev.map(anomaly => 
      anomaly.maintenanceWindowId === id 
        ? { ...anomaly, maintenanceWindowId: undefined }
        : anomaly
    ));
  };

  // Action Plan functions (simplified - stored within anomaly)
  const addActionPlan = async (planData: Omit<ActionPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPlan: ActionPlan = {
      ...planData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store action plan in the anomaly record
    await updateAnomaly(planData.anomalyId, {
      actionPlan: newPlan,
      hasActionPlan: true
    });
    
    setActionPlans(prev => [...prev, newPlan]);
    toast.success('Plan d\'action créé avec succès');
  };

  const updateActionPlan = async (id: string, updates: Partial<ActionPlan>) => {
    const plan = actionPlans.find(p => p.id === id);
    if (!plan) return;
    
    const updatedPlan = { ...plan, ...updates, updatedAt: new Date() };
    
    // Update the action plan in the anomaly record
    await updateAnomaly(plan.anomalyId, {
      actionPlan: updatedPlan
    });
    
    setActionPlans(prev => prev.map(p => 
      p.id === id ? updatedPlan : p
    ));
    toast.success('Plan d\'action mis à jour avec succès');
  };

  const deleteActionPlan = async (id: string) => {
    const plan = actionPlans.find(p => p.id === id);
    if (!plan) return;
    
    // Remove action plan from the anomaly record
    await updateAnomaly(plan.anomalyId, {
      actionPlan: undefined,
      hasActionPlan: false
    });
    
    setActionPlans(prev => prev.filter(plan => plan.id !== id));
    toast.success('Plan d\'action supprimé avec succès');
  };

  // Utility functions
  const getAnomalyById = (id: string) => {
    return anomalies.find(anomaly => anomaly.id === id);
  };

  const getMaintenanceWindowById = (id: string) => {
    return maintenanceWindows.find(window => window.id === id);
  };

  const getActionPlanById = (id: string) => {
    return actionPlans.find(plan => plan.id === id);
  };

  const getAnomalyStats = async () => {
    try {
      const stats = await anomalyService.getAnomalyStats();
      return {
        total: stats.total,
        open: stats.byStatus.new + stats.byStatus.in_progress + stats.byStatus.treated || 0,
        critical: stats.byCriticality.critical || 0,
        assigned: anomalies.filter(a => a.maintenanceWindowId).length,
        unassigned: stats.total - anomalies.filter(a => a.maintenanceWindowId).length
      };
    } catch (error) {
      console.error('Error getting anomaly stats:', error);
      // Fallback to local calculation
      const total = anomalies.length;
      const open = anomalies.filter(a => a.status !== 'closed').length;
      const critical = anomalies.filter(a => a.criticalityLevel === 'critical').length;
      const assigned = anomalies.filter(a => a.maintenanceWindowId).length;
      const unassigned = total - assigned;

      return { total, open, critical, assigned, unassigned };
    }
  };

  const value: DataContextType = {
    // Data
    anomalies,
    maintenanceWindows,
    actionPlans,
    
    // Anomaly functions
    addAnomaly,
    updateAnomaly,
    deleteAnomaly,
    
    // Maintenance Window functions
    addMaintenanceWindow,
    updateMaintenanceWindow,
    deleteMaintenanceWindow,
    
    // Action Plan functions
    addActionPlan,
    updateActionPlan,
    deleteActionPlan,
    
    // Utility functions
    getAnomalyById,
    getMaintenanceWindowById,
    getActionPlanById,
    getAnomalyStats,
    
    // Additional properties for debugging
    isLoading,
    useBackend
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};