import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DOC_TYPES: { type: string; label: string }[] = [
  { type: '01_escritura', label: 'Escritura' },
  { type: '02_pagare', label: 'Pagaré' },
  { type: '03_contrato_credito', label: 'Contrato de Crédito' },
  { type: '04_carta_de_instrucciones', label: 'Carta de Instrucciones' },
  { type: '05_aceptacion_de_credito', label: 'Aceptación de Crédito' },
  { type: '06_avaluo', label: 'Avalúo' },
  { type: '07_contrato_interco', label: 'Contrato Interco' },
  { type: '08_Finanzas', label: 'Finanzas' }
];

interface SubfolderInfo {
  type: string;
  folderId: string;
  folderUrl: string;
}

interface SyncClientInput {
  nombre: string;
  cedula: string;
  fecha?: string | null;
  fechaEscrituracion?: string | null;
  folderUrl: string;
  folderId: string;
  subfolders?: SubfolderInfo[];
}

async function upsertClientWithDocs(input: SyncClientInput) {
  const cedulaStr = input.cedula.toString();
  await supabase.from('clients').upsert({
    nombre: input.nombre,
    cedula: cedulaStr,
    fecha: input.fecha || null,
    fecha_escrituracion: input.fechaEscrituracion || null,
    folder_url: input.folderUrl,
    folder_id: input.folderId,
    has_folder: true,
    updated_at: new Date().toISOString()
  }, { onConflict: 'cedula', ignoreDuplicates: false });

  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('cedula', cedulaStr)
    .limit(1)
    .single();

  if (!clientRow) return;

  const subfolderMap = new Map<string, SubfolderInfo>();
  (input.subfolders || []).forEach(sf => subfolderMap.set(sf.type, sf));

  for (const doc of DOC_TYPES) {
    const sf = subfolderMap.get(doc.type);
    await supabase.from('documents').upsert({
      client_id: clientRow.id,
      type: doc.type,
      label: doc.label,
      exists: !!sf,
      has_files: false,
      file_count: 0,
      folder_id: sf?.folderId || null,
      folder_url: sf?.folderUrl || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'client_id,type', ignoreDuplicates: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appScriptUrl, action, cedula } = body;

    // Validar datos de entrada
    if (!appScriptUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL del App Script es requerida'
        },
        { status: 400 }
      );
    }

    // Validar que la URL sea válida
    try {
      new URL(appScriptUrl);
    } catch {
      return NextResponse.json(
        { 
          success: false, 
          error: 'URL del App Script no es válida' 
        },
        { status: 400 }
      );
    }

    console.log('Llamando al App Script:', appScriptUrl, 'con acción:', action || 'default');

    // Preparar payload
    let payload: Record<string, unknown> = {};
    if (action === 'createMissingFolders') {
      payload = { action: 'createMissingFolders' };
    } else if (action === 'forceCreateFolderByCedula') {
      if (!cedula) {
        return NextResponse.json(
          { success: false, error: 'cedula es requerida para forceCreateFolderByCedula' },
          { status: 400 }
        );
      }
      payload = { action: 'forceCreateFolderByCedula', cedula };
    }

    // Llamar al App Script
    const response = await fetch(appScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      console.error('Error en respuesta del App Script:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Contenido de la respuesta de error:', errorText.substring(0, 500));
      return NextResponse.json(
        { 
          success: false, 
          error: `Error del App Script: ${response.status} ${response.statusText}` 
        },
        { status: 500 }
      );
    }

    // Obtener el texto de la respuesta primero para debuggear
    const responseText = await response.text();
    console.log('Respuesta cruda del App Script:', responseText.substring(0, 500));

    // Intentar parsear como JSON
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Respuesta parseada del App Script:', result);
    } catch (parseError) {
      console.error('Error parseando JSON del App Script:', parseError);
      console.error('Respuesta completa:', responseText);
      return NextResponse.json(
        { 
          success: false, 
          error: 'El App Script devolvió una respuesta inválida (no JSON). Verifica que esté desplegado correctamente y que los permisos estén configurados.' 
        },
        { status: 500 }
      );
    }

    // Verificar el resultado del App Script
    if (result.ok) {
      
      // Caso 1: Creación de carpetas en lote — sincronizar cada cliente a Supabase
      if (action === 'createMissingFolders' && result.data) {
        const details = Array.isArray(result.data.details) ? result.data.details : [];
        let syncedCount = 0;
        const syncErrors: string[] = [];

        for (const d of details) {
          if (d.status === 'error' || !d.folderId || !d.folderUrl || !d.cedula) continue;
          try {
            await upsertClientWithDocs({
              nombre: d.name,
              cedula: d.cedula,
              fecha: d.fecha || null,
              fechaEscrituracion: d.fechaEscrituracion || null,
              folderUrl: d.folderUrl,
              folderId: d.folderId,
              subfolders: d.subfolders || []
            });
            syncedCount++;
          } catch (syncErr) {
            console.error('Error sincronizando cliente con Supabase:', d.name, syncErr);
            syncErrors.push(d.name);
          }
        }

        return NextResponse.json({
          success: true,
          data: { ...result.data, syncedCount, syncErrors },
          message: `${result.message || 'Proceso completado'}. ${syncedCount} sincronizados a Supabase${syncErrors.length ? ` (${syncErrors.length} errores)` : ''}`,
        });
      }

      // Caso 1b: Forzar recreación de carpeta por cédula
      if (action === 'forceCreateFolderByCedula' && result.clientData) {
        const cd = result.clientData;
        const forceFolderId = result.folderId || (() => {
          const m = result.folderUrl ? result.folderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/) : null;
          return m ? m[1] : 'unknown';
        })();

        try {
          await upsertClientWithDocs({
            nombre: cd.nombre,
            cedula: cd.cedula.toString(),
            fecha: cd.fecha || null,
            fechaEscrituracion: cd.fechaEscrituracion || null,
            folderUrl: result.folderUrl,
            folderId: forceFolderId,
            subfolders: result.subfolders || []
          });
        } catch (dbError) {
          console.error('Error sincronizando carpeta forzada en Supabase:', dbError);
        }

        return NextResponse.json({
          success: true,
          data: {
            id: forceFolderId,
            url: result.folderUrl,
            name: cd.nombre,
            cedula: cd.cedula,
            subfolders: result.subfolders || [],
            alreadyExisted: false,
            createdAt: new Date().toISOString(),
          },
          message: 'Carpeta recreada y sincronizada en Supabase',
        });
      }

      // Caso 2: Creación de carpeta única (comportamiento original)
      const folderId = result.folderId || (() => {
        const m = result.folderUrl ? result.folderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/) : null;
        return m ? m[1] : 'unknown';
      })();

      // Insertar/actualizar el cliente en Supabase si tenemos datos
      if (result.clientData) {
        try {
          const cd = result.clientData;
          await upsertClientWithDocs({
            nombre: cd.nombre,
            cedula: cd.cedula.toString(),
            fecha: cd.fecha || null,
            fechaEscrituracion: cd.fechaEscrituracion || null,
            folderUrl: result.folderUrl,
            folderId,
            subfolders: result.subfolders || []
          });
          console.log('Cliente insertado en Supabase:', cd.nombre);
        } catch (dbError) {
          console.error('Error insertando cliente en Supabase:', dbError);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          id: folderId,
          url: result.folderUrl,
          name: result.clientData?.nombre || 'Carpeta del cliente (desde Sheet)',
          cedula: result.clientData?.cedula || null,
          alreadyExisted: result.clientData?.alreadyExisted || false,
          createdAt: new Date().toISOString(),
        },
        message: result.clientData?.alreadyExisted
          ? 'El cliente ya tenía carpeta, se actualizó en la base de datos'
          : 'Carpeta del cliente creada exitosamente',
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Error desconocido del App Script' 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error en create-folder API:', error);
    
    // Manejar errores específicos
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se pudo conectar con el App Script. Verifica la URL.' 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

// Método GET para verificar que la API está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'API de creación de carpetas funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoints: {
      createFolder: {
        method: 'POST',
        description: 'Crea carpeta del último cliente desde Google Sheet usando App Script',
        requiredFields: ['appScriptUrl'],
        optionalFields: [],
        note: 'El App Script lee automáticamente los datos del último cliente del Google Sheet'
      }
    }
  });
}
