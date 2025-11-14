import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const clientName = formData.get('clientName') as string;
    const clientId = formData.get('clientId') as string;
    const documentType = formData.get('documentType') as string;
    const appScriptUrl = formData.get('appScriptUrl') as string;
    const zapierWebhookUrl = formData.get('zapierWebhookUrl') as string;

    // Validaciones
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No se recibió ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tamaño del archivo (límite flexible para archivos comprimidos)
    const fileSizeMB = file.size / 1024 / 1024;
    const maxSizeMB = 150; // Límite aumentado temporalmente para manejar PDFs muy grandes
    
    if (fileSizeMB > maxSizeMB) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Archivo extremadamente grande (${fileSizeMB.toFixed(2)}MB). Máximo permitido: ${maxSizeMB}MB. Considera usar herramientas externas para comprimir el PDF antes de subirlo.` 
        },
        { status: 413 }
      );
    }

    if (!clientName && !clientId) {
      return NextResponse.json(
        { success: false, message: 'Se requiere nombre del cliente o cédula' },
        { status: 400 }
      );
    }

    if (!appScriptUrl || !zapierWebhookUrl) {
      return NextResponse.json(
        { success: false, message: 'URLs del App Script y Zapier son requeridas' },
        { status: 400 }
      );
    }

    console.log('📤 Procesando subida de documento:', {
      fileName: file.name,
      fileSize: file.size,
      clientName,
      clientId,
      documentType
    });

    // Paso 1: Buscar la carpeta del cliente
    console.log('🔍 Buscando carpeta del cliente...');
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

    console.log('✅ Carpeta encontrada:', folderResult.data.folderId);

    // Paso 2: Preparar datos para Zapier
    const zapierData = new FormData();
    zapierData.append('file', file);
    zapierData.append('folderId', folderResult.data.folderId);
    zapierData.append('folderName', folderResult.data.folderName);
    zapierData.append('documentType', documentType);
    zapierData.append('clientName', clientName || '');
    zapierData.append('clientId', clientId || '');
    zapierData.append('fileName', file.name);

    // Debug: Mostrar datos que se envían a Zapier
    console.log('📨 Datos que se envían a Zapier:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: file.type,
      folderId: folderResult.data.folderId,
      folderName: folderResult.data.folderName,
      documentType: documentType,
      clientName: clientName || '',
      clientId: clientId || '',
      zapierUrl: zapierWebhookUrl
    });

    // Paso 3: Enviar a Zapier
    console.log('📨 Enviando a Zapier webhook...');
    const zapierResponse = await fetch(zapierWebhookUrl, {
      method: 'POST',
      body: zapierData,
    });

    if (!zapierResponse.ok) {
      const errorText = await zapierResponse.text();
      console.error('Error en Zapier:', zapierResponse.status, zapierResponse.statusText, errorText);
      
      // Manejar específicamente el error 413 (archivo muy grande)
      if (zapierResponse.status === 413) {
        return NextResponse.json({
          success: false,
          message: `❌ Archivo demasiado grande para Zapier (${(file.size / 1024 / 1024).toFixed(2)}MB). El límite de Zapier es 6MB. Prueba comprimir el archivo externamente.`
        }, { status: 413 });
      }
      
      return NextResponse.json({
        success: false,
        message: `Error en Zapier: ${zapierResponse.status} ${zapierResponse.statusText}`
      }, { status: 500 });
    }

    const zapierResult = await zapierResponse.text();
    console.log('✅ Respuesta de Zapier:', zapierResult);

    return NextResponse.json({
      success: true,
      message: `Documento "${file.name}" enviado exitosamente a la carpeta ${folderResult.data.folderName}`,
      folderUrl: `https://drive.google.com/drive/folders/${folderResult.data.folderId}`,
      zapierResponse: zapierResult,
      details: {
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        folderId: folderResult.data.folderId,
        folderName: folderResult.data.folderName,
        documentType: documentType
      }
    });

  } catch (error) {
    console.error('Error en upload-document:', error);
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
    message: 'Endpoint para subir documentos a carpetas de clientes',
    method: 'POST',
    contentType: 'multipart/form-data',
    requiredFields: [
      'file (File)',
      'clientName o clientId (string)', 
      'documentType (string)',
      'appScriptUrl (string)',
      'zapierWebhookUrl (string)'
    ],
    flow: [
      '1. Recibe archivo y datos del cliente',
      '2. Busca carpeta del cliente usando App Script', 
      '3. Envía archivo + folder ID a Zapier',
      '4. Zapier sube archivo a Google Drive'
    ]
  });
}
