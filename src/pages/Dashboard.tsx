import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Shield, 
  Wrench, 
  DollarSign,
  Activity
} from 'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { AnomalyChart } from '../components/dashboard/AnomalyChart';
import { ServiceDistribution } from '../components/dashboard/ServiceDistribution';
import { RecentAnomalies } from '../components/dashboard/RecentAnomalies';
import { useData } from '../contexts/DataContext';
import { mockDashboardMetrics, mockChartData } from '../data/mockData';

export const Dashboard: React.FC = () => {
  const { anomalies, getAnomalyStats } = useData();
  const stats = getAnomalyStats();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Anomalies Totales"
          value={stats.total}
          change={5.2}
          changeType="increase"
          icon={<AlertTriangle className="h-6 w-6 text-blue-600" />}
        />
        <MetricCard
          title="Anomalies Ouvertes"
          value={stats.open}
          change={-2.1}
          changeType="decrease"
          icon={<Clock className="h-6 w-6 text-orange-600" />}
        />
        <MetricCard
          title="Anomalies Critiques"
          value={stats.critical}
          change={8.5}
          changeType="increase"
          icon={<Shield className="h-6 w-6 text-red-600" />}
        />
        <MetricCard
          title="Taux de Traitement"
          value={`${mockDashboardMetrics.treatmentRate}%`}
          change={3.2}
          changeType="increase"
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
        />
      </div>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Temps Moyen Résolution"
          value={`${mockDashboardMetrics.averageResolutionTime}j`}
          change={-1.8}
          changeType="decrease"
          icon={<Activity className="h-6 w-6 text-purple-600" />}
        />
        <MetricCard
          title="Incidents Sécurité"
          value={mockDashboardMetrics.safetyIncidents}
          change={0}
          changeType="decrease"
          icon={<Shield className="h-6 w-6 text-red-600" />}
        />
        <MetricCard
          title="Utilisation Maintenance"
          value={`${mockDashboardMetrics.maintenanceWindowUtilization}%`}
          change={4.3}
          changeType="increase"
          icon={<Wrench className="h-6 w-6 text-indigo-600" />}
        />
        <MetricCard
          title="Impact Coût"
          value={`${mockDashboardMetrics.costImpact}M€`}
          change={-6.2}
          changeType="decrease"
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomalyChart data={mockChartData.anomaliesByMonth} />
        <ServiceDistribution data={mockChartData.anomaliesByService} />
      </div>
      
      {/* Recent Anomalies */}
      <RecentAnomalies anomalies={anomalies} />
    </div>
  );
};