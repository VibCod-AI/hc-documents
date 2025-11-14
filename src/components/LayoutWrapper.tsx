'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchContext = createContext<SearchContextType>({
  searchQuery: '',
  setSearchQuery: () => {},
});

export const useSearch = () => useContext(SearchContext);

interface LayoutWrapperProps {
  children: React.ReactNode;
}

interface Client {
  name: string;
  id: string;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Client[]>([]);

  // Cargar todos los clientes al montar
  useEffect(() => {
    loadAllClients();
  }, []);

  const loadAllClients = async () => {
    try {
      const response = await fetch('/api/clients/dashboard');
      const result = await response.json();
      
      if (result.success && result.data.clients) {
        const clients = result.data.clients.map((c: any) => ({
          name: c.nombre,
          id: c.cedula,
        }));
        setAllClients(clients);
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const handleSearchQueryChange = (query: string) => {
    if (!query) {
      setFilteredSuggestions([]);
      return;
    }

    // Búsqueda flexible: sin mayúsculas y busca en cualquier parte del nombre o cédula
    const queryLower = query.toLowerCase();
    const filtered = allClients.filter(client => 
      client.name.toLowerCase().includes(queryLower) || 
      client.id.includes(queryLower)
    ).slice(0, 5); // Mostrar máximo 5 sugerencias

    setFilteredSuggestions(filtered);
  };

  const handleSearch = (clientName: string, clientId: string) => {
    setSearchQuery(`${clientName} - ${clientId}`);
    // Disparar evento personalizado para que page.tsx lo capture
    const event = new CustomEvent('navbar-search', { 
      detail: { name: clientName, id: clientId } 
    });
    window.dispatchEvent(event);
  };

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div className="min-h-screen flex flex-col">
        {/* Navbar */}
        <Navbar 
          onSearch={handleSearch}
          onSearchQueryChange={handleSearchQueryChange}
          suggestions={filteredSuggestions}
        />
        
        {/* Main Layout: Sidebar + Content */}
        <div className="flex flex-1 relative">
          <Sidebar />
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto w-full lg:w-auto">
            {children}
          </main>
        </div>
      </div>
    </SearchContext.Provider>
  );
}

