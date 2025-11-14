# Gestor de Documentos - Procesamiento Automático de Clientes

Una aplicación web moderna construida con Next.js que procesa automáticamente clientes desde Google Sheets y crea carpetas organizadas en Google Drive.

## 🚀 Características

- **Procesamiento automático**: Lee datos del último cliente en Google Sheets
- **Creación de carpetas estructuradas**: Genera carpeta principal + 8 subcarpetas
- **Nomenclatura automática**: Formato fecha_nombre_cedula
- **Interfaz moderna**: Diseño responsivo con Tailwind CSS
- **Feedback en tiempo real**: Notificaciones y estado de operaciones
- **Historial de operaciones**: Seguimiento de todas las carpetas creadas
- **Actualización automática**: Guarda URL de carpeta en el Google Sheet
- **TypeScript**: Tipado estático para mejor desarrollo

## 🛠️ Instalación y Configuración

### 1. Clonar e instalar dependencias

```bash
# Si ya tienes el proyecto
npm install

# Para ejecutar en desarrollo
npm run dev
```

### 2. Configurar Google Apps Script

Tu App Script ya está listo y funciona perfectamente. Aquí está el código que proporcionaste:

#### Código del App Script (Code.gs):

```javascript
// ID del Spreadsheet donde se guardarán logs
var LOG_SHEET_ID = "1CDGJ2R8rKkB4dYcGWYPTyHHOrxvhakaun8gu1kxhDl8";  // cambia esto por el ID de tu Google Sheet
var LOG_SHEET_NAME = "logs";       // nombre de la pestaña

// Función de logging
function logRequest(method, e, extra) {
  try {
    var ss = SpreadsheetApp.openById(LOG_SHEET_ID);
    var sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(LOG_SHEET_NAME);
      sheet.appendRow(["Fecha", "Método", "Parámetros", "Extra"]);
    }
    var params = e ? JSON.stringify(e.parameter || {}) : "{}";
    var body = e && e.postData ? e.postData.contents : "";
    var extraInfo = extra || "";
    sheet.appendRow([new Date(), method, params || body, extraInfo]);
  } catch (err) {
    Logger.log("Error guardando log: " + err.message);
  }
}

// --- Endpoint POST ---
function doPost(e) {
  try {
    logRequest("POST", e, "Intentando crear carpeta");

    // Llamamos tu lógica
    var folderUrl = createLastClientFolder();

    logRequest("POST", e, "Carpeta creada: " + folderUrl);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, folderUrl: folderUrl })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    logRequest("POST", e, "Error: " + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Tu lógica para crear carpeta ---
function createLastClientFolder() {
  var rootFolder = DriveApp.getFolderById("1Dtg-CliV40cQPqS1AkK3Ly_A_jys_Xr7");

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(lastRow, 2, 1, 3).getValues()[0];

  var fechaRaw = data[0];
  var nombre = data[1];
  var cedula = data[2];

  var fecha = Utilities.formatDate(new Date(fechaRaw), Session.getScriptTimeZone(), "yyyyMMdd");
  var nombreFormat = nombre.trim().replace(/\s+/g, "_").toLowerCase();
  var cedulaFormat = cedula.toString().replace(/[^\d]/g, "");

  var folderName = fecha + "_" + nombreFormat + "_" + cedulaFormat;

  var clientFolder = rootFolder.createFolder(folderName);

  var subFolders = [
    "01_escritura",
    "02_pagare",
    "03_contrato_credito",
    "04_carta_de_instrucciones",
    "05_aceptacion_de_credito",
    "06_avaluo",
    "07_contrato_interco",
    "08_Finanzas"
  ];

  subFolders.forEach(function(name) {
    clientFolder.createFolder(name);
  });

  sheet.getRange(lastRow, 6).setValue(clientFolder.getUrl());
  return clientFolder.getUrl();
}
```

### 3. Configurar el App Script

1. Ve a [Google Apps Script](https://script.google.com/)
2. Crea un nuevo proyecto
3. Pega el código anterior en `Code.gs`
4. Configura los permisos de Google Drive:
   - Ve a **Servicios** y habilita **Drive API**
5. Despliega como aplicación web:
   - Haz clic en **Implementar** > **Nueva implementación**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién puede acceder: **Cualquier persona**
   - Copia la URL generada

### 4. Permisos necesarios

El App Script necesitará permisos para:
- **Google Drive**: Para crear carpetas
- **Script**: Para ejecutar funciones

## 📱 Uso de la Aplicación

1. **Ejecutar la aplicación**:
   ```bash
   npm run dev
   ```

2. **Acceder en el navegador**: 
   - Abre http://localhost:3000

3. **Procesar cliente**:
   - Asegúrate de que tu Google Sheet tenga datos en la última fila
   - Columnas esperadas: B=Fecha, C=Nombre, D=Cédula
   - Pega la URL de tu App Script desplegado
   - Haz clic en "Crear Carpeta del Cliente"

4. **Verificar el resultado**:
   - La aplicación procesará automáticamente el último cliente
   - Creará la carpeta con formato: fecha_nombre_cedula
   - Generará las 8 subcarpetas necesarias
   - Actualizará la columna F del Sheet con la URL
   - Tendrás un enlace directo a la carpeta creada
   - Todas las operaciones se guardan en el historial

## 📋 Estructura de Carpetas Creadas

Para cada cliente se crea:
- **Carpeta principal**: `yyyyMMdd_nombre_cedula`
- **8 Subcarpetas**:
  1. `01_escritura`
  2. `02_pagare` 
  3. `03_contrato_credito`
  4. `04_carta_de_instrucciones`
  5. `05_aceptacion_de_credito`
  6. `06_avaluo`
  7. `07_contrato_interco`
  8. `08_Finanzas`

## 🔧 Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   └── create-folder/
│   │       └── route.ts          # API para comunicación con App Script
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout principal con Toaster
│   └── page.tsx                  # Página principal
└── components/
    ├── Header.tsx                # Encabezado de la aplicación
    ├── FolderForm.tsx           # Formulario para crear carpetas
    ├── StatusDisplay.tsx        # Mostrar estado de operaciones
    └── FolderHistory.tsx        # Historial de carpetas creadas
```

## 🚨 Solución de Problemas

### Error: "No se pudo conectar con el App Script"
- Verifica que la URL del App Script sea correcta
- Asegúrate de que el App Script esté desplegado como aplicación web
- Comprueba que los permisos estén configurados correctamente

### Error: "ID de carpeta padre no válido"
- Verifica que el ID de la carpeta padre exista
- Asegúrate de tener permisos para acceder a esa carpeta
- Deja el campo vacío para crear en la carpeta raíz

### Error de permisos
- Re-autoriza el App Script
- Verifica que tengas permisos para crear carpetas en Drive
- Comprueba la configuración de "Quién puede acceder" en el App Script

## 🔍 API Endpoints

### POST /api/create-folder
Crea una nueva carpeta en Google Drive.

**Body:**
```json
{
  "name": "Nombre de la carpeta",
  "parentId": "ID_opcional_carpeta_padre",
  "appScriptUrl": "https://script.google.com/macros/s/.../exec"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "id": "ID_de_la_carpeta",
    "url": "https://drive.google.com/drive/folders/...",
    "name": "Nombre de la carpeta",
    "parentId": "ID_carpeta_padre",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ve el archivo `LICENSE` para más detalles.