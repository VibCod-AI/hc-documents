import { NextRequest, NextResponse } from 'next/server';
import { syncAllClients, getSyncStatus } from '@/lib/syncServiceSupabase';

export async function POST(request: NextRequest) {
  try {
    let action = 'sync';

    try {
      const body = await request.json();
      if (body.action) action = body.action;
    } catch {
      // Sin body o JSON inválido → sync por defecto
    }

    if (action === 'sync') {
      console.log('Iniciando sincronización manual...');
      const result = await syncAllClients();
      return NextResponse.json(result);

    } else if (action === 'status') {
      const status = await getSyncStatus();
      return NextResponse.json({ success: true, data: status });

    } else {
      return NextResponse.json(
        { success: false, message: 'Acción no válida. Use "sync" o "status"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error en API de sincronización:', error);
    return NextResponse.json(
      { success: false, message: 'Error en sincronización: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await getSyncStatus();
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
      { success: false, message: 'Error obteniendo estado: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
