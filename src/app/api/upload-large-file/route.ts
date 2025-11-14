import { NextRequest, NextResponse } from 'next/server';

/**
 * API alternativa para archivos muy grandes (>6MB)
 * Usa upload directo a Google Drive evitando Zapier
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const clientName = formData.get('clientName') as string;
    const clientId = formData.get('clientId') as string;
    const documentType = formData.get('documentType') as string;
    const appScriptUrl = formData.get('appScriptUrl') as string;

    console.log('📤 Procesando archivo grande via método alternativo:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      clientName,
      clientId,
      documentType
    });

    // Validaciones
    if (!file || !appScriptUrl) {
      return NextResponse.json(
        { success: false, message: 'Archivo y URL del App Script son requeridos' },
        { status: 400 }
      );
    }

    // Paso 1: Buscar la carpeta del cliente
    const folderResponse = await fetch(new URL('/api/find-folder', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientName: clientName || undefined,
        clientId: clientId || undefined,
        documentType: documentType,
        appScriptUrl: appScriptUrl
      }),
    });

    const folderResult = await folderResponse.json();

    if (!folderResult.success) {
      return NextResponse.json({
        success: false,
        message: `No se pudo encontrar la carpeta del cliente: ${folderResult.error}`
      }, { status: 404 });
    }

    // Paso 2: Enviar archivo directamente al App Script para que lo maneje
    console.log('📤 Enviando archivo grande directamente al App Script...');
    
    const appScriptData = new FormData();
    appScriptData.append('file', file);
    appScriptData.append('action', 'uploadLargeFile');
    appScriptData.append('folderId', folderResult.data.folderId);
    appScriptData.append('folderName', folderResult.data.folderName);
    appScriptData.append('fileName', file.name);
    appScriptData.append('documentType', documentType);
    appScriptData.append('clientName', clientName || '');
    appScriptData.append('clientId', clientId || '');

    console.log('📋 Datos enviados al App Script:', {
      appScriptUrl,
      folderId: folderResult.data.folderId,
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      documentType,
      action: 'uploadLargeFile'
    });

    const appScriptResponse = await fetch(appScriptUrl, {
      method: 'POST',
      body: appScriptData,
    });

    console.log('📡 Respuesta HTTP del App Script:', {
      status: appScriptResponse.status,
      statusText: appScriptResponse.statusText,
      ok: appScriptResponse.ok,
      headers: Object.fromEntries(appScriptResponse.headers.entries())
    });

    if (!appScriptResponse.ok) {
      const errorText = await appScriptResponse.text();
      console.error('❌ Error en App Script:', appScriptResponse.status, appScriptResponse.statusText, errorText);
      
      // Manejar específicamente el error 429 (demasiadas solicitudes)
      if (appScriptResponse.status === 429) {
        return NextResponse.json({
          success: false,
          message: `🚨 Google Apps Script temporalmente sobrecargado. Demasiadas solicitudes.`,
          suggestion: 'Espera 2-3 minutos e intenta de nuevo, o comprime el archivo externamente.',
          retryAfter: 180, // 3 minutos
          alternatives: [
            'Comprimir archivo con SmallPDF.com a menos de 10MB',
            'Esperar 3 minutos antes de reintentar',
            'Dividir archivo en partes más pequeñas'
          ],
          details: {
            status: appScriptResponse.status,
            error: 'rate_limit_exceeded'
          }
        }, { status: 429 });
      }
      
      return NextResponse.json({
        success: false,
        message: `Error en App Script: ${appScriptResponse.status} ${appScriptResponse.statusText}`,
        details: errorText
      }, { status: 500 });
    }

    const appScriptResult = await appScriptResponse.text();
    console.log('✅ Respuesta completa del App Script:', appScriptResult);
    
    // Intentar parsear la respuesta como JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(appScriptResult);
      console.log('📊 Respuesta parseada:', parsedResult);
    } catch (parseError) {
      console.error('⚠️ No se pudo parsear la respuesta como JSON:', parseError);
      console.log('📄 Respuesta raw:', appScriptResult);
      parsedResult = { rawResponse: appScriptResult };
    }

    return NextResponse.json({
      success: parsedResult.ok !== false, // Verificar si el App Script reportó éxito
      message: parsedResult.message || `Archivo grande "${file.name}" procesado vía App Script`,
      method: 'direct_appscript',
      folderUrl: `https://drive.google.com/drive/folders/${folderResult.data.folderId}`,
      appScriptResponse: parsedResult,
      appScriptRaw: appScriptResult,
      details: {
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        folderId: folderResult.data.folderId,
        folderName: folderResult.data.folderName,
        documentType: documentType,
        method: 'App Script directo (evita límites de Zapier)',
        appScriptSuccess: parsedResult.ok,
        appScriptFileId: parsedResult.fileId,
        appScriptError: parsedResult.error
      }
    });

  } catch (error) {
    console.error('Error en upload-large-file:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint para subir archivos grandes directamente via App Script',
    method: 'POST',
    contentType: 'multipart/form-data',
    purpose: 'Evita límites de Zapier para archivos >6MB',
    requiredFields: [
      'file (File)',
      'clientName o clientId (string)', 
      'documentType (string)',
      'appScriptUrl (string)'
    ],
    flow: [
      '1. Recibe archivo grande',
      '2. Busca carpeta del cliente usando App Script', 
      '3. Envía archivo directamente al App Script',
      '4. App Script maneja upload a Google Drive'
    ]
  });
}
