import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  BarChart3,
  Eye
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { 
  TreatedAnomaliesPanel,
  WindowManagementGrid,
  PlanningStats,
  AutoScheduler,
  QuickActions
} from '../components/planning/new';
import { CreateWindowModal, WindowCreationData } from '../components/planning/new/CreateWindowModal';
import { useData } from '../contexts/DataContext';
import { usePlanningEngineReal } from '../hooks/usePlanningEngineReal';
import toast from 'react-hot-toast';

export const PlanningNew: React.FC = () => {
  const { 
    anomalies, 
    maintenanceWindows, 
    actionPlans,
    addMaintenanceWindow,
    updateMaintenanceWindow,
    updateAnomaly 
  } = useData();

  // Planning engine hook for intelligent scheduling (using real backend)
  const planningEngine = usePlanningEngineReal();

  // UI State
  const [activeView, setActiveView] = useState<'overview' | 'windows' | 'analytics'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'urgent' | 'scheduled' | 'unscheduled'>('all');
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [triggeringAnomaly, setTriggeringAnomaly] = useState<string | undefined>();

  // Computed data
  const treatedAnomalies = useMemo(() => 
    anomalies.filter(anomaly => anomaly.status === 'treated'),
    [anomalies]
  );

  const unscheduledTreatedAnomalies = useMemo(() =>
    treatedAnomalies.filter(anomaly => !anomaly.maintenanceWindowId),
    [treatedAnomalies]
  );

  const scheduledTreatedAnomalies = useMemo(() =>
    treatedAnomalies.filter(anomaly => !!anomaly.maintenanceWindowId),
    [treatedAnomalies]
  );

  const availableWindows = useMemo(() =>
    maintenanceWindows.filter(window => 
      window.status === 'planned' && 
      new Date(window.startDate) > new Date()
    ),
    [maintenanceWindows]
  );

  // Auto-scheduling effect
  useEffect(() => {
    if (autoScheduleEnabled && unscheduledTreatedAnomalies.length > 0) {
      const timer = setTimeout(() => {
        handleAutoSchedule();
      }, 2000); // Delay to prevent excessive calls

      return () => clearTimeout(timer);
    }
  }, [unscheduledTreatedAnomalies, autoScheduleEnabled]);

  // Auto-schedule treated anomalies
  const handleAutoSchedule = async () => {
    if (unscheduledTreatedAnomalies.length === 0) return;

    try {
      const scheduleResults = await planningEngine.autoScheduleTreatedAnomalies(
        unscheduledTreatedAnomalies,
        availableWindows,
        actionPlans
      );

      // Apply scheduling results
      if (scheduleResults.assignments && scheduleResults.assignments.length > 0) {
        scheduleResults.assignments.forEach((assignment: any) => {
          updateAnomaly(assignment.anomalyId, {
            maintenanceWindowId: assignment.windowId
          });
        });
      }

      // Create new windows if needed (they should already be created by the backend)
      if (scheduleResults.newWindows && scheduleResults.newWindows.length > 0) {
        // Windows are already created in the database by the backend service
        console.log(`${scheduleResults.newWindows.length} new windows created by backend`);
      }

      if (scheduleResults.assignments && scheduleResults.assignments.length > 0) {
        toast.success(
          `${scheduleResults.assignments.length} anomalies automatically scheduled`,
          { duration: 3000 }
        );
      }

    } catch (error) {
      console.error('Auto-scheduling error:', error);
      toast.error('Auto-scheduling failed');
    }
  };

  // Manual scheduling
  const handleManualSchedule = async (anomalyId: string, windowId: string) => {
    try {
      updateAnomaly(anomalyId, { maintenanceWindowId: windowId });
      
      const anomaly = anomalies.find(a => a.id === anomalyId);
      const window = maintenanceWindows.find(w => w.id === windowId);
      
      toast.success(
        `"${anomaly?.title}" scheduled to ${window?.type} maintenance window`
      );
    } catch (error) {
      toast.error('Failed to schedule anomaly');
    }
  };

  // Create new maintenance window - opens modal
  const handleCreateWindow = async (anomalyId?: string) => {
    setTriggeringAnomaly(anomalyId);
    setShowCreateModal(true);
  };

  // Handle window creation from modal
  const handleCreateWindowFromModal = async (windowData: WindowCreationData) => {
    try {
      // Map 'arret' type to 'minor' for backend compatibility
      const backendType: 'force' | 'minor' | 'major' = windowData.type === 'arret' ? 'minor' : windowData.type;

      // Create the window using the planning engine
      const newWindow = await planningEngine.createOptimalWindow(
        windowData.autoAssignAnomalies,
        actionPlans
      );

      // Update window with custom data
      const updatedWindow = {
        ...newWindow,
        type: backendType,
        durationDays: windowData.durationDays,
        startDate: windowData.startDate,
        endDate: windowData.endDate,
        description: windowData.description
      };

      addMaintenanceWindow(updatedWindow);

      // Assign anomalies to the window
      for (const anomalyId of windowData.autoAssignAnomalies) {
        updateAnomaly(anomalyId, { maintenanceWindowId: updatedWindow.id });
      }

      // TODO: Store scheduling details (dates and hours) in database
      // This would require extending the anomaly model or creating a scheduling table
      console.log('Scheduled times:', windowData.scheduledTimes);

      toast.success(`Fenêtre de maintenance ${windowData.type} créée avec ${windowData.autoAssignAnomalies.length} anomalie(s)`);
    } catch (error) {
      console.error('Error creating window:', error);
      toast.error('Erreur lors de la création de la fenêtre');
      throw error;
    }
  };

  // Batch operations
  const handleBatchSchedule = async (anomalyIds: string[], windowId: string) => {
    try {
      const updatePromises = anomalyIds.map(id => 
        updateAnomaly(id, { maintenanceWindowId: windowId })
      );
      
      await Promise.all(updatePromises);
      toast.success(`${anomalyIds.length} anomalies scheduled`);
    } catch (error) {
      toast.error('Batch scheduling failed');
    }
  };

  const handleOptimizeScheduling = async () => {
    try {
      const optimizationResults = await planningEngine.optimizeScheduling(
        treatedAnomalies,
        maintenanceWindows,
        actionPlans
      );

      // Apply optimizations (already applied by backend service)
      if (optimizationResults.reassignments && optimizationResults.reassignments.length > 0) {
        // Reassignments are already applied in the database by the backend service
        console.log(`${optimizationResults.reassignments.length} reassignments applied by backend`);
      }

      toast.success(
        `Scheduling optimized: ${optimizationResults.reassignments?.length || 0} changes applied`
      );
    } catch (error) {
      toast.error('Optimization failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              Smart Planning System
            </h1>
            <p className="text-gray-600 mt-2">
              Intelligent maintenance scheduling with automatic treated anomaly management
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Auto-schedule toggle */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-3 shadow-sm">
              <div className={`w-3 h-3 rounded-full ${autoScheduleEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">Auto-Schedule</span>
              <Button
                variant={autoScheduleEnabled ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setAutoScheduleEnabled(!autoScheduleEnabled)}
              >
                {autoScheduleEnabled ? 'ON' : 'OFF'}
              </Button>
            </div>

            {/* Quick actions */}
            <QuickActions
              onCreateWindow={() => handleCreateWindow()}
              onOptimize={handleOptimizeScheduling}
              onAutoSchedule={handleAutoSchedule}
              unscheduledCount={unscheduledTreatedAnomalies.length}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'windows', label: 'Windows', icon: Calendar },
            { id: 'analytics', label: 'Analytics', icon: Eye }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeView === tab.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveView(tab.id as any)}
              className="flex items-center gap-2"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <PlanningStats
        treatedAnomalies={treatedAnomalies}
        unscheduledCount={unscheduledTreatedAnomalies.length}
        scheduledCount={scheduledTreatedAnomalies.length}
        availableWindows={availableWindows.length}
        totalWindows={maintenanceWindows.length}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Left Panel - Treated Anomalies */}
        <div className="lg:col-span-1">
          <TreatedAnomaliesPanel
            anomalies={treatedAnomalies}
            unscheduledAnomalies={unscheduledTreatedAnomalies}
            onSchedule={handleManualSchedule}
            onCreateWindow={handleCreateWindow}
            onBatchSchedule={handleBatchSchedule}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
          />
        </div>

        {/* Right Panel - Windows Management */}
        <div className="lg:col-span-2">
          {activeView === 'overview' && (
            <WindowManagementGrid
              windows={maintenanceWindows}
              anomalies={treatedAnomalies}
              actionPlans={actionPlans}
              onScheduleAnomaly={handleManualSchedule}
              onCreateWindow={handleCreateWindow}
              onUpdateWindow={updateMaintenanceWindow}
            />
          )}

          {activeView === 'windows' && (
            <WindowManagementGrid
              windows={maintenanceWindows}
              anomalies={treatedAnomalies}
              actionPlans={actionPlans}
              onScheduleAnomaly={handleManualSchedule}
              onCreateWindow={handleCreateWindow}
              onUpdateWindow={updateMaintenanceWindow}
              viewMode="detailed"
            />
          )}

          {activeView === 'analytics' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Planning Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Advanced analytics coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Auto Scheduler Component */}
      {autoScheduleEnabled && (
        <AutoScheduler
          treatedAnomalies={unscheduledTreatedAnomalies}
          onScheduleComplete={handleAutoSchedule}
          enabled={autoScheduleEnabled}
        />
      )}

      {/* Create Window Modal */}
      <CreateWindowModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setTriggeringAnomaly(undefined);
        }}
        onCreateWindow={handleCreateWindowFromModal}
        triggeringAnomaly={triggeringAnomaly ? anomalies.find(a => a.id === triggeringAnomaly) : undefined}
        availableAnomalies={unscheduledTreatedAnomalies}
      />
    </div>
  );
};
