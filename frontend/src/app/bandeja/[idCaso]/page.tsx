'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  ShieldAlert,
  AlertTriangle,
  User,
  FileText,
  Lock,
  RefreshCw,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { CaseDetailDto, DecisionResultDto } from '@/types';
import { apiClient } from '@/lib/api-client';
import { VisorEvidencia } from '@/components/VisorEvidencia';
import { DesgloseSenales } from '@/components/DesgloseSenales';
import { PanelResolucion } from '@/components/PanelResolucion';
import { BadgeSLA } from '@/components/BadgeSLA';

// Datos de contingencia local para visualización offline inmediata (< 2s RQNF-008)
const SEED_CASES_MOCK: Record<string, CaseDetailDto> = {
  'CASO-SEED-002': {
    idCaso: 'CASO-SEED-002',
    fechaIngreso: new Date().toISOString(),
    puntajeConfianza: 74.0,
    estadoCaso: 'PENDIENTE_REVISION',
    sugerenciaMIRA: 'APROBAR',
    razonDerivacion:
      'Puntaje global insuficiente (74/100) inferior al umbral de aprobación automática configurado (90 puntos). Prohibición de rechazo automático conforme a DEC-04.',
    causalDerivacion: 'PUNTAJE_INSUFICIENTE',
    fechaVencimientoSLA: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    tiempoRestanteHorasHabiles: 48.0,
    estadoSLA: 'EN_PLAZO',
    rutTitular: '18.234.***-*',
    nombreTitular: 'Rodrigo Fuentes Tapia',
    bloqueadoPor: null,
    operadorBloqueoId: null,
    bloqueoExpiracion: null,
    evidencias: [
      {
        idEvidencia: 'evi-seed-002',
        nombreArchivo: 'bono_desfase_002.pdf',
        tipoArchivo: 'PDF',
        urlAlmacenamiento: '/static/evidence/bono_desfase_002.pdf',
        esLegible: true,
      },
    ],
    senales: [
      {
        idSenal: 'sen-seed-002-1',
        idEvidencia: 'evi-seed-002',
        tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
        moduloOrigen: 'lector_boletas_v1',
        puntaje: 80.0,
        pesoPonderacion: 0.4,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        descripcion: 'Comprobante legible pero con arrugas y contraste deficiente',
        ubicacionHallazgo: { page: 1, x: 24, y: 24, width: 560, height: 80 },
      },
      {
        idSenal: 'sen-seed-002-2',
        idEvidencia: 'evi-seed-002',
        tipoSenal: 'COHERENCIA_FECHAS',
        moduloOrigen: 'analizador_fechas_v1',
        puntaje: 65.0,
        pesoPonderacion: 0.35,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        descripcion: 'Desfase temporal de 45 días entre la consulta médica y la emisión del comprobante',
        ubicacionHallazgo: { page: 1, x: 300, y: 247, width: 280, height: 46 },
      },
      {
        idSenal: 'sen-seed-002-3',
        idEvidencia: 'evi-seed-002',
        tipoSenal: 'CRUCE_FUENTES',
        moduloOrigen: 'cruce_prestadores_v1',
        puntaje: 78.0,
        pesoPonderacion: 0.25,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        descripcion: 'Prestador reconocido pero sin especialidad declarada',
        ubicacionHallazgo: { page: 1, x: 24, y: 343, width: 316, height: 30 },
      },
    ],
  },
  'CASO-SEED-003': {
    idCaso: 'CASO-SEED-003',
    fechaIngreso: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    puntajeConfianza: 75.9,
    estadoCaso: 'PENDIENTE_REVISION',
    sugerenciaMIRA: 'RECHAZAR',
    razonDerivacion:
      'Alerta de fraude activa: alteración digital y manipulación de píxeles detectada en el monto de la boleta médica. Precedencia absoluta de fraude sobre el puntaje (DEC-04 / RQF-023).',
    causalDerivacion: 'FRAUDE',
    fechaVencimientoSLA: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    tiempoRestanteHorasHabiles: 14.0,
    estadoSLA: 'PROXIMO_A_VENCER',
    rutTitular: '14.567.***-*',
    nombreTitular: 'Marcela Castillo Gómez',
    bloqueadoPor: null,
    operadorBloqueoId: null,
    bloqueoExpiracion: null,
    evidencias: [
      {
        idEvidencia: 'evi-seed-003',
        nombreArchivo: 'boleta_manipulada_003.svg',
        tipoArchivo: 'IMAGEN_SVG',
        urlAlmacenamiento: '/static/evidence/boleta_manipulada_003.svg',
        esLegible: true,
      },
    ],
    senales: [
      {
        idSenal: 'sen-seed-003-1',
        idEvidencia: 'evi-seed-003',
        tipoSenal: 'CRUCE_FUENTES',
        moduloOrigen: 'cruce_identidad_v1',
        puntaje: 96.0,
        pesoPonderacion: 0.4,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        descripcion: 'Identidad del asegurado y beneficiario coinciden con la póliza',
        ubicacionHallazgo: { page: 1, x: 52, y: 162, width: 190, height: 23 },
      },
      {
        idSenal: 'sen-seed-003-2',
        idEvidencia: 'evi-seed-003',
        tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
        moduloOrigen: 'metadatos_pdf_v1',
        puntaje: 90.0,
        pesoPonderacion: 0.3,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        descripcion: 'Metadatos estándar de archivo PDF',
        ubicacionHallazgo: { page: 1, x: 414, y: 124, width: 132, height: 54 },
      },
      {
        idSenal: 'sen-seed-003-3',
        idEvidencia: 'evi-seed-003',
        tipoSenal: 'FRAUDE_MANIPULACION',
        moduloOrigen: 'forense_imagen_v1',
        puntaje: 35.0,
        pesoPonderacion: 0.3,
        umbralMinimo: 60.0,
        cumpleMinimo: false,
        esAlertaFraude: true,
        descripcion: 'Manipulación digital de píxeles detectada en el recuadro del monto total (tipografía inconsistente)',
        ubicacionHallazgo: { page: 1, x: 310, y: 520, width: 140, height: 45 },
      },
    ],
  },
};

