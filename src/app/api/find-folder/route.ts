import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, clientId, documentType, appScriptUrl } = body;

    // Validar datos de entrada
    if (!clientName && !clientId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Se requiere nombre del cliente o cédula' 
        },
        { status: 400 }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tipo de documento es requerido' 
        },
        { status: 400 }
      );
    }

    if (!appScriptUrl) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'URL del App Script es requerida' 
        },
        { status: 400 }
      );
    }

    console.log('🔍 Buscando carpeta para cliente:', { clientName, clientId, documentType });

    // Llamar al App Script para buscar la carpeta
    const response = await fetch(appScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'findFolder',
        clientName: clientName,
        clientId: clientId,
        documentType: documentType
      }),
    });

    if (!response.ok) {
      console.error('Error en respuesta del App Script:', response.status, response.statusText);
      return NextResponse.json(
        { 
          success: false, 
          error: `Error del App Script: ${response.status} ${response.statusText}` 
        },
        { status: 500 }
      );
    }

    const responseText = await response.text();
    console.log('Respuesta del App Script:', responseText.substring(0, 500));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Respuesta inválida del App Script' 
        },
        { status: 500 }
      );
    }

    if (result.ok) {
      return NextResponse.json({
        success: true,
        data: {
          folderId: result.folderId,
          folderName: result.folderName,
          folderUrl: result.folderUrl,
          subfolderPath: result.subfolderPath,
          documentType: documentType,
          hasFiles: result.hasFiles || false,
          files: result.files || [],
          fileCount: result.fileCount || 0,
          clientInfo: {
            name: clientName,
            id: clientId
          }
        },
        message: 'Carpeta encontrada exitosamente',
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'No se pudo encontrar la carpeta' 
        },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error en find-folder API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API para encontrar carpetas de clientes',
    usage: 'POST con clientName/clientId, documentType y appScriptUrl',
    documentTypes: [
      '02_pagare',
      '01_escritura', 
      '03_contrato_credito',
      '04_carta_de_instrucciones',
      '05_aceptacion_de_credito',
      '06_avaluo',
      '07_contrato_interco',
      '08_Finanzas'
    ]
  });
}
