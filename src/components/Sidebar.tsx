'use client';

import { FileText, Home, Menu, X, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const menuItems = [
  { id: 'documentos', label: 'Documentos', icon: FileText, href: '/' },
  { id: 'reportes', label: 'Reportes', icon: BarChart3, href: '/reportes' },
];

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
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
              </Link>
            );
          })}
        </nav>

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

