'use client';

import { AlertCircle, FileText, Image, HelpCircle } from 'lucide-react';

interface FileOptimizationHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FileOptimizationHelp({ isOpen, onClose }: FileOptimizationHelpProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-blue-600" />
              Optimización de Archivos Grandes
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Límites */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Límites de Tamaño
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Recomendado:</strong> Hasta 6MB (óptimo para Zapier)</li>
                <li>• <strong>Máximo absoluto:</strong> 50MB</li>
                <li>• <strong>Compresión automática:</strong> Activada para archivos &gt; 6MB</li>
              </ul>
            </div>

            {/* PDFs */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-600" />
                Optimizar PDFs Grandes
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Métodos recomendados:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <strong>Adobe Acrobat:</strong> "Guardar como" → "PDF reducido"</li>
                    <li>• <strong>Preview (Mac):</strong> "Exportar" → "Quartz Filter" → "Reduce File Size"</li>
                    <li>• <strong>Google Drive:</strong> Abrir PDF → "Imprimir" → "Guardar como PDF"</li>
                    <li>• <strong>Online:</strong> SmallPDF, ILovePDF, PDF24</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Causas comunes de PDFs grandes:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Imágenes sin comprimir</li>
                    <li>• Resolución muy alta (300+ DPI)</li>
                    <li>• Fuentes incrustadas innecesarias</li>
                    <li>• Documentos escaneados sin optimizar</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Imágenes */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Image className="h-5 w-5 text-green-600" />
                Optimizar Imágenes
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Herramientas recomendadas:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <strong>Online:</strong> TinyPNG, Compressor.io</li>
                    <li>• <strong>Mac:</strong> ImageOptim, Preview</li>
                    <li>• <strong>Windows:</strong> Paint, IrfanView</li>
                    <li>• <strong>Móvil:</strong> Foto Compress, Image Resizer</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Configuración sugerida:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <strong>Formato:</strong> JPEG para fotos, PNG para logos</li>
                    <li>• <strong>Calidad:</strong> 70-85% para JPEG</li>
                    <li>• <strong>Resolución:</strong> Máximo 1920px ancho</li>
                    <li>• <strong>DPI:</strong> 72 DPI para web, 150 DPI para imprimir</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Compresión automática */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">✨ Compresión Automática SIEMPRE Activa</h3>
              <div className="text-sm text-green-800 space-y-2">
                <p>
                  <strong>¡Novedad!</strong> Ahora comprimimos TODOS los archivos automáticamente:
                </p>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>Imágenes:</strong> Compresión inteligente (40-80% calidad según tamaño)</li>
                  <li>• <strong>PDFs:</strong> Optimización básica (mejorado en futuras versiones)</li>
                  <li>• <strong>Objetivo:</strong> Mantener archivos bajo 5MB</li>
                  <li>• <strong>Preservación:</strong> Se mantiene la legibilidad del documento</li>
                  <li>• <strong>Transparencia:</strong> Te mostramos el % de reducción conseguido</li>
                </ul>
                <p className="text-xs bg-green-100 p-2 rounded mt-2">
                  <strong>Ventaja:</strong> Subes archivos más rápido y ocupas menos espacio en Drive.
                </p>
              </div>
            </div>

            {/* Problemas comunes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Problemas Comunes</h3>
              <div className="text-sm text-yellow-800 space-y-2">
                <div>
                  <strong>Archivo de 97MB para 50 páginas:</strong>
                  <p className="text-xs mt-1">
                    Esto es extremadamente grande. Un PDF de 50 páginas debería pesar 2-10MB máximo. 
                    Probablemente contiene imágenes sin comprimir o fue escaneado a muy alta resolución.
                  </p>
                </div>
                <div>
                  <strong>Solución rápida:</strong>
                  <p className="text-xs mt-1">
                    Usa "Imprimir → Guardar como PDF" con calidad "Buena" o "Media" en lugar de "Mejor".
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
