import { getDatabase, Client, Document, FileRecord } from './database';

/**
 * 🚀 Consultas súper rápidas a la base de datos local
 * Estas funciones reemplazan las llamadas lentas a Google Drive
 */

/**
 * Buscar un cliente por nombre o cédula (SÚPER RÁPIDO)
 */
export function findClient(clientName?: string, clientId?: string): Client | null {
  const db = getDatabase();
  
  let query = '';
  let params: any[] = [];
  
  if (clientId) {
    query = 'SELECT * FROM clients WHERE cedula = ? LIMIT 1';
    params = [clientId.trim()];
  } else if (clientName) {
    query = 'SELECT * FROM clients WHERE name LIKE ? LIMIT 1';
    params = [`%${clientName.trim()}%`];
  } else {
    return null;
  }
  
  const stmt = db.prepare(query);
  const client = stmt.get(...params) as Client | undefined;
  
  return client || null;
}

/**
 * Obtener todos los documentos de un cliente (SÚPER RÁPIDO)
 */
export function getClientDocuments(clientCedula: string): Document[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM documents 
    WHERE client_cedula = ? 
    ORDER BY document_type
  `);
  
  return stmt.all(clientCedula) as Document[];
}

/**
 * Obtener archivos de un documento específico
 */
export function getDocumentFiles(documentId: number): FileRecord[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM files 
    WHERE document_id = ? 
    ORDER BY created_at DESC
  `);
  
  return stmt.all(documentId) as FileRecord[];
}

/**
 * Obtener información completa de un cliente con sus documentos (SÚPER RÁPIDO)
 */
export function getClientWithDocuments(clientName?: string, clientId?: string) {
  const client = findClient(clientName, clientId);
  
  if (!client) {
    return null;
  }
  
  const documents = getClientDocuments(client.cedula);
  
  // Mapear documentos al formato esperado por el frontend
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
  
  const documentsWithFiles = documentTypes.map(docType => {
    const doc = documents.find(d => d.document_type === docType.value);
    
    if (doc) {
      const files = getDocumentFiles(doc.id!);
      return {
        type: doc.document_type,
        label: doc.document_label,
        exists: true,
        hasFiles: doc.has_files,
        fileCount: doc.file_count,
        files: files.map(f => ({
          name: f.file_name,
          id: f.file_id,
          url: f.file_url,
          downloadUrl: f.download_url,
          size: f.file_size || 0,
          lastModified: f.created_at || ''
        })),
        folderId: doc.folder_id,
        folderUrl: doc.folder_url
      };
    } else {
      return {
        type: docType.value,
        label: docType.label,
        exists: false,
        hasFiles: false,
        fileCount: 0,
        files: [],
        folderId: undefined,
        folderUrl: undefined
      };
    }
  });
  
  return {
    name: client.name,
    id: client.cedula,
    folderUrl: client.folder_url || '',
    fechaEscrituracion: client.fecha_escrituracion || '',
    documents: documentsWithFiles
  };
}

/**
 * Obtener todos los clientes con su progreso (SÚPER RÁPIDO)
 */
export function getAllClientsWithProgress() {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT 
      c.*,
      COUNT(d.id) as total_documents,
      COUNT(CASE WHEN d.has_files = 1 AND d.file_count > 0 THEN 1 END) as completed_documents
    FROM clients c
    LEFT JOIN documents d ON c.cedula = d.client_cedula
    GROUP BY c.id, c.cedula
    ORDER BY c.fecha_escrituracion DESC, c.name ASC
  `);
  
  const results = stmt.all() as any[];
  
  
  return results.map(row => {
    // FORMATEO DE FECHA SÚPER SIMPLE Y ROBUSTO
    let fechaFormateada = 'Sin fecha';
    
    // FORZAR que siempre muestre algo diferente a "Invalid Date"
    if (row.fecha_escrituracion) {
      const fechaStr = String(row.fecha_escrituracion);
      if (fechaStr.includes('-')) {
        // Formato YYYY-MM-DD -> DD/MM/YYYY
        const partes = fechaStr.split('-');
        if (partes.length === 3) {
          fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        } else {
          fechaFormateada = fechaStr;
        }
      } else {
        fechaFormateada = fechaStr;
      }
    } else {
      fechaFormateada = 'Sin fecha';
    }

    // Obtener detalles de documentos para este cliente
    const documentDetails = getClientDocuments(row.cedula).map(doc => ({
      type: doc.document_type,
      label: doc.document_label,
      hasFiles: doc.has_files === 1,
      fileCount: doc.file_count || 0
    }));

    return {
      rowNumber: row.id,
      fecha: fechaFormateada,
      nombre: row.name,
      cedula: row.cedula,
      folderUrl: row.folder_url || '',
      hasFolder: !!row.folder_url,
      documentsStatus: {
        completed: row.completed_documents || 0,
        total: 8,
        percentage: Math.round(((row.completed_documents || 0) / 8) * 100)
      },
      documentDetails: documentDetails
    };
  });
}

/**
 * Buscar clientes por texto (nombre o cédula)
 */
export function searchClients(searchText: string): Client[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM clients 
    WHERE name LIKE ? OR cedula LIKE ?
    ORDER BY name
    LIMIT 20
  `);
  
  const searchPattern = `%${searchText.trim()}%`;
  return stmt.all(searchPattern, searchPattern) as Client[];
}

/**
 * Obtener estadísticas generales
 */
export function getDatabaseStats() {
  const db = getDatabase();
  
  const clientsCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
  const documentsCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
  const filesCount = db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number };
  const documentsWithFiles = db.prepare('SELECT COUNT(*) as count FROM documents WHERE has_files = 1').get() as { count: number };
  
  return {
    totalClients: clientsCount.count,
    totalDocuments: documentsCount.count,
    totalFiles: filesCount.count,
    documentsWithFiles: documentsWithFiles.count,
    completionRate: documentsCount.count > 0 ? Math.round((documentsWithFiles.count / documentsCount.count) * 100) : 0
  };
}
