import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield, 
  Wrench, 
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { AnomalyChart } from '../components/dashboard/AnomalyChart';
import { ServiceDistribution } from '../components/dashboard/ServiceDistribution';
import { RecentAnomalies } from '../components/dashboard/RecentAnomalies';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { supabaseDashboardService, DashboardKPIs, AnomalyChartData, ServiceDistributionData } from '../services/supabaseDashboardService';
import { mockChartData } from '../data/mockData';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const { anomalies } = useData();
  const [dashboardKPIs, setDashboardKPIs] = useState<DashboardKPIs>({
    totalAnomalies: 0,
    openAnomalies: 0,
    criticalAnomalies: 0,
    averageResolutionTime: 0,
    treatmentRate: 0,
    safetyIncidents: 0,
    maintenanceWindowUtilization: 0,
    costImpact: 0
  });
  const [chartData, setChartData] = useState<AnomalyChartData[]>([]);
  const [serviceData, setServiceData] = useState<ServiceDistributionData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async (showToast = false) => {
    try {
      setLoading(true);
      
      // Load KPIs
      const kpis = await supabaseDashboardService.getDashboardKPIs();
      
      // Get change statistics
      const changeStats = await supabaseDashboardService.getChangeStatistics(kpis);
      kpis.changeStats = changeStats;
      
      setDashboardKPIs(kpis);

      // Load chart data
      const [anomalyChartData, serviceDistData] = await Promise.all([
        supabaseDashboardService.getAnomaliesChartData(),
        supabaseDashboardService.getServiceDistributionData()
      ]);

      setChartData(anomalyChartData);
      setServiceData(serviceDistData);
      
      if (showToast) {
        toast.success('Dashboard mis à jour avec succès');
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (showToast) {
        toast.error('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(false); // Don't show toast on initial load
  }, []);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadDashboardData(true)}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </Button>
          <div className="text-sm text-gray-500">
            Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
            {loading && <span className="ml-2 text-blue-600">Chargement...</span>}
          </div>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Anomalies Totales"
          value={dashboardKPIs.totalAnomalies}
          change={dashboardKPIs.changeStats?.totalChange || 0}
          changeType={dashboardKPIs.changeStats?.totalChange && dashboardKPIs.changeStats.totalChange >= 0 ? "increase" : "decrease"}
          icon={<AlertTriangle className="h-6 w-6 text-blue-600" />}
        />
        <MetricCard
          title="Anomalies Ouvertes"
          value={dashboardKPIs.openAnomalies}
          change={dashboardKPIs.changeStats?.openChange || 0}
          changeType={dashboardKPIs.changeStats?.openChange && dashboardKPIs.changeStats.openChange >= 0 ? "increase" : "decrease"}
          icon={<Clock className="h-6 w-6 text-orange-600" />}
        />
        <MetricCard
          title="Anomalies Critiques"
          value={dashboardKPIs.criticalAnomalies}
          change={dashboardKPIs.changeStats?.criticalChange || 0}
          changeType={dashboardKPIs.changeStats?.criticalChange && dashboardKPIs.changeStats.criticalChange >= 0 ? "increase" : "decrease"}
          icon={<Shield className="h-6 w-6 text-red-600" />}
        />
        <MetricCard
          title="Taux de Traitement"
          value={`${dashboardKPIs.treatmentRate}%`}
          change={dashboardKPIs.changeStats?.treatmentRateChange || 0}
          changeType={dashboardKPIs.changeStats?.treatmentRateChange && dashboardKPIs.changeStats.treatmentRateChange >= 0 ? "increase" : "decrease"}
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
        />
      </div>
      
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Temps Moyen Résolution"
          value={`${dashboardKPIs.averageResolutionTime}j`}
          change={-1.8}
          changeType="decrease"
          icon={<Clock className="h-6 w-6 text-orange-600" />}
        />
        <MetricCard
          title="Incidents Sécurité"
          value={dashboardKPIs.safetyIncidents}
          change={0}
          changeType="decrease"
          icon={<Shield className="h-6 w-6 text-red-600" />}
        />
        <MetricCard
          title="Utilisation Maintenance"
          value={`${dashboardKPIs.maintenanceWindowUtilization}%`}
          change={4.3}
          changeType="increase"
          icon={<Wrench className="h-6 w-6 text-indigo-600" />}
        />
        <MetricCard
          title="Impact Coût"
          value={`${dashboardKPIs.costImpact}M€`}
          change={-6.2}
          changeType="decrease"
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomalyChart data={chartData.length > 0 ? chartData : mockChartData.anomaliesByMonth} />
        <ServiceDistribution data={serviceData.length > 0 ? serviceData : mockChartData.anomaliesByService} />
      </div>
      
      {/* Recent Anomalies */}
      <RecentAnomalies anomalies={anomalies} />
    </div>
  );
};