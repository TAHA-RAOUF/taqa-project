import React, { createContext, useContext, useState, useEffect } from 'react';
import { Anomaly, MaintenanceWindow, ActionPlan } from '../types';
import { mockAnomalies, mockMaintenanceWindows } from '../data/mockData';
import { anomalyService } from '../services/anomalyService';
import { maintenanceService } from '../services/maintenanceService';
import { actionPlanService } from '../services/actionPlanService';
import { 
  transformBackendAnomaly, 
  transformToCreateAnomalyData, 
  transformToUpdateAnomalyData,
  transformBackendMaintenanceWindow,
  transformToCreateMaintenanceWindowData,
  transformBackendActionPlan,
  transformToCreateActionPlanData
} from '../utils/dataTransformers';
import { ValidationError } from '../services/apiService';
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
  getAnomalyStats: () => {
    total: number;
    open: number;
    critical: number;
    assigned: number;
    unassigned: number;
  };
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

  // Initialize data from backend or fallback to localStorage/mock data
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Try to load data from backend
        const [anomaliesResponse, windowsResponse] = await Promise.all([
          anomalyService.getAllAnomalies({ per_page: 1000 }),
          maintenanceService.getAllWindows()
        ]);
        
        const transformedAnomalies = anomaliesResponse.items?.map(transformBackendAnomaly) || [];
        const transformedWindows = windowsResponse.map(transformBackendMaintenanceWindow);
        
        setAnomalies(transformedAnomalies);
        setMaintenanceWindows(transformedWindows);
        setActionPlans([]); // Action plans will be loaded on demand
        setUseBackend(true);
        
        toast.success('Données chargées depuis le serveur');
      } catch (error) {
        console.error('Failed to load data from backend, using local data:', error);
        setUseBackend(false);
        
        // Fallback to localStorage or mock data
        loadLocalData();
        
        toast('Mode hors ligne - utilisation des données locales', {
          icon: '⚠️',
          style: {
            background: '#fef3c7',
            color: '#92400e',
          },
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);

  const loadLocalData = () => {
    const savedAnomalies = localStorage.getItem('taqa_anomalies');
    const savedWindows = localStorage.getItem('taqa_maintenance_windows');
    const savedActionPlans = localStorage.getItem('taqa_action_plans');

    if (savedAnomalies) {
      try {
        const parsed = JSON.parse(savedAnomalies);
        const anomaliesWithDates = parsed.map((anomaly: any) => ({
          ...anomaly,
          createdAt: new Date(anomaly.createdAt),
          updatedAt: new Date(anomaly.updatedAt),
          lastModifiedAt: anomaly.lastModifiedAt ? new Date(anomaly.lastModifiedAt) : undefined,
          actionPlan: anomaly.actionPlan ? {
            ...anomaly.actionPlan,
            createdAt: new Date(anomaly.actionPlan.createdAt),
            updatedAt: new Date(anomaly.actionPlan.updatedAt),
            plannedDate: anomaly.actionPlan.plannedDate ? new Date(anomaly.actionPlan.plannedDate) : undefined,
            actions: anomaly.actionPlan.actions.map((action: any) => ({
              ...action,
              dateDebut: action.dateDebut ? new Date(action.dateDebut) : undefined,
              dateFin: action.dateFin ? new Date(action.dateFin) : undefined
            }))
          } : undefined
        }));
        setAnomalies(anomaliesWithDates);
      } catch (error) {
        console.error('Error parsing saved anomalies:', error);
        setAnomalies(mockAnomalies);
      }
    } else {
      setAnomalies(mockAnomalies);
    }

    if (savedWindows) {
      try {
        const parsed = JSON.parse(savedWindows);
        const windowsWithDates = parsed.map((window: any) => ({
          ...window,
          startDate: new Date(window.startDate),
          endDate: new Date(window.endDate)
        }));
        setMaintenanceWindows(windowsWithDates);
      } catch (error) {
        console.error('Error parsing saved windows:', error);
        setMaintenanceWindows(mockMaintenanceWindows);
      }
    } else {
      setMaintenanceWindows(mockMaintenanceWindows);
    }

    if (savedActionPlans) {
      try {
        const parsed = JSON.parse(savedActionPlans);
        const plansWithDates = parsed.map((plan: any) => ({
          ...plan,
          createdAt: new Date(plan.createdAt),
          updatedAt: new Date(plan.updatedAt),
          plannedDate: plan.plannedDate ? new Date(plan.plannedDate) : undefined,
          actions: plan.actions.map((action: any) => ({
            ...action,
            dateDebut: action.dateDebut ? new Date(action.dateDebut) : undefined,
            dateFin: action.dateFin ? new Date(action.dateFin) : undefined
          }))
        }));
        setActionPlans(plansWithDates);
      } catch (error) {
        console.error('Error parsing saved action plans:', error);
        setActionPlans([]);
      }
    }
  };

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!useBackend) {
      localStorage.setItem('taqa_anomalies', JSON.stringify(anomalies));
    }
  }, [anomalies]);

  useEffect(() => {
    if (!useBackend) {
      localStorage.setItem('taqa_maintenance_windows', JSON.stringify(maintenanceWindows));
    }
  }, [maintenanceWindows]);

  useEffect(() => {
    if (!useBackend) {
      localStorage.setItem('taqa_action_plans', JSON.stringify(actionPlans));
    }
  }, [actionPlans]);

  // Anomaly functions
  const addAnomaly = async (anomalyData: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (useBackend) {
      try {
        const createData = transformToCreateAnomalyData(anomalyData);
        const backendAnomaly = await anomalyService.createAnomaly(createData);
        const newAnomaly = transformBackendAnomaly(backendAnomaly);
        setAnomalies(prev => [newAnomaly, ...prev]);
        return;
      } catch (error) {
        console.error('Failed to create anomaly via backend:', error);
        if (error instanceof ValidationError) {
          toast.error('Données invalides');
          return;
        }
        toast.error('Erreur serveur, sauvegarde locale');
      }
    }
    
    // Fallback to local creation
    const newAnomaly: Anomaly = {
      ...anomalyData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setAnomalies(prev => [newAnomaly, ...prev]);
  };

  const updateAnomaly = async (id: string, updates: Partial<Anomaly>) => {
    if (useBackend) {
      try {
        const updateData = transformToUpdateAnomalyData(updates);
        const backendAnomaly = await anomalyService.updateAnomaly(id, updateData);
        const updatedAnomaly = transformBackendAnomaly(backendAnomaly);
        setAnomalies(prev => prev.map(anomaly => 
          anomaly.id === id ? updatedAnomaly : anomaly
        ));
        return;
      } catch (error) {
        console.error('Failed to update anomaly via backend:', error);
        if (error instanceof ValidationError) {
          toast.error('Données invalides');
          return;
        }
        toast.error('Erreur serveur, sauvegarde locale');
      }
    }
    
    // Fallback to local update
    setAnomalies(prev => prev.map(anomaly => 
      anomaly.id === id 
        ? { ...anomaly, ...updates, updatedAt: new Date() }
        : anomaly
    ));
  };

  const deleteAnomaly = async (id: string) => {
    if (useBackend) {
      try {
        await anomalyService.deleteAnomaly(id);
      } catch (error) {
        console.error('Failed to delete anomaly via backend:', error);
        toast.error('Erreur serveur, suppression locale');
      }
    }
    
    // Update local state regardless
    setAnomalies(prev => prev.filter(anomaly => anomaly.id !== id));
    // Also remove from maintenance windows
    setMaintenanceWindows(prev => prev.map(window => ({
      ...window,
      assignedAnomalies: window.assignedAnomalies?.filter(a => a.id !== id)
    })));
  };

  // Maintenance Window functions
  const addMaintenanceWindow = async (windowData: Omit<MaintenanceWindow, 'id'>) => {
    if (useBackend) {
      try {
        const createData = transformToCreateMaintenanceWindowData(windowData);
        const backendWindow = await maintenanceService.createWindow(createData);
        const newWindow = transformBackendMaintenanceWindow(backendWindow);
        setMaintenanceWindows(prev => [...prev, newWindow]);
        return;
      } catch (error) {
        console.error('Failed to create maintenance window via backend:', error);
        if (error instanceof ValidationError) {
          toast.error('Données invalides');
          return;
        }
        toast.error('Erreur serveur, sauvegarde locale');
      }
    }
    
    // Fallback to local creation
    const newWindow: MaintenanceWindow = {
      ...windowData,
      id: generateId()
    };
    setMaintenanceWindows(prev => [...prev, newWindow]);
  };

  const updateMaintenanceWindow = async (id: string, updates: Partial<MaintenanceWindow>) => {
    if (useBackend) {
      try {
        const updateData = {
          type: updates.type,
          duration_days: updates.durationDays,
          start_date: updates.startDate?.toISOString(),
          description: updates.description,
          status: updates.status,
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key as keyof typeof updateData] === undefined) {
            delete updateData[key as keyof typeof updateData];
          }
        });
        
        const backendWindow = await maintenanceService.updateWindow(id, updateData);
        const updatedWindow = transformBackendMaintenanceWindow(backendWindow);
        setMaintenanceWindows(prev => prev.map(window => 
          window.id === id ? updatedWindow : window
        ));
        return;
      } catch (error) {
        console.error('Failed to update maintenance window via backend:', error);
        if (error instanceof ValidationError) {
          toast.error('Données invalides');
          return;
        }
        toast.error('Erreur serveur, sauvegarde locale');
      }
    }
    
    // Fallback to local update
    setMaintenanceWindows(prev => prev.map(window => 
      window.id === id ? { ...window, ...updates } : window
    ));
  };

  const deleteMaintenanceWindow = async (id: string) => {
    if (useBackend) {
      try {
        await maintenanceService.deleteWindow(id);
      } catch (error) {
        console.error('Failed to delete maintenance window via backend:', error);
        toast.error('Erreur serveur, suppression locale');
      }
    }
    
    // Update local state regardless
    setMaintenanceWindows(prev => prev.filter(window => window.id !== id));
    // Remove window assignment from anomalies
    setAnomalies(prev => prev.map(anomaly => 
      anomaly.maintenanceWindowId === id 
        ? { ...anomaly, maintenanceWindowId: undefined }
        : anomaly
    ));
  };

  // Action Plan functions
  const addActionPlan = async (planData: Omit<ActionPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (useBackend) {
      try {
        const createData = transformToCreateActionPlanData(planData);
        const backendPlan = await actionPlanService.createActionPlan(createData);
        const newPlan = transformBackendActionPlan(backendPlan);
        setActionPlans(prev => [...prev, newPlan]);
        
        // Update the associated anomaly
        updateAnomaly(planData.anomalyId, {
          actionPlan: newPlan,
          hasActionPlan: true
        });
        return;
      } catch (error) {
        console.error('Failed to create action plan via backend:', error);
        if (error instanceof ValidationError) {
          toast.error('Données invalides');
          return;
        }
        toast.error('Erreur serveur, sauvegarde locale');
      }
    }
    
    // Fallback to local creation
    const newPlan: ActionPlan = {
      ...planData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setActionPlans(prev => [...prev, newPlan]);
    
    // Update the associated anomaly
    updateAnomaly(planData.anomalyId, {
      actionPlan: newPlan,
      hasActionPlan: true
    });
  };

  const updateActionPlan = async (id: string, updates: Partial<ActionPlan>) => {
    const plan = actionPlans.find(p => p.id === id);
    if (!plan) return;
    
    if (useBackend) {
      try {
        const updateData = {
          needs_outage: updates.needsOutage,
          outage_type: updates.outageType,
          outage_duration: updates.outageDuration,
          planned_date: updates.plannedDate?.toISOString(),
          estimated_cost: updates.estimatedCost,
          priority: updates.priority,
          comments: updates.comments,
          status: updates.status,
        };
        
        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key as keyof typeof updateData] === undefined) {
            delete updateData[key as keyof typeof updateData];
          }
        });
        
        const backendPlan = await actionPlanService.updateActionPlan(plan.anomalyId, updateData);
        const updatedPlan = transformBackendActionPlan(backendPlan);
        
        setActionPlans(prev => prev.map(p => 
          p.id === id ? updatedPlan : p
        ));
        
        // Update the associated anomaly
        updateAnomaly(plan.anomalyId, {
          actionPlan: updatedPlan
        });
        return;
      } catch (error) {
        console.error('Failed to update action plan via backend:', error);
        if (error instanceof ValidationError) {
          toast.error('Données invalides');
          return;
        }
        toast.error('Erreur serveur, sauvegarde locale');
      }
    }
    
    // Fallback to local update
    setActionPlans(prev => prev.map(p => 
      p.id === id 
        ? { ...p, ...updates, updatedAt: new Date() }
        : p
    ));
    
    // Update the associated anomaly
    updateAnomaly(plan.anomalyId, {
      actionPlan: { ...plan, ...updates, updatedAt: new Date() }
    });
  };

  const deleteActionPlan = async (id: string) => {
    const plan = actionPlans.find(p => p.id === id);
    if (!plan) return;
    
    if (useBackend) {
      try {
        // Backend doesn't have a direct delete endpoint, so we'll just remove locally
        // In a real implementation, you might want to set status to 'cancelled' instead
      } catch (error) {
        console.error('Failed to delete action plan via backend:', error);
      }
    }
    
    // Update local state
    setActionPlans(prev => prev.filter(plan => plan.id !== id));
    updateAnomaly(plan.anomalyId, {
      actionPlan: undefined,
      hasActionPlan: false
    });
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

  const getAnomalyStats = () => {
    const total = anomalies.length;
    const open = anomalies.filter(a => a.status !== 'closed').length;
    const critical = anomalies.filter(a => a.criticalityLevel === 'critical').length;
    const assigned = anomalies.filter(a => a.maintenanceWindowId).length;
    const unassigned = total - assigned;

    return { total, open, critical, assigned, unassigned };
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