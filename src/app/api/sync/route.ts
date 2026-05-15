import { NextRequest, NextResponse } from 'next/server';
import { syncInit, syncBatch, syncFinalize, getSyncStatus, SYNC_BATCH_SIZE } from '@/lib/syncServiceSupabase';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // sin body
    }

    const action = body.action || 'sync';

    if (action === 'init') {
      const result = await syncInit();
      return NextResponse.json(result);
    }

    if (action === 'batch') {
      const startIndex = Number.isFinite(body.startIndex) ? body.startIndex : 0;
      const batchSize = Number.isFinite(body.batchSize) ? body.batchSize : SYNC_BATCH_SIZE;
      const result = await syncBatch(startIndex, batchSize);
      return NextResponse.json(result);
    }

    if (action === 'finalize') {
      const sheetCedulas: string[] = Array.isArray(body.sheetCedulas) ? body.sheetCedulas : [];
      const totals = body.totals || { clients: 0, documents: 0, files: 0 };
      const result = await syncFinalize(sheetCedulas, totals);
      return NextResponse.json(result);
    }

    if (action === 'status') {
      const status = await getSyncStatus();
      return NextResponse.json({ success: true, data: status });
    }

    return NextResponse.json(
      { success: false, message: 'Acción no válida. Use "init", "batch", "finalize" o "status".' },
      { status: 400 }
    );
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
          'POST /api/sync { action: "init" }': 'Inicia sync, retorna total y cédulas',
          'POST /api/sync { action: "batch", startIndex, batchSize }': 'Procesa un lote',
          'POST /api/sync { action: "finalize", sheetCedulas, totals }': 'Limpia zombies y registra',
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
