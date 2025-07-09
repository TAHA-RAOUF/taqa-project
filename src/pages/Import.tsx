import React from 'react';
import { FileText, Download, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ImportWizard } from '../components/import/ImportWizard';

export const Import: React.FC = () => {
  const handleImport = (files: File[]) => {
    console.log('Import files:', files);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Import de Données</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Modèle Excel
          </Button>
          <Button variant="outline">
            <HelpCircle className="h-4 w-4 mr-2" />
            Guide d'import
          </Button>
        </div>
      </div>
      
      <ImportWizard onImport={handleImport} />
      
      <Card>
        <CardHeader>
          <CardTitle>Format des Données</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Champs Obligatoires</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Title:</strong> Titre de l'anomalie</li>
                <li>• <strong>Description:</strong> Description détaillée</li>
                <li>• <strong>Equipment ID:</strong> Identifiant équipement</li>
                <li>• <strong>Service:</strong> Service responsable</li>
                <li>• <strong>Responsible Person:</strong> Personne responsable</li>
                <li>• <strong>Origin Source:</strong> Source de détection</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Champs Optionnels</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Status:</strong> Statut (défaut: nouveau)</li>
                <li>• <strong>Priority:</strong> Priorité (1-5)</li>
                <li>• <strong>Estimated Hours:</strong> Heures estimées</li>
                <li>• <strong>Comments:</strong> Commentaires</li>
                <li>• <strong>REX:</strong> Retour d'expérience</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Intelligence Artificielle</span>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              Notre système IA analyse automatiquement chaque anomalie importée pour prédire sa criticité 
              basée sur les scores de Fiabilité, Intégrité, Disponibilité et Sécurité Process.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};