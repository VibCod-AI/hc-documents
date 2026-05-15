'use client';

import { useState, useEffect } from 'react';
import { Users, Eye, RefreshCw, FolderOpen, AlertCircle, Info, FolderPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { CONFIG } from '@/config/urls';
import { getCachedDashboard, setCachedDashboard } from '@/utils/clientCache';
import { FolderForm } from './FolderForm';

interface Client {
  rowNumber: number;
  fecha: string;
  nombre: string;
  cedula: string;
  folderUrl: string;
  hasFolder: boolean;
  documentsStatus: {
    completed: number;
    total: number;
    percentage: number;
  };
  documentDetails: Array<{
    type: string;
    hasFiles: boolean;
    fileCount: number;
  }>;
}

interface ClientDashboardProps {
  onClientSelect: (clientName: string, clientId: string) => void;
}

export function ClientDashboard({ onClientSelect }: ClientDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [stats, setStats] = useState<{
    totalClients: number;
    totalDocuments: number;
    completedDocuments: number;
    lastUpdated: string;
  } | null>(null);

  // 🚀 CARGAR AUTOMÁTICAMENTE AL MONTAR EL COMPONENTE
  useEffect(() => {
    loadAllClients();
  }, []);

  const loadAllClients = async (forceSync = false) => {
    setIsLoading(true);

    // 🚀 Si es sincronización forzada, ejecutar sync paginado lote por lote
    if (forceSync) {
      try {
        toast.loading('Iniciando sincronización...', { id: 'loading' });

        // Paso 1: init
        const initRes = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'init' })
        }).then(r => r.json());

        if (!initRes.success) {
          toast.error('Error iniciando sync: ' + (initRes.message || 'desconocido'), { id: 'loading' });
          setIsLoading(false);
          return;
        }

        const totalClients: number = initRes.totalClients;
        const sheetCedulas: string[] = initRes.sheetCedulas;
        const batchSize: number = initRes.batchSize || 8;
        const totals = { clients: 0, documents: 0, files: 0 };

        // Paso 2: procesar lotes secuencialmente
        let startIndex = 0;
        let hasMore = true;
        while (hasMore) {
          const end = Math.min(startIndex + batchSize, totalClients);
          toast.loading(`Sincronizando ${startIndex + 1}-${end} de ${totalClients}...`, { id: 'loading' });

          const batchRes = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'batch', startIndex, batchSize })
          }).then(r => r.json());

          if (!batchRes.success) {
            toast.error(`Error en lote ${startIndex}: ${batchRes.message || 'desconocido'}`, { id: 'loading' });
            setIsLoading(false);
            return;
          }

          totals.clients += batchRes.stats?.clients || 0;
          totals.documents += batchRes.stats?.documents || 0;
          totals.files += batchRes.stats?.files || 0;

          hasMore = !!batchRes.hasMore && batchRes.nextStartIndex > startIndex;
          startIndex = batchRes.nextStartIndex;
        }

        // Paso 3: finalize (limpia zombies + registra)
        toast.loading('Finalizando sincronización...', { id: 'loading' });
        const finalRes = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'finalize', sheetCedulas, totals })
        }).then(r => r.json());

        if (finalRes.success) {
          toast.success(`Sincronizado: ${totals.clients} clientes, ${totals.documents} documentos`, { id: 'loading' });
          setCachedDashboard([]);
        } else {
          toast.error('Error finalizando: ' + (finalRes.message || 'desconocido'), { id: 'loading' });
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error sincronizando:', error);
        toast.error('Error al sincronizar con Google Drive', { id: 'loading' });
        setIsLoading(false);
        return;
      }
    }
    
    // 🚀 VERIFICAR CACHÉ PRIMERO (solo si no es sincronización forzada)
    if (!forceSync) {
      const cachedClients = getCachedDashboard();
      if (cachedClients && cachedClients.length > 0) {
        setClients(cachedClients);
        
        // Calcular estadísticas
        const totalCompleted = cachedClients.reduce((sum: number, client: Client) => 
          sum + client.documentsStatus.completed, 0
        );
        const totalPossible = cachedClients.length * 8;
        
        setStats({
          totalClients: cachedClients.length,
          totalDocuments: totalPossible,
          completedDocuments: totalCompleted,
          lastUpdated: new Date().toLocaleString('es-CO', { 
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        });
        
        setIsLoading(false);
        return;
      }
    }
    
    
    toast.loading('Cargando clientes desde base de datos...', { id: 'loading' });
    
    try {
      const response = await fetch('/api/clients/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        // 💾 GUARDAR EN CACHÉ
        setCachedDashboard(result.data.clients);
        
        setClients(result.data.clients);
        const totalCompleted = result.data.clients.reduce((sum: number, client: Client) => 
          sum + client.documentsStatus.completed, 0
        );
        const totalPossible = result.data.clients.length * 8;
        
        // Guardar estadísticas con hora de Colombia
        setStats({
          totalClients: result.data.clients.length,
          totalDocuments: totalPossible,
          completedDocuments: totalCompleted,
          lastUpdated: result.meta?.lastUpdated || new Date().toLocaleString('es-CO', { 
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        });
        
        const queryTime = result.meta?.queryTime || 0;
        toast.success(
          `${result.data.totalClients} clientes cargados en ${queryTime}ms • ${totalCompleted}/${totalPossible} documentos totales`, 
          { id: 'loading', duration: 4000 }
        );
      } else {
        toast.error('Error: ' + result.error, { id: 'loading' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error cargando clientes', { id: 'loading' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async (data: { appScriptUrl: string; action: 'createMissingFolders' | 'createLast' }) => {
    setIsCreatingFolder(true);
    try {
      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        if (data.action === 'createMissingFolders' && result.data && result.data.createdCount !== undefined) {
           toast.success(`Proceso completado: ${result.data.createdCount} carpetas creadas`, { duration: 5000 });
        } else if (result.data?.alreadyExisted) {
           toast.success(`${result.data.name} ya tenía carpeta, se actualizó en la base de datos`);
        } else {
           toast.success(`Carpeta creada para ${result.data?.name || 'el cliente'}`);
        }

        setIsFolderModalOpen(false);

        // Recargar lista de clientes desde Supabase (sin sync completo)
        toast.loading('Actualizando lista de clientes...', { duration: 2000 });
        setCachedDashboard([]);
        setTimeout(() => {
          loadAllClients(false);
        }, 1000);
      } else {
        toast.error('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error creando carpeta:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleClientClick = (client: Client) => {
    onClientSelect(client.nombre, client.cedula);
    toast.success(`Cliente ${client.nombre} cargado en gestión de documentos`);
  };

  const getStatusBadge = (client: Client) => {
    const { completed, total, percentage } = client.documentsStatus;
    
    // Lista de todos los documentos esperados
    const documentosEsperados = [
      { type: '01_escritura', label: 'Escritura' },
      { type: '02_pagare', label: 'Pagaré' },
      { type: '03_contrato_credito', label: 'Contrato de Crédito' },
      { type: '04_carta_de_instrucciones', label: 'Carta de Instrucciones' },
      { type: '05_aceptacion_de_credito', label: 'Aceptación de Crédito' },
      { type: '06_avaluo', label: 'Avalúo' },
      { type: '07_contrato_interco', label: 'Contrato Interco' },
      { type: '08_Finanzas', label: 'Finanzas' }
    ];
    
    // Encontrar qué documentos faltan
    const documentosFaltantes = documentosEsperados.filter(docEsperado => {
      const docCliente = client.documentDetails?.find(d => d.type === docEsperado.type);
      return !docCliente || !docCliente.hasFiles;
    });
    
    const nombresFaltantes = documentosFaltantes.map(d => d.label).join(', ');

    if (percentage === 100) {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#10B981] rounded-full"></span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#D1FAE5] text-[#059669]">
            Completo
          </span>
        </div>
      );
    } else if (percentage > 0) {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#F59E0B] rounded-full"></span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#FEF3C7] text-[#D97706]">
            Incompleto
          </span>
          <div className="relative group">
            <Info className="h-4 w-4 text-[#9CA3AF] hover:text-[#6B7280] cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#1F2937] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
              Faltan: {nombresFaltantes}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#EF4444] rounded-full"></span>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#FEE2E2] text-[#DC2626]">
            Sin documentos
          </span>
        </div>
      );
    }
  };

  const getProgressBar = (client: Client) => {
    const { percentage } = client.documentsStatus;
    
    let colorClass = 'bg-[#EF4444]';
    if (percentage === 100) colorClass = 'bg-[#10B981]';
    else if (percentage > 0) colorClass = 'bg-[#F59E0B]';

    return (
      <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB]">
      <div className="px-4 sm:px-6 py-4 border-b border-[#E5E7EB]">
        <h2 className="text-lg sm:text-xl font-bold text-[#1F2937] flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#EDE9FE] rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#8B5CF6]" />
          </div>
          <span className="truncate">Dashboard de Clientes</span>
        </h2>
      </div>
      
      <div className="p-4 sm:p-6">
        {/* Controles */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => loadAllClients(true)}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-white text-sm font-medium transition-all ${
              isLoading 
                ? 'bg-[#9CA3AF] cursor-not-allowed' 
                : 'bg-[#10B981] hover:bg-[#059669] shadow-sm hover:shadow-md'
            }`}
            title="Sincronizar datos desde Google Drive"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Sincronizando...' : 'Sincronizar'}</span>
            <span className="sm:hidden">{isLoading ? '...' : 'Sync'}</span>
          </button>

          <button
            onClick={() => setIsFolderModalOpen(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-white text-sm font-medium transition-all bg-[#3B82F6] hover:bg-[#2563EB] shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            title="Crear carpeta para el último cliente del Sheet"
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Crear Carpeta Reciente</span>
            <span className="sm:hidden">Crear Carpeta</span>
          </button>
        </div>

        {/* Modal de Crear Carpeta */}
        {isFolderModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setIsFolderModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FolderPlus className="h-6 w-6 text-blue-600" />
                Crear Carpeta desde Google Sheet
              </h2>
              
              <FolderForm 
                onSubmit={handleCreateFolder} 
                isLoading={isCreatingFolder} 
              />
            </div>
          </div>
        )}

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Total Clientes */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#EDE9FE] rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-[#8B5CF6]" />
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Total Clientes</p>
                  <p className="text-2xl font-bold text-[#1F2937]">{stats.totalClients}</p>
                </div>
              </div>
            </div>

            {/* Documentos Completos */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#D1FAE5] rounded-full flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-6 h-6 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Documentos Completos</p>
                  <p className="text-2xl font-bold text-[#10B981]">{stats.completedDocuments}</p>
                </div>
              </div>
            </div>

            {/* Total Documentos */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F3F4F6] rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-[#6B7280]" />
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Total Documentos</p>
                  <p className="text-2xl font-bold text-[#1F2937]">{stats.totalDocuments}</p>
                </div>
              </div>
            </div>

            {/* Última Actualización */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FEF3C7] rounded-full flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Última Actualización</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">{stats.lastUpdated}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barra de progreso global */}
        {stats && (
          <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5 mb-6">
            <div className="flex justify-between text-sm text-[#6B7280] mb-2">
              <span className="font-medium">Progreso Global</span>
              <span className="font-bold text-[#8B5CF6]">
                {Math.round((stats.completedDocuments / (stats.totalDocuments || 1)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-[#F3F4F6] rounded-full h-3">
              <div 
                className="bg-[#8B5CF6] h-3 rounded-full transition-all duration-300" 
                style={{ width: `${(stats.completedDocuments / (stats.totalDocuments || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Tabla de clientes */}
        {clients.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-[#E5E7EB]">
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Cédula
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Progreso
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Carpeta
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {clients.map((client, index) => (
                  <tr 
                    key={`${client.cedula}-${index}`}
                    className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                    onClick={() => handleClientClick(client)}
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-[#1F2937] font-medium">
                      {client.nombre}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-[#6B7280]">
                      {client.cedula}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-[#6B7280]">
                      {client.fecha}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="space-y-1.5">
                        <div className="text-xs text-[#6B7280] font-medium">
                          {client.documentsStatus.completed}/{client.documentsStatus.total} documentos
                        </div>
                        {getProgressBar(client)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      {getStatusBadge(client)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      {client.hasFolder ? (
                        <a 
                          href={client.folderUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#D1FAE5] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FolderOpen className="h-5 w-5 text-[#10B981]" />
                        </a>
                      ) : (
                        <span className="text-[#9CA3AF] text-xs">Sin carpeta</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClientClick(client);
                        }}
                        className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-[#8B5CF6] text-white rounded-lg hover:bg-[#7C3AED] transition-colors"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Ver</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[#6B7280]">
            <div className="w-16 h-16 bg-[#F3F4F6] rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-[#9CA3AF]" />
            </div>
            <p className="text-lg font-medium text-[#1F2937]">No hay clientes cargados</p>
            <p className="text-sm mt-1">Haz clic en "Sincronizar" para cargar los clientes desde Google Drive</p>
          </div>
        )}
      </div>
    </div>
  );
}
