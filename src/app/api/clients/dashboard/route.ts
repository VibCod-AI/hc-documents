import { NextRequest, NextResponse } from 'next/server';
import { getAllClientsWithProgress } from '@/lib/clientQueriesSupabase';

/**
 * 🚀 API SÚPER RÁPIDA: Dashboard de todos los clientes desde base de datos local
 * Respuesta en < 100ms en lugar de 60+ segundos
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 🚀 CONSULTA A SUPABASE
    const result = await getAllClientsWithProgress();
    
    const queryTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        clients: result.clients,
        totalClients: result.meta.totalClients
      },
      meta: {
        queryTime: queryTime,
        source: 'supabase',
        lastUpdated: result.meta.lastUpdated
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [LOCAL DB] Error cargando dashboard:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error consultando dashboard: ' + (error as Error).message,
        meta: {
          queryTime: totalTime,
          source: 'local_database'
        }
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Alias para GET (compatibilidad con código existente)
  return GET({} as NextRequest);
}
