import { NextRequest, NextResponse } from 'next/server';
import { clearAllCache } from '@/utils/clientCache';

/**
 * 🔄 API para limpiar caché y forzar recarga de datos
 */
export async function POST() {
  try {
    console.log('🔄 Limpiando caché...');
    
    // Limpiar todo el caché
    clearAllCache();
    
    console.log('✅ Caché limpiado exitosamente');
    
    return NextResponse.json({
      success: true,
      message: 'Caché limpiado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error limpiando caché:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint para limpiar caché',
    usage: 'POST para limpiar caché y forzar recarga'
  });
}
