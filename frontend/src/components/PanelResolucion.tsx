'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Lock,
  Loader2,
  ShieldCheck,
  Send,
  FileText,
} from 'lucide-react';
import {
  SugerenciaMIRA,
  TipoDecisionOperador,
  EstadoCaso,
  DecisionResultDto,
} from '@/types';
import { apiClient, ApiError } from '@/lib/api-client';

interface PanelResolucionProps {
  idCaso: string;
  sugerenciaMIRA: SugerenciaMIRA;
  estadoCaso: EstadoCaso;
  idOperador?: string;
  onDecisionSuccess?: (result: DecisionResultDto) => void;
  className?: string;
}

const DEFAULT_OPERADOR_ID = '11111111-1111-4111-8111-111111111111';
const MIN_JUSTIFICACION_LENGTH = 10;

export function PanelResolucion({
  idCaso,
  sugerenciaMIRA,
  estadoCaso,
  idOperador = DEFAULT_OPERADOR_ID,
  onDecisionSuccess,
  className = '',
}: PanelResolucionProps) {
  const [tipoDecision, setTipoDecision] = useState<TipoDecisionOperador | null>(null);
  const [justificacion, setJustificacion] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<DecisionResultDto | null>(null);

  const yaResuelto = estadoCaso === 'RESUELTO' || !!successResult;

  // Evaluar discrepancia entre decisión del operador y sugerencia MIRA
  const esDiscrepante = (() => {
    if (!tipoDecision) return false;
    if (sugerenciaMIRA === 'APROBAR' && tipoDecision !== 'APROBADO') return true;
    if (sugerenciaMIRA === 'RECHAZAR' && tipoDecision !== 'RECHAZADO') return true;
    if (
      sugerenciaMIRA === 'SOLICITAR_ANTECEDENTES' &&
      tipoDecision !== 'SOLICITAR_ANTECEDENTES'
    ) {
      return true;
    }
    return false;
  })();

  const justificacionTrimmed = justificacion.trim();
  const caracteresActuales = justificacionTrimmed.length;
  const esJustificacionValida = caracteresActuales >= MIN_JUSTIFICACION_LENGTH;
  const caracteresFaltantes = Math.max(0, MIN_JUSTIFICACION_LENGTH - caracteresActuales);

  const puedeAbrirConfirmacion =
    tipoDecision !== null && esJustificacionValida && !loading && !yaResuelto;

  const handleAbrirConfirmacion = () => {
    if (!puedeAbrirConfirmacion) return;
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleConfirmarDecision = async () => {
    if (!tipoDecision || !esJustificacionValida || loading || yaResuelto) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await apiClient.submitDecision(idCaso, {
        idOperador,
        tipoDecision,
        justificacion: justificacionTrimmed,
      });

      setSuccessResult(result);
      setIsModalOpen(false);
      if (onDecisionSuccess) {
        onDecisionSuccess(result);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErrorMessage(
            'Conflicto (409): El caso ya fue resuelto previamente y no admite modificaciones (principio append-only inalterable).'
          );
        } else if (err.status === 400) {
          setErrorMessage(
            `Petición inválida (400): ${err.message || 'Verifica la justificación y los datos de la resolución.'}`
          );
        } else {
          setErrorMessage(err.message || 'Error al emitir la resolución.');
        }
      } else {
        // En caso de error de red local o contingencia
        setErrorMessage(
          err.message ||
            'Error al comunicar con el servicio de resolución. Verifica la conectividad del backend.'
        );
      }
      setIsModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Si el caso ya fue resuelto, mostrar vista inmutable bloqueada
  if (yaResuelto) {
    const res = successResult;
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 ${className}`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Expediente Resuelto (Inalterable)
            </h3>
            <p className="text-xs text-slate-500">
              Registro append-only sellado conforme a DEC-05 y RQNF-005
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">Estado del Caso:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              RESUELTO
            </span>
          </div>

          {res && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Veredicto Emitido:</span>
                <span className="font-bold text-slate-900">{res.tipoDecision}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Marca Discrepancia:</span>
                <span
                  className={`font-semibold ${
                    res.marcaDiscrepancia ? 'text-amber-600' : 'text-slate-600'
                  }`}
                >
                  {res.marcaDiscrepancia ? 'Sí (Registrada en Auditoría)' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600">Fecha de Resolución:</span>
                <span className="font-mono text-slate-500">
                  {new Date(res.fechaDecision).toLocaleString('es-CL')}
                </span>
              </div>
            </>
          )}

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-200">
            Este expediente se encuentra sellado criptográficamente. Por normativas de auditoría
            de la aseguradora, las resoluciones no admiten modificaciones ni reaperturas directas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5 ${className}`}
    >
      {/* Encabezado del Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Panel de Resolución del Operador
            </h3>
            <p className="text-xs text-slate-500">
              Veredicto humano formal e inalterable (RQF-010, DEC-04)
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de Error si aplica */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error al registrar la decisión:</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 1. Selector de las Tres Acciones Resolutivas */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          1. Seleccione la Acción Resolutiva:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Botón APROBAR (Verde) */}
          <button
            type="button"
            onClick={() => setTipoDecision('APROBADO')}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all ${
              tipoDecision === 'APROBADO'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                : 'bg-emerald-50/50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>APROBAR</span>
          </button>

          {/* Botón RECHAZAR (Rojo) */}
          <button
            type="button"
            onClick={() => setTipoDecision('RECHAZADO')}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all ${
              tipoDecision === 'RECHAZADO'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-300'
                : 'bg-rose-50/50 text-rose-800 border-rose-200 hover:bg-rose-100/60'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>RECHAZAR</span>
          </button>

          {/* Botón SOLICITAR ANTECEDENTES (Ámbar / Azul) */}
          <button
            type="button"
            onClick={() => setTipoDecision('SOLICITAR_ANTECEDENTES')}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all ${
              tipoDecision === 'SOLICITAR_ANTECEDENTES'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300'
                : 'bg-amber-50/50 text-amber-900 border-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>SOLICITAR ANTECEDENTES</span>
          </button>
        </div>
      </div>

      {/* 2. Advertencia Visual de Discrepancia con Sugerencia MIRA (RQF-011) */}
      {tipoDecision && esDiscrepante && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 space-y-1.5 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Advertencia de Discrepancia con el Modelo Analítico</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Esta resolución difiere de la sugerencia del modelo (MIRA recomendó:{' '}
            <strong className="font-semibold underline uppercase">{sugerenciaMIRA}</strong>, y
            usted ha seleccionado:{' '}
            <strong className="font-semibold underline uppercase">{tipoDecision}</strong>).
            Se registrará automáticamente una{' '}
            <strong className="font-semibold">marca de discrepancia (marcaDiscrepancia = true)</strong>{' '}
            en la pista de auditoría inalterable para supervisión de calidad y reentrenamiento.
          </p>
        </div>
      )}

      {/* 3. Textarea de Justificación Explicativa Obligatoria con Contador en Vivo */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="justificacion"
            className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>2. Justificación Explicativa Obligatoria:</span>
          </label>
          <span
            className={`text-xs font-mono font-semibold ${
              esJustificacionValida ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            {caracteresActuales} / {MIN_JUSTIFICACION_LENGTH} caracteres
          </span>
        </div>

        <textarea
          id="justificacion"
          rows={3}
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          placeholder={
            tipoDecision === 'APROBADO'
              ? 'Explique el fundamento de la aprobación (ej: Se verificó la consistencia del comprobante y no existen indicios de dolo)...'
              : tipoDecision === 'RECHAZADO'
              ? 'Explique los motivos precisos del rechazo del siniestro conforme a póliza...'
              : tipoDecision === 'SOLICITAR_ANTECEDENTES'
              ? 'Detalle con claridad los documentos o antecedentes adicionales requeridos al asegurado...'
              : 'Seleccione primero una acción resolutiva y detalle los fundamentos técnicos de su veredicto...'
          }
          className={`w-full text-xs p-3 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-y ${
            !esJustificacionValida && justificacion.length > 0
              ? 'border-amber-300 focus:ring-amber-200'
              : 'border-slate-300 focus:ring-sky-200 focus:border-sky-500'
          }`}
        />

        {/* Mensaje de validación en vivo */}
        <div className="text-[11px]">
          {!esJustificacionValida ? (
            <span className="text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>
                Mínimo {MIN_JUSTIFICACION_LENGTH} caracteres requeridos (faltan {caracteresFaltantes}).
              </span>
            </span>
          ) : (
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              <span>Justificación válida y fundamentada.</span>
            </span>
          )}
        </div>
      </div>

      {/* 4. Botón de Apertura de Diálogo de Confirmación Atómica */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleAbrirConfirmacion}
          disabled={!puedeAbrirConfirmacion}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
            puedeAbrirConfirmacion
              ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99] cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Emitir Resolución Formal</span>
        </button>
      </div>

      {/* 5. Modal / Diálogo de Confirmación Atómica */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Confirmación de Resolución Inalterable
                </h4>
                <p className="text-xs text-slate-500 font-mono">Caso: {idCaso}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Acción a Registrar:</span>
                  <span
                    className={`font-black uppercase px-2.5 py-0.5 rounded-full text-xs ${
                      tipoDecision === 'APROBADO'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : tipoDecision === 'RECHAZADO'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {tipoDecision}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Sugerencia MIRA:</span>
                  <span className="font-bold text-slate-700 uppercase">{sugerenciaMIRA}</span>
                </div>

                {esDiscrepante && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-amber-700 font-semibold">
                    <span>Marca de Discrepancia:</span>
                    <span className="font-bold">Sí (Se registrará en Auditoría)</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">
                  Justificación Ingresada:
                </span>
                <p className="p-3 bg-slate-100 rounded-lg text-slate-800 italic border border-slate-200 leading-relaxed">
                  &ldquo;{justificacionTrimmed}&rdquo;
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Advertencia de Inmutabilidad:</strong> Al
                  confirmar, esta decisión se registrará de forma permanente (append-only) bajo su
                  identidad de operador. No podrá ser modificada ni eliminada.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar y Revisar
              </button>

              <button
                type="button"
                onClick={handleConfirmarDecision}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirmar y Sellar Veredicto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
