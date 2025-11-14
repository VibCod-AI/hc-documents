# 🚀 Configuración de Supabase

## Paso 1: Crear archivo .env.local

Crea un archivo `.env.local` en la raíz del proyecto con este contenido:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://mqtosjqlwtxsctaxyllw.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xdG9zanFsd3R4c2N0YXh5bGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwODQ0MDcsImV4cCI6MjA3ODY2MDQwN30.ge4-hN3LIyHVb3WAXWS_vzJ-168BVjigqNyY4wSaIcQ"

# Postgres Direct Connection
POSTGRES_URL="postgres://postgres.mqtosjqlwtxsctaxyllw:PEj2MW5HPCROWmLa@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"

# Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xdG9zanFsd3R4c2N0YXh5bGx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA4NDQwNywiZXhwIjoyMDc4NjYwNDA3fQ.Xx-D_UAvq7vCmIMIRA6IGd0KJLCqdr-LRpEKnP6yE00"

# Google Apps Script URL
APP_SCRIPT_URL="https://script.google.com/macros/s/AKfycbwSLwz3Y8PNUXY34aaCZmbIwon5aZWpmOYeY_uLGDmhh7kGRgho_W5YUystUzpuMXwv/exec"

# Zapier Webhook URL
ZAPIER_WEBHOOK_URL="https://hooks.zapier.com/hooks/catch/20799031/2c5qvwz/"
```

## Paso 2: Crear las tablas en Supabase

Ve al SQL Editor de Supabase y ejecuta este script:

```sql
-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  cedula TEXT NOT NULL UNIQUE,
  fecha TEXT NOT NULL,
  fecha_escrituracion TEXT,
  folder_url TEXT,
  folder_id TEXT,
  has_folder BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  exists BOOLEAN DEFAULT FALSE,
  has_files BOOLEAN DEFAULT FALSE,
  file_count INTEGER DEFAULT 0,
  folder_id TEXT,
  folder_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, type)
);

-- Tabla de archivos
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_id TEXT NOT NULL,
  url TEXT NOT NULL,
  download_url TEXT,
  size BIGINT,
  last_modified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de estado de sincronización
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  last_sync TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL,
  total_clients INTEGER DEFAULT 0,
  total_documents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_clients_cedula ON clients(cedula);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_files_document_id ON files(document_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (lectura)
CREATE POLICY "Public can read clients" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read documents" ON documents FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read files" ON files FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read sync_status" ON sync_status FOR SELECT TO anon USING (true);

-- Políticas de escritura (solo para usuarios autenticados o service_role)
CREATE POLICY "Service role can insert clients" ON clients FOR INSERT TO service_role USING (true);
CREATE POLICY "Service role can update clients" ON clients FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role can delete clients" ON clients FOR DELETE TO service_role USING (true);

CREATE POLICY "Service role can insert documents" ON documents FOR INSERT TO service_role USING (true);
CREATE POLICY "Service role can update documents" ON documents FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role can delete documents" ON documents FOR DELETE TO service_role USING (true);

CREATE POLICY "Service role can insert files" ON files FOR INSERT TO service_role USING (true);
CREATE POLICY "Service role can update files" ON files FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service role can delete files" ON files FOR DELETE TO service_role USING (true);

CREATE POLICY "Service role can insert sync_status" ON sync_status FOR INSERT TO service_role USING (true);
CREATE POLICY "Service role can update sync_status" ON sync_status FOR UPDATE TO service_role USING (true);
```

## Paso 3: Verificar la instalación

Una vez creadas las tablas, el código ya está listo para usar Supabase. Solo reinicia el servidor:

```bash
npm run dev
```

## ✅ Listo!

Tu aplicación ahora usa Supabase en lugar de SQLite local.

