import { createClient } from '@supabase/supabase-js';

/**
 * 🗄️ Cliente de Supabase para acceder a la base de datos PostgreSQL
 * Reemplaza la base de datos SQLite local
 */

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please create a .env.local file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
}

// Cliente de Supabase con Service Role Key para operaciones del servidor
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente de Supabase con Anon Key para operaciones del cliente (si se necesita)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Tipos de datos para TypeScript
 */
export interface Client {
  id: number;
  nombre: string;
  cedula: string;
  fecha: string;
  fecha_escrituracion?: string | null;
  folder_url?: string | null;
  folder_id?: string | null;
  has_folder: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id: number;
  client_id: number;
  type: string;
  label: string;
  exists: boolean;
  has_files: boolean;
  file_count: number;
  folder_id?: string | null;
  folder_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface File {
  id: number;
  document_id: number;
  name: string;
  file_id: string;
  url: string;
  download_url?: string | null;
  size?: number | null;
  last_modified?: string | null;
  created_at?: string;
}

export interface SyncStatus {
  id: number;
  last_sync: string;
  status: string;
  total_clients: number;
  total_documents: number;
  created_at?: string;
}

