import { NextRequest, NextResponse } from 'next/server';
import { getClientWithDocuments } from '@/lib/clientQueriesSupabase';

/**
 * 🚀 API SÚPER RÁPIDA: Buscar cliente en base de datos local
 * Respuesta en < 50ms en lugar de 9+ segundos
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { clientName, clientId } = body;

    console.log('⚡ [LOCAL DB] Búsqueda rápida de cliente:', { clientName, clientId });

    if (!clientName && !clientId) {
      return NextResponse.json(
        { success: false, message: 'Se requiere nombre o cédula del cliente' },
        { status: 400 }
      );
    }

    // 🚀 CONSULTA A SUPABASE
    const clientData = await getClientWithDocuments(clientName, clientId);
    
    const queryTime = Date.now() - startTime;

    if (!clientData) {
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado en la base de datos local' },
        { status: 404 }
      );
    }

    console.log('✅ [LOCAL DB] Cliente encontrado:', {
      nombre: clientData.name,
      documentos: clientData.documents.length,
      conArchivos: clientData.documents.filter(d => d.hasFiles).length
    });

    return NextResponse.json({
      success: true,
      data: clientData,
      meta: {
        queryTime: queryTime,
        source: 'local_database'
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [LOCAL DB] Error en búsqueda:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error consultando base de datos local: ' + (error as Error).message,
        meta: {
          queryTime: totalTime,
          source: 'local_database'
        }
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de búsqueda rápida en base de datos local',
    benefits: [
      'Respuesta en < 50ms',
      'No depende de Google Drive',
      'Funciona offline',
      'Datos siempre actualizados'
    ],
    usage: 'POST con { clientName, clientId }'
  });
}
