import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appScriptUrl, action } = body;

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
    // Si la acción es createMissingFolders, enviarla. Si no, enviar objeto vacío para mantener comportamiento original
    const payload = action === 'createMissingFolders' 
      ? { action: 'createMissingFolders' } 
      : {};

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
      
      // Caso 1: Creación de carpetas en lote
      if (action === 'createMissingFolders' && result.data) {
        return NextResponse.json({
          success: true,
          data: result.data,
          message: result.message || 'Proceso de creación de carpetas completado',
        });
      }

      // Caso 2: Creación de carpeta única (comportamiento original)
      // Extraer ID de la carpeta de la URL
      const urlMatch = result.folderUrl ? result.folderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/) : null;
      const folderId = urlMatch ? urlMatch[1] : 'unknown';
      
      return NextResponse.json({
        success: true,
        data: {
          id: folderId,
          url: result.folderUrl,
          name: 'Carpeta del cliente (desde Sheet)',
          createdAt: new Date().toISOString(),
        },
        message: 'Carpeta del cliente creada exitosamente',
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
