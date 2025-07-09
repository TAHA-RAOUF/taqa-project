import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { Planning } from '../src/pages/Planning';
import { DataProvider } from '../src/contexts/DataContext';
import AutoPlanningService from '../src/services/autoPlanningService';

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn()
}));

jest.mock('../src/services/autoPlanningService', () => ({
  autoAssignTreatedAnomalies: jest.fn(),
  showAssignmentResults: jest.fn(),
  createWindowForTreatedAnomalies: jest.fn()
}));

jest.mock('../src/hooks/useLogging', () => ({
  usePlanningLogging: () => ({
    logWindowCreated: jest.fn(),
    logWindowUpdated: jest.fn(),
    logAutoScheduling: jest.fn(),
    logManualScheduling: jest.fn(),
    logError: jest.fn()
  })
}));

jest.mock('../src/hooks/useIntelligentPlanning', () => ({
  useIntelligentPlanning: () => ({
    autoScheduleEnabled: true,
    setAutoScheduleEnabled: jest.fn(),
    schedulingInProgress: false
  })
}));

// Test suite for Planning component
describe('Planning Component', () => {
  // Sample test data
  const mockAnomalies = [
    {
      id: 'a1',
      title: 'Critical Issue',
      description: 'A critical issue',
      equipmentId: 'EQ001',
      status: 'treated',
      criticalityLevel: 'critical',
      estimatedHours: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'a2',
      title: 'High Priority Issue',
      description: 'A high priority issue',
      equipmentId: 'EQ002',
      status: 'treated',
      criticalityLevel: 'high',
      estimatedHours: 8,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'a3',
      title: 'New Issue',
      description: 'A new issue',
      equipmentId: 'EQ003',
      status: 'new',
      criticalityLevel: 'medium',
      estimatedHours: 6,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  const mockWindows = [
    {
      id: 'w1',
      type: 'force',
      durationDays: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      description: 'Force maintenance window',
      status: 'planned',
      assignedAnomalies: []
    },
    {
      id: 'w2',
      type: 'minor',
      durationDays: 3,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 86400000 * 4),
      description: 'Minor maintenance window',
      status: 'planned',
      assignedAnomalies: []
    }
  ];
  
  const mockActionPlans = [
    {
      id: 'ap1',
      anomalyId: 'a1',
      needsOutage: true,
      outageType: 'force',
      outageDuration: 1,
      totalDurationHours: 12,
      priority: 1,
      status: 'approved',
      actions: [],
      completionPercentage: 0,
      estimatedCost: 1000,
      comments: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockDataContext = {
    anomalies: mockAnomalies,
    maintenanceWindows: mockWindows,
    actionPlans: mockActionPlans,
    addMaintenanceWindow: jest.fn(),
    updateMaintenanceWindow: jest.fn(),
    updateAnomaly: jest.fn()
  };

  // Mock implementation for auto-assignment
  const mockAssignmentResults = {
    updatedAnomalies: [...mockAnomalies],
    updatedWindows: [...mockWindows],
    assignmentResults: [
      {
        anomalyId: 'a1',
        windowId: 'w1',
        success: true,
        reason: 'Assigned to force maintenance window'
      },
      {
        anomalyId: 'a2',
        windowId: 'w2',
        success: true,
        reason: 'Assigned to minor maintenance window'
      }
    ]
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up the mock implementation for auto assignment
    AutoPlanningService.autoAssignTreatedAnomalies.mockReturnValue(mockAssignmentResults);
    
    // Mock implementation for window creation
    AutoPlanningService.createWindowForTreatedAnomalies.mockReturnValue([
      {
        id: 'new-w1',
        type: 'force',
        durationDays: 1,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        description: 'Auto-created force window',
        status: 'planned',
        assignedAnomalies: [mockAnomalies[0]]
      }
    ]);
  });

  test('Auto-assigns treated anomalies when component mounts', async () => {
    // Render the component with mocked context
    render(
      <DataProvider value={mockDataContext}>
        <Planning />
      </DataProvider>
    );

    // Check that auto assignment was called
    await waitFor(() => {
      expect(AutoPlanningService.autoAssignTreatedAnomalies).toHaveBeenCalledWith(
        expect.arrayContaining([mockAnomalies[0], mockAnomalies[1]]), // Only treated anomalies
        mockWindows,
        mockActionPlans
      );
    });

    // Check that the results are shown
    expect(AutoPlanningService.showAssignmentResults).toHaveBeenCalledWith(
      mockAssignmentResults.assignmentResults
    );

    // Check that anomalies were updated
    expect(mockDataContext.updateAnomaly).toHaveBeenCalledWith('a1', { maintenanceWindowId: 'w1' });
    expect(mockDataContext.updateAnomaly).toHaveBeenCalledWith('a2', { maintenanceWindowId: 'w2' });
  });

  test('Manually assigns an anomaly to a window', async () => {
    // Render the component
    render(
      <DataProvider value={mockDataContext}>
        <Planning />
      </DataProvider>
    );

    // Find and click the "Assign Treated" button
    const assignButton = screen.getByText('Assigner Traitées');
    fireEvent.click(assignButton);

    // Check that auto-assignment is called
    expect(AutoPlanningService.autoAssignTreatedAnomalies).toHaveBeenCalled();
  });

  test('Creates windows for treated anomalies when no windows exist', async () => {
    // Mock empty windows array
    const noWindowsContext = {
      ...mockDataContext,
      maintenanceWindows: []
    };

    // Render the component
    render(
      <DataProvider value={noWindowsContext}>
        <Planning />
      </DataProvider>
    );

    // Find and click the "Create Window" button in TreatedAnomaliesStatus
    const createWindowButton = screen.getByText('Créer Fenêtres');
    fireEvent.click(createWindowButton);

    // Check that window creation is called
    expect(AutoPlanningService.createWindowForTreatedAnomalies).toHaveBeenCalledWith(
      expect.arrayContaining([mockAnomalies[0], mockAnomalies[1]]),
      mockActionPlans
    );

    // Check that the new window is added
    expect(mockDataContext.addMaintenanceWindow).toHaveBeenCalled();
  });

  test('Toggles auto-assignment feature', async () => {
    // Render the component
    render(
      <DataProvider value={mockDataContext}>
        <Planning />
      </DataProvider>
    );

    // Initial state should be auto-assignment enabled
    expect(screen.getByText('Auto-assign: ON')).toBeInTheDocument();

    // Find and click the toggle button
    const toggleButton = screen.getByText('Désactiver');
    fireEvent.click(toggleButton);

    // Check that the status changes
    expect(screen.getByText('Auto-assign: OFF')).toBeInTheDocument();

    // Click again to re-enable
    const enableButton = screen.getByText('Activer');
    fireEvent.click(enableButton);

    // Check that status changes back
    expect(screen.getByText('Auto-assign: ON')).toBeInTheDocument();
  });
});
