# Configuración de Google Drive API para Archivos Grandes

## ¿Por qué Google Drive API?
- ✅ **Archivos hasta 100MB+** sin problemas
- ✅ **Sin límites de frecuencia** como App Script  
- ✅ **Upload directo** más rápido y confiable
- ✅ **Sin intermediarios** (Zapier/App Script)

## Pasos para Configurar

### 1. Crear Proyecto en Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el **Project ID**

### 2. Habilitar Google Drive API
1. En el proyecto, ve a "APIs y servicios" → "Biblioteca"
2. Busca "Google Drive API"
3. Haz clic en "Habilitar"

### 3. Crear Credenciales
1. Ve a "APIs y servicios" → "Credenciales"
2. Haz clic en "Crear credenciales" → "ID de cliente de OAuth 2.0"
3. Configura:
   - Tipo: Aplicación web
   - Nombre: "Gestor Documentos"
   - Orígenes autorizados: `http://localhost:3000`, `https://tu-dominio.com`
4. Descarga el archivo JSON de credenciales

### 4. Configurar Variables de Entorno
Crea/actualiza `.env.local`:

```bash
# Google Drive API
GOOGLE_CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_API_KEY=tu_api_key_aqui

# URLs existentes
APP_SCRIPT_URL=https://script.google.com/macros/s/...
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
```

### 5. Instalar Dependencias
```bash
npm install googleapis google-auth-library
```

## Beneficios Después de la Configuración

### Límites Nuevos:
- **≤ 10MB:** Zapier (rápido)
- **10-100MB:** Google Drive API (confiable)
- **> 100MB:** Chunks o compresión externa

### Características:
- **Sin errores 429** (demasiadas solicitudes)
- **Upload directo** sin intermediarios
- **Progreso en tiempo real**
- **Manejo de errores robusto**

## Implementación

Una vez configurado, el sistema automáticamente:
1. Detecta archivos > 10MB
2. Usa Google Drive API en lugar de App Script
3. Sube directamente a la carpeta correcta
4. Reporta progreso y éxito

## Alternativas Temporales

Mientras se configura:
1. **SmallPDF.com** para comprimir archivos
2. **Esperar 3-5 minutos** entre intentos con App Script
3. **Dividir archivos grandes** manualmente

---
¿Quieres que implementemos esta configuración paso a paso?









