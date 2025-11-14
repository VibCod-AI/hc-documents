import { supabase, Client as DBClient, Document as DBDocument, File as DBFile } from './supabase';

/**
 * 🚀 Consultas a Supabase (reemplazo de SQLite)
 * Estas funciones consultan PostgreSQL en lugar de SQLite local
 */

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
  size?: number;
  lastModified?: string;
}

/**
 * Obtener información completa de un cliente con sus documentos
 */
export async function getClientWithDocuments(clientName?: string, clientId?: string): Promise<ClientInfo | null> {
  try {
    // Buscar cliente
    let query = supabase.from('clients').select('*');
    
    if (clientId) {
      query = query.eq('cedula', clientId.trim());
    } else if (clientName) {
      query = query.ilike('nombre', `%${clientName.trim()}%`);
    } else {
      return null;
    }
    
    const { data: clients, error: clientError } = await query.limit(1);
    
    if (clientError) throw clientError;
    if (!clients || clients.length === 0) return null;
    
    const client = clients[0] as DBClient;
    
    // Obtener documentos del cliente
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', client.id)
      .order('type');
    
    if (docsError) throw docsError;
    
    // Mapear documentos al formato esperado
    const documentTypes = [
      { value: '01_escritura', label: 'Escritura' },
      { value: '02_pagare', label: 'Pagaré' },
      { value: '03_contrato_credito', label: 'Contrato de Crédito' },
      { value: '04_carta_de_instrucciones', label: 'Carta de Instrucciones' },
      { value: '05_aceptacion_de_credito', label: 'Aceptación de Crédito' },
      { value: '06_avaluo', label: 'Avalúo' },
      { value: '07_contrato_interco', label: 'Contrato Interco' },
      { value: '08_Finanzas', label: 'Finanzas' }
    ];
    
    const documentsWithFiles: DocumentStatus[] = await Promise.all(
      documentTypes.map(async (docType) => {
        const doc = (documents as DBDocument[] || []).find(d => d.type === docType.value);
        
        if (doc) {
          // Obtener archivos del documento
          const { data: files, error: filesError } = await supabase
            .from('files')
            .select('*')
            .eq('document_id', doc.id)
            .order('created_at', { ascending: false });
          
          if (filesError) console.error('Error fetching files:', filesError);
          
          return {
            type: doc.type,
            label: doc.label,
            exists: true,
            hasFiles: doc.has_files,
            fileCount: doc.file_count,
            files: (files as DBFile[] || []).map(f => ({
              name: f.name,
              id: f.file_id,
              url: f.url,
              downloadUrl: f.download_url || f.url,
              size: f.size || undefined,
              lastModified: f.last_modified || undefined
            })),
            folderId: doc.folder_id || undefined,
            folderUrl: doc.folder_url || undefined
          };
        }
        
        // Documento no existe
        return {
          type: docType.value,
          label: docType.label,
          exists: false,
          hasFiles: false,
          fileCount: 0,
          files: []
        };
      })
    );
    
    // Formatear fecha correctamente (de YYYY-MM-DD a DD/MM/YYYY)
    let fechaFormateada = client.fecha || '';
    if (fechaFormateada && fechaFormateada.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = fechaFormateada.split('-');
      fechaFormateada = `${day}/${month}/${year}`;
    }
    
    return {
      name: client.nombre,
      id: client.cedula,
      folderUrl: client.folder_url || '',
      fechaEscrituracion: client.fecha_escrituracion || '',
      documents: documentsWithFiles
    };
  } catch (error) {
    console.error('Error getting client with documents:', error);
    return null;
  }
}

/**
 * Obtener todos los clientes con su progreso de documentos
 */
export async function getAllClientsWithProgress() {
  try {
    const startTime = Date.now();
    
    // Obtener todos los clientes
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (clientsError) throw clientsError;
    if (!clients || clients.length === 0) {
      return { clients: [], meta: { queryTime: Date.now() - startTime, totalClients: 0 } };
    }
    
    // Obtener documentos de todos los clientes
    const clientIds = (clients as DBClient[]).map(c => c.id);
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .in('client_id', clientIds);
    
    if (docsError) throw docsError;
    
    // Mapear clientes con su progreso
    const clientsWithProgress = (clients as DBClient[]).map(client => {
      const clientDocs = (documents as DBDocument[] || []).filter(d => d.client_id === client.id);
      
      const completed = clientDocs.filter(d => d.has_files && d.file_count > 0).length;
      const total = 8; // Total de documentos esperados
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      // Formatear fecha correctamente
      let fechaFormateada = client.fecha || '';
      if (fechaFormateada && fechaFormateada.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = fechaFormateada.split('-');
        fechaFormateada = `${day}/${month}/${year}`;
      }
      
      return {
        nombre: client.nombre,
        cedula: client.cedula,
        fecha: fechaFormateada,
        folderUrl: client.folder_url || '',
        hasFolder: client.has_folder,
        documentsStatus: {
          completed,
          total,
          percentage
        },
        documentDetails: clientDocs.map(d => ({
          type: d.type,
          label: d.label,
          hasFiles: d.has_files,
          fileCount: d.file_count
        }))
      };
    });
    
    const queryTime = Date.now() - startTime;
    
    // Obtener última sincronización
    const { data: syncData } = await supabase
      .from('sync_status')
      .select('*')
      .order('last_sync', { ascending: false })
      .limit(1);
    
    const lastSync = syncData && syncData.length > 0 
      ? new Date(syncData[0].last_sync).toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Nunca';
    
    return {
      clients: clientsWithProgress,
      meta: {
        queryTime,
        totalClients: clients.length,
        lastUpdated: lastSync
      }
    };
  } catch (error) {
    console.error('Error getting all clients:', error);
    throw error;
  }
}

/**
 * Buscar cliente por texto (nombre o cédula)
 */
export async function searchClientByText(searchText: string) {
  try {
    const trimmed = searchText.trim();
    if (!trimmed) return null;
    
    // Buscar por cédula exacta o nombre parcial
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(`cedula.eq.${trimmed},nombre.ilike.%${trimmed}%`)
      .limit(10);
    
    if (error) throw error;
    
    return data as DBClient[] || [];
  } catch (error) {
    console.error('Error searching client:', error);
    return [];
  }
}

