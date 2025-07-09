import React, { useState } from 'react';
import { Upload, File, X, Download, Trash } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface REXFileUploadProps {
  anomalyId: string;
  isEnabled: boolean;
}

export const REXFileUpload: React.FC<REXFileUploadProps> = ({ anomalyId, isEnabled }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ name: string; url: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing REX file on component mount
  React.useEffect(() => {
    async function loadExistingFile() {
      if (anomalyId) {
        setIsLoading(true);
        try {
          // Query the rex_files table to check if this anomaly has a file
          const { data, error } = await supabase
            .from('rex_files')
            .select('filename, file_path')
            .eq('anomaly_id', anomalyId)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error checking for REX file:', error);
          }

          if (data) {
            // Get the download URL for the file
            const { data: urlData, error: urlError } = await supabase
              .storage
              .from('rex_files')
              .createSignedUrl(data.file_path, 3600); // 1 hour link validity

            if (urlError) {
              console.error('Error getting file URL:', urlError);
            } else if (urlData) {
              setCurrentFile({
                name: data.filename,
                url: urlData.signedUrl
              });
            }
          }
        } catch (err) {
          console.error('Error in loadExistingFile:', err);
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadExistingFile();
  }, [anomalyId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to storage
      const filePath = `${anomalyId}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('rex_files')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
      }

      // 2. Add record to rex_files table
      const { error: dbError } = await supabase
        .from('rex_files')
        .insert([{
          anomaly_id: anomalyId,
          filename: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type
        }]);

      if (dbError) {
        throw new Error(`Erreur lors de l'enregistrement des données: ${dbError.message}`);
      }

      // 3. Get download URL
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from('rex_files')
        .createSignedUrl(filePath, 3600); // 1 hour link validity

      if (urlError) {
        console.error('Error getting file URL:', urlError);
      } else if (urlData) {
        setCurrentFile({
          name: selectedFile.name,
          url: urlData.signedUrl
        });
      }

      toast.success('Fichier REX uploadé avec succès');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading REX file:', error);
      toast.error('Erreur lors de l\'upload du fichier');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async () => {
    if (!currentFile || !window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier REX?')) {
      return;
    }

    try {
      // 1. Get the file path
      const { data, error: fetchError } = await supabase
        .from('rex_files')
        .select('file_path')
        .eq('anomaly_id', anomalyId)
        .single();

      if (fetchError) {
        throw new Error(`Erreur lors de la récupération du fichier: ${fetchError.message}`);
      }

      // 2. Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('rex_files')
        .remove([data.file_path]);

      if (storageError) {
        throw new Error(`Erreur lors de la suppression du fichier: ${storageError.message}`);
      }

      // 3. Delete from database
      const { error: dbError } = await supabase
        .from('rex_files')
        .delete()
        .eq('anomaly_id', anomalyId);

      if (dbError) {
        throw new Error(`Erreur lors de la suppression des données: ${dbError.message}`);
      }

      setCurrentFile(null);
      toast.success('Fichier REX supprimé avec succès');
    } catch (error) {
      console.error('Error deleting REX file:', error);
      toast.error('Erreur lors de la suppression du fichier');
    }
  };

  if (!isEnabled) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 text-center">
        <p className="text-sm text-gray-600">
          Le dépôt de fichier REX sera disponible lorsque toutes les actions seront terminées et que l'anomalie sera marquée comme traitée.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <File className="h-5 w-5 mr-2" />
        Fichier REX
      </h3>

      {!currentFile ? (
        <div>
          <div className="border-dashed border-2 border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-1 text-sm text-gray-600">
              Déposez votre fichier REX ici ou{' '}
              <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                parcourez
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
              </label>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, Word, Excel, PowerPoint ou TXT jusqu'à 10MB
            </p>
          </div>
          
          {selectedFile && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <File className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="ml-2 text-xs text-gray-500">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <Button
              onClick={uploadFile}
              disabled={!selectedFile || isUploading}
              className="flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Upload en cours...' : 'Uploader le fichier REX'}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <File className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="font-medium">{currentFile.name}</p>
                <p className="text-xs text-gray-500">Fichier REX disponible</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(currentFile.url, '_blank')}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                Télécharger
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={deleteFile}
                className="text-red-500 border-red-200 hover:bg-red-50"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-gray-600">
              Remplacer par un nouveau fichier:
            </p>
            <div className="mt-2">
              <label className="block">
                <span className="sr-only">Choose file</span>
                <input 
                  type="file" 
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                  onChange={handleFileChange} 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
              </label>
              
              {selectedFile && (
                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={uploadFile}
                    disabled={isUploading}
                    size="sm"
                  >
                    {isUploading ? 'Remplacement...' : 'Remplacer le fichier'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
