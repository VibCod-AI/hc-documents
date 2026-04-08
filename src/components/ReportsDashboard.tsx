'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock, FileWarning, PieChart, Users, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart as RechartsPie, Pie, Legend
} from 'recharts';

interface Client {
  nombre: string;
  cedula: string;
  fecha: string;
  folderUrl: string;
  hasFolder: boolean;
  documentsStatus: {
    completed: number;
    total: number;
    percentage: number;
  };
  documentDetails: Array<{
    type: string;
    label?: string;
    hasFiles: boolean;
    fileCount: number;
  }>;
}

const DOC_LABELS: Record<string, string> = {
  '01_escritura': 'Escritura',
  '02_pagare': 'Pagaré',
  '03_contrato_credito': 'Contrato Crédito',
  '04_carta_de_instrucciones': 'Carta Instrucciones',
  '05_aceptacion_de_credito': 'Aceptación Crédito',
  '06_avaluo': 'Avalúo',
  '07_contrato_interco': 'Contrato Interco',
  '08_Finanzas': 'Finanzas',
};

const ALL_DOC_TYPES = Object.keys(DOC_LABELS);

const COLORS = {
  green: '#10B981',
  yellow: '#F59E0B',
  orange: '#F97316',
  red: '#EF4444',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  gray: '#9CA3AF',
};

const PIE_COLORS = [COLORS.green, COLORS.yellow, COLORS.orange, COLORS.red];

