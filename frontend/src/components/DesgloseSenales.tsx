'use client';

import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Crosshair,
  FileCheck,
  FileX,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import {
  SenalDto,
  EvidenciaDto,
  SugerenciaMIRA,
  CausalDerivacion,
} from '@/types';

interface DesgloseSenalesProps {
  puntajeConfianza: number;
  sugerenciaMIRA: SugerenciaMIRA;
  razonDerivacion: string;
  causalDerivacion: CausalDerivacion;
  senales: SenalDto[];
  evidencias?: EvidenciaDto[];
  selectedSignalId?: string | null;
  onSelectSignal?: (idSenal: string) => void;
  className?: string;
}

export function DesgloseSenales({
  puntajeConfianza,
  sugerenciaMIRA,
  razonDerivacion,
  causalDerivacion,
  senales = [],
  evidencias = [],
  selectedSignalId,
  onSelectSignal,
  className = '',
}: DesgloseSenalesProps) {
  // Verificar si hay alguna alerta de fraude activa en las señales
  const tieneAlertaFraude = senales.some((s) => s.esAlertaFraude) || causalDerivacion === 'FRAUDE';

  // Verificar si alguna evidencia es ilegible
  const evidenciaIlegible = evidencias.find((e) => !e.esLegible);

  // Formato para badges de sugerencia MIRA
  const renderBadgeSugerencia = () => {
    switch (sugerenciaMIRA) {
      case 'APROBAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sugerencia MIRA: Aprobar
          </span>
        );
      case 'RECHAZAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            Sugerencia MIRA: Rechazar
          </span>
        );
      case 'SOLICITAR_ANTECEDENTES':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle className="w-3.5 h-3.5" />
            Sugerencia MIRA: Solicitar Antecedentes
          </span>
        );
    }
  };

  // Formato para causal de derivación
  const renderBadgeCausal = () => {
    switch (causalDerivacion) {
      case 'FRAUDE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            Causal: Precedencia de Fraude (DEC-04)
          </span>
        );
      case 'MINIMO_SENAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            Causal: Mínimo Basal no Cumplido (&lt;60)
          </span>
        );
      case 'PUNTAJE_INSUFICIENTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800">
            Causal: Puntaje Bajo Umbral (&lt;90)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Tarjeta de Puntaje Global y Veredicto Algorítmico */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Evaluación Algorítmica MIRA
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {puntajeConfianza.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100 pts</span>
              <span className="text-xs text-slate-500 font-medium ml-1">
                (Umbral de Aprobación: 90.0)
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1.5">
            {renderBadgeSugerencia()}
            {renderBadgeCausal()}
          </div>
        </div>

        {/* Barra de progreso visual respecto al umbral */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
            <span>Puntaje de Confianza Global</span>
            <span className={puntajeConfianza >= 90 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
              {puntajeConfianza >= 90 ? 'Supera umbral (≥ 90)' : 'Bajo umbral (< 90)'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                tieneAlertaFraude
                  ? 'bg-red-500'
                  : puntajeConfianza >= 90
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(Math.max(puntajeConfianza, 0), 100)}%` }}
            />
            {/* Marcador del umbral de aprobación en 90% */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10"
              style={{ left: '90%' }}
              title="Umbral de Aprobación Automática: 90 pts"
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0 pts</span>
            <span className="font-semibold text-slate-600">60 pts (Basal)</span>
            <span className="font-bold text-slate-800">90 pts (Umbral Aprobación)</span>
            <span>100 pts</span>
          </div>
        </div>

        {/* 2. Razón Explícita de Derivación (RQF-009, SC-002) */}
        <div
          className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
            tieneAlertaFraude
              ? 'bg-red-50/80 border-red-200 text-red-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {tieneAlertaFraude ? (
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold uppercase tracking-wider block text-[11px] mb-0.5">
                Razón Explícita de Derivación a Revisión Humana:
              </span>
              <p className="font-medium">
                {razonDerivacion ||
                  'El caso fue derivado para verificación de antecedentes por el operador humano conforme a las políticas de riesgo vigentes.'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Estado de Legibilidad del Expediente (RQF-002) */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Estado de Legibilidad del Expediente:</span>
          {evidenciaIlegible ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              <FileX className="w-3.5 h-3.5 text-amber-600" />
              Pieza con reparo: {evidenciaIlegible.motivoIlegibilidad || 'Baja resolución'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              Documentación 100% Legible
            </span>
          )}
        </div>
      </div>

      {/* 4. Desglose Detallado de Señales con Navegación Espacial (RQF-009, RQF-020, ENT5) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Desglose Analítico por Señal ({senales.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            Haz clic en un hallazgo para ubicarlo en el visor
          </span>
        </div>

        {senales.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            No se registraron señales analíticas individuales para este expediente.
          </p>
        ) : (
          <div className="space-y-2.5">
            {senales.map((senal) => {
              const hasSpatial = !!senal.ubicacionHallazgo;
              const isSelected = selectedSignalId === senal.idSenal;
              const isFraud = senal.esAlertaFraude;
              const pesoPorcentual = senal.pesoPonderacion
                ? `${Math.round(senal.pesoPonderacion * 100)}%`
                : 'N/A';

              return (
                <div
                  key={senal.idSenal}
                  onClick={() => {
                    if (hasSpatial && onSelectSignal) {
                      onSelectSignal(senal.idSenal);
                    }
                  }}
                  className={`p-3 rounded-lg border transition-all text-xs ${
                    hasSpatial ? 'cursor-pointer hover:shadow-sm' : ''
                  } ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-400 ring-opacity-60 shadow-sm'
                      : isFraud
                      ? 'border-red-200 bg-red-50/40 hover:bg-red-50/70'
                      : 'border-slate-200 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      {/* Cabecera de la señal: Tipo y Módulo */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-800">{senal.tipoSenal}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {senal.moduloOrigen}
                        </span>
                        {isFraud && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded shadow-sm">
                            <ShieldAlert className="w-3 h-3" />
                            Alerta Fraude
                          </span>
                        )}
                        {!isFraud && senal.cumpleMinimo === false && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Mínimo Reprobado
                          </span>
                        )}
                      </div>

                      {/* Descripción explicativa */}
                      <p className="text-slate-600 leading-relaxed text-[11px] mt-1">
                        {senal.descripcion}
                      </p>
                    </div>

                    {/* Puntaje y Peso */}
                    <div className="text-right flex flex-col items-end flex-shrink-0">
                      <span
                        className={`text-sm font-black ${
                          isFraud
                            ? 'text-red-600'
                            : senal.puntaje >= 80
                            ? 'text-emerald-700'
                            : senal.puntaje >= 60
                            ? 'text-amber-700'
                            : 'text-red-600'
                        }`}
                      >
                        {senal.puntaje.toFixed(1)} pts
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Peso: {pesoPorcentual}
                      </span>
                    </div>
                  </div>

                  {/* Barra de acción para localización de hallazgo (ENT5, RQF-020) */}
                  {hasSpatial && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Crosshair className="w-3 h-3 text-sky-600" />
                        <span>
                          Pág. {senal.ubicacionHallazgo?.page} • X:{senal.ubicacionHallazgo?.x} Y:
                          {senal.ubicacionHallazgo?.y}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectSignal) onSelectSignal(senal.idSenal);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>{isSelected ? 'Hallazgo Enfocado' : 'Ubicar en Evidencia'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
