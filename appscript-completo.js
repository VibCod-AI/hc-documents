// --- CONFIGURACIÓN ---
// ID del Spreadsheet donde se guardarán logs
var LOG_SHEET_ID   = "1CDGJ2R8rKkB4dYcGWYPTyHHOrxvhakaun8gu1kxhDl8";  
var LOG_SHEET_NAME = "logs";

// ID del Spreadsheet donde están los clientes
var DATA_SHEET_ID   = "1gpzBoGicWjCo7KidDUaXRXFw-0-Qo24qYeugjNvIGg8";
var DATA_SHEET_NAME = "Creditos";   // nombre real de la pestaña

// Carpeta raíz en Drive
var ROOT_FOLDER_ID = "1Dtg-CliV40cQPqS1AkK3Ly_A_jys_Xr7";


// --- LOGGING ---
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


// --- ENDPOINT GET (para pruebas desde navegador ) ---
function doGet(e) {
  try {
    // Si hay parámetros, procesarlos
    if (e && e.parameter && e.parameter.action) {
      console.log('GET request con acción:', e.parameter.action);
      
      if (e.parameter.action === 'getAllClients' || e.parameter.action === 'getClientList') {
        logRequest("GET", e, "Obteniendo lista ligera de clientes via GET");

        try {
          var clients = getClientListFromSheet();

          logRequest("GET", e, "Lista obtenida via GET: " + clients.length + " registros");

          return ContentService.createTextOutput(
            JSON.stringify({
              ok: true,
              clients: clients,
              totalClients: clients.length
            })
          ).setMimeType(ContentService.MimeType.JSON);

        } catch (error) {
          console.error('Error obteniendo clientes:', error);
          logRequest("GET", e, "Error: " + error.message);
          return ContentService.createTextOutput(
            JSON.stringify({ ok: false, error: "Error obteniendo clientes: " + error.message })
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    
    // Respuesta por defecto
    return ContentService.createTextOutput(
      JSON.stringify({ 
        ok: true, 
        message: "App Script funcionando correctamente",
        functions: ["createFolder", "findFolder", "getAllClients"],
        timestamp: new Date().toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error en doGet:', error);
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: error.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// 🧪 FUNCIÓN DE PRUEBA - Para ejecutar directamente en el editor de Apps Script
function testOptimizedSearch() {
  try {
    console.log('🧪 Iniciando prueba de búsqueda optimizada...');
    
    // Simular un request POST con datos de prueba
    var testRequest = {
      postData: {
        contents: JSON.stringify({
          action: 'findFolder',
          clientName: 'MARIA', // Cambia por un nombre que exista en tu sheet
          clientId: '12345'     // Cambia por una cédula que exista
          // SIN documentType para activar modo optimizado
        })
      }
    };
    
    console.log('🧪 Datos de prueba:', testRequest.postData.contents);
    
    // Ejecutar la función doPost
    var result = doPost(testRequest);
    var response = JSON.parse(result.getContent());
    
    console.log('🧪 Resultado de la prueba:', response);
    
    if (response.ok) {
      console.log('✅ Prueba exitosa!');
      console.log('📊 Cliente encontrado:', response.data.clientName);
      console.log('📄 Documentos encontrados:', response.data.documents.length);
      
      // Mostrar resumen de documentos
      response.data.documents.forEach(function(doc) {
        console.log('📋 ' + doc.type + ': ' + (doc.hasFiles ? '✅ Con archivos (' + doc.fileCount + ')' : '❌ Sin archivos'));
      });
      
    } else {
      console.log('❌ Prueba falló:', response.error);
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
    return { ok: false, error: error.message };
  }
}


// --- ENDPOINT POST MEJORADO ---
function doPost(e) {
  try {
    logRequest("POST", e, "Procesando request");
    
    // Parsear datos si existen
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
        console.log('Datos recibidos:', requestData);
      } catch (parseError) {
        console.log('No hay datos JSON válidos, usando función original');
      }
    }
    
    // Obtener solo el conteo y lista ligera de clientes (sin escaneo de Drive)
    if (requestData.action === 'getClientList') {
      logRequest("POST", e, "Obteniendo lista ligera de clientes");

      try {
        var clientList = getClientListFromSheet();
        logRequest("POST", e, "Lista ligera obtenida: " + clientList.length + " clientes");

        return ContentService.createTextOutput(
          JSON.stringify({
            ok: true,
            clients: clientList,
            totalClients: clientList.length
          })
        ).setMimeType(ContentService.MimeType.JSON);

      } catch (error) {
        logRequest("POST", e, "Error obteniendo lista: " + error.message);
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, error: "Error obteniendo lista: " + error.message })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Obtener clientes CON documentos de Drive, por lotes
    if (requestData.action === 'getAllClients') {
      var startIndex = requestData.startIndex || 0;
      var batchSize = requestData.batchSize || 10;

      logRequest("POST", e, "Obteniendo clientes en lote: inicio=" + startIndex + " tamaño=" + batchSize);

      try {
        var result = getAllClientsFromSheetBatched(startIndex, batchSize);

        logRequest("POST", e, "Lote obtenido: " + result.clients.length + " de " + result.totalClients + " clientes");

        return ContentService.createTextOutput(
          JSON.stringify({
            ok: true,
            clients: result.clients,
            totalClients: result.totalClients,
            startIndex: startIndex,
            batchSize: batchSize,
            hasMore: result.hasMore
          })
        ).setMimeType(ContentService.MimeType.JSON);

      } catch (error) {
        logRequest("POST", e, "Error obteniendo lote: " + error.message);
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, error: "Error obteniendo clientes: " + error.message })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Si es para subir un archivo grande directamente
    if (requestData.action === 'uploadLargeFile' || (e.parameter && e.parameter.action === 'uploadLargeFile')) {
      logRequest("POST", e, "Procesando upload directo de archivo grande");
      
      try {
        // Log completo de lo que se recibe
        logRequest("POST", e, "=== INICIO DEBUG UPLOAD ===");
        logRequest("POST", e, "Tipo de request: " + (e.postData ? e.postData.type : "sin postData"));
        logRequest("POST", e, "Parámetros disponibles: " + Object.keys(e.parameter || {}).join(", "));
        
        // Obtener parámetros del formulario
        var folderId = e.parameter.folderId;
        var fileName = e.parameter.fileName || 'archivo_sin_nombre.pdf';
        var documentType = e.parameter.documentType || 'documento';
        var clientName = e.parameter.clientName || '';
        var clientId = e.parameter.clientId || '';
        
        logRequest("POST", e, "Parámetros parseados - folderId: " + folderId + ", fileName: " + fileName);
        
        // Intentar obtener el archivo de diferentes formas
        var fileBlob = null;
        
        // Método 1: Desde e.parameter.file
        if (e.parameter.file) {
          fileBlob = e.parameter.file;
          logRequest("POST", e, "MÉTODO 1 - Archivo encontrado en e.parameter.file - tipo: " + fileBlob.getContentType() + ", tamaño: " + fileBlob.getBytes().length + " bytes");
        }
        
        // Método 2: Desde e.parameters (array)
        if (!fileBlob && e.parameters && e.parameters.file) {
          fileBlob = e.parameters.file[0];
          logRequest("POST", e, "MÉTODO 2 - Archivo encontrado en e.parameters.file[0]");
        }
        
        // Método 3: Iterar todos los parámetros buscando Blob
        if (!fileBlob) {
          logRequest("POST", e, "MÉTODO 3 - Buscando archivo en todos los parámetros...");
          for (var key in e.parameter) {
            var value = e.parameter[key];
            if (value && typeof value.getContentType === 'function') {
              fileBlob = value;
              logRequest("POST", e, "MÉTODO 3 - Archivo encontrado en parámetro: " + key);
              break;
            }
          }
        }
        
        if (!fileBlob) {
          logRequest("POST", e, "ERROR: No se encontró archivo en ningún método");
          logRequest("POST", e, "Estructura completa de e.parameter: " + JSON.stringify(e.parameter));
        }
        
        if (!fileBlob) {
          throw new Error('No se recibió archivo en el request');
        }
        
        if (!folderId) {
          throw new Error('No se recibió folderId');
        }
        
        logRequest("POST", e, "Iniciando subida - archivo: " + fileName + " a carpeta: " + folderId);
        
        // Verificar que la carpeta existe
        var targetFolder;
        try {
          targetFolder = DriveApp.getFolderById(folderId);
          logRequest("POST", e, "Carpeta encontrada: " + targetFolder.getName());
        } catch (folderError) {
          throw new Error('No se pudo acceder a la carpeta: ' + folderError.message);
        }
        
        // Crear el archivo en Drive
        logRequest("POST", e, "Creando archivo en Drive...");
        var uploadedFile = targetFolder.createFile(fileBlob);
        uploadedFile.setName(fileName);
        
        logRequest("POST", e, "Archivo creado exitosamente - ID: " + uploadedFile.getId() + ", URL: " + uploadedFile.getUrl());
        
        return ContentService.createTextOutput(
          JSON.stringify({ 
            ok: true, 
            message: "Archivo grande subido exitosamente via App Script",
            fileId: uploadedFile.getId(),
            fileName: fileName,
            fileUrl: uploadedFile.getUrl(),
            downloadUrl: uploadedFile.getDownloadUrl(),
            folderId: folderId,
            method: 'direct_appscript_upload'
          })
        ).setMimeType(ContentService.MimeType.JSON);
        
      } catch (error) {
        logRequest("POST", e, "Error en upload directo: " + error.message);
        return ContentService.createTextOutput(
          JSON.stringify({ 
            ok: false, 
            error: "Error subiendo archivo: " + error.message
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Si es una búsqueda de carpeta (OPTIMIZADA - trae todos los documentos de una vez)
    if (requestData.action === 'findFolder') {
      logRequest("POST", e, "Buscando carpeta para: " + JSON.stringify(requestData));
      
      var clientFolder = findClientFolder(requestData.clientName, requestData.clientId);
      
      if (!clientFolder) {
        logRequest("POST", e, "No se encontró carpeta para: " + JSON.stringify(requestData));
        return ContentService.createTextOutput(
          JSON.stringify({ 
            ok: false, 
            error: "No se encontró carpeta para el cliente especificado. Verifica que exista una carpeta con el nombre o cédula proporcionados." 
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      
      // NUEVA LÓGICA: Si no se especifica documentType, traer TODOS los documentos
      if (!requestData.documentType) {
        logRequest("POST", e, "🚀 MODO OPTIMIZADO: Obteniendo todos los documentos del cliente");
        
        var allDocuments = getAllClientDocuments(clientFolder);
        
        return ContentService.createTextOutput(
          JSON.stringify({ 
            ok: true, 
            data: {
              clientName: clientFolder.getName(),
              clientFolderUrl: clientFolder.getUrl(),
              documents: allDocuments
            }
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      
      // LÓGICA ORIGINAL: Para un documento específico
      var subfolderInfo = getSubfolderPath(clientFolder, requestData.documentType);
      
      if (!subfolderInfo) {
        return ContentService.createTextOutput(
          JSON.stringify({ 
            ok: false, 
            error: "Subcarpeta '" + requestData.documentType + "' no encontrada en la carpeta del cliente" 
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      
      logRequest("POST", e, "Carpeta encontrada: " + subfolderInfo.folderUrl + " - Archivos: " + subfolderInfo.fileCount);
      
      return ContentService.createTextOutput(
        JSON.stringify({ 
          ok: true, 
          folderId: subfolderInfo.folderId,
          folderName: subfolderInfo.folderName,
          folderUrl: subfolderInfo.folderUrl,
          subfolderPath: requestData.documentType,
          clientFolder: clientFolder.getName(),
          hasFiles: subfolderInfo.hasFiles,
          files: subfolderInfo.files,
          fileCount: subfolderInfo.fileCount
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Si es para crear carpetas faltantes en lote
    if (requestData.action === 'createMissingFolders') {
      logRequest("POST", e, "Iniciando creación de carpetas faltantes en lote");
      
      try {
        var result = createMissingFolders();
        
        logRequest("POST", e, "Proceso completado: " + result.createdCount + " carpetas creadas");
        
        return ContentService.createTextOutput(
          JSON.stringify({ 
            ok: true, 
            data: result,
            message: "Se procesaron " + result.totalProcessed + " clientes. Se crearon " + result.createdCount + " carpetas nuevas."
          })
        ).setMimeType(ContentService.MimeType.JSON);
        
      } catch (error) {
        logRequest("POST", e, "Error creando carpetas faltantes: " + error.message);
        return ContentService.createTextOutput(
          JSON.stringify({ 
            ok: false, 
            error: "Error creando carpetas: " + error.message
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Si no es búsqueda, usar la función original (crear carpeta)
    var folderUrl = createLastClientFolder();
    
    logRequest("POST", e, "Carpeta creada: " + folderUrl);
    
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, folderUrl: folderUrl })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    logRequest("POST", e, "Error: " + err.message);
    console.error('Error en doPost:', err);
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}


// --- LÓGICA DE CREACIÓN DE CARPETA (ORIGINAL) ---
function createLastClientFolder() {
  var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);

  var ss = SpreadsheetApp.openById(DATA_SHEET_ID);
  var sheet = ss.getSheetByName(DATA_SHEET_NAME);

  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(lastRow, 1, 1, 4).getValues()[0];
  // col 1: crédito (ID), col 2: fecha, col 3: nombre, col 4: cédula

  var idCredito = data[0];
  var nombre    = data[2];
  var cedula    = data[3];

  var idCreditoFormat = idCredito.toString().trim();
  var nombreFormat = nombre.trim().replace(/\s+/g, "_").toLowerCase();
  var cedulaFormat = cedula.toString().replace(/[^\d]/g, "");

  var folderName = idCreditoFormat + "_" + nombreFormat + "_" + cedulaFormat;

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


// --- NUEVAS FUNCIONES PARA BUSCAR CARPETAS ---

function findClientFolder(clientName, clientId) {
  try {
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var folders = rootFolder.getFolders();
    
    // Normalizar datos de búsqueda
    var searchName = clientName ? clientName.trim().replace(/\s+/g, "_").toLowerCase() : null;
    var searchId = clientId ? clientId.toString().replace(/[^\d]/g, "") : null;
    
    console.log('Buscando carpeta con:', { searchName: searchName, searchId: searchId });
    
    var foundFolders = [];
    
    while (folders.hasNext()) {
      var folder = folders.next();
      var folderName = folder.getName().toLowerCase();
      
      console.log('Revisando carpeta:', folderName);
      
      // Buscar por nombre
      if (searchName && folderName.includes(searchName)) {
        console.log('Encontrada por nombre:', folder.getName());
        foundFolders.push({ folder: folder, reason: 'nombre' });
      }
      
      // Buscar por cédula
      if (searchId && folderName.includes(searchId)) {
        console.log('Encontrada por cédula:', folder.getName());
        foundFolders.push({ folder: folder, reason: 'cedula' });
      }
    }
    
    if (foundFolders.length > 0) {
      // Preferir coincidencia por cédula si existe
      for (var i = 0; i < foundFolders.length; i++) {
        if (foundFolders[i].reason === 'cedula') {
          return foundFolders[i].folder;
        }
      }
      // Si no hay por cédula, devolver la primera por nombre
      return foundFolders[0].folder;
    }
    
    console.log('No se encontró ninguna carpeta');
    return null;
    
  } catch (error) {
    console.error('Error buscando carpeta:', error);
    throw error;
  }
}

// 🚀 NUEVA FUNCIÓN OPTIMIZADA: Obtiene TODOS los documentos del cliente de una vez
function getAllClientDocuments(clientFolder) {
  try {
    // Validar que clientFolder existe
    if (!clientFolder) {
      console.error('❌ getAllClientDocuments: clientFolder es undefined');
      throw new Error('clientFolder es requerido');
    }
    
    console.log('🚀 Obteniendo todos los documentos para:', clientFolder.getName());
    
    var documentTypes = [
      '01_escritura',
      '02_pagare', 
      '03_contrato_credito',
      '04_carta_de_instrucciones',
      '05_aceptacion_de_credito',
      '06_avaluo',
      '07_contrato_interco',
      '08_Finanzas'
    ];
    
    var allDocuments = [];
    var subfolders = clientFolder.getFolders();
    var subfolderMap = {};
    
    // Crear un mapa de subcarpetas para acceso rápido
    while (subfolders.hasNext()) {
      var subfolder = subfolders.next();
      subfolderMap[subfolder.getName()] = subfolder;
    }
    
    // Procesar cada tipo de documento
    for (var i = 0; i < documentTypes.length; i++) {
      var docType = documentTypes[i];
      var subfolder = subfolderMap[docType];
      
      if (subfolder) {
        console.log('✅ Procesando subcarpeta:', docType);
        
        // Verificar archivos en la subcarpeta
        var files = subfolder.getFiles();
        var fileList = [];
        var hasFiles = false;
        
        while (files.hasNext()) {
          var file = files.next();
          
          console.log('🔍 [DEBUG] Archivo encontrado:', file.getName(), 'ID:', file.getId());
          
          // 🗑️ VERIFICAR SI EL ARCHIVO ESTÁ EN LA PAPELERA O ES INACCESIBLE
          var isValidFile = false;
          try {
            // Intentar acceder a propiedades del archivo
            var fileName = file.getName();
            var fileSize = file.getSize();
            var isTrashed = file.isTrashed();
            
            console.log('🗑️ [DEBUG] ¿Está en papelera?', isTrashed);
            console.log('📏 [DEBUG] Tamaño del archivo:', fileSize);
            
            // Si está en papelera O no es accesible, ignorar
            if (isTrashed) {
              console.log('🗑️ [DEBUG] ✅ Archivo en papelera (IGNORADO):', fileName);
            } else if (fileSize === 0) {
              console.log('📏 [DEBUG] ✅ Archivo vacío (IGNORADO):', fileName);
            } else if (fileName.indexOf('~$') === 0 || fileName.indexOf('.') === 0 || fileName === 'desktop.ini' || fileName === 'Thumbs.db') {
              console.log('👻 [DEBUG] ✅ Archivo temporal/oculto (IGNORADO):', fileName);
            } else {
              isValidFile = true;
              console.log('✅ [DEBUG] Archivo VÁLIDO:', fileName, 'Tamaño:', fileSize);
            }
            
          } catch (error) {
            console.log('❌ [DEBUG] Error accediendo archivo (IGNORADO):', error.message);
            isValidFile = false;
          }
          
          // Solo procesar archivos válidos
          if (isValidFile) {
            hasFiles = true;
            console.log('✅ [DEBUG] Archivo procesado:', file.getName(), 'en carpeta:', docType);
            fileList.push({
              name: file.getName(),
              id: file.getId(),
              url: file.getUrl(),
              downloadUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view',
              size: file.getSize(),
              lastModified: file.getLastUpdated()
            });
          }
        }
        
        allDocuments.push({
          type: docType,
          exists: true,
          folderId: subfolder.getId(),
          folderUrl: subfolder.getUrl(),
          hasFiles: hasFiles,
          files: fileList,
          fileCount: fileList.length
        });
        
        console.log('📄', docType + ':', fileList.length, 'archivos');
        console.log('🔍 [DEBUG] fileList para', docType + ':', JSON.stringify(fileList));
        
      } else {
        console.log('❌ Subcarpeta no encontrada:', docType);
        allDocuments.push({
          type: docType,
          exists: false,
          folderId: null,
          folderUrl: null,
          hasFiles: false,
          files: [],
          fileCount: 0
        });
      }
    }
    
    console.log('🎉 Procesamiento completo. Total documentos:', allDocuments.length);
    console.log('🔍 [DEBUG] allDocuments final:', JSON.stringify(allDocuments, null, 2));
    return allDocuments;
    
  } catch (error) {
    console.error('Error obteniendo todos los documentos:', error);
    throw error;
  }
}

function getSubfolderPath(clientFolder, documentType) {
  try {
    var subfolders = clientFolder.getFolders();
    
    console.log('Buscando subcarpeta:', documentType, 'en:', clientFolder.getName());
    
    while (subfolders.hasNext()) {
      var subfolder = subfolders.next();
      var subfolderName = subfolder.getName();
      
      console.log('Revisando subcarpeta:', subfolderName);
      
      if (subfolderName === documentType) {
        console.log('Subcarpeta encontrada:', subfolderName);
        
        // Verificar si hay archivos dentro de la subcarpeta
        var files = subfolder.getFiles();
        var fileList = [];
        var hasFiles = false;
        
        while (files.hasNext()) {
          var file = files.next();
          
          console.log('🔍 [DEBUG] Archivo encontrado en', subfolderName + ':', file.getName(), 'ID:', file.getId());
          
          // 🗑️ VERIFICAR SI EL ARCHIVO ESTÁ EN LA PAPELERA O ES INACCESIBLE
          var isValidFile = false;
          try {
            // Intentar acceder a propiedades del archivo
            var fileName = file.getName();
            var fileSize = file.getSize();
            var isTrashed = file.isTrashed();
            
            console.log('🗑️ [DEBUG] ¿Está en papelera?', isTrashed);
            console.log('📏 [DEBUG] Tamaño del archivo:', fileSize);
            
            // Si está en papelera O no es accesible, ignorar
            if (isTrashed) {
              console.log('🗑️ [DEBUG] ✅ Archivo en papelera (IGNORADO):', fileName);
            } else if (fileSize === 0) {
              console.log('📏 [DEBUG] ✅ Archivo vacío (IGNORADO):', fileName);
            } else if (fileName.indexOf('~$') === 0 || fileName.indexOf('.') === 0 || fileName === 'desktop.ini' || fileName === 'Thumbs.db') {
              console.log('👻 [DEBUG] ✅ Archivo temporal/oculto (IGNORADO):', fileName);
            } else {
              isValidFile = true;
              console.log('✅ [DEBUG] Archivo VÁLIDO:', fileName, 'Tamaño:', fileSize);
            }
            
          } catch (error) {
            console.log('❌ [DEBUG] Error accediendo archivo (IGNORADO):', error.message);
            isValidFile = false;
          }
          
          // Solo procesar archivos válidos
          if (isValidFile) {
            hasFiles = true;
            console.log('✅ [DEBUG] Archivo procesado en', subfolderName + ':', file.getName());
            fileList.push({
              name: file.getName(),
              id: file.getId(),
              url: file.getUrl(),
              downloadUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view',
              size: file.getSize(),
              lastModified: file.getLastUpdated()
            });
          }
        }
        
        console.log('Archivos encontrados en', subfolderName + ':', fileList.length);
        
        return {
          folderId: subfolder.getId(),
          folderName: subfolderName,
          folderUrl: subfolder.getUrl(),
          hasFiles: hasFiles,
          files: fileList,
          fileCount: fileList.length
        };
      }
    }
    
    // Si no encuentra la subcarpeta específica, devolver null
    console.log('Subcarpeta no encontrada:', documentType);
    return null;
    
  } catch (error) {
    console.error('Error obteniendo subcarpeta:', error);
    throw error;
  }
}

// --- LISTA LIGERA DE CLIENTES (sin escaneo de Drive) ---
function getClientListFromSheet() {
  var ss = SpreadsheetApp.openById(DATA_SHEET_ID);
  var sheet = ss.getSheetByName(DATA_SHEET_NAME);
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var clients = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (row[0] && row[2] && row[3]) {
      clients.push({
        rowNumber: i + 2,
        credito: row[0].toString().trim(),
        fecha: row[1],
        nombre: row[2],
        cedula: row[3].toString()
      });
    }
  }

  return clients;
}


// --- OBTENER CLIENTES CON DOCUMENTOS POR LOTES ---
function getAllClientsFromSheetBatched(startIndex, batchSize) {
  var ss = SpreadsheetApp.openById(DATA_SHEET_ID);
  var sheet = ss.getSheetByName(DATA_SHEET_NAME);
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return { clients: [], totalClients: 0, hasMore: false };
  }

  var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  // Filtrar filas válidas primero
  var validRows = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (row[0] && row[2] && row[3]) {
      validRows.push({ row: row, originalIndex: i });
    }
  }

  var totalClients = validRows.length;
  var endIndex = Math.min(startIndex + batchSize, totalClients);
  var hasMore = endIndex < totalClients;
  var batch = validRows.slice(startIndex, endIndex);

  var clients = [];

  for (var b = 0; b < batch.length; b++) {
    var entry = batch[b];
    var row = entry.row;
    var clientName = row[2];
    var clientId = row[3].toString();

    var clientFolder = findClientFolder(clientName, clientId);
    var documentsStatus = { completed: 0, total: 8, percentage: 0 };
    var documentDetails = [];

    if (clientFolder) {
      var allDocuments = getAllClientDocuments(clientFolder);

      for (var j = 0; j < allDocuments.length; j++) {
        var doc = allDocuments[j];
        if (doc.hasFiles) {
          documentsStatus.completed++;
        }
        documentDetails.push({
          type: doc.type,
          hasFiles: doc.hasFiles,
          fileCount: doc.fileCount,
          folderId: doc.folderId,
          folderUrl: doc.folderUrl,
          files: doc.files || []
        });
      }

      documentsStatus.percentage = Math.round((documentsStatus.completed / documentsStatus.total) * 100);
    }

    clients.push({
      rowNumber: entry.originalIndex + 2,
      fecha: row[1],
      nombre: clientName,
      cedula: clientId,
      folderUrl: clientFolder ? clientFolder.getUrl() : '',
      folderId: clientFolder ? clientFolder.getId() : null,
      hasFolder: !!clientFolder,
      documentsStatus: documentsStatus,
      documentDetails: documentDetails
    });
  }

  console.log('Lote procesado: ' + clients.length + ' clientes (de ' + totalClients + ' total)');
  return { clients: clients, totalClients: totalClients, hasMore: hasMore };
}


// --- FUNCIÓN PARA CREAR CARPETAS FALTANTES EN LOTE ---
function createMissingFolders() {
  console.log('🚀 Iniciando creación de carpetas faltantes...');
  var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var ss = SpreadsheetApp.openById(DATA_SHEET_ID);
  var sheet = ss.getSheetByName(DATA_SHEET_NAME);
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { totalProcessed: 0, createdCount: 0, details: [] };
  
  // Leer todos los datos: rango desde fila 2 hasta última fila, columnas A-F (1-6)
  var range = sheet.getRange(2, 1, lastRow - 1, 6);
  var data = range.getValues();
  
  var createdCount = 0;
  var details = [];
  
  var subFolders = [
    "01_escritura", "02_pagare", "03_contrato_credito", "04_carta_de_instrucciones",
    "05_aceptacion_de_credito", "06_avaluo", "07_contrato_interco", "08_Finanzas"
  ];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowIndex = i + 2; // +2 porque el array empieza en 0 y el sheet tiene header en fila 1
    
    // Verificar si tiene datos mínimos (crédito, nombre, cédula)
    if (!row[0] || !row[2] || !row[3]) continue;
    
    var idCredito = row[0]; // Columna A: ID del crédito
    var nombre = row[2];    // Columna C: Nombre
    var cedula = row[3];    // Columna D: Cédula
    var existingUrl = row[5]; // Columna F: URL carpeta
    
    // Si ya tiene URL en el sheet, asumimos que tiene carpeta (o intentar verificar si existe)
    if (existingUrl && existingUrl.toString().trim() !== "") {
      // Opcional: Podríamos verificar si la carpeta realmente existe con DriveApp, 
      // pero para optimizar asumimos que si está en el sheet, está bien.
      continue;
    }
    
    // Intentar buscar si ya existe una carpeta (pero no estaba anotada en el sheet)
    var existingFolder = findClientFolder(nombre, cedula.toString());
    
    if (existingFolder) {
      // Si existe pero no estaba en el sheet, actualizamos el sheet
      console.log('✅ Carpeta ya existía para:', nombre, '- Actualizando Sheet...');
      sheet.getRange(rowIndex, 6).setValue(existingFolder.getUrl());
      details.push({ name: nombre, status: 'linked', url: existingFolder.getUrl() });
      continue;
    }
    
    // SI NO EXISTE: CREARLA
    console.log('🔨 Creando carpeta para:', nombre);
    
    try {
      var idCreditoFormat = idCredito.toString().trim();
      var nombreFormat = nombre.toString().trim().replace(/\s+/g, "_").toLowerCase();
      var cedulaFormat = cedula.toString().replace(/[^\d]/g, "");
      
      var folderName = idCreditoFormat + "_" + nombreFormat + "_" + cedulaFormat;
      var clientFolder = rootFolder.createFolder(folderName);
      
      // Crear subcarpetas
      subFolders.forEach(function(subName) {
        clientFolder.createFolder(subName);
      });
      
      // Guardar URL en el sheet
      sheet.getRange(rowIndex, 6).setValue(clientFolder.getUrl());
      
      createdCount++;
      details.push({ name: nombre, status: 'created', url: clientFolder.getUrl() });
      
      // Pequeña pausa para no saturar API de Drive si son muchos
      Utilities.sleep(500);
      
    } catch (err) {
      console.error('❌ Error creando carpeta para ' + nombre + ':', err);
      details.push({ name: nombre, status: 'error', error: err.message });
    }
  }
  
  console.log('🏁 Finalizado. Creadas:', createdCount);
  return {
    totalProcessed: data.length,
    createdCount: createdCount,
    details: details
  };
}


// --- FUNCIÓN DE PRUEBA (OPCIONAL) ---
function testFindFolder() {
  // Función para probar la búsqueda desde el editor
  try {
    var result = findClientFolder("test", "123456");
    if (result) {
      console.log('Carpeta encontrada:', result.getName());
    } else {
      console.log('No se encontró carpeta');
    }
  } catch (error) {
    console.error('Error en prueba:', error);
  }
}
