import Database from 'better-sqlite3';
import path from 'path';

/**
 * 🗄️ Base de datos local SQLite para almacenar información de clientes y documentos
 * Esto permite consultas súper rápidas sin depender de Google Drive
 */

// Ruta de la base de datos
const DB_PATH = path.join(process.cwd(), 'data', 'clients.db');

let db: Database.Database | null = null;

/**
 * Inicializar la base de datos y crear las tablas
 */
export function initDatabase(): Database.Database {
  if (db) return db;

  try {
    // Crear directorio si no existe
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    
    // Configurar para mejor rendimiento
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 1000');
    db.pragma('temp_store = MEMORY');

    console.log('✅ Base de datos SQLite inicializada:', DB_PATH);
    
    // Crear tablas
    createTables();
    
    return db;
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
}

/**
 * Crear las tablas necesarias
 */
function createTables() {
  if (!db) throw new Error('Base de datos no inicializada');

  // Tabla de clientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cedula TEXT NOT NULL UNIQUE,
      fecha_escrituracion TEXT,
      folder_url TEXT,
      folder_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de documentos
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_cedula TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_label TEXT NOT NULL,
      folder_id TEXT,
      folder_url TEXT,
      has_files BOOLEAN DEFAULT FALSE,
      file_count INTEGER DEFAULT 0,
      last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_cedula) REFERENCES clients (cedula),
      UNIQUE(client_cedula, document_type)
    )
  `);

  // Tabla de archivos individuales
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_id TEXT NOT NULL,
      file_url TEXT NOT NULL,
      download_url TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents (id)
    )
  `);

  // Tabla de sincronización
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_full_sync DATETIME,
      last_partial_sync DATETIME,
      total_clients INTEGER DEFAULT 0,
      total_documents INTEGER DEFAULT 0,
      sync_errors TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Índices para mejor rendimiento
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_clients_cedula ON clients (cedula);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
    CREATE INDEX IF NOT EXISTS idx_documents_client ON documents (client_cedula);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents (document_type);
    CREATE INDEX IF NOT EXISTS idx_files_document ON files (document_id);
  `);

  console.log('✅ Tablas de base de datos creadas/verificadas');
}

/**
 * Obtener la instancia de la base de datos
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Cerrar la conexión a la base de datos
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('🔒 Base de datos cerrada');
  }
}

// Tipos TypeScript
export interface Client {
  id?: number;
  name: string;
  cedula: string;
  fecha_escrituracion?: string;
  folder_url?: string;
  folder_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id?: number;
  client_cedula: string;
  document_type: string;
  document_label: string;
  folder_id?: string;
  folder_url?: string;
  has_files: boolean;
  file_count: number;
  last_sync?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FileRecord {
  id?: number;
  document_id: number;
  file_name: string;
  file_id: string;
  file_url: string;
  download_url: string;
  file_size?: number;
  created_at?: string;
}

export interface SyncStatus {
  id?: number;
  last_full_sync?: string;
  last_partial_sync?: string;
  total_clients: number;
  total_documents: number;
  sync_errors?: string;
  created_at?: string;
  updated_at?: string;
}
