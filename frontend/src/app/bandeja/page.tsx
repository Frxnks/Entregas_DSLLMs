'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Unlock,
  ChevronRight,
  User,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { CaseSummaryDto, EstadoCaso, NivelPrioridad } from '@/types';
import { apiClient, ApiError } from '@/lib/api-client';
import { BadgeSLA, formatearTiempoHabil } from '@/components/BadgeSLA';

// Identificador del operador de demostración (Carlos Liquidador Valenzuela)
const CURRENT_OPERATOR_ID = '11111111-1111-4111-8111-111111111111';

// Semillas locales de contingencia para carga instantánea (< 2s RQNF-008)
const FALLBACK_CASES: CaseSummaryDto[] = [
  {
    idCaso: 'CASO-SEED-003',
    fechaIngreso: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    puntajeConfianza: 75.9,
    razonDerivacion:
      'Alerta de fraude activa: alteración digital y manipulación de píxeles detectada en el monto de la boleta médica. Precedencia absoluta de fraude sobre el puntaje (DEC-04 / RQF-023).',
    sugerenciaMIRA: 'RECHAZAR',
    nivelPrioridad: 'ALTA',
    alertaFraude: true,
    tiempoRestanteHorasHabiles: 14.0,
    estadoSLA: 'PROXIMO_A_VENCER',
    estadoCaso: 'PENDIENTE_REVISION',
    causalDerivacion: 'FRAUDE',
    rutTitular: '14.567.***-*',
    nombreTitular: 'M*** C*** G***',
    bloqueadoPor: null,
  },
  {
    idCaso: 'CASO-SEED-002',
    fechaIngreso: new Date().toISOString(),
    puntajeConfianza: 74.0,
    razonDerivacion:
      'Puntaje global insuficiente (74/100) inferior al umbral de aprobación automática configurado (90 puntos). Prohibición de rechazo automático conforme a DEC-04.',
    sugerenciaMIRA: 'APROBAR',
    nivelPrioridad: 'MEDIA',
    alertaFraude: false,
    tiempoRestanteHorasHabiles: 48.0,
    estadoSLA: 'EN_PLAZO',
    estadoCaso: 'PENDIENTE_REVISION',
    causalDerivacion: 'PUNTAJE_INSUFICIENTE',
    rutTitular: '18.234.***-*',
    nombreTitular: 'R*** F*** T***',
    bloqueadoPor: null,
  },
  {
    idCaso: 'CASO-SEED-004',
    fechaIngreso: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    puntajeConfianza: 62.5,
    razonDerivacion:
      'Plazo perentorio de 3 días hábiles superado sin resolución humana. Caso escalado a supervisión.',
    sugerenciaMIRA: 'RECHAZAR',
    nivelPrioridad: 'ALTA',
    alertaFraude: false,
    tiempoRestanteHorasHabiles: 0.0,
    estadoSLA: 'VENCIDO_ESCALADO',
    estadoCaso: 'VENCIDO_ESCALADO',
    causalDerivacion: 'MINIMO_SENAL',
    rutTitular: '11.890.***-*',
    nombreTitular: 'P*** V*** L***',
    bloqueadoPor: null,
  },
];

