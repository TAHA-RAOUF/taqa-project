import React, { useState } from 'react';
import { Plus, Database, WifiOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AnomalyTable } from '../components/anomalies/AnomalyTable';
import { AnomalyModal } from '../components/anomalies/AnomalyModal';
import { useData } from '../contexts/DataContext';
import { useAnomalyLogging } from '../hooks/useLogging';
import { Anomaly } from '../types';
import toast from 'react-hot-toast';

export const Anomalies: React.FC = () => {
  const { anomalies, addAnomaly, updateAnomaly, deleteAnomaly, isLoading, useBackend } = useData();
  const { 
    logAnomalyCreated, 
    logAnomalyUpdated, 
    logError 
  } = useAnomalyLogging();
  const [showModal, setShowModal] = useState(false);
  const [editingAnomaly, setEditingAnomaly] = useState<Anomaly | undefined>();
  
  const handleEdit = (anomaly: Anomaly) => {
    setEditingAnomaly(anomaly);
    setShowModal(true);
  };
  
  const handleDelete = (anomaly: Anomaly) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette anomalie ?')) {
      deleteAnomaly(anomaly.id);
      toast.success('Anomalie supprimée avec succès');
    }
  };

  const handleCreateNew = () => {
    setEditingAnomaly(undefined);
    setShowModal(true);
  };

  const handleSaveAnomaly = async (anomalyData: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingAnomaly) {
        // Update existing anomaly
        const oldData = { ...editingAnomaly };
        updateAnomaly(editingAnomaly.id, anomalyData);
        
        // Log the update
        await logAnomalyUpdated(editingAnomaly.id, oldData, anomalyData);
        
        toast.success('Anomalie mise à jour avec succès');
      } else {
        // Create new anomaly
        addAnomaly(anomalyData);
        
        // Log the creation (we'll need to get the new ID from the context)
        const newAnomalyId = `anomaly-${Date.now()}`;
        await logAnomalyCreated(newAnomalyId, anomalyData);
        
        toast.success('Nouvelle anomalie créée avec succès');
      }
      setShowModal(false);
    } catch (error) {
      await logError(error as Error, 'anomaly-save');
      toast.error('Erreur lors de la sauvegarde de l\'anomalie');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Anomalies</h1>
          {/* Data source status indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            useBackend 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {useBackend ? (
              <>
                <Database className="h-4 w-4" />
                Supabase
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                Données locales
              </>
            )}
          </div>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Anomalie
        </Button>
      </div>
      
      <AnomalyTable 
        anomalies={anomalies}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      <AnomalyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveAnomaly}
        editAnomaly={editingAnomaly}
      />
    </div>
  );
};