export function ReportsDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/clients/dashboard');
      const result = await response.json();
      if (result.success && result.data?.clients) {
        setClients(result.data.clients);
        setLastUpdated(new Date().toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }));
      }
    } catch (error) {
      console.error('Error cargando datos para reportes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const total = clients.length;
    const complete = clients.filter(c => c.documentsStatus.percentage === 100).length;
    const empty = clients.filter(c => c.documentsStatus.completed === 0).length;
    const avgPct = total > 0
      ? Math.round(clients.reduce((s, c) => s + c.documentsStatus.percentage, 0) / total)
      : 0;
    return { total, complete, empty, avgPct };
  }, [clients]);

  // ---- Documentos que más faltan (bar chart horizontal) ----
  const docCompletionData = useMemo(() => {
    return ALL_DOC_TYPES.map(type => {
      const have = clients.filter(c => {
        const d = c.documentDetails?.find(dd => dd.type === type);
        return d && d.hasFiles && d.fileCount > 0;
      }).length;
      const missing = clients.length - have;
      return { name: DOC_LABELS[type], tienen: have, faltan: missing };
    }).sort((a, b) => b.faltan - a.faltan);
  }, [clients]);

  // ---- Distribución de completitud (pie chart) ----
  const distributionData = useMemo(() => {
    const ranges = [
      { name: 'Completos (100%)', min: 100, max: 100, count: 0 },
      { name: 'Casi listos (75-99%)', min: 75, max: 99, count: 0 },
      { name: 'En progreso (25-74%)', min: 25, max: 74, count: 0 },
      { name: 'Críticos (0-24%)', min: 0, max: 24, count: 0 },
    ];
    clients.forEach(c => {
      const p = c.documentsStatus.percentage;
      for (const r of ranges) {
        if (p >= r.min && p <= r.max) { r.count++; break; }
      }
    });
    return ranges.filter(r => r.count > 0);
  }, [clients]);

  const formatFecha = (fecha: string): string => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' });
  };

  const parseFecha = (fecha: string): number => {
    if (!fecha) return 0;
    let d: Date | null = null;
    if (fecha.includes('T') || fecha.includes('-')) {
      d = new Date(fecha);
    } else {
      const parts = fecha.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (parts) d = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
    }
    if (!d || isNaN(d.getTime())) return 0;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // ---- Clientes sin escritura, ordenados por antigüedad ----
  const clientesSinEscritura = useMemo(() => {
    return clients
      .filter(c => {
        const esc = c.documentDetails?.find(d => d.type === '01_escritura');
        return !esc || !esc.hasFiles || esc.fileCount === 0;
      })
      .map(c => ({ ...c, diasSin: parseFecha(c.fecha) }))
      .sort((a, b) => b.diasSin - a.diasSin);
  }, [clients]);

  // ---- Clientes más antiguos sin completar ----
  const clientesAntiguosSinCompletar = useMemo(() => {
    return clients
      .filter(c => c.documentsStatus.percentage < 100)
      .map(c => {
        const faltantes = ALL_DOC_TYPES
          .filter(type => {
            const dd = c.documentDetails?.find(d => d.type === type);
            return !dd || !dd.hasFiles || dd.fileCount === 0;
          })
          .map(t => DOC_LABELS[t]);
        return { ...c, dias: parseFecha(c.fecha), faltantes };
      })
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 15);
  }, [clients]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-[#6B7280]">
        <Loader2 className="h-10 w-10 animate-spin text-[#8B5CF6] mb-4" />
        <p className="text-sm font-medium">Cargando reportes...</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-[#6B7280]">
        <BarChart3 className="h-12 w-12 text-[#D1D5DB] mb-4" />
        <p className="text-sm">No hay datos disponibles. Sincroniza primero desde Documentos.</p>
      </div>
    );
  }

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-[#1F2937] mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill }}>
            {p.dataKey === 'tienen' ? 'Tienen' : 'Faltan'}: <strong>{p.value}</strong> clientes
          </p>
        ))}
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0];
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-[#1F2937]">{d.name}</p>
        <p style={{ color: d.payload.fill }}><strong>{d.value}</strong> clientes</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            Reportes y Métricas
          </h1>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-[#9CA3AF]">Actualizado: {lastUpdated}</span>
            )}
            <button
              onClick={loadClients}
              className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-4 sm:p-6 space-y-8">

        {/* ===== KPIs ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<Users className="w-6 h-6 text-[#8B5CF6]" />} bg="bg-[#EDE9FE]" label="Total Clientes" value={kpis.total} />
          <KpiCard icon={<CheckCircle2 className="w-6 h-6 text-[#10B981]" />} bg="bg-[#D1FAE5]" label="100% Completos" value={kpis.complete} accent="text-[#10B981]" />
          <KpiCard icon={<AlertTriangle className="w-6 h-6 text-[#EF4444]" />} bg="bg-[#FEE2E2]" label="Sin Documentos" value={kpis.empty} accent="text-[#EF4444]" />
          <KpiCard icon={<TrendingUp className="w-6 h-6 text-[#3B82F6]" />} bg="bg-[#DBEAFE]" label="Promedio Completitud" value={`${kpis.avgPct}%`} accent="text-[#3B82F6]" />
        </div>

        {/* ===== Gráficas lado a lado ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Documentos que más faltan */}
          <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="text-sm font-semibold text-[#374151] mb-4 flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-[#F59E0B]" />
              Documentos que más faltan
            </h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={docCompletionData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#374151' }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="tienen" stackId="a" fill={COLORS.green} radius={[0, 0, 0, 0]} name="Tienen" />
                  <Bar dataKey="faltan" stackId="a" fill={COLORS.red} radius={[0, 4, 4, 0]} name="Faltan" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-3 text-xs text-[#6B7280]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#10B981]"></span> Tienen</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#EF4444]"></span> Faltan</span>
            </div>
          </div>

          {/* Distribución de completitud */}
          <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="text-sm font-semibold text-[#374151] mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-[#8B5CF6]" />
              Distribución de Completitud
            </h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                    stroke="none"
                  >
                    {distributionData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={10}
                    formatter={(value: string) => <span className="text-xs text-[#374151]">{value}</span>}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ===== Clientes sin Escritura (tabla crítica) ===== */}
        {clientesSinEscritura.length > 0 && (
          <div className="bg-[#FEF2F2] rounded-xl border border-[#FECACA] p-5">
            <h3 className="text-sm font-semibold text-[#991B1B] mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
              Clientes sin Escritura — {clientesSinEscritura.length} pendientes
            </h3>
            <p className="text-xs text-[#B91C1C] mb-4">Ordenados por antigüedad. La escritura es el documento más crítico del proceso.</p>
            <div className="overflow-x-auto rounded-lg border border-[#FECACA]">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-white border-b border-[#FECACA]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Cédula</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Fecha</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase">Días sin escritura</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase">Progreso</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase">Carpeta</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {clientesSinEscritura.slice(0, 10).map((c, i) => (
                    <tr key={`${c.cedula}-${i}`} className="border-b border-[#F3F4F6] hover:bg-[#FEF2F2] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1F2937]">{c.nombre}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{c.cedula}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{formatFecha(c.fecha)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.diasSin > 90 ? 'bg-[#FEE2E2] text-[#DC2626]' :
                          c.diasSin > 30 ? 'bg-[#FEF3C7] text-[#D97706]' :
                          'bg-[#F3F4F6] text-[#6B7280]'
                        }`}>
                          <Clock className="h-3 w-3" />
                          {c.diasSin}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-semibold text-[#6B7280]">{c.documentsStatus.completed}/8</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.folderUrl ? (
                          <a href={c.folderUrl} target="_blank" rel="noopener noreferrer" className="text-[#3B82F6] hover:text-[#2563EB]">
                            <ExternalLink className="h-4 w-4 inline" />
                          </a>
                        ) : <span className="text-[#D1D5DB]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {clientesSinEscritura.length > 10 && (
              <p className="text-xs text-[#B91C1C] mt-3 text-center">
                Mostrando 10 de {clientesSinEscritura.length} clientes sin escritura
              </p>
            )}
          </div>
        )}

        {/* ===== Clientes más antiguos sin completar ===== */}
        {clientesAntiguosSinCompletar.length > 0 && (
          <div className="bg-[#FFFBEB] rounded-xl border border-[#FDE68A] p-5">
            <h3 className="text-sm font-semibold text-[#92400E] mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#F59E0B]" />
              Clientes con más antigüedad sin completar
            </h3>
            <p className="text-xs text-[#B45309] mb-4">Prioriza estos clientes para cerrar sus expedientes.</p>
            <div className="overflow-x-auto rounded-lg border border-[#FDE68A]">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-white border-b border-[#FDE68A]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Cédula</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase">Días</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#6B7280] uppercase">Progreso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Documentos Faltantes</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {clientesAntiguosSinCompletar.map((c, i) => (
                    <tr key={`${c.cedula}-${i}`} className="border-b border-[#F3F4F6] hover:bg-[#FFFBEB] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1F2937]">{c.nombre}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{c.cedula}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.dias > 90 ? 'bg-[#FEE2E2] text-[#DC2626]' :
                          c.dias > 30 ? 'bg-[#FEF3C7] text-[#D97706]' :
                          'bg-[#F3F4F6] text-[#6B7280]'
                        }`}>
                          {c.dias}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                c.documentsStatus.percentage >= 75 ? 'bg-[#F59E0B]' :
                                c.documentsStatus.percentage > 0 ? 'bg-[#F97316]' : 'bg-[#EF4444]'
                              }`}
                              style={{ width: `${c.documentsStatus.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-[#6B7280]">{c.documentsStatus.completed}/8</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.faltantes.map((f, j) => (
                            <span key={j} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              f === 'Escritura' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#F3F4F6] text-[#6B7280]'
                            }`}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ---- Sub-componente KPI Card ----
function KpiCard({ icon, bg, label, value, accent }: {
  icon: React.ReactNode; bg: string; label: string; value: string | number; accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-4 sm:p-5">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bg} rounded-full flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-xs sm:text-sm text-[#6B7280]">{label}</p>
          <p className={`text-xl sm:text-2xl font-bold ${accent || 'text-[#1F2937]'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
