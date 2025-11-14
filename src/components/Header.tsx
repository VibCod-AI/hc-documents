import { FileText } from 'lucide-react';

interface HeaderProps {
  title?: string;
  description?: string;
}

export function Header({ 
  title = "Gestión de Documentos",
  description = "Sistema de gestión de documentos de clientes"
}: HeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#EDE9FE] rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-[#8B5CF6]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">
            {title}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {description}
          </p>
        </div>
      </div>
    </header>
  );
}
