import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Anomaly } from '../../types';
import { formatDate, getCriticalityColor } from '../../lib/utils';
import toast from 'react-hot-toast';

interface AnomalyTableProps {
  anomalies: Anomaly[];
  onEdit?: (anomaly: Anomaly) => void;
  onDelete?: (anomaly: Anomaly) => void;
}

export const AnomalyTable: React.FC<AnomalyTableProps> = ({ 
  anomalies, 
  onEdit, 
  onDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof Anomaly>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'new', label: 'Nouveau' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'treated', label: 'Traité' },
    { value: 'closed', label: 'Fermé' },
  ];
  
  const serviceOptions = [
    { value: 'all', label: 'Tous les services' },
    { value: 'Production', label: 'Production' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Intégrité', label: 'Intégrité' },
    { value: 'Instrumentation', label: 'Instrumentation' },
    { value: 'Utilités', label: 'Utilités' },
  ];
  
  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'new': return 'info';
      case 'in_progress': return 'warning';
      case 'treated': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };
  
  const filteredAnomalies = anomalies.filter(anomaly => {
    const matchesSearch = (anomaly.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (anomaly.equipmentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (anomaly.responsiblePerson || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || anomaly.status === statusFilter;
    const matchesService = serviceFilter === 'all' || anomaly.service === serviceFilter;
    
    return matchesSearch && matchesStatus && matchesService;
  });
  
  const sortedAnomalies = [...filteredAnomalies].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    // Handle undefined/null values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
    if (bValue == null) return sortDirection === 'asc' ? 1 : -1;
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  const handleSort = (field: keyof Anomaly) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const handleExport = () => {
    try {
      // Create CSV content
      const headers = [
        'ID',
        'Équipement',
        'Description',
        'Service',
        'Responsable',
        'Statut',
        'Criticité',
        'Fiabilité/Intégrité',
        'Disponibilité',
        'Sécurité',
        'Date Création',
        'Heures Estimées',
        'Priorité'
      ];
      
      const csvContent = [
        headers.join(','),
        ...sortedAnomalies.map(anomaly => [
          anomaly.id,
          anomaly.equipmentId || '',
          `"${(anomaly.description || '').replace(/"/g, '""')}"`,
          anomaly.service || '',
          `"${(anomaly.responsiblePerson || '').replace(/"/g, '""')}"`,
          anomaly.status || '',
          anomaly.criticalityLevel || '',
          (anomaly.fiabiliteIntegriteScore || 0).toFixed(1),
          (anomaly.disponibiliteScore || 0).toFixed(1),
          (anomaly.processSafetyScore || 0).toFixed(1),
          formatDate(anomaly.createdAt),
          anomaly.estimatedHours || 0,
          anomaly.priority || 1
        ].join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `anomalies_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Export réalisé avec succès');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <CardTitle>Gestion des Anomalies</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher par description, équipement, ou responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            options={serviceOptions}
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('equipmentId')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Équipement</span>
                    {sortField === 'equipmentId' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criticité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Date</span>
                    {sortField === 'createdAt' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAnomalies.map((anomaly) => (
                <tr key={anomaly.id} className="hover:bg-gray-50">
                  {/* <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${getCriticalityColor(anomaly.criticalityLevel)}`} />
                      <div className="text-sm font-medium text-gray-900">
                        {anomaly.equipmentId || 'N/A'}
                      </div>
                    </div>
                  </td> */}
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={anomaly.description || 'N/A'}>
                      {anomaly.description || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {anomaly.service || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getBadgeVariant(anomaly.criticalityLevel || 'low')}>
                      {anomaly.criticalityLevel || 'low'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(anomaly.status || 'new')}>
                      {anomaly.status || 'new'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(anomaly.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Link to={`/anomaly/${anomaly.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      {onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(anomaly)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="ghost" size="sm" onClick={() => onDelete(anomaly)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {sortedAnomalies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucune anomalie trouvée.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};