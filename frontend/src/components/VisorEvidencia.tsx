'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  FileWarning,
} from 'lucide-react';
import { EvidenciaDto, SenalDto, BoundingBox } from '@/types';
import { apiClient } from '@/lib/api-client';

interface VisorEvidenciaProps {
  evidencias: EvidenciaDto[];
  senales: SenalDto[];
  selectedSignalId?: string | null;
  onSelectSignal?: (idSenal: string) => void;
  className?: string;
}

// Dimensiones de referencia de página estándar (Letter: 612 x 792 pt)
const DOC_WIDTH = 612;
const DOC_HEIGHT = 792;

export function VisorEvidencia({
  evidencias = [],
  senales = [],
  selectedSignalId,
  onSelectSignal,
  className = '',
}: VisorEvidenciaProps) {
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [imageError, setImageError] = useState(false);

  const activeEvidencia: EvidenciaDto | undefined = evidencias[activeEvidenceIndex];

  // Señales con hallazgo espacial asociadas a la evidencia activa (o globales si no tienen idEvidencia asignado)
  const senalesConHallazgo = useMemo(() => {
    if (!activeEvidencia) return [];
    return senales.filter((s) => {
      if (!s.ubicacionHallazgo) return false;
      // Si la señal tiene idEvidencia, debe coincidir con la evidencia activa
      if (s.idEvidencia && s.idEvidencia !== activeEvidencia.idEvidencia) {
        return false;
      }
      return true;
    });
  }, [senales, activeEvidencia]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  if (!evidencias || evidencias.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 p-8 text-center ${className}`}>
        <FileWarning className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">
          No hay piezas de evidencia asociadas a este caso
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          El expediente no contiene archivos adjuntos legibles o digitalizados.
        </p>
      </div>
    );
  }

  const isPdf = activeEvidencia?.tipoArchivo?.toUpperCase().includes('PDF');
  const evidenceUrl = activeEvidencia ? apiClient.getEvidenceUrl(activeEvidencia.urlAlmacenamiento) : '';

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${className}`}>
      {/* 1. Barra de Herramientas y Selector de Evidencias */}
      <div className="border-b border-slate-200 bg-slate-50/75 p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Selector de pestañas si hay múltiples evidencias */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          {evidencias.map((evi, idx) => {
            const isActive = idx === activeEvidenceIndex;
            const esPdfDoc = evi.tipoArchivo?.toUpperCase().includes('PDF');
            return (
              <button
                key={evi.idEvidencia || idx}
                onClick={() => {
                  setActiveEvidenceIndex(idx);
                  setImageError(false);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
                title={evi.nombreArchivo}
              >
                {esPdfDoc ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                <span className="truncate max-w-[140px]">{evi.nombreArchivo}</span>
                {!evi.esLegible && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-0.5" title="Ilegible" />
                )}
              </button>
            );
          })}
        </div>

        {/* Controles del Visor (Zoom, Capas de Hallazgos) */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Alternar Bounding Boxes */}
          <button
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              showBoundingBoxes
                ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title={showBoundingBoxes ? 'Ocultar capas de hallazgos' : 'Mostrar capas de hallazgos'}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hallazgos</span>
            {showBoundingBoxes ? <Eye className="w-3 h-3 text-sky-600" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md disabled:opacity-40 transition-colors"
            title="Reducir zoom"
            aria-label="Reducir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-slate-700 w-11 text-center select-none">
            {zoomLevel}%
          </span>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md disabled:opacity-40 transition-colors"
            title="Aumentar zoom"
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Reset Zoom */}
          <button
            onClick={handleResetZoom}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
            title="Restablecer zoom a 100%"
            aria-label="Restablecer zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Banner de Legibilidad (RQF-002) */}
      {activeEvidencia && !activeEvidencia.esLegible && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2.5 text-amber-900 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-amber-800">
              Advertencia de Legibilidad (RQF-002):
            </span>{' '}
            {activeEvidencia.motivoIlegibilidad ||
              'Esta pieza de evidencia presenta problemas de resolución, iluminación o contraste. Puedes continuar revisando el resto del expediente o solicitar antecedentes al asegurado.'}
          </div>
        </div>
      )}

      {/* 3. Lienzo Principal de Visualización de Documento y Superposición de Bounding Boxes */}
      <div className="relative flex-1 bg-slate-100 overflow-auto min-h-[460px] max-h-[680px] p-4 flex items-start justify-start">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            width: `${DOC_WIDTH}px`,
            minHeight: `${DOC_HEIGHT}px`,
          }}
          className="relative mx-auto flex-none bg-white shadow-xl rounded border border-slate-300 select-none overflow-hidden"
        >
          {/* Fondo del documento: Renderizado de Imagen o Plantilla Documental Mock */}
          {activeEvidencia && !isPdf && !imageError ? (
            <div className="relative w-full h-full min-h-[792px] bg-slate-50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evidenceUrl}
                alt={activeEvidencia.nombreArchivo}
                className="w-full h-auto object-contain max-h-[792px]"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            /* Plantilla gráfica simulada de comprobante / boleta médica para PDF o fallback */
            <div className="w-full h-full min-h-[792px] p-8 text-slate-800 flex flex-col justify-between font-sans relative bg-gradient-to-b from-white via-slate-50/40 to-white">
              {/* Encabezado del documento médico */}
              <div className="border-b-2 border-slate-800 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                      Centro Médico San Cristóbal
                    </h2>
                    <p className="text-xs text-slate-500">
                      RUT: 76.543.210-K • Av. Providencia 1234, Santiago
                    </p>
                    <p className="text-xs text-slate-500">
                      Giro: Prestaciones Médicas y Exámenes Clínicos
                    </p>
                  </div>
                  <div className="text-right border-2 border-slate-800 px-3 py-1.5 rounded">
                    <span className="block text-[10px] font-bold tracking-wider text-slate-600">
                      BOLETA ELECTRÓNICA
                    </span>
                    <span className="text-sm font-black text-red-600">
                      N° {activeEvidencia?.idEvidencia?.slice(0, 8).toUpperCase() || '0048291'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cuerpo del documento */}
              <div className="my-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Paciente Asegurado
                    </span>
                    <span className="font-semibold text-slate-800">
                      Andrea Morales Pino / Rodrigo Fuentes
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Fecha de Atención Médica
                    </span>
                    <span className="font-semibold text-slate-800">
                      15 de Septiembre de 2026
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1">
                    <span>Detalle de Prestación Médica</span>
                    <span>Código Fonasa</span>
                    <span>Total CLP</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>Consulta Médica Especialidad Broncopulmonar</span>
                    <span className="font-mono">01-01-001</span>
                    <span className="font-semibold">$45.000</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>Espirometría Basal y con Broncodilatador</span>
                    <span className="font-mono">04-01-012</span>
                    <span className="font-semibold">$25.000</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Radiografía de Tórax AP y Lateral</span>
                    <span className="font-mono">04-04-001</span>
                    <span className="font-semibold">$22.000</span>
                  </div>
                </div>

                {/* Recuadro de montos */}
                <div className="pt-6 flex justify-end">
                  <div className="w-64 bg-slate-50 p-3 rounded border border-slate-300 space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>$92.000</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Bonificación Isapre / Fonasa:</span>
                      <span>-$47.000</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1 text-sm">
                      <span>Copago Asegurado:</span>
                      <span className="text-sky-700 font-mono">$45.000</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de página con timbre electrónico mock */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 border border-slate-300 rounded flex items-center justify-center font-mono text-[8px] text-slate-400">
                    TIMBRE
                    <br />
                    SII
                  </div>
                  <span>
                    Resolución Exenta N° 80 del SII - Verifique validez en www.sii.cl
                    <br />
                    Hash SHA-256: {activeEvidencia?.idEvidencia || '35db403b284a7b5...'}
                  </span>
                </div>
                <div className="text-right">
                  <span>Página 1 de 1</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Capa SVG/HTML de Superposición de Bounding Boxes (RQF-020) */}
          {showBoundingBoxes && (
            <div
              className={`absolute pointer-events-none ${
                isPdf || imageError
                  ? 'inset-0'
                  : 'left-1/2 top-1/2 aspect-[612/792] w-full -translate-x-1/2 -translate-y-1/2'
              }`}
            >
              {senalesConHallazgo.map((s) => {
                const box = s.ubicacionHallazgo as BoundingBox;
                if (!box) return null;

                const isSelected = selectedSignalId === s.idSenal;
                const isFraud = s.esAlertaFraude;

                // Coordenadas calculadas respecto a DOC_WIDTH y DOC_HEIGHT
                const left = (box.x / DOC_WIDTH) * 100;
                const top = (box.y / DOC_HEIGHT) * 100;
                const width = (box.width / DOC_WIDTH) * 100;
                const height = (box.height / DOC_HEIGHT) * 100;

                return (
                  <div
                    key={s.idSenal}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectSignal) onSelectSignal(s.idSenal);
                    }}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className={`absolute pointer-events-auto cursor-pointer rounded transition-all duration-200 flex flex-col justify-between ${
                      isFraud
                        ? isSelected
                          ? 'border-2 border-red-600 bg-red-600/25 ring-4 ring-red-400 ring-opacity-70 animate-pulse z-30'
                          : 'border-2 border-red-500 bg-red-500/15 hover:bg-red-500/25 hover:border-red-600 z-20'
                        : isSelected
                        ? 'border-2 border-amber-600 bg-amber-500/25 ring-4 ring-amber-400 ring-opacity-70 z-30'
                        : 'border-2 border-amber-500 bg-amber-500/15 hover:bg-amber-500/25 hover:border-amber-600 z-20'
                    }`}
                    title={`${s.tipoSenal}: ${s.descripcion}`}
                  >
                    {/* Etiqueta flotante con el hallazgo */}
                    <div
                      className={`-mt-6 self-start px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight shadow-md flex items-center gap-1 whitespace-nowrap ${
                        isFraud
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isFraud ? (
                        <AlertTriangle className="w-2.5 h-2.5" />
                      ) : (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      )}
                      <span>{isFraud ? 'Alerta Fraude' : s.tipoSenal}</span>
                      <span className="opacity-80 font-normal">({s.puntaje} pts)</span>
                    </div>

                    {/* Resaltado de coordenadas en esquina */}
                    <div className="self-end p-0.5 text-[8px] font-mono text-slate-700 bg-white/80 rounded opacity-0 hover:opacity-100 transition-opacity">
                      {box.x},{box.y} [{box.width}x{box.height}]
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Pie del Visor con Metadatos del Documento Activo */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Archivo:</span>
            <span className="font-mono text-slate-600">{activeEvidencia?.nombreArchivo}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Tipo:</span>
            <span>{activeEvidencia?.tipoArchivo}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Estado:</span>
            {activeEvidencia?.esLegible ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Legible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Ilegible
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-500">
          <span>
            Hallazgos en documento:{' '}
            <strong className="text-slate-700 font-semibold">{senalesConHallazgo.length}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
