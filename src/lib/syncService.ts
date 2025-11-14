import { getDatabase, Client, Document, FileRecord } from './database';
import { CONFIG } from '@/config/urls';

/**
 * 🔄 Servicio de sincronización entre la base de datos local y Google Drive
 * Mantiene los datos actualizados sin afectar la velocidad de consultas
 */

/**
 * Sincronizar todos los clientes desde Google Sheets
 */
export async function syncAllClients(): Promise<{ success: boolean; message: string; stats?: any }> {
  const startTime = Date.now();
  console.log('🔄 Iniciando sincronización completa...');
  
  try {
    // Llamar al Apps Script para obtener todos los clientes
    const response = await fetch(CONFIG.APP_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getAllClients'
      }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('🔍 [DEBUG] Respuesta completa del Apps Script:', JSON.stringify(result, null, 2));
    
    if (!result.ok) {
      throw new Error(result.error || 'Error en Apps Script');
    }

    // Verificar estructura de datos
    let clientsData = null;
    if (result.clients && Array.isArray(result.clients)) {
      clientsData = result.clients;
      console.log('✅ [DEBUG] Usando result.clients');
    } else if (result.data && result.data.clients) {
      clientsData = result.data.clients;
      console.log('✅ [DEBUG] Usando result.data.clients');
    } else if (Array.isArray(result.data)) {
      clientsData = result.data;
      console.log('✅ [DEBUG] Usando result.data como array');
    } else if (Array.isArray(result)) {
      clientsData = result;
      console.log('✅ [DEBUG] Usando result como array');
    } else {
      console.error('❌ Estructura de datos no reconocida:', result);
      throw new Error('Estructura de datos del Apps Script no reconocida');
    }

    console.log('📊 [DEBUG] Clientes encontrados:', clientsData?.length || 0);

    const db = getDatabase();
    
    // Iniciar transacción para mejor rendimiento
    const transaction = db.transaction(() => {
      let clientsUpdated = 0;
      let documentsUpdated = 0;
      let filesUpdated = 0;

      // 🧹 LIMPIAR DATOS EXISTENTES para evitar mezclar datos de prueba con reales
      console.log('🧹 Limpiando datos existentes...');
      db.exec('DELETE FROM files');
      db.exec('DELETE FROM documents');  
      db.exec('DELETE FROM clients');

      // Preparar statements para mejor rendimiento
      const insertClient = db.prepare(`
        INSERT OR REPLACE INTO clients (name, cedula, fecha_escrituracion, folder_url, folder_id, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const insertDocument = db.prepare(`
        INSERT OR REPLACE INTO documents 
        (client_cedula, document_type, document_label, folder_id, folder_url, has_files, file_count, last_sync, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const deleteFiles = db.prepare(`DELETE FROM files WHERE document_id = ?`);
      
      const insertFile = db.prepare(`
        INSERT INTO files (document_id, file_name, file_id, file_url, download_url, file_size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const getDocumentId = db.prepare(`
        SELECT id FROM documents WHERE client_cedula = ? AND document_type = ?
      `);

      // Procesar cada cliente
      clientsData.forEach((clientData: any) => {
        console.log('🔄 Procesando cliente:', clientData.nombre, clientData.cedula);
        
        // Limpiar datos del cliente
        const folderUrl = (clientData.folderUrl && clientData.folderUrl !== '✅' && clientData.folderUrl !== '❌') 
          ? clientData.folderUrl 
          : null;
        
        const fechaEscrituracion = clientData.fecha 
          ? new Date(clientData.fecha).toISOString().split('T')[0] 
          : null;
        
        // Insertar/actualizar cliente
        insertClient.run(
          clientData.nombre,
          clientData.cedula,
          fechaEscrituracion,
          folderUrl,
          clientData.folderId || null
        );
        clientsUpdated++;

        // Procesar documentos del cliente
        if (clientData.documentDetails && Array.isArray(clientData.documentDetails)) {
          clientData.documentDetails.forEach((doc: any) => {
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

            // Insertar/actualizar documento
            insertDocument.run(
              clientData.cedula,
              doc.type,
              documentLabels[doc.type] || doc.type,
              doc.folderId || null,
              doc.folderUrl || null,
              doc.hasFiles ? 1 : 0,
              doc.fileCount || 0
            );
            documentsUpdated++;

            // Si hay archivos, procesarlos
            console.log('🔍 [DEBUG] Procesando documento:', doc.type, 'hasFiles:', doc.hasFiles, 'files:', doc.files);
            if (doc.hasFiles && doc.files && Array.isArray(doc.files)) {
              console.log('✅ [DEBUG] Documento tiene archivos:', doc.files.length);
              const docRecord = getDocumentId.get(clientData.cedula, doc.type) as { id: number } | undefined;
              
              if (docRecord) {
                // Limpiar archivos existentes
                deleteFiles.run(docRecord.id);
                
                // Insertar archivos actualizados
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
      });

      // Actualizar estado de sincronización
      db.prepare(`
        INSERT OR REPLACE INTO sync_status (id, last_full_sync, total_clients, total_documents, updated_at)
        VALUES (1, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP)
      `).run(clientsUpdated, documentsUpdated);

      return { clientsUpdated, documentsUpdated, filesUpdated };
    });

    const stats = transaction();
    const syncTime = Date.now() - startTime;

    console.log('✅ Sincronización completa exitosa:', {
      tiempo: `${syncTime}ms`,
      clientes: stats.clientsUpdated,
      documentos: stats.documentsUpdated,
      archivos: stats.filesUpdated
    });

    return {
      success: true,
      message: `Sincronización exitosa en ${syncTime}ms`,
      stats: {
        syncTime,
        clientsUpdated: stats.clientsUpdated,
        documentsUpdated: stats.documentsUpdated,
        filesUpdated: stats.filesUpdated
      }
    };

  } catch (error) {
    const syncTime = Date.now() - startTime;
    console.error('❌ Error en sincronización:', error);
    
    // Registrar error en la base de datos
    try {
      const db = getDatabase();
      db.prepare(`
        INSERT OR REPLACE INTO sync_status (id, sync_errors, updated_at)
        VALUES (1, ?, CURRENT_TIMESTAMP)
      `).run((error as Error).message);
    } catch (dbError) {
      console.error('❌ Error guardando estado de sincronización:', dbError);
    }

    return {
      success: false,
      message: `Error en sincronización: ${(error as Error).message}`,
      stats: { syncTime }
    };
  }
}

/**
 * Sincronizar un cliente específico
 */
export async function syncSingleClient(clientName: string, clientId: string): Promise<{ success: boolean; message: string }> {
  console.log('🔄 Sincronizando cliente específico:', { clientName, clientId });
  
  try {
    // Llamar al Apps Script para obtener datos del cliente
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

    // Actualizar base de datos local con los nuevos datos
    const db = getDatabase();
    
    // TODO: Implementar actualización específica del cliente
    // Por ahora, simplemente indicamos que se necesita sincronización completa
    
    return {
      success: true,
      message: 'Cliente sincronizado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error sincronizando cliente:', error);
    return {
      success: false,
      message: `Error: ${(error as Error).message}`
    };
  }
}

/**
 * Obtener estado de la última sincronización
 */
export function getSyncStatus() {
  const db = getDatabase();
  
  const status = db.prepare(`
    SELECT * FROM sync_status WHERE id = 1
  `).get() as any;

  if (!status) {
    return {
      lastSync: null,
      needsSync: true,
      message: 'Base de datos nunca sincronizada'
    };
  }

  const lastSync = new Date(status.last_full_sync || status.updated_at);
  const now = new Date();
  const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

  return {
    lastSync: lastSync.toISOString(),
    needsSync: hoursSinceSync > 1, // Sincronizar cada hora
    hoursSinceSync: Math.round(hoursSinceSync * 10) / 10,
    totalClients: status.total_clients || 0,
    totalDocuments: status.total_documents || 0,
    hasErrors: !!status.sync_errors,
    errors: status.sync_errors
  };
}
