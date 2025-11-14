import { getDatabase } from './database';
import { CONFIG } from '@/config/urls';

/**
 * 🔄 Sincronización automática después de subir documentos
 * Actualiza solo los datos del cliente específico para máxima velocidad
 */

/**
 * Sincronizar un cliente específico después de subir un documento
 */
export async function syncClientAfterUpload(clientName: string, clientId: string): Promise<{ success: boolean; message: string }> {
  console.log('🔄 [AUTO-SYNC] Sincronizando cliente después de upload:', { clientName, clientId });
  
  try {
    // Llamar al Apps Script para obtener datos actualizados del cliente
    const response = await fetch(CONFIG.APP_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'findFolder',
        clientName: clientName?.trim(),
        clientId: clientId?.trim(),
        // Sin documentType para obtener todos los documentos
      }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.error || 'Cliente no encontrado');
    }

    console.log('📦 [AUTO-SYNC] Datos actualizados recibidos:', result.data);

    // Actualizar base de datos local con los nuevos datos
    const db = getDatabase();
    
    const transaction = db.transaction(() => {
      // Preparar statements
      const updateClient = db.prepare(`
        UPDATE clients 
        SET folder_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE cedula = ?
      `);

      const deleteClientDocuments = db.prepare(`
        DELETE FROM documents WHERE client_cedula = ?
      `);

      const deleteClientFiles = db.prepare(`
        DELETE FROM files WHERE document_id IN (
          SELECT id FROM documents WHERE client_cedula = ?
        )
      `);

      const insertDocument = db.prepare(`
        INSERT INTO documents 
        (client_cedula, document_type, document_label, folder_id, folder_url, has_files, file_count, last_sync, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const insertFile = db.prepare(`
        INSERT INTO files (document_id, file_name, file_id, file_url, download_url, file_size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const getDocumentId = db.prepare(`
        SELECT id FROM documents WHERE client_cedula = ? AND document_type = ?
      `);

      // Limpiar documentos y archivos existentes del cliente
      deleteClientFiles.run(clientId);
      deleteClientDocuments.run(clientId);

      // Actualizar información del cliente
      updateClient.run(result.data.clientFolderUrl || null, clientId);

      // Mapear tipos de documento
      const documentLabels: { [key: string]: string } = {
        '01_escritura': 'Escritura',
        '02_pagare': 'Pagaré',
        '03_contrato_credito': 'Contrato de Crédito',
        '04_carta_de_instrucciones': 'Carta de Instrucciones',
        '05_aceptacion_de_credito': 'Aceptación de Crédito',
        '06_avaluo': 'Avalúo',
        '07_contrato_interco': 'Contrato Interco',
        '08_Finanzas': 'Finanzas'
      };

      let documentsUpdated = 0;
      let filesUpdated = 0;

      // Procesar documentos actualizados
      if (result.data.documents && Array.isArray(result.data.documents)) {
        result.data.documents.forEach((doc: any) => {
          // Insertar documento
          insertDocument.run(
            clientId,
            doc.type,
            documentLabels[doc.type] || doc.type,
            doc.folderId || null,
            doc.folderUrl || null,
            doc.hasFiles ? 1 : 0,
            doc.fileCount || 0
          );
          documentsUpdated++;

          // Si hay archivos, insertarlos
          if (doc.hasFiles && doc.files && Array.isArray(doc.files)) {
            const docRecord = getDocumentId.get(clientId, doc.type) as { id: number } | undefined;
            
            if (docRecord) {
              doc.files.forEach((file: any) => {
                insertFile.run(
                  docRecord.id,
                  file.name,
                  file.id,
                  file.url,
                  file.downloadUrl,
                  file.size || 0
                );
                filesUpdated++;
              });
            }
          }
        });
      }

      return { documentsUpdated, filesUpdated };
    });

    const stats = transaction();

    console.log('✅ [AUTO-SYNC] Cliente sincronizado:', {
      cliente: clientName,
      documentos: stats.documentsUpdated,
      archivos: stats.filesUpdated
    });

    return {
      success: true,
      message: `Cliente sincronizado: ${stats.documentsUpdated} documentos, ${stats.filesUpdated} archivos`
    };

  } catch (error) {
    console.error('❌ [AUTO-SYNC] Error:', error);
    return {
      success: false,
      message: `Error: ${(error as Error).message}`
    };
  }
}

/**
 * Invalidar caché del cliente específico
 */
export function invalidateClientCache(clientName?: string, clientId?: string) {
  // Esta función ya existe en clientCache.ts, la importamos si es necesario
  try {
    const { invalidateClientCache: invalidateCache } = require('@/utils/clientCache');
    invalidateCache(clientName, clientId);
    console.log('🗑️ [AUTO-SYNC] Caché invalidado para cliente:', clientName || clientId);
  } catch (error) {
    console.warn('⚠️ [AUTO-SYNC] No se pudo invalidar caché:', error);
  }
}
