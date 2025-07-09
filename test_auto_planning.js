// Test script for autoPlanningService

// Mock the types and services we need
class AutoPlanningService {
  static getAvailableHours(window) {
    const assigned = window.assignedAnomalies || [];
    const totalWindowHours = window.durationDays * 24; // Convert days to hours
    
    // Calculate used hours based on estimated hours of assigned anomalies
    const usedHours = assigned.reduce((sum, anomaly) => {
      return sum + (anomaly.estimatedHours || 8); // Default to 8 hours if not specified
    }, 0);
    
    // Account for buffer time between anomalies (2 hours buffer per anomaly)
    const bufferHours = assigned.length > 0 ? (assigned.length * 2) : 0;
    
    // Calculate available hours
    return Math.max(0, totalWindowHours - usedHours - bufferHours);
  }
  
  static isTypeCompatible(criticality, windowType) {
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
  
  static autoAssignTreatedAnomalies(anomalies, maintenanceWindows, actionPlans = []) {
    const updatedAnomalies = [...anomalies];
    const updatedWindows = [...maintenanceWindows];
    const assignmentResults = [];

    console.log('Starting auto assignment of treated anomalies');

    // Find treated anomalies that are not yet assigned to any window
    const treatedAnomalies = anomalies.filter(anomaly => 
      anomaly.status === 'treated' && 
      !anomaly.maintenanceWindowId
    );
    
    console.log(`Found ${treatedAnomalies.length} treated unassigned anomalies`);

    // Find open maintenance windows (planned or in_progress)
    const openWindows = maintenanceWindows.filter(window => 
      window.status === 'planned' || window.status === 'in_progress'
    );
    
    console.log(`Found ${openWindows.length} open maintenance windows`);
    
    // Log the initial capacity of each window
    openWindows.forEach(window => {
      const availableHours = this.getAvailableHours(window);
      console.log(`Window ${window.id} (${window.description || 'No description'}): ${availableHours} hours available, type: ${window.type}`);
    });

    if (treatedAnomalies.length === 0) {
      console.log('No treated anomalies to assign');
      return {
        updatedAnomalies,
        updatedWindows,
        assignmentResults: []
      };
    }

    if (openWindows.length === 0) {
      console.log('No open windows available, suggesting new ones');
      return {
        updatedAnomalies,
        updatedWindows,
        assignmentResults: []
      };
    }

    // Sort anomalies by criticality (critical first)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const sortedAnomalies = [...treatedAnomalies].sort((a, b) => {
      // First by criticality
      const aPriority = priorityOrder[a.criticalityLevel] || 0;
      const bPriority = priorityOrder[b.criticalityLevel] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by creation date (oldest first for same criticality)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    console.log(`Sorted ${sortedAnomalies.length} anomalies by priority`);
    console.log('Priority order:', sortedAnomalies.map(a => `${a.id} (${a.criticalityLevel})`).join(', '));

    // Create a working copy of open windows that we'll update as we assign anomalies
    let workingWindows = [...openWindows];
    
    // Assign anomalies to windows
    for (const anomaly of sortedAnomalies) {
      console.log(`\nProcessing anomaly ${anomaly.id}`);
      console.log(`Status: ${anomaly.status}, Criticality: ${anomaly.criticalityLevel}, Estimated Hours: ${anomaly.estimatedHours || 'unknown'}`);
      
      // Find the action plan for this anomaly to determine actual required hours
      const actionPlan = actionPlans.find(ap => ap.anomalyId === anomaly.id);
      
      // Use estimated hours from anomaly or action plan
      const requiredHours = anomaly.estimatedHours || 
                          (actionPlan?.totalDurationHours) || 
                          (actionPlan?.outageDuration ? actionPlan.outageDuration * 8 : 8); // Convert outage duration from days to hours
                          
      console.log(`Anomaly ${anomaly.id} requires ${requiredHours} hours`);

      // Filter windows that have enough capacity for this anomaly
      const compatibleWindows = workingWindows.filter(window => {
        const isTypeCompatible = this.isTypeCompatible(anomaly.criticalityLevel, window.type);
        const availableHours = this.getAvailableHours(window);
        const hasEnoughCapacity = availableHours >= requiredHours;
        
        console.log(`Window ${window.id}: Type compatible: ${isTypeCompatible}, Available hours: ${availableHours}, Required: ${requiredHours}`);
        
        return isTypeCompatible && hasEnoughCapacity;
      });
      
      if (compatibleWindows.length === 0) {
        console.log(`No compatible windows found for anomaly ${anomaly.id}`);
        assignmentResults.push({
          anomalyId: anomaly.id,
          windowId: null,
          success: false,
          reason: 'No compatible maintenance window found'
        });
        continue;
      }
      
      // Sort by preference: exact match type > best fit for hours
      const bestWindow = compatibleWindows.sort((a, b) => {
        // Prefer exact compatibility match
        const criticalityToType = {
          'critical': 'force',
          'high': 'minor',
          'medium': 'minor',
          'low': 'minor'
        };
        const aExactMatch = criticalityToType[anomaly.criticalityLevel] === a.type;
        const bExactMatch = criticalityToType[anomaly.criticalityLevel] === b.type;
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // Prefer windows where this anomaly will fit best (best fit algorithm)
        // This prevents small jobs from taking large windows unnecessarily
        const aAvailableHours = this.getAvailableHours(a);
        const bAvailableHours = this.getAvailableHours(b);
        const aDifference = aAvailableHours - requiredHours;
        const bDifference = bAvailableHours - requiredHours;
        
        // Choose the window with the smallest non-negative difference (best fit)
        if (aDifference >= 0 && bDifference >= 0) {
          return aDifference - bDifference; // Smaller difference is better
        }
        
        // Prefer earlier dates if best fit is equivalent
        const aDate = new Date(a.startDate).getTime();
        const bDate = new Date(b.startDate).getTime();
        
        return aDate - bDate;
      })[0];
      
      if (bestWindow) {
        console.log(`Found best window: ${bestWindow.id} (${bestWindow.description || 'No description'})`);
        
        // Assign anomaly to window
        const anomalyIndex = updatedAnomalies.findIndex(a => a.id === anomaly.id);
        const windowIndex = updatedWindows.findIndex(w => w.id === bestWindow.id);
        
        if (anomalyIndex !== -1 && windowIndex !== -1) {
          // Update anomaly
          updatedAnomalies[anomalyIndex] = {
            ...updatedAnomalies[anomalyIndex],
            maintenanceWindowId: bestWindow.id
          };

          // Update window in our main result
          const currentAssigned = updatedWindows[windowIndex].assignedAnomalies || [];
          updatedWindows[windowIndex] = {
            ...updatedWindows[windowIndex],
            assignedAnomalies: [...currentAssigned, updatedAnomalies[anomalyIndex]]
          };
          
          // Update our working copy of windows
          const workingWindowIndex = workingWindows.findIndex(w => w.id === bestWindow.id);
          if (workingWindowIndex !== -1) {
            const workingCurrentAssigned = workingWindows[workingWindowIndex].assignedAnomalies || [];
            workingWindows[workingWindowIndex] = {
              ...workingWindows[workingWindowIndex],
              assignedAnomalies: [...workingCurrentAssigned, updatedAnomalies[anomalyIndex]]
            };
          }
          
          // Log the remaining capacity after assignment
          const remainingHours = this.getAvailableHours(workingWindows[workingWindowIndex]);
          console.log(`Assigned to window ${bestWindow.id}. Remaining capacity: ${remainingHours} hours`);

          assignmentResults.push({
            anomalyId: anomaly.id,
            windowId: bestWindow.id,
            success: true,
            reason: `Assigned to ${bestWindow.type} maintenance window`
          });
        }
      }
    }
    
    // Log assignment results
    console.log(`\nAssignment complete. ${assignmentResults.filter(r => r.success).length} anomalies assigned.`);
    console.log(`${assignmentResults.filter(r => !r.success).length} anomalies could not be assigned.`);

    return {
      updatedAnomalies,
      updatedWindows,
      assignmentResults
    };
  }
}

// Create test data
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

const testAnomalies = [
  {
    id: 'a1',
    status: 'treated',
    criticalityLevel: 'critical',
    estimatedHours: 10,
    equipmentId: 'EQ001',
    createdAt: new Date(today.getTime() - 86400000 * 5), // 5 days ago
  },
  {
    id: 'a2',
    status: 'treated',
    criticalityLevel: 'high',
    estimatedHours: 8,
    equipmentId: 'EQ002',
    createdAt: new Date(today.getTime() - 86400000 * 10), // 10 days ago
  },
  {
    id: 'a3',
    status: 'treated',
    criticalityLevel: 'medium',
    estimatedHours: 12,
    equipmentId: 'EQ003',
    createdAt: new Date(today.getTime() - 86400000 * 3), // 3 days ago
  },
  {
    id: 'a4',
    status: 'treated',
    criticalityLevel: 'low',
    estimatedHours: 6,
    equipmentId: 'EQ004',
    createdAt: new Date(today.getTime() - 86400000 * 15), // 15 days ago
  },
  {
    id: 'a5',
    status: 'treated',
    criticalityLevel: 'critical',
    estimatedHours: 24,
    equipmentId: 'EQ005',
    createdAt: new Date(today.getTime() - 86400000 * 1), // 1 day ago
  },
  {
    id: 'a6',
    status: 'new', // This one shouldn't be assigned as it's not treated
    criticalityLevel: 'high',
    estimatedHours: 16,
    equipmentId: 'EQ006',
    createdAt: today,
  },
];

const testWindows = [
  {
    id: 'w1',
    type: 'force',
    durationDays: 1,
    startDate: tomorrow,
    endDate: new Date(tomorrow.getTime() + 86400000),
    description: 'Force maintenance window',
    status: 'planned',
    assignedAnomalies: []
  },
  {
    id: 'w2',
    type: 'minor',
    durationDays: 3,
    startDate: nextWeek,
    endDate: new Date(nextWeek.getTime() + 86400000 * 3),
    description: 'Minor maintenance window',
    status: 'planned',
    assignedAnomalies: []
  },
  {
    id: 'w3',
    type: 'major',
    durationDays: 7,
    startDate: new Date(nextWeek.getTime() + 86400000 * 7),
    endDate: new Date(nextWeek.getTime() + 86400000 * 14),
    description: 'Major maintenance window',
    status: 'planned',
    assignedAnomalies: []
  }
];

const testActionPlans = [
  {
    id: 'ap1',
    anomalyId: 'a1',
    needsOutage: true,
    outageType: 'force',
    outageDuration: 1, // in days
    totalDurationHours: 12
  },
  {
    id: 'ap2',
    anomalyId: 'a2',
    needsOutage: true,
    outageType: 'minor',
    outageDuration: 1,
    totalDurationHours: 10
  }
];

console.log('=== AUTO PLANNING TEST SCENARIO ===');

// Run the auto assignment
const result = AutoPlanningService.autoAssignTreatedAnomalies(
  testAnomalies,
  testWindows,
  testActionPlans
);

// Output detailed results
console.log('\n=== ASSIGNMENT RESULTS ===');
result.assignmentResults.forEach(ar => {
  const anomaly = testAnomalies.find(a => a.id === ar.anomalyId);
  const window = ar.windowId ? testWindows.find(w => w.id === ar.windowId) : null;
  
  console.log(`Anomaly ${ar.anomalyId} (${anomaly?.criticalityLevel}, ${anomaly?.estimatedHours}h):`);
  if (ar.success) {
    console.log(`  SUCCESS: Assigned to window ${ar.windowId} (${window?.type}, ${window?.durationDays} days)`);
  } else {
    console.log(`  FAILED: ${ar.reason}`);
  }
});

// Analyze window capacities after assignment
console.log('\n=== FINAL WINDOW CAPACITIES ===');
result.updatedWindows.forEach(window => {
  const assignedCount = window.assignedAnomalies?.length || 0;
  const totalHours = window.durationDays * 24;
  const usedHours = window.assignedAnomalies?.reduce((sum, a) => sum + (a.estimatedHours || 8), 0) || 0;
  const remainingHours = AutoPlanningService.getAvailableHours(window);
  const utilizationPercentage = Math.round((usedHours / totalHours) * 100);
  
  console.log(`Window ${window.id} (${window.type}, ${window.durationDays} days):`);
  console.log(`  Assigned anomalies: ${assignedCount}`);
  console.log(`  Total capacity: ${totalHours} hours`);
  console.log(`  Used capacity: ${usedHours} hours`);
  console.log(`  Remaining capacity: ${remainingHours} hours`);
  console.log(`  Utilization: ${utilizationPercentage}%`);
  
  if (window.assignedAnomalies && window.assignedAnomalies.length > 0) {
    console.log('  Assigned anomalies:');
    window.assignedAnomalies.forEach(anomaly => {
      console.log(`    - ${anomaly.id} (${anomaly.criticalityLevel}, ${anomaly.estimatedHours}h)`);
    });
  }
});

// Create a more complex scenario with already assigned anomalies
console.log('\n\n=== COMPLEX SCENARIO WITH ALREADY ASSIGNED ANOMALIES ===');

// Add some already assigned anomalies to windows
const complexWindows = [
  {
    id: 'cw1',
    type: 'force',
    durationDays: 1,
    startDate: tomorrow,
    endDate: new Date(tomorrow.getTime() + 86400000),
    description: 'Force maintenance window with existing assignments',
    status: 'planned',
    assignedAnomalies: [
      {
        id: 'ca1',
        status: 'treated',
        criticalityLevel: 'critical',
        estimatedHours: 8,
        equipmentId: 'EQ010',
      }
    ]
  },
  {
    id: 'cw2',
    type: 'minor',
    durationDays: 3,
    startDate: nextWeek,
    endDate: new Date(nextWeek.getTime() + 86400000 * 3),
    description: 'Minor maintenance window with existing assignments',
    status: 'planned',
    assignedAnomalies: [
      {
        id: 'ca2',
        status: 'treated',
        criticalityLevel: 'high',
        estimatedHours: 16,
        equipmentId: 'EQ011',
      },
      {
        id: 'ca3',
        status: 'treated',
        criticalityLevel: 'medium',
        estimatedHours: 12,
        equipmentId: 'EQ012',
      }
    ]
  },
  {
    id: 'cw3',
    type: 'major',
    durationDays: 7,
    startDate: new Date(nextWeek.getTime() + 86400000 * 7),
    endDate: new Date(nextWeek.getTime() + 86400000 * 14),
    description: 'Major maintenance window (empty)',
    status: 'planned',
    assignedAnomalies: []
  }
];

// New anomalies for complex scenario
const complexAnomalies = [
  {
    id: 'ca4',
    status: 'treated',
    criticalityLevel: 'critical',
    estimatedHours: 10,
    equipmentId: 'EQ013',
    createdAt: new Date(today.getTime() - 86400000 * 2),
  },
  {
    id: 'ca5',
    status: 'treated',
    criticalityLevel: 'high',
    estimatedHours: 20,
    equipmentId: 'EQ014',
    createdAt: new Date(today.getTime() - 86400000 * 4),
  },
  {
    id: 'ca6',
    status: 'treated',
    criticalityLevel: 'medium',
    estimatedHours: 16,
    equipmentId: 'EQ015',
    createdAt: today,
  },
  {
    id: 'ca7',
    status: 'treated',
    criticalityLevel: 'low',
    estimatedHours: 8,
    equipmentId: 'EQ016',
    createdAt: new Date(today.getTime() - 86400000 * 8),
  }
];

// Run the complex scenario
const complexResult = AutoPlanningService.autoAssignTreatedAnomalies(
  complexAnomalies,
  complexWindows,
  [] // No action plans for this scenario
);

// Output detailed results for complex scenario
console.log('\n=== COMPLEX SCENARIO ASSIGNMENT RESULTS ===');
complexResult.assignmentResults.forEach(ar => {
  const anomaly = complexAnomalies.find(a => a.id === ar.anomalyId);
  const window = ar.windowId ? complexWindows.find(w => w.id === ar.windowId) : null;
  
  console.log(`Anomaly ${ar.anomalyId} (${anomaly?.criticalityLevel}, ${anomaly?.estimatedHours}h):`);
  if (ar.success) {
    console.log(`  SUCCESS: Assigned to window ${ar.windowId} (${window?.type}, ${window?.durationDays} days)`);
  } else {
    console.log(`  FAILED: ${ar.reason}`);
  }
});

// Analyze final complex window capacities
console.log('\n=== COMPLEX SCENARIO FINAL WINDOW CAPACITIES ===');
complexResult.updatedWindows.forEach(window => {
  const assignedCount = window.assignedAnomalies?.length || 0;
  const totalHours = window.durationDays * 24;
  const usedHours = window.assignedAnomalies?.reduce((sum, a) => sum + (a.estimatedHours || 8), 0) || 0;
  const remainingHours = AutoPlanningService.getAvailableHours(window);
  const utilizationPercentage = Math.round((usedHours / totalHours) * 100);
  
  console.log(`Window ${window.id} (${window.type}, ${window.durationDays} days):`);
  console.log(`  Assigned anomalies: ${assignedCount}`);
  console.log(`  Total capacity: ${totalHours} hours`);
  console.log(`  Used capacity: ${usedHours} hours`);
  console.log(`  Remaining capacity: ${remainingHours} hours`);
  console.log(`  Utilization: ${utilizationPercentage}%`);
  
  if (window.assignedAnomalies && window.assignedAnomalies.length > 0) {
    console.log('  Assigned anomalies:');
    window.assignedAnomalies.forEach(anomaly => {
      console.log(`    - ${anomaly.id} (${anomaly.criticalityLevel}, ${anomaly.estimatedHours}h)`);
    });
  }
});

console.log('\n=== TEST COMPLETE ===');
