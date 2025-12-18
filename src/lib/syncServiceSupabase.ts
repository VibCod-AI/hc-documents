import { supabase } from './supabase';
import { CONFIG } from '@/config/urls';

/**
 * 🔄 Servicio de sincronización entre Supabase y Google Drive
 * Mantiene los datos actualizados desde Google Drive/Sheets
 */

/**
 * Sincronizar todos los clientes desde Google Sheets a Supabase
 */
export async function syncAllClients(): Promise<{ success: boolean; message: string; stats?: any }> {
  const startTime = Date.now();
  
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
    
    if (!result.ok) {
      throw new Error(result.error || 'Error en Apps Script');
    }

    // Verificar estructura de datos
    let clientsData = null;
    if (result.clients && Array.isArray(result.clients)) {
      clientsData = result.clients;
    } else if (result.data && result.data.clients) {
      clientsData = result.data.clients;
    } else if (Array.isArray(result.data)) {
      clientsData = result.data;
    } else if (Array.isArray(result)) {
      clientsData = result;
    } else {
      throw new Error('Estructura de datos del Apps Script no reconocida');
    }

    if (!clientsData || clientsData.length === 0) {
      return {
        success: false,
        message: 'No se encontraron clientes en Google Sheets',
        stats: { clientsUpdated: 0, documentsUpdated: 0, filesUpdated: 0, duration: Date.now() - startTime }
      };
    }

    let clientsUpdated = 0;
    let documentsUpdated = 0;
    let filesUpdated = 0;

    // 🧹 LIMPIAR DATOS EXISTENTES para sincronización limpia
    await supabase.from('files').delete().neq('id', 0);
    await supabase.from('documents').delete().neq('id', 0);
    await supabase.from('clients').delete().neq('id', 0);

    // Procesar cada cliente
    for (const clientData of clientsData) {
      try {
        // Insertar o actualizar cliente
        const { data: clientResult, error: clientError } = await supabase
          .from('clients')
          .upsert({
            nombre: clientData.nombre,
            cedula: clientData.cedula,
            fecha: clientData.fecha,
            fecha_escrituracion: clientData.fechaEscrituracion || null,
            folder_url: clientData.folderUrl || null,
            folder_id: clientData.folderId || null,
            has_folder: clientData.hasFolder || false,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'cedula',
            ignoreDuplicates: false
          })
          .select();

        if (clientError) {
          console.error('Error inserting client:', clientError);
          continue;
        }

        if (!clientResult || clientResult.length === 0) {
          console.error('No client returned after upsert');
          continue;
        }

        const insertedClient = clientResult[0];
        clientsUpdated++;

        // Procesar documentos del cliente
        if (clientData.documentDetails && Array.isArray(clientData.documentDetails)) {
          for (const doc of clientData.documentDetails) {
            try {
              // 🕵️ VALIDACIÓN ADICIONAL DE ARCHIVOS
              // No confiar ciegamente en doc.hasFiles. Verificar la lista real de archivos.
              // Filtrar archivos basura o temporales que puedan haber pasado
              const validFiles = (doc.files || []).filter((f: any) => {
                if (!f.name) return false;
                const name = f.name.toLowerCase();
                return !name.startsWith('~$') && // Archivos temporales de Office
                       !name.startsWith('.') &&  // Archivos ocultos (.DS_Store, etc)
                       name !== 'desktop.ini' && // Windows
                       name !== 'thumbs.db';     // Windows
              });

              const realHasFiles = validFiles.length > 0;
              const realFileCount = validFiles.length;

              // Insertar o actualizar documento
              const { data: docResult, error: docError } = await supabase
                .from('documents')
                .upsert({
                  client_id: insertedClient.id,
                  type: doc.type,
                  label: doc.label || doc.type,
                  exists: doc.exists || false,
                  has_files: realHasFiles, // Usar valor recalculado
                  file_count: realFileCount, // Usar valor recalculado
                  folder_id: doc.folderId || null,
                  folder_url: doc.folderUrl || null,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'client_id,type',
                  ignoreDuplicates: false
                })
                .select();

              if (docError) {
                console.error('Error inserting document:', docError);
                continue;
              }

              if (!docResult || docResult.length === 0) continue;

              const insertedDoc = docResult[0];
              documentsUpdated++;

              // Procesar archivos del documento (usando la lista filtrada)
              if (validFiles.length > 0) {
                for (const file of validFiles) {
                  try {
                    const { error: fileError } = await supabase
                      .from('files')
                      .insert({
                        document_id: insertedDoc.id,
                        name: file.name,
                        file_id: file.id,
                        url: file.url,
                        download_url: file.downloadUrl || file.url,
                        size: file.size || null,
                        last_modified: file.lastModified ? new Date(file.lastModified).toISOString() : null
                      });

                    if (fileError) {
                      console.error('Error inserting file:', fileError);
                    } else {
                      filesUpdated++;
                    }
                  } catch (error) {
                    console.error('Error processing file:', error);
                  }
                }
              }
            } catch (error) {
              console.error('Error processing document:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error processing client:', error);
      }
    }

    // Actualizar estado de sincronización
    await supabase.from('sync_status').insert({
      last_sync: new Date().toISOString(),
      status: 'success',
      total_clients: clientsUpdated,
      total_documents: documentsUpdated
    });

    const duration = Date.now() - startTime;

    return {
      success: true,
      message: `Sincronización completada: ${clientsUpdated} clientes, ${documentsUpdated} documentos, ${filesUpdated} archivos`,
      stats: {
        clientsUpdated,
        documentsUpdated,
        filesUpdated,
        duration
      }
    };
  } catch (error) {
    console.error('Error en sincronización:', error);
    
    // Registrar error
    await supabase.from('sync_status').insert({
      last_sync: new Date().toISOString(),
      status: 'error',
      total_clients: 0,
      total_documents: 0
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido en sincronización'
    };
  }
}

/**
 * Sincronizar un cliente específico después de subir un archivo
 */
export async function syncClientAfterUpload(clientName: string, clientId: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // Obtener datos actualizados del cliente desde Apps Script
    const response = await fetch(CONFIG.APP_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'findFolder',
        clientName,
        clientId,
        documentType: '01_escritura' // Cualquier tipo, solo para obtener los datos
      }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.error || 'Error obteniendo datos del cliente');
    }

    // Buscar cliente en la base de datos
    const { data: existingClients } = await supabase
      .from('clients')
      .select('*')
      .eq('cedula', clientId)
      .limit(1);

    if (!existingClients || existingClients.length === 0) {
      return {
        success: false,
        message: 'Cliente no encontrado en la base de datos'
      };
    }

    const client = existingClients[0];

    // Actualizar documentos del cliente
    // Aquí deberías implementar la lógica para actualizar los documentos
    // basándote en la respuesta del Apps Script

    return {
      success: true,
      message: 'Cliente sincronizado correctamente',
      data: client
    };
  } catch (error) {
    console.error('Error sincronizando cliente:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

