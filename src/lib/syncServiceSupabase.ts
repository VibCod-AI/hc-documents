import { supabase } from './supabase';
import { CONFIG } from '@/config/urls';

const BATCH_SIZE = 8;

/**
 * Llamar al AppScript con reintentos
 */
async function callAppScript(body: Record<string, unknown>, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(CONFIG.APP_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000), // 90s max por llamada
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || 'Error en Apps Script');
      return result;
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Intento ${attempt + 1} falló, reintentando...`, error);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

/**
 * Procesar un lote de clientes y guardarlo en Supabase (upsert, nunca delete)
 */
async function upsertClientBatch(clientsData: any[]): Promise<{ clients: number; documents: number; files: number }> {
  let clients = 0, documents = 0, files = 0;

  for (const clientData of clientsData) {
    try {
      // Upsert cliente por cédula
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
        }, { onConflict: 'cedula', ignoreDuplicates: false })
        .select();

      if (clientError || !clientResult?.length) {
        console.error('Error upserting client:', clientError);
        continue;
      }

      const insertedClient = clientResult[0];
      clients++;

      // Procesar documentos
      if (!Array.isArray(clientData.documentDetails)) continue;

      for (const doc of clientData.documentDetails) {
        try {
          const validFiles = (doc.files || []).filter((f: any) => {
            if (!f.name) return false;
            const name = f.name.toLowerCase();
            return !name.startsWith('~$') && !name.startsWith('.') &&
                   name !== 'desktop.ini' && name !== 'thumbs.db';
          });

          const realHasFiles = validFiles.length > 0;
          const realFileCount = validFiles.length;

          // Upsert documento
          const { data: docResult, error: docError } = await supabase
            .from('documents')
            .upsert({
              client_id: insertedClient.id,
              type: doc.type,
              label: doc.label || doc.type,
              exists: doc.exists || false,
              has_files: realHasFiles,
              file_count: realFileCount,
              folder_id: doc.folderId || null,
              folder_url: doc.folderUrl || null,
              updated_at: new Date().toISOString()
            }, { onConflict: 'client_id,type', ignoreDuplicates: false })
            .select();

          if (docError || !docResult?.length) {
            console.error('Error upserting document:', docError);
            continue;
          }

          const insertedDoc = docResult[0];
          documents++;

          // Borrar archivos anteriores de ESTE documento y reinsertar los actuales
          await supabase.from('files').delete().eq('document_id', insertedDoc.id);

          for (const file of validFiles) {
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
            if (!fileError) files++;
          }
        } catch (error) {
          console.error('Error processing document:', error);
        }
      }
    } catch (error) {
      console.error('Error processing client:', error);
    }
  }

  return { clients, documents, files };
}

/**
 * Sincronizar todos los clientes por lotes (sin borrar datos existentes)
 */
export async function syncAllClients(): Promise<{ success: boolean; message: string; stats?: any }> {
  const startTime = Date.now();

  try {
    // Paso 1: obtener lista ligera de clientes para saber el total
    const listResult = await callAppScript({ action: 'getClientList' });
    const totalClients = listResult.totalClients || 0;

    if (totalClients === 0) {
      return {
        success: false,
        message: 'No se encontraron clientes en Google Sheets',
        stats: { clientsUpdated: 0, documentsUpdated: 0, filesUpdated: 0, duration: Date.now() - startTime }
      };
    }

    // Guardar las cédulas que vienen del Sheet para limpiar zombies al final
    const sheetCedulas = new Set<string>(
      listResult.clients.map((c: any) => c.cedula.toString())
    );

    let totalStats = { clients: 0, documents: 0, files: 0 };
    let startIndex = 0;

    // Paso 2: procesar por lotes con escaneo de Drive
    while (startIndex < totalClients) {
      console.log(`Procesando lote: ${startIndex}-${startIndex + BATCH_SIZE} de ${totalClients}`);

      const batchResult = await callAppScript({
        action: 'getAllClients',
        startIndex,
        batchSize: BATCH_SIZE
      });

      const batchClients = batchResult.clients || [];
      if (batchClients.length === 0) break;

      const batchStats = await upsertClientBatch(batchClients);
      totalStats.clients += batchStats.clients;
      totalStats.documents += batchStats.documents;
      totalStats.files += batchStats.files;

      startIndex += BATCH_SIZE;
    }

    // Paso 3: limpiar clientes que ya no están en el Sheet (zombies)
    const { data: allDbClients } = await supabase.from('clients').select('id, cedula');
    if (allDbClients) {
      const zombieIds = allDbClients
        .filter(c => !sheetCedulas.has(c.cedula))
        .map(c => c.id);

      if (zombieIds.length > 0) {
        console.log(`Eliminando ${zombieIds.length} clientes que ya no están en el Sheet`);
        await supabase.from('files').delete().in('document_id',
          (await supabase.from('documents').select('id').in('client_id', zombieIds)).data?.map(d => d.id) || []
        );
        await supabase.from('documents').delete().in('client_id', zombieIds);
        await supabase.from('clients').delete().in('id', zombieIds);
      }
    }

    // Paso 4: registrar sync exitoso
    await supabase.from('sync_status').insert({
      last_sync: new Date().toISOString(),
      status: 'success',
      total_clients: totalStats.clients,
      total_documents: totalStats.documents
    });

    const duration = Date.now() - startTime;

    return {
      success: true,
      message: `Sincronización completada: ${totalStats.clients} clientes, ${totalStats.documents} documentos, ${totalStats.files} archivos`,
      stats: {
        clientsUpdated: totalStats.clients,
        documentsUpdated: totalStats.documents,
        filesUpdated: totalStats.files,
        totalInSheet: totalClients,
        duration
      }
    };
  } catch (error) {
    console.error('Error en sincronización:', error);

    try {
      await supabase.from('sync_status').insert({
        last_sync: new Date().toISOString(),
        status: 'error',
        total_clients: 0,
        total_documents: 0
      });
    } catch { /* ignorar error al registrar fallo */ }

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
    // Obtener todos los documentos del cliente desde Drive
    const result = await callAppScript({
      action: 'findFolder',
      clientName,
      clientId
      // Sin documentType → modo optimizado que trae todos los documentos
    });

    if (!result.ok || !result.data) {
      throw new Error(result.error || 'No se encontró carpeta del cliente');
    }

    // Buscar cliente en Supabase
    const { data: existingClients } = await supabase
      .from('clients')
      .select('*')
      .eq('cedula', clientId)
      .limit(1);

    if (!existingClients?.length) {
      return { success: false, message: 'Cliente no encontrado en la base de datos' };
    }

    const client = existingClients[0];

    // Upsert documentos y archivos del cliente
    if (Array.isArray(result.data.documents)) {
      await upsertClientBatch([{
        nombre: client.nombre,
        cedula: client.cedula,
        fecha: client.fecha,
        folderUrl: client.folder_url,
        folderId: client.folder_id,
        hasFolder: true,
        documentDetails: result.data.documents.map((doc: any) => ({
          type: doc.type,
          label: doc.type,
          exists: doc.exists,
          hasFiles: doc.hasFiles,
          fileCount: doc.fileCount,
          folderId: doc.folderId,
          folderUrl: doc.folderUrl,
          files: doc.files || []
        }))
      }]);
    }

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

/**
 * Obtener estado de la última sincronización
 */
export async function getSyncStatus() {
  const { data } = await supabase
    .from('sync_status')
    .select('*')
    .order('last_sync', { ascending: false })
    .limit(1);

  if (!data?.length) {
    return { lastSync: null, status: 'never', totalClients: 0, totalDocuments: 0 };
  }

  const row = data[0];
  return {
    lastSync: row.last_sync,
    status: row.status,
    totalClients: row.total_clients,
    totalDocuments: row.total_documents
  };
}
