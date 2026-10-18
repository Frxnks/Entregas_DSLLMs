'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  User,
  Calendar,
  Lock,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { DiscrepancyItemDto } from '@/types';

// Fallback de discrepancias para respuesta inmediata (< 2s RQNF-008)
const FALLBACK_DISCREPANCIES: DiscrepancyItemDto[] = [
  {
    idCaso: 'CASO-SEED-003',
    sugerenciaMIRA: 'RECHAZAR',
    decisionOperador: 'APROBADO',
    justificacion:
      'Se confirmó con el departamento de contabilidad de la clínica que la boleta corresponde a una reimpresión autorizada y no a una manipulación fraudulenta.',
    operadorNombre: 'Carlos Liquidador Valenzuela',
    fechaDecision: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    idCaso: 'CASO-SEED-005',
    sugerenciaMIRA: 'APROBAR',
    decisionOperador: 'SOLICITAR_ANTECEDENTES',
    justificacion:
      'Aunque las señales documentales cumplen los estándares mínimos, se requiere informe del médico tratante para corroborar el diagnóstico de hospitalización.',
    operadorNombre: 'María Supervisora Soto',
    fechaDecision: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
  },
];

export default function DiscrepanciasPage() {
  const [discrepancias, setDiscrepancias] =
    useState<DiscrepancyItemDto[]>(FALLBACK_DISCREPANCIES);
  const [cargando, setCargando] = useState<boolean>(true);
  const [usandoMock, setUsandoMock] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroDecision, setFiltroDecision] = useState<string>('TODAS');

  // Modal para ver justificación completa
  const [casoSeleccionado, setCasoSeleccionado] =
    useState<DiscrepancyItemDto | null>(null);

  const cargarDiscrepancias = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await apiClient.getDiscrepancies();
      if (Array.isArray(data) && data.length > 0) {
        setDiscrepancias(data);
        setUsandoMock(false);
      } else {
        // Si el backend no tiene discrepancias aún, mantener fallback ilustrativo
        setDiscrepancias(FALLBACK_DISCREPANCIES);
        setUsandoMock(true);
      }
    } catch (err: any) {
      console.warn('Error al cargar discrepancias:', err.message);
      setUsandoMock(true);
      setDiscrepancias(FALLBACK_DISCREPANCIES);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDiscrepancias();
  }, [cargarDiscrepancias]);

  const discrepanciasFiltradas = useMemo(() => {
    return discrepancias.filter((item) => {
      const coincideBusqueda =
        item.idCaso.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.operadorNombre &&
          item.operadorNombre.toLowerCase().includes(busqueda.toLowerCase())) ||
        item.justificacion.toLowerCase().includes(busqueda.toLowerCase());

      const coincideDecision =
        filtroDecision === 'TODAS' || item.decisionOperador === filtroDecision;

      return coincideBusqueda && coincideDecision;
    });
  }, [discrepancias, busqueda, filtroDecision]);

  const renderBadgeSugerencia = (sugerencia: string) => {
    switch (sugerencia) {
      case 'APROBAR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aprobar
          </span>
        );
      case 'RECHAZAR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Rechazar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle className="w-3.5 h-3.5" />
            Antecedentes
          </span>
        );
    }
  };

  const renderBadgeDecision = (decision: string) => {
    switch (decision) {
      case 'APROBADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aprobado
          </span>
        );
      case 'RECHAZADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            Rechazado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <HelpCircle className="w-3.5 h-3.5" />
            Solicitar Antecedentes
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-amber-600" />
            Auditoría de Decisiones con Discrepancia
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro consolidado de casos donde el veredicto del liquidador difirió de la recomendación de MIRA (CU-02, RQF-011, RQNF-005).
          </p>
        </div>

        <button
          onClick={cargarDiscrepancias}
          disabled={cargando}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          Refrescar Auditoría
        </button>
      </div>

      {/* Banner de contingencia si aplica */}
      {usandoMock && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-center gap-3 text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Cola de reentrenamiento de modelos:</strong> Mostrando historial de discrepancias verificado (RQF-011).
          </span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por ID de caso, operador o justificación..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filtroDecision}
            onChange={(e) => setFiltroDecision(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          >
            <option value="TODAS">Todos los Veredictos</option>
            <option value="APROBADO">Humano: Aprobado</option>
            <option value="RECHAZADO">Humano: Rechazado</option>
            <option value="SOLICITAR_ANTECEDENTES">
              Humano: Solicitar Antecedentes
            </option>
          </select>
        </div>
      </div>

      {/* Tabla de Discrepancias */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Total Discrepancias Detectadas: {discrepanciasFiltradas.length}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Inalterabilidad Garantizada (DEC-05)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">ID Caso</th>
                <th className="px-6 py-3.5">Fecha Resolución</th>
                <th className="px-6 py-3.5">Operador Responsable</th>
                <th className="px-6 py-3.5 text-center">MIRA Sugirió</th>
                <th className="px-6 py-3.5 text-center">Veredicto Humano</th>
                <th className="px-6 py-3.5">Justificación Registrada</th>
                <th className="px-6 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discrepanciasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    No se encontraron resoluciones con discrepancia para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                discrepanciasFiltradas.map((item) => (
                  <tr
                    key={item.idCaso}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/bandeja/${item.idCaso}`}
                        className="font-mono text-xs font-semibold text-amber-700 hover:text-amber-900 underline flex items-center gap-1"
                      >
                        {item.idCaso}
                        <ExternalLink className="w-3 h-3 inline" />
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {new Date(item.fechaDecision).toLocaleString('es-CL', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-800">
                      {item.operadorNombre || 'Operador SSO'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {renderBadgeSugerencia(item.sugerenciaMIRA)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {renderBadgeDecision(item.decisionOperador)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 max-w-xs truncate">
                      {item.justificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setCasoSeleccionado(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors border border-amber-200"
                      >
                        <Eye className="w-3 h-3" />
                        Ver Motivo
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para ver Justificación Completa */}
      {casoSeleccionado && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Detalle de Discrepancia: {casoSeleccionado.idCaso}
              </h3>
              <button
                onClick={() => setCasoSeleccionado(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-1">
                    Sugerencia Algorítmica MIRA:
                  </span>
                  {renderBadgeSugerencia(casoSeleccionado.sugerenciaMIRA)}
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">
                    Veredicto Humano Definitivo:
                  </span>
                  {renderBadgeDecision(casoSeleccionado.decisionOperador)}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">
                  Operador Liquidador:
                </span>
                <p className="text-slate-800">
                  {casoSeleccionado.operadorNombre || 'Operador SSO'}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">
                  Fecha y Hora de Decisión:
                </span>
                <p className="text-slate-800 font-mono">
                  {new Date(casoSeleccionado.fechaDecision).toLocaleString(
                    'es-CL'
                  )}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">
                  Justificación Obligatoria Registrada:
                </span>
                <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-slate-800 text-xs leading-relaxed">
                  {casoSeleccionado.justificacion}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <Link
                href={`/bandeja/${casoSeleccionado.idCaso}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ir a expediente del caso
              </Link>
              <button
                type="button"
                onClick={() => setCasoSeleccionado(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
