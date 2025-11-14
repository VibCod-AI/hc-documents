import { NextRequest, NextResponse } from 'next/server';
import { syncClientAfterUpload } from '@/lib/syncServiceSupabase';

/**
 * 🔄 API para auto-sincronización después de subir documentos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, clientId } = body;

    console.log('🔄 [API] Auto-sincronización solicitada para:', { clientName, clientId });

    if (!clientName && !clientId) {
      return NextResponse.json(
        { success: false, message: 'Se requiere nombre o cédula del cliente' },
        { status: 400 }
      );
    }

    // Ejecutar auto-sincronización
    const result = await syncClientAfterUpload(clientName, clientId);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [API] Error en auto-sincronización:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error en auto-sincronización: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de auto-sincronización después de subir documentos',
    usage: 'POST con { clientName, clientId }'
  });
}
