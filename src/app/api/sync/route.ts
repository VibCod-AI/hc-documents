import { NextRequest, NextResponse } from 'next/server';
import { syncAllClients } from '@/lib/syncServiceSupabase';

/**
 * 🔄 API de sincronización entre base de datos local y Google Drive
 */

export async function POST(request: NextRequest) {
  try {
    let action = 'sync'; // Por defecto, sincronizar
    
    // Intentar parsear el body si existe
    try {
      const body = await request.json();
      if (body.action) {
        action = body.action;
      }
    } catch (e) {
      // Si no hay body o no es JSON válido, usar acción por defecto
      console.log('No se pudo parsear body, usando acción por defecto: sync');
    }

    if (action === 'sync') {
      console.log('🔄 Iniciando sincronización manual...');
      const result = await syncAllClients();
      
      return NextResponse.json(result);
      
    } else if (action === 'status') {
      const status = getSyncStatus();
      
      return NextResponse.json({
        success: true,
        data: status
      });
      
    } else {
      return NextResponse.json(
        { success: false, message: 'Acción no válida. Use "sync" o "status"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Error en API de sincronización:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error en sincronización: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Obtener estado de sincronización
  try {
    const status = getSyncStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
      info: {
        message: 'Estado de sincronización',
        endpoints: {
          'POST /api/sync': 'Sincronizar datos',
          'GET /api/sync': 'Obtener estado'
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error obteniendo estado: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}
