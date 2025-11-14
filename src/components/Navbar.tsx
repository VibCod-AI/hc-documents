'use client';

import { Search, User, LogOut, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface NavbarProps {
  onSearch?: (clientName: string, clientId: string) => void;
  onSearchQueryChange?: (query: string) => void;
  suggestions?: Array<{ name: string; id: string; }>;
}

export default function Navbar({ onSearch, onSearchQueryChange, suggestions = [] }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cerrar sugerencias al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.trim().length > 0);
    if (onSearchQueryChange) {
      onSearchQueryChange(value.trim());
    }
  };

  const handleSelectSuggestion = (clientName: string, clientId: string) => {
    if (onSearch) {
      onSearch(clientName, clientId);
      setSearchQuery('');
      setShowSuggestions(false);
      toast.success(`Cliente ${clientName} seleccionado`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Ingresa un nombre o cédula para buscar');
      return;
    }
    
    // Si hay sugerencias, seleccionar la primera
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0].name, suggestions[0].id);
    } else {
      toast.error('No se encontraron clientes con ese criterio');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e as any);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <nav className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
      <div className="max-w-full px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#8B5CF6]">
              HabiCapital
            </h1>
          </div>

          {/* Buscador Central */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyPress}
                onFocus={() => setShowSuggestions(searchQuery.trim().length > 0)}
                placeholder="Buscar cliente por nombre o cédula..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    if (onSearchQueryChange) onSearchQueryChange('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sugerencias */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
              >
                <div className="p-2">
                  <div className="text-xs text-[#6B7280] px-3 py-2 font-medium">
                    {suggestions.length} resultado{suggestions.length !== 1 ? 's' : ''} encontrado{suggestions.length !== 1 ? 's' : ''}
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.id}-${index}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion.name, suggestion.id)}
                      className="w-full text-left px-3 py-3 hover:bg-[#F9FAFB] rounded-lg transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 bg-[#EDE9FE] rounded-full flex items-center justify-center group-hover:bg-[#8B5CF6] transition-colors">
                        <User className="w-5 h-5 text-[#8B5CF6] group-hover:text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#1F2937] truncate">
                          {suggestion.name}
                        </div>
                        <div className="text-sm text-[#6B7280]">
                          Cédula: {suggestion.id}
                        </div>
                      </div>
                      <Search className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sin resultados */}
            {showSuggestions && searchQuery.trim() && suggestions.length === 0 && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50"
              >
                <div className="p-4 text-center text-[#6B7280]">
                  <Search className="w-8 h-8 mx-auto mb-2 text-[#9CA3AF]" />
                  <p className="text-sm font-medium">No se encontraron clientes</p>
                  <p className="text-xs mt-1">Intenta con otro nombre o cédula</p>
                </div>
              </div>
            )}
          </form>

          {/* Usuario */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Desktop: Mostrar info completa */}
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[#F9FAFB] rounded-lg">
              <div className="w-8 h-8 bg-[#8B5CF6] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#374151]">
                  juanvalencia@habi.co
                </span>
                <span className="text-xs text-[#9CA3AF]">
                  Usuario autenticado
                </span>
              </div>
            </div>

            {/* Mobile/Tablet: Solo icono */}
            <div className="lg:hidden w-9 h-9 bg-[#8B5CF6] rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>

            <button
              onClick={() => {
                // Aquí puedes agregar lógica de logout
                console.log('Cerrar sesión');
              }}
              className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors"
              title="Salir"
            >
              <LogOut className="w-4 lg:w-5 h-4 lg:h-5" />
              <span className="hidden sm:inline text-sm font-medium">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