export default function DetalleCasoPage() {
  const params = useParams();
  const idCasoParam = (params?.idCaso as string) || '';

  const [caso, setCaso] = useState<CaseDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResultDto | null>(null);

  const handleDecisionSuccess = useCallback((result: DecisionResultDto) => {
    setDecisionResult(result);
    setCaso((prev) =>
      prev
        ? {
            ...prev,
            estadoCaso: 'RESUELTO',
            bloqueadoPor: null,
            operadorBloqueoId: null,
            bloqueoExpiracion: null,
          }
        : null
    );
  }, []);

  const cargarCaso = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCaseDetail(idCasoParam);
      setCaso(data);
    } catch (err: any) {
      // Fallback determinista a semilla mock si el backend no está disponible localmente
      if (SEED_CASES_MOCK[idCasoParam]) {
        setCaso(SEED_CASES_MOCK[idCasoParam]);
      } else {
        setError(
          err.message ||
            `No se pudo cargar el caso ${idCasoParam}. Verifica que el backend esté operativo.`
        );
      }
    } finally {
      setLoading(false);
    }
  }, [idCasoParam]);

  useEffect(() => {
    if (idCasoParam) {
      cargarCaso();
    }
  }, [idCasoParam, cargarCaso]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/3" />
        <div className="h-24 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-[600px] bg-slate-200 rounded-xl" />
          <div className="lg:col-span-5 h-[600px] bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !caso) {
    return (
      <div className="space-y-6">
        <Link
          href="/bandeja"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la Bandeja de Revisión
        </Link>

        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-900">
            Error al consultar el expediente del caso
          </h2>
          <p className="text-sm text-red-700 max-w-md mx-auto">
            {error || `El caso ${idCasoParam} no fue encontrado en el sistema.`}
          </p>
          <button
            onClick={cargarCaso}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar Consulta
          </button>
        </div>
      </div>
    );
  }

  const tieneFraude = caso.causalDerivacion === 'FRAUDE' || caso.senales.some((s) => s.esAlertaFraude);
  const esProximoVencer = caso.estadoSLA === 'PROXIMO_A_VENCER';

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Barra de Navegación y Encabezado del Caso */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/bandeja"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Volver a la lista de casos"
            aria-label="Volver a la lista de casos"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {caso.idCaso}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  caso.estadoCaso === 'RESUELTO'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {caso.estadoCaso.replace('_', ' ')}
              </span>
              {tieneFraude && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Alerta Fraude Activa
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Ingreso: {new Date(caso.fechaIngreso).toLocaleString('es-CL')}
            </p>
          </div>
        </div>

        {/* Indicadores de Concurrencia (Lease) y SLA */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bloqueo / Lease */}
          {caso.bloqueadoPor && caso.estadoCaso !== 'RESUELTO' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>En edición por: {caso.bloqueadoPor}</span>
            </div>
          )}

          {/* Semáforo SLA Hábil */}
          {caso.estadoCaso === 'RESUELTO' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Caso Concluido</span>
            </div>
          ) : (
            <BadgeSLA
              horasRestantes={caso.tiempoRestanteHorasHabiles}
              estadoSLA={caso.estadoSLA}
              modo="completo"
              tamano="md"
            />
          )}
        </div>
      </div>

      {/* Banner de Confirmación de Resolución Atómica (US2 - T020) */}
      {decisionResult && (
        <div
          className={`rounded-xl border p-4 text-xs space-y-1.5 shadow-sm animate-fadeIn ${
            decisionResult.marcaDiscrepancia
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2
              className={`w-5 h-5 flex-shrink-0 ${
                decisionResult.marcaDiscrepancia ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
            <span>
              {decisionResult.marcaDiscrepancia
                ? 'Resolución Registrada con Éxito (Discrepancia Auditada)'
                : 'Resolución Registrada Exitosamente'}
            </span>
          </div>
          <p className="leading-relaxed">
            Se ha emitido y sellado la resolución{' '}
            <strong className="underline uppercase font-bold">
              {decisionResult.tipoDecision}
            </strong>{' '}
            para el caso <strong>{decisionResult.idCaso}</strong>.
            {decisionResult.marcaDiscrepancia
              ? ` Debido a que la decisión difiere de la recomendación de MIRA (${caso.sugerenciaMIRA}), el caso fue marcado automáticamente con marcaDiscrepancia = true en la base de auditoría inalterable.`
              : ' El expediente ha transicionado a estado RESUELTO de manera append-only inalterable.'}
          </p>
        </div>
      )}

      {/* 2. Barra Informativa del Titular Protegido (DEC-06, RQNF-003) */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500 font-medium">Titular del Seguro:</span>
            <span className="font-bold text-slate-800">{caso.nombreTitular || 'No informado'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">RUT:</span>
            <span className="font-mono font-semibold text-slate-800">
              {caso.rutTitular || 'No informado'}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          Protección de Privacidad de Datos (DEC-06 / Ley 19.628)
        </div>
      </div>

      {/* 3. Pantalla Consolidada: Visor de Evidencias, Desglose de Señales y Panel de Resolución */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Visor Interactivo con Bounding Boxes (7 cols en lg) */}
        <div className="lg:col-span-7 space-y-4">
          <VisorEvidencia
            evidencias={caso.evidencias}
            senales={caso.senales}
            selectedSignalId={selectedSignalId}
            onSelectSignal={(id) => setSelectedSignalId(id)}
          />
        </div>

        {/* Columna Derecha: Desglose de Señales y Panel de Resolución */}
        <div className="lg:col-span-5 space-y-4">
          <DesgloseSenales
            puntajeConfianza={caso.puntajeConfianza}
            sugerenciaMIRA={caso.sugerenciaMIRA}
            razonDerivacion={caso.razonDerivacion}
            causalDerivacion={caso.causalDerivacion}
            senales={caso.senales}
            evidencias={caso.evidencias}
            selectedSignalId={selectedSignalId}
            onSelectSignal={(id) => setSelectedSignalId(id)}
          />

          <PanelResolucion
            idCaso={caso.idCaso}
            sugerenciaMIRA={caso.sugerenciaMIRA}
            estadoCaso={caso.estadoCaso}
            onDecisionSuccess={handleDecisionSuccess}
          />
        </div>
      </div>
    </div>
  );
}
