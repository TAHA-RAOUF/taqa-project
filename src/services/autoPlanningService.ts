import { Anomaly, MaintenanceWindow, ActionPlan } from '../types';
import { toast } from 'react-hot-toast';

export class AutoPlanningService {
  
  /**
   * Automatically assign treated anomalies to open maintenance windows
   */
  static autoAssignTreatedAnomalies(
    anomalies: Anomaly[],
    maintenanceWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[] = []
  ): {
    updatedAnomalies: Anomaly[];
    updatedWindows: MaintenanceWindow[];
    assignmentResults: AssignmentResult[];
  } {
    const updatedAnomalies = [...anomalies];
    const updatedWindows = [...maintenanceWindows];
    const assignmentResults: AssignmentResult[] = [];

    // Find treated anomalies that are not yet assigned to any window
    const treatedAnomalies = anomalies.filter(anomaly => 
      anomaly.status === 'treated' && 
      !anomaly.maintenanceWindowId
    );

    // Find open maintenance windows (planned or in_progress)
    const openWindows = maintenanceWindows.filter(window => 
      window.status === 'planned' || window.status === 'in_progress'
    );

    if (treatedAnomalies.length === 0) {
      return {
        updatedAnomalies,
        updatedWindows,
        assignmentResults: []
      };
    }

    if (openWindows.length === 0) {
      // No open windows - suggest creating new ones
      const criticalAnomalies = treatedAnomalies.filter(a => a.criticalityLevel === 'critical');
      if (criticalAnomalies.length > 0) {
        toast.error(`${criticalAnomalies.length} anomalies critiques traitées nécessitent un arrêt forcé`);
      }
      
      const highPriorityAnomalies = treatedAnomalies.filter(a => a.criticalityLevel === 'high');
      if (highPriorityAnomalies.length > 0) {
        toast(`${highPriorityAnomalies.length} anomalies haute priorité en attente de planification`);
      }

      return {
        updatedAnomalies,
        updatedWindows,
        assignmentResults: []
      };
    }

    // Sort anomalies by priority (critical first)
    const sortedAnomalies = this.sortAnomaliesByPriority(treatedAnomalies);

    // Assign anomalies to windows
    for (const anomaly of sortedAnomalies) {
      const bestWindow = this.findBestWindow(anomaly, openWindows, actionPlans);
      
      if (bestWindow) {
        // Assign anomaly to window
        const anomalyIndex = updatedAnomalies.findIndex(a => a.id === anomaly.id);
        const windowIndex = updatedWindows.findIndex(w => w.id === bestWindow.id);
        
        if (anomalyIndex !== -1 && windowIndex !== -1) {
          // Update anomaly
          updatedAnomalies[anomalyIndex] = {
            ...updatedAnomalies[anomalyIndex],
            maintenanceWindowId: bestWindow.id
          };

          // Update window
          const currentAssigned = updatedWindows[windowIndex].assignedAnomalies || [];
          updatedWindows[windowIndex] = {
            ...updatedWindows[windowIndex],
            assignedAnomalies: [...currentAssigned, updatedAnomalies[anomalyIndex]]
          };

          assignmentResults.push({
            anomalyId: anomaly.id,
            windowId: bestWindow.id,
            success: true,
            reason: `Assigned to ${bestWindow.type} maintenance window`
          });
        }
      } else {
        assignmentResults.push({
          anomalyId: anomaly.id,
          windowId: null,
          success: false,
          reason: 'No compatible maintenance window found'
        });
      }
    }

    return {
      updatedAnomalies,
      updatedWindows,
      assignmentResults
    };
  }

  /**
   * Find the best maintenance window for an anomaly
   */
  private static findBestWindow(
    anomaly: Anomaly,
    openWindows: MaintenanceWindow[],
    actionPlans: ActionPlan[]
  ): MaintenanceWindow | null {
    const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
    const requiredDuration = actionPlan?.outageDuration || 1;

    // Filter compatible windows
    const compatibleWindows = openWindows.filter(window => 
      this.isCompatible(anomaly, window, requiredDuration)
    );

    if (compatibleWindows.length === 0) {
      return null;
    }

    // Sort by preference: exact match type > earlier date > more capacity
    return compatibleWindows.sort((a, b) => {
      // Prefer exact compatibility match
      const aExactMatch = this.isExactMatch(anomaly, a);
      const bExactMatch = this.isExactMatch(anomaly, b);
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // Prefer earlier dates
      const aDate = new Date(a.startDate).getTime();
      const bDate = new Date(b.startDate).getTime();
      
      if (aDate !== bDate) {
        return aDate - bDate;
      }

      // Prefer windows with more available capacity
      const aCapacity = this.getAvailableCapacity(a);
      const bCapacity = this.getAvailableCapacity(b);
      
      return bCapacity - aCapacity;
    })[0];
  }

