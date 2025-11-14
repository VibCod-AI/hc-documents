'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Upload, CheckCircle, XCircle, Plus, ExternalLink, User, FileText, Loader2, HelpCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONFIG } from '@/config/urls';
import { compressFile, validateFileSize, getFileSizeRecommendations } from '@/utils/fileCompression';
import { FileOptimizationHelp } from './FileOptimizationHelp';
import { getCachedClient, setCachedClient, invalidateClientCache } from '@/utils/clientCache';
// import { syncClientAfterUpload } from '@/lib/autoSync'; // Movido a API route

interface ClientInfo {
  name: string;
  id: string;
  folderUrl: string;
  fechaEscrituracion: string;
  documents: DocumentStatus[];
}

interface DocumentStatus {
  type: string;
  label: string;
  exists: boolean;
  hasFiles: boolean;
  fileCount: number;
  files: FileInfo[];
  folderId?: string;
  folderUrl?: string;
}

interface FileInfo {
  name: string;
  id: string;
  url: string;
  downloadUrl: string;
  size: number;
  lastModified: string;
}

interface ClientDocumentManagerProps {
  preloadedClient?: {
    name: string;
    id: string;
  };
  hideSearchForm?: boolean;
}

export function ClientDocumentManager({ preloadedClient, hideSearchForm = false }: ClientDocumentManagerProps = {}) {
  const [searchData, setSearchData] = useState({
    clientName: '',
    clientId: '',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const lastLoadedClientRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  // Función de búsqueda directa
  const loadClientData = async (clientName: string, clientId: string) => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsSearching(true);
    setClientInfo(null);

    try {
      // Consulta a base de datos local
      const response = await fetch('/api/clients/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: clientName.trim() || undefined,
          clientId: clientId.trim() || undefined,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setClientInfo(result.data);
      } else {
        toast.error(result.message || 'Cliente no encontrado');
      }
    } catch (error) {
      console.error('❌ Error en búsqueda:', error);
      toast.error('Error al buscar el cliente');
    } finally {
      setIsSearching(false);
      isLoadingRef.current = false;
    }
  };

  // Efecto para cargar cliente precargado - SIMPLE Y DIRECTO
  useEffect(() => {
    if (preloadedClient && preloadedClient.name && preloadedClient.id) {
      const clientKey = `${preloadedClient.name}-${preloadedClient.id}`;
      
      // Solo cargar si es un cliente diferente
      if (clientKey !== lastLoadedClientRef.current) {
        lastLoadedClientRef.current = clientKey;
        
        setSearchData({
          clientName: preloadedClient.name,
          clientId: preloadedClient.id,
        });
        
        // Cargar datos directamente
        loadClientData(preloadedClient.name, preloadedClient.id);
      }
    }
  }, [preloadedClient?.name, preloadedClient?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const searchClient = async () => {
    if (!searchData.clientName.trim() && !searchData.clientId.trim()) {
      toast.error('Ingresa el nombre del cliente o la cédula');
      return;
    }

    setIsSearching(true);
    setClientInfo(null);

    try {
      // 🚀 VERIFICAR CACHÉ PRIMERO
      const cachedClient = getCachedClient(searchData.clientName.trim(), searchData.clientId.trim());
      if (cachedClient) {
        setClientInfo(cachedClient);
        const documentsWithFiles = cachedClient.documents.filter((doc: DocumentStatus) => doc.hasFiles);
        toast.success(`Cliente encontrado (caché)! ${documentsWithFiles.length}/8 documentos con archivos`);
        return;
      }
      
      // 🚀 NUEVA LÓGICA SÚPER RÁPIDA: Consulta a base de datos local
      const response = await fetch('/api/clients/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName: searchData.clientName.trim() || undefined,
          clientId: searchData.clientId.trim() || undefined,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        toast.error(result.message || 'Cliente no encontrado');
        return;
      }

      // 💾 GUARDAR EN CACHÉ
      setCachedClient(result.data, searchData.clientName.trim(), searchData.clientId.trim());
      
      setClientInfo(result.data);

      const documentsWithFiles = result.data.documents.filter((doc: DocumentStatus) => doc.hasFiles);
      const queryTime = result.meta?.queryTime || 0;
      toast.success(`Cliente encontrado en ${queryTime}ms! ${documentsWithFiles.length}/8 documentos con archivos`);

    } catch (error) {
      console.error('❌ Error en búsqueda optimizada:', error);
      toast.error('Error al buscar el cliente');
    } finally {
      setIsSearching(false);
    }
  };

  const uploadDocument = async (documentType: string, file: File) => {
    setUploadingDoc(documentType);

    try {
      // Generar el nombre del archivo siguiendo el patrón
      const originalName = file.name;
      const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'pdf';
      const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
      
      // 📅 USAR LA FECHA DE ESCRITURACIÓN DEL CLIENTE (no la fecha de hoy)
      const fechaEscrituracion = clientInfo.fechaEscrituracion.replace(/-/g, ''); // "2025-09-29" → "20250929"
      const documentTypeForName = documentType.replace(/^\d+_/, ''); // Quitar número del inicio (ej: "02_pagare" → "pagare")
      const newFileName = `${documentTypeForName}_${fechaEscrituracion}_${searchData.clientId.trim()}.${fileExtension}`;
      
      
      // Crear un nuevo archivo con el nombre correcto Y el contenido comprimido
      const finalFile = new File([file], newFileName, { type: file.type });

      const uploadData = new FormData();
      uploadData.append('file', finalFile);
      uploadData.append('clientName', searchData.clientName.trim());
      uploadData.append('clientId', searchData.clientId.trim());
      uploadData.append('documentType', documentType);
      uploadData.append('appScriptUrl', CONFIG.APP_SCRIPT_URL);
      
      // Decidir qué método usar basado en el tamaño del archivo
      const fileSizeMB = finalFile.size / 1024 / 1024;
      let uploadEndpoint = '/api/upload-document';
      let uploadMethod = 'Zapier';
      
      if (fileSizeMB > 50) {
        // Para archivos muy grandes, rechazar
        toast.error(`⚠️ Archivo demasiado grande (${fileSizeMB.toFixed(2)}MB). Máximo: 50MB`, { duration: 8000 });
        toast.error(`💡 Solución: Comprime el PDF externamente. Recomendado: SmallPDF.com`, { duration: 10000 });
        setShowHelp(true);
        setUploadingDoc(null);
        return;
      } else if (fileSizeMB > 10) {
        // Para archivos grandes (10-50MB), usar método directo via App Script
        uploadEndpoint = '/api/upload-large-file';
        uploadMethod = 'App Script directo';
        toast.success(`📤 Archivo grande - usando método directo via App Script`, { duration: 4000 });
      } else {
        // Para archivos ≤10MB, usar Zapier
        uploadData.append('zapierWebhookUrl', CONFIG.ZAPIER_WEBHOOK_URL);
        uploadMethod = 'Zapier';
      }

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: uploadData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Documento subido exitosamente');
        
        // 🗑️ INVALIDAR CACHÉ después de subir documento
        invalidateClientCache(clientInfo?.name, clientInfo?.id);
        
        // 🔄 ACTUALIZACIÓN INMEDIATA DE LA UI
        if (clientInfo && clientInfo.documents) {
          
          // Crear archivo simulado para actualizar la UI inmediatamente
          const newFile = {
            name: newFileName,
            id: 'temp-' + Date.now(),
            url: '#',
            downloadUrl: '#',
            size: file.size,
            lastModified: new Date().toISOString()
          };
          
          // Actualizar el documento específico
          const updatedDocuments = clientInfo.documents.map(doc => {
            if (doc.type === documentType) {
              return {
                ...doc,
                hasFiles: true,
                fileCount: (doc.fileCount || 0) + 1,
                files: [...(doc.files || []), newFile]
              };
            }
            return doc;
          });
          
          // Actualizar clientInfo con los nuevos datos
          const updatedClientInfo = {
            ...clientInfo,
            documents: updatedDocuments
          };
          
          setClientInfo(updatedClientInfo);
          
          // Auto-sincronización en segundo plano (sin bloquear la UI)
          setTimeout(async () => {
            try {
              const syncResponse = await fetch('/api/clients/auto-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  clientName: clientInfo.name,
                  clientId: clientInfo.id,
                }),
              });
              
              const syncResult = await syncResponse.json();
              if (syncResult.success) {
                
                // Actualizar con datos reales del servidor
                const refreshResponse = await fetch('/api/clients/search', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    clientName: clientInfo.name,
                    clientId: clientInfo.id,
                  }),
                });
                
                const refreshResult = await refreshResponse.json();
                if (refreshResult.success) {
                  setClientInfo(refreshResult.data);
                }
              }
            } catch (error) {
              console.error('❌ Error en sincronización de segundo plano:', error);
            }
          }, 2000); // Esperar 2 segundos antes de sincronizar
        }
      } else {
        // Manejar errores específicos
        if (result.retryAfter) {
          toast.error(`⏰ ${result.message}`, { duration: 8000 });
          toast.error(`💡 ${result.suggestion}`, { duration: 10000 });
          if (result.alternatives) {
            toast.error(`Alternativas:\n${result.alternatives.join('\n')}`, { duration: 12000 });
          }
        } else {
          toast.error('Error: ' + result.message);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error subiendo el documento');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleFileSelect = async (documentType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño del archivo
    const fileSizeMB = file.size / 1024 / 1024;
    const validation = validateFileSize(file);
    
    if (!validation.valid) {
      toast.error(validation.message || 'Archivo demasiado grande');
      const recommendations = getFileSizeRecommendations(file);
      if (recommendations.length > 0) {
        toast.error(`Recomendaciones:\n${recommendations.join('\n')}`, { duration: 10000 });
      }
      
      // Para PDFs muy grandes, mostrar ayuda específica
      if (file.type === 'application/pdf' && fileSizeMB > 50) {
        toast.error(`💡 Sugerencia rápida: Usa "Guardar como PDF" con calidad "Media" en lugar de "Mejor" para reducir el tamaño drásticamente.`, { duration: 8000 });
        setShowHelp(true); // Abrir automáticamente la ayuda
      }
      
      // Limpiar el input
      event.target.value = '';
      return;
    }
    
    // Mostrar advertencia si es archivo grande
    if (validation.message) {
      toast.success(validation.message, { duration: 4000 });
    }
    
    try {
      // POR AHORA: Sin compresión, solo subir el archivo tal como está
      
      if (fileSizeMB > 50) {
        toast.error(`❌ Archivo demasiado grande (${fileSizeMB.toFixed(2)}MB). Máximo: 50MB`, { duration: 6000 });
        toast.error(`💡 Usa herramientas externas para comprimir: SmallPDF.com`, { duration: 8000 });
        setUploadingDoc(null);
        return;
      }
      
      toast.success(`📤 Preparando subida de archivo de ${fileSizeMB.toFixed(2)}MB...`, { duration: 3000 });
      
      // Subir archivo original (sin compresión por ahora)
      uploadDocument(documentType, file);
      
    } catch (error) {
      console.error('Error procesando archivo:', error);
      toast.error('Error procesando el archivo');
      event.target.value = '';
    }
  };

  const getCompletionPercentage = () => {
    if (!clientInfo) return 0;
    const completed = clientInfo.documents.filter(doc => doc.exists).length;
    return Math.round((completed / clientInfo.documents.length) * 100);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB]">
      <div className="px-4 sm:px-6 py-4 border-b border-[#E5E7EB]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-[#1F2937] flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#D1FAE5] rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[#10B981]" />
            </div>
            <span className="truncate">Gestión de Documentos</span>
          </h2>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-[#8B5CF6] hover:bg-[#EDE9FE] rounded-lg transition-colors self-start sm:self-auto"
            title="Ayuda para optimizar archivos grandes"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Ayuda con archivos grandes</span>
            <span className="sm:hidden">Ayuda</span>
          </button>
        </div>
      </div>
      
      <div className="p-4 sm:p-6">
        {/* Buscador de cliente (oculto si se usa el del Navbar) */}
        {!hideSearchForm && (
          <div className="space-y-4 mb-6">
            <div className="bg-[#EDE9FE] border border-[#A78BFA] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold text-[#7C3AED]">
                  Buscar Cliente
                </h3>
              </div>
              <p className="text-sm text-[#6B7280]">
                Busca un cliente para ver el estado de sus documentos y subir los faltantes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={searchData.clientName}
                  onChange={handleInputChange}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent text-[#1F2937] bg-white transition-all"
                  disabled={isSearching}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Cédula del Cliente
                </label>
                <input
                  type="text"
                  name="clientId"
                  value={searchData.clientId}
                  onChange={handleInputChange}
                  placeholder="12345678"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent text-[#1F2937] bg-white transition-all"
                  disabled={isSearching}
                />
              </div>
            </div>

            <button
              onClick={searchClient}
              disabled={isSearching}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium transition-all ${
                isSearching 
                  ? 'bg-[#9CA3AF] cursor-not-allowed' 
                  : 'bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-sm hover:shadow-md'
              }`}
            >
              <Search className="h-5 w-5" />
              {isSearching ? 'Buscando cliente...' : 'Buscar Cliente'}
            </button>
          </div>
        )}

        {/* Información del cliente y documentos */}
        {clientInfo && (
          <div id="client-info-section" className="space-y-6">
            {/* Header del cliente */}
            <div className="bg-gradient-to-r from-[#EDE9FE] to-[#F9FAFB] border border-[#A78BFA] rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-[#1F2937]">
                    {clientInfo.name}
                  </h3>
                  <p className="text-[#6B7280] mt-1">Cédula: {clientInfo.id}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-[#8B5CF6]">
                    {getCompletionPercentage()}%
                  </div>
                  <div className="text-sm text-[#6B7280] mt-1">
                    {clientInfo.documents.filter(doc => doc.exists).length}/8 documentos
                  </div>
                  {clientInfo.folderUrl && (
                    <a
                      href={clientInfo.folderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[#8B5CF6] hover:text-[#7C3AED] mt-2 font-medium"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver carpeta
                    </a>
                  )}
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="mt-4">
                <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                  <div 
                    className="bg-[#8B5CF6] h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getCompletionPercentage()}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Lista de documentos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientInfo.documents.map((doc) => {
                // Determinar el estado del documento
                const hasFolder = !!doc.folderId;
                const hasFiles = doc.exists;
                
                let cardClass = '';
                let statusIcon = null;
                let statusText = '';
                
                if (hasFiles && doc.fileCount > 0) {
                  // Tiene archivos reales - Verde
                  cardClass = 'border-[#10B981] bg-[#D1FAE5]';
                  statusIcon = <CheckCircle className="h-5 w-5 text-[#10B981]" />;
                  statusText = 'Con documentos';
                } else if (hasFiles || hasFolder) {
                  // Carpeta existe pero sin archivos - Amarillo
                  cardClass = 'border-[#F59E0B] bg-[#FEF3C7]';
                  statusIcon = <XCircle className="h-5 w-5 text-[#F59E0B]" />;
                  statusText = hasFiles ? 'Sin documentos' : 'Carpeta vacía';
                } else {
                  // No existe carpeta - Gris
                  cardClass = 'border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB] hover:bg-white';
                  statusIcon = <XCircle className="h-5 w-5 text-[#9CA3AF]" />;
                  statusText = 'Sin carpeta';
                }

                return (
                  <div
                    key={doc.type}
                    className={`p-5 border-2 rounded-xl transition-all shadow-sm hover:shadow-md ${cardClass}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {statusIcon}
                        <span className="font-semibold text-[#1F2937]">
                          {doc.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          hasFiles && doc.fileCount > 0
                            ? 'bg-[#D1FAE5] text-[#059669]'
                            : hasFiles || hasFolder 
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#F3F4F6] text-[#6B7280]'
                        }`}>
                          {hasFiles && doc.fileCount === 0 ? 'Sin documentos' : statusText}
                        </span>
                        {hasFolder && (
                          <a
                            href={doc.folderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
                            title="Ver carpeta en Drive"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {hasFiles && doc.fileCount > 0 ? (
                      <div className="space-y-3">
                        <div className={`text-sm flex items-center gap-2 font-medium ${doc.fileCount > 0 ? 'text-[#059669]' : 'text-[#D97706]'}`}>
                          <div className={`w-2 h-2 rounded-full ${doc.fileCount > 0 ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}></div>
                          {doc.fileCount} archivo{doc.fileCount !== 1 ? 's' : ''} disponible{doc.fileCount !== 1 ? 's' : ''}
                        </div>
                        
                        {/* Lista de archivos existentes */}
                        <div className="space-y-2">
                          {doc.files.map((file, index) => (
                            <div key={index} className="bg-white border border-[#E5E7EB] rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#1F2937] truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-[#6B7280]">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <a
                                    href={file.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-[#8B5CF6] text-white rounded-lg hover:bg-[#7C3AED] transition-colors font-medium"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Ver
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Botón para cargar más archivos */}
                        <div className="border-t border-[#E5E7EB] pt-3">
                          <label className="block group">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => handleFileSelect(doc.type, e)}
                              disabled={uploadingDoc === doc.type}
                              className="hidden"
                            />
                            <div className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${
                              uploadingDoc === doc.type
                                ? 'border-[#8B5CF6] bg-[#EDE9FE] cursor-not-allowed shadow-lg transform scale-105'
                                : 'border-[#D1D5DB] hover:border-[#8B5CF6] hover:bg-[#F9FAFB] hover:shadow-md'
                            }`}>
                              {uploadingDoc === doc.type ? (
                                <>
                                  <div className="relative">
                                    <Loader2 className="h-5 w-5 text-[#8B5CF6] animate-spin" />
                                    <div className="absolute inset-0 rounded-full border-2 border-[#A78BFA] border-t-transparent animate-pulse"></div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-sm font-semibold text-[#7C3AED] animate-pulse">
                                      Subiendo documento...
                                    </span>
                                    <div className="w-28 h-1.5 bg-[#EDE9FE] rounded-full mt-1.5 overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] rounded-full animate-pulse"></div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 text-[#8B5CF6] transition-transform group-hover:rotate-90" />
                                  <span className="text-sm text-[#6B7280] font-medium group-hover:text-[#8B5CF6]">
                                    Cargar otro archivo
                                  </span>
                                </>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    ) : hasFiles ? (
                      <div className="space-y-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                        <div className="text-sm flex items-center gap-2 text-yellow-700">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          0 archivos disponibles
                        </div>
                        
                        <div className="border-t border-gray-200 pt-3">
                          <label className="block group">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => handleFileSelect(doc.type, e)}
                              disabled={uploadingDoc === doc.type}
                              className="hidden"
                            />
                            <div className={`flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-md cursor-pointer transition-all duration-300 ${
                              uploadingDoc === doc.type
                                ? 'border-blue-300 bg-blue-50 cursor-not-allowed shadow-lg transform scale-105'
                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md'
                            }`}>
                              {uploadingDoc === doc.type ? (
                                <>
                                  <div className="relative">
                                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                    <div className="absolute inset-0 rounded-full border-2 border-blue-200 border-t-transparent animate-pulse"></div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-sm font-medium text-blue-700 animate-pulse">
                                      Subiendo documento...
                                    </span>
                                    <div className="w-24 h-1 bg-blue-200 rounded-full mt-1 overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse"></div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 text-gray-600 transition-transform group-hover:rotate-90" />
                                  <span className="text-sm text-gray-700 font-medium">
                                    Cargar archivo
                                  </span>
                                </>
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    ) : hasFolder ? (
                      <div className="space-y-2">
                        <div className="text-sm text-yellow-700">
                          📁 Carpeta creada pero sin documentos
                        </div>
                        <label className="block group">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => handleFileSelect(doc.type, e)}
                            disabled={uploadingDoc === doc.type}
                            className="hidden"
                          />
                                                  <div className={`flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-md cursor-pointer transition-all duration-300 ${
                          uploadingDoc === doc.type
                            ? 'border-blue-300 bg-blue-50 cursor-not-allowed shadow-lg transform scale-105'
                            : 'border-orange-300 hover:border-orange-400 hover:bg-orange-50 hover:shadow-md'
                        }`}>
                          {uploadingDoc === doc.type ? (
                            <>
                              <div className="relative">
                                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                <div className="absolute inset-0 rounded-full border-2 border-blue-200 border-t-transparent animate-pulse"></div>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-blue-700 animate-pulse">
                                  Subiendo documento...
                                </span>
                                <div className="w-24 h-1 bg-blue-200 rounded-full mt-1 overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse"></div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 text-orange-600 transition-transform group-hover:rotate-90" />
                              <span className="text-sm text-orange-700 font-medium">
                                Subir documento
                              </span>
                            </>
                          )}
                        </div>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          ❌ Carpeta no encontrada
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                          Esta subcarpeta no existe. Primero crea la estructura de carpetas del cliente.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de ayuda */}
      <FileOptimizationHelp 
        isOpen={showHelp} 
        onClose={() => setShowHelp(false)} 
      />
    </div>
  );
}
