/**
 * 🚀 Sistema de caché temporal para mejorar la velocidad de búsquedas
 * Evita llamadas repetidas al Apps Script para el mismo cliente
 */

interface CachedClient {
  name: string;
  id: string;
  folderUrl: string;
  documents: any[];
  timestamp: number;
}

interface CachedDashboard {
  clients: any[];
  timestamp: number;
}

// Caché en memoria (se pierde al recargar la página)
const clientCache = new Map<string, CachedClient>();
let dashboardCache: CachedDashboard | null = null;

// Tiempo de vida del caché (5 minutos)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Genera una clave única para el cliente
 */
function getClientKey(clientName?: string, clientId?: string): string {
  return `${clientName?.toLowerCase().trim() || ''}_${clientId?.trim() || ''}`;
}

/**
 * Verifica si un elemento del caché sigue siendo válido
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Obtiene un cliente del caché si está disponible y válido
 */
export function getCachedClient(clientName?: string, clientId?: string): CachedClient | null {
  const key = getClientKey(clientName, clientId);
  const cached = clientCache.get(key);
  
  if (cached && isCacheValid(cached.timestamp)) {
    return cached;
  }
  
  if (cached) {
    clientCache.delete(key);
  }
  
  return null;
}

/**
 * Guarda un cliente en el caché
 */
export function setCachedClient(clientData: Omit<CachedClient, 'timestamp'>, clientName?: string, clientId?: string): void {
  const key = getClientKey(clientName, clientId);
  const cached: CachedClient = {
    ...clientData,
    timestamp: Date.now()
  };
  
  clientCache.set(key, cached);
}

/**
 * Obtiene el dashboard del caché si está disponible y válido
 */
export function getCachedDashboard(): any[] | null {
  if (dashboardCache && isCacheValid(dashboardCache.timestamp)) {
    return dashboardCache.clients;
  }
  
  if (dashboardCache) {
    dashboardCache = null;
  }
  
  return null;
}

/**
 * Guarda el dashboard en el caché
 */
export function setCachedDashboard(clients: any[]): void {
  dashboardCache = {
    clients,
    timestamp: Date.now()
  };
}

/**
 * Invalida el caché de un cliente específico
 * Útil después de subir un documento
 */
export function invalidateClientCache(clientName?: string, clientId?: string): void {
  const key = getClientKey(clientName, clientId);
  if (clientCache.has(key)) {
    clientCache.delete(key);
  }
}

/**
 * Invalida todo el caché del dashboard
 * Útil después de crear una nueva carpeta o subir documentos
 */
export function invalidateDashboardCache(): void {
  dashboardCache = null;
}

/**
 * Limpia todo el caché
 */
export function clearAllCache(): void {
  clientCache.clear();
  dashboardCache = null;
}

/**
 * Obtiene estadísticas del caché para debugging
 */
export function getCacheStats(): {
  clientCacheSize: number;
  dashboardCached: boolean;
  oldestClientCache: number | null;
  newestClientCache: number | null;
} {
  let oldestTimestamp: number | null = null;
  let newestTimestamp: number | null = null;
  
  clientCache.forEach((cached) => {
    if (oldestTimestamp === null || cached.timestamp < oldestTimestamp) {
      oldestTimestamp = cached.timestamp;
    }
    if (newestTimestamp === null || cached.timestamp > newestTimestamp) {
      newestTimestamp = cached.timestamp;
    }
  });
  
  return {
    clientCacheSize: clientCache.size,
    dashboardCached: dashboardCache !== null,
    oldestClientCache: oldestTimestamp,
    newestClientCache: newestTimestamp
  };
}
