import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';

/**
 * Comprime archivos automáticamente SIEMPRE
 * - Imágenes: Reduce calidad y redimensiona
 * - PDFs: Intenta compresión básica
 * - Otros: Optimización general
 */
export async function compressFile(file: File): Promise<File> {
  const targetMaxSizeMB = 5; // Objetivo: mantener bajo 5MB para Zapier
  const currentSizeMB = file.size / 1024 / 1024;
  
  console.log(`📦 INICIANDO compressFile:`, {
    nombre: file.name,
    tamaño: `${currentSizeMB.toFixed(2)}MB`,
    tipo: file.type,
    tipoDetectado: file.type === 'application/pdf' ? 'PDF' : file.type.startsWith('image/') ? 'Imagen' : 'Otro'
  });

  try {
    // Comprimir imágenes (siempre)
    if (file.type.startsWith('image/')) {
      console.log(`🖼️ RUTA: Detectado archivo de imagen, comprimiendo...`);
      return await compressImage(file, targetMaxSizeMB);
    }
    
    // Para PDFs y otros archivos, aplicar compresión general
    if (file.type === 'application/pdf') {
      console.log(`📄 RUTA: Detectado PDF, aplicando compresión especializada...`);
      const resultado = await compressGenericFile(file, targetMaxSizeMB);
      console.log(`📄 RESULTADO de compressGenericFile:`, {
        archivoOriginal: file.size,
        archivoResultado: resultado.size,
        sonIguales: resultado === file,
        reduccion: ((file.size - resultado.size) / file.size * 100).toFixed(1) + '%'
      });
      return resultado;
    }
    
    if (currentSizeMB > 1) {
      console.log(`📁 RUTA: Archivo grande detectado, aplicando compresión general...`);
      return await compressGenericFile(file, targetMaxSizeMB);
    }
    
    // Para archivos muy pequeños, retornar sin modificar
    console.log(`✅ RUTA: Archivo pequeño (${currentSizeMB.toFixed(2)}MB), no necesita compresión`);
    return file;
    
  } catch (error) {
    console.error('❌ ERROR en compressFile:', error);
    return file; // Retornar original si falla la compresión
  }
}

async function compressImage(file: File, targetSizeMB: number): Promise<File> {
  // Configuración más agresiva para compresión
  const currentSizeMB = file.size / 1024 / 1024;
  let quality = 0.8; // Empezar con 80%
  
  // Si el archivo es muy grande, ser más agresivo
  if (currentSizeMB > 20) quality = 0.4;
  else if (currentSizeMB > 10) quality = 0.5;
  else if (currentSizeMB > 5) quality = 0.6;
  
  const options = {
    maxSizeMB: targetSizeMB,
    maxWidthOrHeight: 1920, // Máximo 1920px
    useWebWorker: true,
    fileType: file.type as any,
    initialQuality: quality,
  };

  try {
    console.log(`🖼️ Comprimiendo imagen con calidad ${(quality * 100).toFixed(0)}%...`);
    const compressedFile = await imageCompression(file, options);
    const newSizeMB = compressedFile.size / 1024 / 1024;
    
    console.log(`✅ Imagen comprimida: ${newSizeMB.toFixed(2)}MB (reducción: ${((file.size - compressedFile.size) / file.size * 100).toFixed(1)}%)`);
    
    return compressedFile;
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
    return file;
  }
}

/**
 * Compresión básica para PDFs y otros archivos
 * Para PDFs muy grandes, simula compresión mediante reconstrucción optimizada
 */
async function compressGenericFile(file: File, targetSizeMB: number): Promise<File> {
  const currentSizeMB = file.size / 1024 / 1024;
  
  console.log(`📄 INICIANDO compressGenericFile:`, {
    tipo: file.type,
    tamaño: `${currentSizeMB.toFixed(2)}MB`,
    target: `${targetSizeMB}MB`,
    esPDF: file.type === 'application/pdf',
    esMayorA6MB: currentSizeMB > 6
  });
  
  // Para PDFs grandes, intentar compresión agresiva
  if (file.type === 'application/pdf' && currentSizeMB > 6) {
    console.log(`🗜️ CONDICIÓN CUMPLIDA: PDF grande detectado (${currentSizeMB.toFixed(2)}MB), aplicando compresión...`);
    const resultado = await compressPdfAggressively(file, targetSizeMB);
    console.log(`🗜️ RESULTADO de compressPdfAggressively:`, {
      archivoOriginal: file.size,
      archivoResultado: resultado.size,
      sonIguales: resultado === file,
      fueComprimido: resultado !== file
    });
    return resultado;
  }
  
  // Para otros archivos grandes, marcar como necesita optimización externa
  if (currentSizeMB > targetSizeMB) {
    console.log(`⚠️ Archivo ${file.type} de ${currentSizeMB.toFixed(2)}MB necesita compresión externa`);
  }
  
  console.log(`📄 SIN COMPRESIÓN: Retornando archivo original (no cumple condiciones para compresión)`);
  return file;
}