  /**
   * Check if anomaly is compatible with maintenance window
   */
  private static isCompatible(
    anomaly: Anomaly,
    window: MaintenanceWindow,
    requiredDuration: number
  ): boolean {
    // Check capacity
    const availableCapacity = this.getAvailableCapacity(window);
    if (availableCapacity < requiredDuration) {
      return false;
    }

    // Check type compatibility
    return this.isTypeCompatible(anomaly.criticalityLevel, window.type);
  }

  /**
   * Check if anomaly criticality matches window type exactly
   */
  private static isExactMatch(anomaly: Anomaly, window: MaintenanceWindow): boolean {
    const criticalityToType = {
      'critical': 'force',
      'high': 'minor',
      'medium': 'minor',
      'low': 'minor'
    };

    return criticalityToType[anomaly.criticalityLevel] === window.type;
  }

  /**
   * Check type compatibility between anomaly and window
   */
  private static isTypeCompatible(criticality: string, windowType: string): boolean {
    switch (windowType) {
      case 'force':
        return criticality === 'critical';
      case 'major':
        return ['critical', 'high', 'medium'].includes(criticality);
      case 'minor':
        return ['high', 'medium', 'low'].includes(criticality);
      default:
        return false;
    }
  }

  /**
   * Get available capacity for a maintenance window
   */
  private static getAvailableCapacity(window: MaintenanceWindow): number {
    const assigned = window.assignedAnomalies || [];
    const usedCapacity = assigned.reduce((sum, anomaly) => {
      return sum + (anomaly.estimatedHours || 8) / 24; // Convert hours to days
    }, 0);
    
    return Math.max(0, window.durationDays - usedCapacity);
  }

  /**
   * Sort anomalies by priority for assignment
   */
  private static sortAnomaliesByPriority(anomalies: Anomaly[]): Anomaly[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return [...anomalies].sort((a, b) => {
      // First by criticality
      const aPriority = priorityOrder[a.criticalityLevel] || 0;
      const bPriority = priorityOrder[b.criticalityLevel] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by creation date (oldest first for same criticality)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Create maintenance window for unassigned treated anomalies
   */
  static createWindowForTreatedAnomalies(
    treatedAnomalies: Anomaly[],
    actionPlans: ActionPlan[] = []
  ): MaintenanceWindow[] {
    const newWindows: MaintenanceWindow[] = [];
    
    // Group by criticality
    const criticalAnomalies = treatedAnomalies.filter(a => a.criticalityLevel === 'critical');
    const highAnomalies = treatedAnomalies.filter(a => a.criticalityLevel === 'high');
    const mediumLowAnomalies = treatedAnomalies.filter(a => 
      ['medium', 'low'].includes(a.criticalityLevel)
    );

    // Create force window for critical anomalies
    if (criticalAnomalies.length > 0) {
      const forceWindow = this.createWindow('force', criticalAnomalies, actionPlans);
      newWindows.push(forceWindow);
    }

    // Create minor window for high priority anomalies
    if (highAnomalies.length > 0) {
      const minorWindow = this.createWindow('minor', highAnomalies, actionPlans);
      newWindows.push(minorWindow);
    }

    // Create minor window for medium/low anomalies if there are enough
    if (mediumLowAnomalies.length >= 3) {
      const maintenanceWindow = this.createWindow('minor', mediumLowAnomalies, actionPlans);
      newWindows.push(maintenanceWindow);
    }

    return newWindows;
  }

  /**
   * Create a maintenance window for a group of anomalies
   */
  private static createWindow(
    type: 'force' | 'minor' | 'major',
    anomalies: Anomaly[],
    actionPlans: ActionPlan[]
  ): MaintenanceWindow {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    
    // Calculate duration based on anomalies
    const totalHours = anomalies.reduce((sum, anomaly) => {
      const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
      return sum + (actionPlan?.outageDuration || 1) * 24; // Convert days to hours
    }, 0);
    
    const duration = Math.max(1, Math.ceil(totalHours / 24)); // Convert back to days
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    // Create description
    const equipmentIds = anomalies.map(a => a.equipmentId).join(', ');
    const description = `Arrêt ${type} automatique - Équipements: ${equipmentIds}`;

    return {
      id: `auto-${type}-${Date.now()}`,
      type,
      durationDays: duration,
      startDate,
      endDate,
      description,
      status: 'planned',
      autoCreated: true,
      assignedAnomalies: anomalies.map(anomaly => ({
        ...anomaly,
        maintenanceWindowId: `auto-${type}-${Date.now()}`
      }))
    };
  }

  /**
   * Show user notification about automatic assignments
   */
  static showAssignmentResults(results: AssignmentResult[]): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (successful > 0) {
      toast.success(`${successful} anomalies traitées assignées automatiquement`);
    }

    if (failed > 0) {
      toast.error(`${failed} anomalies non assignées - Fenêtres incompatibles`);
    }

    // Log details for debugging
    console.log('Auto-assignment results:', results);
  }
}

export interface AssignmentResult {
  anomalyId: string;
  windowId: string | null;
  success: boolean;
  reason: string;
}

export default AutoPlanningService;
