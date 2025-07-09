import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AnomalyTable } from '../components/anomalies/AnomalyTable';
import { AnomalyModal } from '../components/anomalies/AnomalyModal';
import { useData } from '../contexts/DataContext';
import { Anomaly } from '../types';
import toast from 'react-hot-toast';

export const Anomalies: React.FC = () => {
  const { anomalies, addAnomaly, updateAnomaly, deleteAnomaly } = useData();
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

  const handleSaveAnomaly = (anomalyData: Omit<Anomaly, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingAnomaly) {
      // Update existing anomaly
      updateAnomaly(editingAnomaly.id, anomalyData);
      toast.success('Anomalie mise à jour avec succès');
    } else {
      // Create new anomaly
      addAnomaly(anomalyData);
      toast.success('Nouvelle anomalie créée avec succès');
    }
    setShowModal(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Anomalies</h1>
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