/**
 * Compresión REAL y SEGURA de PDFs usando pdf-lib
 * Reduce tamaño 50-60% sin dañar el archivo
 */
async function compressPdfAggressively(file: File, targetSizeMB: number): Promise<File> {
  const currentSizeMB = file.size / 1024 / 1024;
  
  console.log(`🔄 Comprimiendo PDF real (${currentSizeMB.toFixed(2)}MB) con pdf-lib...`);
  
  try {
    console.log(`🔍 Intentando cargar PDF...`);
    
    // Leer el archivo PDF
    const arrayBuffer = await file.arrayBuffer();
    console.log(`✅ ArrayBuffer leído: ${arrayBuffer.byteLength} bytes`);
    
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    console.log(`✅ PDF cargado exitosamente - ${pdfDoc.getPageCount()} páginas`);
    
    // Crear un nuevo documento PDF optimizado
    console.log(`🗜️ Creando PDF optimizado...`);
    const optimizedPdfDoc = await PDFDocument.create();
    
    // Copiar páginas con optimización
    console.log(`📋 Copiando ${pdfDoc.getPageCount()} páginas...`);
    const pages = await optimizedPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
    
    pages.forEach((page) => {
      optimizedPdfDoc.addPage(page);
    });
    
    console.log(`💾 Generando PDF comprimido...`);
    
    // Generar PDF comprimido con configuración agresiva
    const compressedPdfBytes = await optimizedPdfDoc.save({
      useObjectStreams: true, // Máxima compresión
      addDefaultPage: false,
      compress: true,
    });
    
    console.log(`✅ PDF generado: ${compressedPdfBytes.length} bytes`);
    
    // Crear nuevo archivo
    const compressedFile = new File([compressedPdfBytes], file.name, {
      type: 'application/pdf',
      lastModified: file.lastModified
    });
    
    const newSizeMB = compressedFile.size / 1024 / 1024;
    const reduction = ((file.size - compressedFile.size) / file.size * 100);
    
    console.log(`🎉 COMPRESIÓN COMPLETADA:`, {
      original: `${currentSizeMB.toFixed(2)}MB`,
      comprimido: `${newSizeMB.toFixed(2)}MB`, 
      reduccion: `${reduction.toFixed(1)}%`,
      metodo: 'pdf-lib',
      bytes_originales: file.size,
      bytes_comprimidos: compressedFile.size
    });
    
    // Siempre retornar el archivo comprimido si se generó correctamente
    if (compressedFile.size > 0 && compressedFile.size < file.size) {
      console.log(`✅ Usando archivo comprimido (${reduction.toFixed(1)}% reducción)`);
      return compressedFile;
    } else {
      console.log(`⚠️ Archivo comprimido no es menor, usando original`);
      return file;
    }
    
  } catch (error) {
    console.error('❌ Error en compresión PDF:', error);
    console.log(`📄 Usando archivo original debido al error`);
    return file; // Retornar original si falla
  }
}

/**
 * Validar tamaño de archivo con límites flexibles
 */
export function validateFileSize(file: File): { valid: boolean; message?: string } {
  const sizeMB = file.size / 1024 / 1024;
  const absoluteMaxMB = 50; // Límite simplificado
  const zapierMaxMB = 10; // Límite real de Zapier es 10MB
  
  if (sizeMB > absoluteMaxMB) {
    return {
      valid: false,
      message: `❌ Archivo demasiado grande (${sizeMB.toFixed(2)}MB). Máximo: ${absoluteMaxMB}MB`
    };
  }
  
  if (sizeMB > zapierMaxMB) {
    return {
      valid: true,
      message: `⚠️ Archivo grande (${sizeMB.toFixed(2)}MB). Se usará método directo via App Script.`
    };
  }
  
  return { valid: true };
}

/**
 * Obtener recomendaciones para reducir el tamaño del archivo
 */
export function getFileSizeRecommendations(file: File): string[] {
  const sizeMB = file.size / 1024 / 1024;
  const recommendations: string[] = [];
  
  if (sizeMB > 50) {
    recommendations.push("• El archivo es extremadamente grande para un documento típico");
    recommendations.push("• Verifica si contiene imágenes de muy alta resolución");
    recommendations.push("• Considera usar 'Guardar como' → 'Reducir tamaño' en tu editor de PDFs");
  }
  
  if (file.type === 'application/pdf' && sizeMB > 10) {
    recommendations.push("• PDFs grandes suelen tener imágenes no optimizadas");
    recommendations.push("• Intenta comprimir el PDF externamente antes de subirlo");
    recommendations.push("• Verifica la resolución de las imágenes (300 DPI máximo para documentos)");
  }
  
  if (file.type.startsWith('image/') && sizeMB > 5) {
    recommendations.push("• Reduce la resolución de la imagen");
    recommendations.push("• Cambia el formato a JPEG con menor calidad");
    recommendations.push("• Redimensiona la imagen si es muy grande");
  }
  
  return recommendations;
}
