'use client';

import React from 'react';
import { Clock, AlertTriangle, AlertOctagon, ShieldAlert } from 'lucide-react';
import { EstadoSLA } from '@/types';

export interface BadgeSLAProps {
  /**
   * Horas hábiles restantes calculadas en base a jornada chilena (Lun-Vie 08:30 a 18:30)
   */
  horasRestantes: number;
  /**
   * Estado de SLA opcional (si no se proporciona se deriva de horasRestantes)
   */
  estadoSLA?: EstadoSLA;
  /**
   * Tamaño del badge ('sm' para tablas compactas, 'md' estándar, 'lg' para cabeceras)
   */
  tamano?: 'sm' | 'md' | 'lg';
  /**
   * Modo de visualización:
   * - 'completo': incluye semáforo, badge de estado y cuenta regresiva formateada
   * - 'compacto': semáforo y cuenta regresiva corta para celdas de tabla
   * - 'badge-solo': solo etiqueta de estado ('En Plazo', 'Próximo a Vencer', 'Vencido / Escalado')
   */
  modo?: 'completo' | 'compacto' | 'badge-solo';
  /**
   * Clases adicionales opcionales
   */
  className?: string;
}

/**
 * Formatea amigablemente el tiempo hábil restante en días (10 hrs laborables) y horas de Chile.
 * Ejemplos:
 *  - 48.0 hrs -> "4 días 8 hrs hábiles restantes"
 *  - 24.0 hrs -> "2 días 4 hrs hábiles restantes"
 *  - 14.0 hrs -> "1 día 4 hrs hábiles restantes"
 *  - 8.5 hrs  -> "8.5 hrs hábiles restantes"
 *  - <= 0 hrs -> "0 hrs hábiles (Plazo superado)"
 */
export function formatearTiempoHabil(horas: number): string {
  if (horas <= 0) {
    return '0 hrs hábiles (Plazo superado)';
  }

  const HORAS_POR_DIA = 10;
  const dias = Math.floor(horas / HORAS_POR_DIA);
  const horasRestantes = Math.round((horas % HORAS_POR_DIA) * 10) / 10;

  if (dias > 0) {
    const textoDias = dias === 1 ? '1 día' : `${dias} días`;
    if (horasRestantes > 0) {
      return `${textoDias} ${horasRestantes} hrs hábiles restantes`;
    }
    return `${textoDias} hábiles restantes`;
  }

  return `${horas} hrs hábiles restantes`;
}

/**
 * Determina el estado de SLA según las horas hábiles restantes (RQF-021).
 */
export function determinarEstadoSLA(horas: number): EstadoSLA {
  if (horas <= 0) {
    return 'VENCIDO_ESCALADO';
  }
  if (horas <= 24) {
    return 'PROXIMO_A_VENCER';
  }
  return 'EN_PLAZO';
}

export function BadgeSLA({
  horasRestantes,
  estadoSLA,
  tamano = 'md',
  modo = 'completo',
  className = '',
}: BadgeSLAProps) {
  const estadoCalculado: EstadoSLA = estadoSLA || determinarEstadoSLA(horasRestantes);
  const tiempoFormateado = formatearTiempoHabil(horasRestantes);

  // Configuración visual por estado
  const configs = {
    EN_PLAZO: {
      contenedor: 'bg-emerald-50 text-emerald-900 border-emerald-200/80',
      indicadorPing: null,
      indicadorPunto: 'bg-emerald-500',
      icono: <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      tituloEstado: 'En Plazo',
      etiquetaBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      colorTextoTiempo: 'text-emerald-700',
    },
    PROXIMO_A_VENCER: {
      contenedor: 'bg-amber-50 text-amber-950 border-amber-300/90 shadow-sm',
      indicadorPing: (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>
      ),
      indicadorPunto: 'bg-amber-500',
      icono: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      tituloEstado: 'Próximo a Vencer (<24h)',
      etiquetaBadge: 'bg-amber-100 text-amber-900 border-amber-300 font-medium',
      colorTextoTiempo: 'text-amber-800 font-medium',
    },
    VENCIDO_ESCALADO: {
      contenedor: 'bg-rose-50 text-rose-950 border-rose-300 shadow-sm',
      indicadorPing: (
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
        </span>
      ),
      indicadorPunto: 'bg-rose-600',
      icono: <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
      tituloEstado: 'Vencido / Escalado',
      etiquetaBadge: 'bg-rose-600 text-white font-semibold shadow-xs',
      colorTextoTiempo: 'text-rose-700 font-semibold',
    },
  };

  const config = configs[estadoCalculado];

  // Tamaños de texto y padding
  const paddingClase =
    tamano === 'sm'
      ? 'px-2 py-1 text-xs'
      : tamano === 'lg'
      ? 'px-3.5 py-2 text-sm'
      : 'px-2.5 py-1.5 text-xs';

  if (modo === 'badge-solo') {
    return (
      <span
        title="SLA: Jornada hábil Chile Lun-Vie 08:30 a 18:30 hrs"
        className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${config.contenedor} ${paddingClase} ${className}`}
      >
        {config.indicadorPing ? (
          config.indicadorPing
        ) : (
          <span className={`inline-block h-2 w-2 rounded-full ${config.indicadorPunto}`} />
        )}
        <span>{config.tituloEstado}</span>
      </span>
    );
  }

  if (modo === 'compacto') {
    return (
      <div
        title="Plazo computado en días y horas hábiles de Chile (Lun-Vie 08:30–18:30 hrs, excluye feriados)"
        className={`inline-flex items-center gap-2 rounded-md border ${config.contenedor} ${paddingClase} ${className}`}
      >
        {config.indicadorPing ? (
          config.indicadorPing
        ) : (
          <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${config.indicadorPunto}`} />
        )}
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-[11px] tracking-tight">{config.tituloEstado}</span>
          <span className={`text-[11px] ${config.colorTextoTiempo}`}>{tiempoFormateado}</span>
        </div>
      </div>
    );
  }

  // Modo 'completo'
  return (
    <div
      title="Plazo comprometido según jornada laboral chilena (Lunes a Viernes 08:30 a 18:30 hrs, excluye feriados legales)"
      className={`inline-flex flex-wrap items-center gap-2 rounded-lg border transition-colors ${config.contenedor} ${paddingClase} ${className}`}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        {config.indicadorPing ? (
          config.indicadorPing
        ) : (
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.indicadorPunto}`} />
        )}
        {config.icono}
        <span className="font-semibold">{config.tituloEstado}</span>
      </div>

      {estadoCalculado === 'VENCIDO_ESCALADO' && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-rose-600 text-white font-bold uppercase tracking-wider">
          Escalado
        </span>
      )}

      <span className="text-slate-300">|</span>

      <span className={`tabular-nums ${config.colorTextoTiempo}`}>
        {tiempoFormateado}
      </span>
    </div>
  );
}
