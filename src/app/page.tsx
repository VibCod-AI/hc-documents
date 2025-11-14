'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ClientDocumentManager } from '@/components/ClientDocumentManager';
import { ClientDashboard } from '@/components/ClientDashboard';

export default function Home() {
  const [selectedClient, setSelectedClient] = useState<{name: string, id: string} | null>(null);
  const documentManagerRef = useRef<HTMLDivElement>(null);

  const handleClientSelect = useCallback((clientName: string, clientId: string) => {
    
    // Actualizar cliente seleccionado
    setSelectedClient({ name: clientName, id: clientId });
    
    // Scroll a la sección de información del cliente cuando esté lista
    const scrollToClientInfo = () => {
      // Primero intenta scroll a la sección específica de info del cliente
      const clientInfoSection = document.getElementById('client-info-section');
      if (clientInfoSection) {
        const offset = 80; // Espacio desde el top del navbar
        const elementPosition = clientInfoSection.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        return true;
      }
      
      // Si no existe (aún no cargó), hacer scroll al componente
      if (documentManagerRef.current) {
        const offset = 20;
        const elementPosition = documentManagerRef.current.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        return true;
      }
      
      return false;
    };

    // Intentar scroll inmediato y luego reintentar para cuando cargue la data
    setTimeout(() => scrollToClientInfo(), 100);
    setTimeout(() => scrollToClientInfo(), 500);
    setTimeout(() => scrollToClientInfo(), 1000);
  }, []);

  // Escuchar búsquedas desde el Navbar
  useEffect(() => {
    const handleNavbarSearch = (event: any) => {
      const { name, id } = event.detail;
      // Seleccionar cliente con nombre y cédula
      handleClientSelect(name, id);
    };

    window.addEventListener('navbar-search', handleNavbarSearch);
    return () => window.removeEventListener('navbar-search', handleNavbarSearch);
  }, [handleClientSelect]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Dashboard de todos los clientes */}
      <ClientDashboard onClientSelect={handleClientSelect} />

      {/* Gestión de documentos por cliente */}
      <div ref={documentManagerRef}>
        <ClientDocumentManager 
          preloadedClient={selectedClient}
          hideSearchForm={true}
        />
      </div>
    </div>
  );
}