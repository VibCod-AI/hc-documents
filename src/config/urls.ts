// Configuración de URLs del sistema
export const CONFIG = {
  // URL del Google Apps Script
  APP_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwSLwz3Y8PNuXY34aaCZmbIwon5aZWpmOYeY_uLGDmhh7kGRgho_W5YUystUzpuMXwv/exec',
  
  // URL del Webhook de Zapier
  ZAPIER_WEBHOOK_URL: 'https://hooks.zapier.com/hooks/catch/18943555/uhlsgcp/',
  
  // Configuración adicional
  DEFAULT_DOCUMENT_TYPE: '02_pagare',
  
  // Tipos de documentos disponibles
  DOCUMENT_TYPES: [
    { value: '01_escritura', label: '01 - Escritura' },
    { value: '02_pagare', label: '02 - Pagaré' },
    { value: '03_contrato_credito', label: '03 - Contrato de Crédito' },
    { value: '04_carta_de_instrucciones', label: '04 - Carta de Instrucciones' },
    { value: '05_aceptacion_de_credito', label: '05 - Aceptación de Crédito' },
    { value: '06_avaluo', label: '06 - Avalúo' },
    { value: '07_contrato_interco', label: '07 - Contrato Interco' },
    { value: '08_Finanzas', label: '08 - Finanzas' },
  ],
} as const;