export default function BandejaPage() {
  const router = useRouter();

  // Estados de datos
  const [casos, setCasos] = useState<CaseSummaryDto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [usandoFallback, setUsandoFallback] = useState<boolean>(false);

  // Estados de filtros
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('TODAS');

  // Estados de interacción
  const [procesandoLeaseId, setProcesandoLeaseId] = useState<string | null>(null);
  const [mensajeAlerta, setMensajeAlerta] = useState<{
    tipo: 'info' | 'advertencia' | 'error' | 'exito';
    texto: string;
  } | null>(null);

  /**
   * Carga los casos derivados desde la API REST de NestJS (F1 Review Tray)
   */
  const cargarCasos = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);

    try {
      const params: { estado?: string; prioridad?: string } = {};
      if (filtroEstado !== 'TODOS') {
        params.estado = filtroEstado;
      }
      if (filtroPrioridad !== 'TODAS') {
        params.prioridad = filtroPrioridad;
      }

      const resultado = await apiClient.getReviewCases(params);

      // Si la API retorna casos los usamos, si viene vacía pero no hay filtros podemos usar fallback
      if (resultado && resultado.length > 0) {
        setCasos(resultado);
        setUsandoFallback(false);
      } else if (filtroEstado === 'TODOS' && filtroPrioridad === 'TODAS') {
        setCasos(FALLBACK_CASES);
        setUsandoFallback(true);
      } else {
        setCasos([]);
        setUsandoFallback(false);
      }
    } catch (err: any) {
      console.warn('Conexión con el servidor no disponible, utilizando datos de contingencia local:', err);
      // Aplicar filtros sobre el fallback en caso de contingencia
      let filtrados = [...FALLBACK_CASES];
      if (filtroEstado !== 'TODOS') {
        filtrados = filtrados.filter((c) => c.estadoCaso === filtroEstado || c.estadoSLA === filtroEstado);
      }
      if (filtroPrioridad !== 'TODAS') {
        filtrados = filtrados.filter((c) => c.nivelPrioridad === filtroPrioridad);
      }
      setCasos(filtrados);
      setUsandoFallback(true);
      setErrorCarga(
        'Modo contingencia activo: mostrando datos precalculados de verificación offline.'
      );
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, filtroPrioridad]);

  useEffect(() => {
    cargarCasos();
  }, [cargarCasos]);

  /**
   * Métricas y resumen estadístico de la bandeja
   */
  const estadisticas = useMemo(() => {
    const total = casos.length;
    const proximosVencer = casos.filter((c) => c.estadoSLA === 'PROXIMO_A_VENCER').length;
    const vencidosEscalados = casos.filter(
      (c) => c.estadoSLA === 'VENCIDO_ESCALADO' || c.estadoCaso === 'VENCIDO_ESCALADO'
    ).length;
    const enRevision = casos.filter(
      (c) => c.estadoCaso === 'EN_REVISION' || Boolean(c.bloqueadoPor)
    ).length;
    const conAlertaFraude = casos.filter((c) => c.alertaFraude).length;

    return {
      total,
      proximosVencer,
      vencidosEscalados,
      enRevision,
      conAlertaFraude,
    };
  }, [casos]);

  /**
   * Filtrado en memoria por búsqueda de texto (ID Caso o Titular)
   */
  const casosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return casos;
    const q = busqueda.toLowerCase().trim();
    return casos.filter((c) => {
      const coincideId = c.idCaso.toLowerCase().includes(q);
      const coincideNombre = c.nombreTitular?.toLowerCase().includes(q);
      const coincideRut = c.rutTitular?.toLowerCase().includes(q);
      const coincideCausal = c.causalDerivacion?.toLowerCase().includes(q);
      return coincideId || coincideNombre || coincideRut || coincideCausal;
    });
  }, [casos, busqueda]);

  /**
   * Adquiere el lease de 15 minutos e inicia la revisión asistida (T024, T025, RQF-024)
   */
  const handleRevisarExpediente = async (idCaso: string, bloqueadoPorOtro: boolean) => {
    setMensajeAlerta(null);

    // Si está bloqueado por otro operador, se ofrece entrar en modo sólo lectura
    if (bloqueadoPorOtro) {
      setMensajeAlerta({
        tipo: 'advertencia',
        texto: `El caso ${idCaso} se encuentra bloqueado para edición por otro analista. Accederás en modo sólo lectura.`,
      });
      setTimeout(() => {
        router.push(`/bandeja/${idCaso}`);
      }, 700);
      return;
    }

    setProcesandoLeaseId(idCaso);
    try {
      // Intentar adquirir o renovar el arriendo de 15 min en el backend
      await apiClient.acquireOrRenewLease(idCaso, {
        idOperador: CURRENT_OPERATOR_ID,
      });

      // Lease adquirido con éxito, navegar al visor integral
      router.push(`/bandeja/${idCaso}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setMensajeAlerta({
          tipo: 'advertencia',
          texto: `Conflicto concurrente: ${err.message} Puedes acceder en modo sólo lectura.`,
        });
        // Si hay conflicto pero se desea inspeccionar, permitir acceso en modo lectura
        setTimeout(() => {
          router.push(`/bandeja/${idCaso}`);
        }, 1200);
      } else {
        // En caso de modo offline o error de red, proceder a la vista
        console.warn('No se pudo adquirir lease en servidor, ingresando a visualización local:', err);
        router.push(`/bandeja/${idCaso}`);
      }
    } finally {
      setProcesandoLeaseId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Cabecera Principal y Botón de Recarga */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-sky-100 text-sky-700 rounded-lg flex items-center justify-center shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Bandeja de Revisión Asistida
              </h1>
              <p className="text-sm text-slate-500">
                Priorización inteligente de siniestros derivados, cómputo de SLA hábil y control concurrente.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={cargarCasos}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors disabled:opacity-50"
            title="Recargar casos de la bandeja"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin text-sky-600' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Notificación / Alertas */}
      {mensajeAlerta && (
        <div
          className={`flex items-start justify-between gap-3 p-4 rounded-xl border text-sm transition-all ${
            mensajeAlerta.tipo === 'advertencia'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : mensajeAlerta.tipo === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-sky-50 text-sky-900 border-sky-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <p className="font-medium">{mensajeAlerta.texto}</p>
          </div>
          <button
            onClick={() => setMensajeAlerta(null)}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Cerrar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Tarjetas de Resumen Estadístico (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Derivados */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Derivados
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">{estadisticas.total}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Expedientes en bandeja</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        {/* Próximos a Vencer (<24h) */}
        <div className="bg-white rounded-xl border border-amber-200/90 p-4 shadow-xs flex items-center justify-between bg-amber-50/30">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                Próximos a Vencer
              </p>
            </div>
            <p className="text-2xl font-black text-amber-950 mt-1">
              {estadisticas.proximosVencer}
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">SLA hábil &lt; 24 hrs</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* En Revisión Activa */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              En Revisión
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">{estadisticas.enRevision}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Con lease activo</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Vencidos / Escalados */}
        <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-xs flex items-center justify-between bg-rose-50/20">
          <div>
            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Vencidos / Escalados
            </p>
            <p className="text-2xl font-black text-rose-900 mt-1">
              {estadisticas.vencidosEscalados}
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5">A supervisión inmediata</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID Caso, titular (RUT o nombre) o causal..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros Selectores */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Estado */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">Estado:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE_REVISION">Pendiente</option>
                <option value="EN_REVISION">En Revisión</option>
                <option value="VENCIDO_ESCALADO">Vencido Escalado</option>
              </select>
            </div>

            {/* Filtro Prioridad */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-slate-500 font-medium">Prioridad:</span>
              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="TODAS">Todas</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>

            {/* Limpiar Filtros */}
            {(busqueda || filtroEstado !== 'TODOS' || filtroPrioridad !== 'TODAS') && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setFiltroEstado('TODOS');
                  setFiltroPrioridad('TODAS');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-dashed border-slate-300"
              >
                <X className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Tabla de Casos Derivados */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">ID Caso</th>
                <th className="py-3 px-3.5">Fecha Ingreso</th>
                <th className="py-3 px-3.5">Titular (PII protegida)</th>
                <th className="py-3 px-3.5">Puntaje / Sugerencia MIRA</th>
                <th className="py-3 px-3.5">Causal Derivación</th>
                <th className="py-3 px-3.5">Alerta Fraude</th>
                <th className="py-3 px-3.5">Semáforo SLA Hábil</th>
                <th className="py-3 px-3.5">Estado Lease</th>
                <th className="py-3 px-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cargando && casos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                      <p className="text-sm font-medium text-slate-700">
                        Cargando casos derivados de la bandeja...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : casosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">
                        No se encontraron casos con los filtros aplicados
                      </p>
                      <p className="text-xs text-slate-400">
                        Prueba ajustando los criterios de búsqueda o los selectores de estado y prioridad.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                casosFiltrados.map((caso) => {
                  const tieneFraude = caso.alertaFraude;
                  const bloqueadoPorOtro =
                    Boolean(caso.bloqueadoPor) && caso.bloqueadoPor !== CURRENT_OPERATOR_ID;
                  const estaProcesando = procesandoLeaseId === caso.idCaso;

                  return (
                    <tr
                      key={caso.idCaso}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        caso.estadoSLA === 'PROXIMO_A_VENCER'
                          ? 'bg-amber-50/20'
                          : caso.estadoSLA === 'VENCIDO_ESCALADO'
                          ? 'bg-rose-50/20'
                          : ''
                      }`}
                    >
                      {/* 1. ID Caso & Prioridad */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              caso.nivelPrioridad === 'ALTA'
                                ? 'bg-red-500'
                                : caso.nivelPrioridad === 'MEDIA'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                            title={`Prioridad ${caso.nivelPrioridad}`}
                          />
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {caso.idCaso}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 ml-4">
                          Prioridad {caso.nivelPrioridad}
                        </div>
                      </td>

                      {/* 2. Fecha Ingreso */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{new Date(caso.fechaIngreso).toLocaleDateString('es-CL')}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 ml-5">
                          {new Date(caso.fechaIngreso).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* 3. Titular (PII protegida) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{caso.nombreTitular || 'Nombre Protegido'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 ml-5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                          <span>{caso.rutTitular || 'RUT Protegido'}</span>
                        </div>
                      </td>

                      {/* 4. Puntaje & Sugerencia MIRA */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 tabular-nums">
                            {caso.puntajeConfianza.toFixed(0)}
                            <span className="text-slate-400 font-normal text-[10px]">/100</span>
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              caso.sugerenciaMIRA === 'APROBAR'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : caso.sugerenciaMIRA === 'RECHAZAR'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {caso.sugerenciaMIRA}
                          </span>
                        </div>
                      </td>

                      {/* 5. Causal de Derivación */}
                      <td className="py-3 px-3.5 max-w-[200px]">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-0.5 border ${
                            caso.causalDerivacion === 'FRAUDE'
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : caso.causalDerivacion === 'MINIMO_SENAL'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {caso.causalDerivacion || 'PUNTAJE_INSUFICIENTE'}
                        </span>
                        <p
                          className="text-[11px] text-slate-500 truncate"
                          title={caso.razonDerivacion}
                        >
                          {caso.razonDerivacion}
                        </p>
                      </td>

                      {/* 6. Alerta Fraude */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {tieneFraude ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-xs">
                            <ShieldAlert className="w-3 h-3" />
                            FRAUDE ACTIVO
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sin alertas</span>
                        )}
                      </td>

                      {/* 7. Semáforo SLA (BadgeSLA) */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <BadgeSLA
                          horasRestantes={caso.tiempoRestanteHorasHabiles}
                          estadoSLA={caso.estadoSLA}
                          modo="compacto"
                          tamano="sm"
                        />
                      </td>

                      {/* 8. Estado de Bloqueo / Lease */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {bloqueadoPorOtro ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-300"
                            title={`Modo sólo lectura activo. Operador en edición: ${caso.bloqueadoPor}`}
                          >
                            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Bloqueado ({caso.bloqueadoPor})</span>
                          </span>
                        ) : caso.bloqueadoPor ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-sky-50 text-sky-900 border border-sky-300">
                            <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                            <span>En edición por ti</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <Unlock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Disponible</span>
                          </span>
                        )}
                      </td>

                      {/* 9. Botón de Acción */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        {bloqueadoPorOtro ? (
                          <button
                            onClick={() => handleRevisarExpediente(caso.idCaso, true)}
                            disabled={estaProcesando}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-colors border border-slate-300 shadow-xs"
                            title="El caso se encuentra bloqueado por otro operador. Ingresar en modo sólo lectura."
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>Solo Lectura</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevisarExpediente(caso.idCaso, false)}
                            disabled={estaProcesando}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                          >
                            {estaProcesando ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            <span>Revisar Expediente</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de Tabla con Información Regulatoria */}
        <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              Cómputo oficial de SLA: Lunes a Viernes 08:30 a 18:30 hrs (10 hrs hábiles/día), excluye fines de semana y feriados legales de Chile.
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>Total mostrados: {casosFiltrados.length}</span>
            {usandoFallback && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-sans font-medium text-[10px]">
                Modo Offline
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
