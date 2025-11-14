'use client';

import { FileText, CheckCircle, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  currentView?: 'clientes' | 'documentos';
  onViewChange?: (view: 'clientes' | 'documentos') => void;
}

export default function Sidebar({ currentView = 'clientes', onViewChange }: SidebarProps) {
  const [activeItem, setActiveItem] = useState<string>(currentView);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Home,
      count: null,
    },
    {
      id: 'documentos',
      label: 'Documentos',
      icon: FileText,
      count: null,
    },
  ];

  const handleItemClick = (itemId: string) => {
    setActiveItem(itemId);
    setIsMobileMenuOpen(false); // Cerrar menú móvil al seleccionar
    if (onViewChange) {
      onViewChange(itemId as 'clientes' | 'documentos');
    }
  };

  return (
    <>
      {/* Botón de menú móvil */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay móvil */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white border-r border-[#E5E7EB] min-h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${isActive 
                  ? 'bg-[#EDE9FE] text-[#8B5CF6] font-medium' 
                  : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151]'
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
              {item.count !== null && (
                <span className={`
                  ml-auto text-xs px-2 py-1 rounded-full
                  ${isActive 
                    ? 'bg-[#8B5CF6] text-white' 
                    : 'bg-[#E5E7EB] text-[#6B7280]'
                  }
                `}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer - Versión */}
      <div className="px-4 py-6 border-t border-[#E5E7EB]">
        <div className="bg-[#F9FAFB] rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-[#8B5CF6]">
            HabiCapital
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Versión 1.0.0
          </p>
        </div>
      </div>
    </aside>
    </>
  );
}

