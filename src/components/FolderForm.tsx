'use client';

import { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONFIG } from '@/config/urls';

interface FolderFormProps {
  onSubmit: (data: {
    appScriptUrl: string;
    action: 'createMissingFolders' | 'createLast';
  }) => void;
  isLoading: boolean;
}

export function FolderForm({ onSubmit, isLoading }: FolderFormProps) {
  const [formData, setFormData] = useState({
    appScriptUrl: CONFIG.APP_SCRIPT_URL,
    mode: 'createMissingFolders' as 'createMissingFolders' | 'createLast'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appScriptUrl.trim()) {
      toast.error('La URL del App Script es requerida');
      return;
    }

    // Validar URL básica
    try {
      new URL(formData.appScriptUrl);
    } catch {
      toast.error('La URL del App Script no es válida');
      return;
    }

    onSubmit({
      appScriptUrl: formData.appScriptUrl.trim(),
      action: formData.mode
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Información explicativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          📋 ¿Cómo funciona?
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Lee tu Google Sheet para identificar clientes sin carpeta</li>
          <li>• Crea automáticamente las carpetas para TODOS los clientes faltantes</li>
          <li>• Genera las 8 subcarpetas necesarias para cada uno</li>
          <li>• Actualiza la columna F del Sheet con las URLs generadas</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selector de modo */}
        <div className="flex justify-center gap-4 mb-4">
          <label className={`cursor-pointer px-4 py-2 rounded-lg border ${formData.mode === 'createMissingFolders' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700'}`}>
            <input 
              type="radio" 
              name="mode" 
              value="createMissingFolders" 
              checked={formData.mode === 'createMissingFolders'} 
              onChange={handleInputChange} 
              className="sr-only"
            />
            <span className="font-medium">Crear Todas las Faltantes</span>
          </label>
          <label className={`cursor-pointer px-4 py-2 rounded-lg border ${formData.mode === 'createLast' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700'}`}>
            <input 
              type="radio" 
              name="mode" 
              value="createLast" 
              checked={formData.mode === 'createLast'} 
              onChange={handleInputChange} 
              className="sr-only"
            />
            <span className="font-medium">Solo Último Cliente</span>
          </label>
        </div>

        {/* Botón principal */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <FolderPlus className="h-6 w-6" />
                {formData.mode === 'createMissingFolders' ? 'Crear Carpetas Faltantes' : 'Crear Carpeta del Último'}
              </>
            )}
          </button>
        </div>

        {/* Configuración avanzada (colapsable) */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>⚙️ Configuración del App Script</span>
            <span className="text-xs text-gray-500">
              {showAdvanced ? '▼ Ocultar' : '▶ Mostrar'}
            </span>
          </button>
          
          {showAdvanced && (
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label 
                  htmlFor="appScriptUrl" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  URL del App Script *
                </label>
                <input
                  type="url"
                  id="appScriptUrl"
                  name="appScriptUrl"
                  value={formData.appScriptUrl}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  placeholder="https://script.google.com/macros/s/tu-script-id/exec"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm text-gray-900 bg-white"
                />
                <p className="mt-1 text-xs text-gray-600">
                  💡 URL preconfigurada de tu Google Apps Script. Solo cámbiala si usas otro script.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
