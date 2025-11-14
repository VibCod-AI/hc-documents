// AGREGAR ESTA FUNCIÓN A TU APP SCRIPT EXISTENTE

// --- FUNCIÓN PARA BUSCAR CARPETAS DE CLIENTES ---
function findClientFolder(clientName, clientId) {
  try {
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var folders = rootFolder.getFolders();
    
    // Normalizar datos de búsqueda
    var searchName = clientName ? clientName.trim().replace(/\s+/g, "_").toLowerCase() : null;
    var searchId = clientId ? clientId.toString().replace(/[^\d]/g, "") : null;
    
    console.log('Buscando carpeta con:', { searchName, searchId });
    
    while (folders.hasNext()) {
      var folder = folders.next();
      var folderName = folder.getName().toLowerCase();
      
      console.log('Revisando carpeta:', folderName);
      
      // Buscar por nombre
      if (searchName && folderName.includes(searchName)) {
        console.log('Encontrada por nombre:', folder.getName());
        return folder;
      }
      
      // Buscar por cédula
      if (searchId && folderName.includes(searchId)) {
        console.log('Encontrada por cédula:', folder.getName());
        return folder;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error buscando carpeta:', error);
    throw error;
  }
}

// --- FUNCIÓN PARA OBTENER SUBCARPETA ESPECÍFICA ---
function getSubfolderPath(clientFolder, documentType) {
  try {
    var subfolders = clientFolder.getFolders();
    
    while (subfolders.hasNext()) {
      var subfolder = subfolders.next();
      var subfolderName = subfolder.getName();
      
      if (subfolderName === documentType) {
        return {
          folderId: subfolder.getId(),
          folderName: subfolderName,
          folderUrl: subfolder.getUrl()
        };
      }
    }
    
    // Si no encuentra la subcarpeta, devolver la carpeta principal
    return {
      folderId: clientFolder.getId(),
      folderName: clientFolder.getName(),
      folderUrl: clientFolder.getUrl()
    };
  } catch (error) {
    console.error('Error obteniendo subcarpeta:', error);
    throw error;
  }
}

// --- ACTUALIZAR LA FUNCIÓN doPost PARA MANEJAR BÚSQUEDAS ---
function doPost(e) {
  try {
    logRequest("POST", e, "Procesando request");
    
    // Parsear datos si existen
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseError) {
        console.log('No hay datos JSON válidos, usando función original');
      }
    }
    
    // Si es una búsqueda de carpeta
    if (requestData.action === 'findFolder') {
      logRequest("POST", e, "Buscando carpeta para: " + JSON.stringify(requestData));
      
      var clientFolder = findClientFolder(requestData.clientName, requestData.clientId);
      
      if (!clientFolder) {
        return ContentService.createTextOutput(
          JSON.stringify({ 
            ok: false, 
            error: "No se encontró carpeta para el cliente especificado" 
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      
      var subfolderInfo = getSubfolderPath(clientFolder, requestData.documentType);
      
      logRequest("POST", e, "Carpeta encontrada: " + subfolderInfo.folderUrl);
      
      return ContentService.createTextOutput(
        JSON.stringify({ 
          ok: true, 
          folderId: subfolderInfo.folderId,
          folderName: subfolderInfo.folderName,
          folderUrl: subfolderInfo.folderUrl,
          subfolderPath: requestData.documentType,
          clientFolder: clientFolder.getName()
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Si no es búsqueda, usar la función original (crear carpeta)
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
