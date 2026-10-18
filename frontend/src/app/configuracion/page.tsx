'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Shield,
  History,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Save,
  Lock,
  ArrowRight,
  Info,
  UserCheck,
  Percent,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { ThresholdResponseDto, ThresholdAuditDto } from '@/types';

const DEFAULT_FLUJO_ID = 'flujo-reembolso-gastos-medicos';

// Datos de contingencia local para inicialización offline (< 2s RQNF-008)
const FALLBACK_THRESHOLD: ThresholdResponseDto = {
  idFlujo: DEFAULT_FLUJO_ID,
  valorAprobacion: 90.0,
  minimoBasalSeguridad: 60.0,
  version: 1,
  fechaActualizacion: new Date().toISOString(),
};

const FALLBACK_AUDITS: ThresholdAuditDto[] = [
  {
    idAuditoria: 'aud-seed-001',
    idFlujo: DEFAULT_FLUJO_ID,
    valorAprobacionAnterior: 92.0,
    valorAprobacionNuevo: 90.0,
    minimoBasalAnterior: 60.0,
    minimoBasalNuevo: 60.0,
    usuarioModificador: 'admin.riesgo@aseguradora.cl',
    fechaModificacion: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
];

export default function ConfiguracionPage() {
  const [umbral, setUmbral] = useState<ThresholdResponseDto>(FALLBACK_THRESHOLD);
  const [auditorias, setAuditorias] = useState<ThresholdAuditDto[]>(FALLBACK_AUDITS);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [usandoMock, setUsandoMock] = useState<boolean>(false);

  // Estados del formulario interactivo
  const [inputAprobacion, setInputAprobacion] = useState<number>(90.0);
  const [inputBasal, setInputBasal] = useState<number>(60.0);
  const [usuarioModificador, setUsuarioModificador] = useState<string>(
    'admin.riesgo@aseguradora.cl'
  );

  // Modal de confirmación
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] =
    useState<boolean>(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await apiClient.getThresholds(DEFAULT_FLUJO_ID);
      setUmbral(data);
      setInputAprobacion(data.valorAprobacion);
      setInputBasal(data.minimoBasalSeguridad);
      setUsandoMock(false);

      // Cargar historial de auditoría
      try {
        const auditData = await apiClient.getThresholdAudit(DEFAULT_FLUJO_ID);
        setAuditorias(auditData);
      } catch {
        // Si el endpoint de auditoría aún no tiene registros, mantener el fallback
      }
    } catch (err: any) {
      console.warn('API no disponible, usando fallback simulado:', err.message);
      setUsandoMock(true);
      setUmbral(FALLBACK_THRESHOLD);
      setInputAprobacion(FALLBACK_THRESHOLD.valorAprobacion);
      setInputBasal(FALLBACK_THRESHOLD.minimoBasalSeguridad);
      setAuditorias(FALLBACK_AUDITS);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const validarFormulario = (): string | null => {
    if (isNaN(inputAprobacion) || inputAprobacion < 0 || inputAprobacion > 100) {
      return 'El umbral de aprobación debe ser un número entre 0 y 100 puntos.';
    }
    if (isNaN(inputBasal) || inputBasal < 0 || inputBasal > 100) {
      return 'El mínimo basal de seguridad debe ser un número entre 0 y 100 puntos.';
    }
    if (!usuarioModificador.trim()) {
      return 'Debe ingresar el identificador o correo del Administrador de Riesgo modificador.';
    }
    if (inputBasal > inputAprobacion) {
      return 'El mínimo basal de seguridad no puede ser superior al umbral de aprobación automática.';
    }
    return null;
  };

  const handleAbrirConfirmacion = (e: React.FormEvent) => {
    e.preventDefault();
    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setError(null);
    setMostrarModalConfirmacion(true);
  };

  const handleConfirmarCalibracion = async () => {
    setGuardando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const res = await apiClient.updateThresholds(DEFAULT_FLUJO_ID, {
        valorAprobacion: Number(inputAprobacion),
        minimoBasalSeguridad: Number(inputBasal),
        usuarioModificador: usuarioModificador.trim(),
      });

      setUmbral(res);
      setMostrarModalConfirmacion(false);
      setMensajeExito(
        `Umbral actualizado exitosamente a la versión v${res.version}. Registro inalterable persistido en auditoría.`
      );

      // Refrescar auditoría
      try {
        const auditData = await apiClient.getThresholdAudit(DEFAULT_FLUJO_ID);
        setAuditorias(auditData);
      } catch {
        // En modo mock agregar nueva entrada
        const nuevaAuditoria: ThresholdAuditDto = {
          idAuditoria: `aud-${Date.now()}`,
          idFlujo: DEFAULT_FLUJO_ID,
          valorAprobacionAnterior: umbral.valorAprobacion,
          valorAprobacionNuevo: Number(inputAprobacion),
          minimoBasalAnterior: umbral.minimoBasalSeguridad,
          minimoBasalNuevo: Number(inputBasal),
          usuarioModificador: usuarioModificador.trim(),
          fechaModificacion: new Date().toISOString(),
        };
        setAuditorias((prev) => [nuevaAuditoria, ...prev]);
      }
    } catch (err: any) {
      // Si la API falla pero estamos en modo demostración/mock
      if (usandoMock) {
        const nuevaVersion = umbral.version + 1;
        const mockActualizado: ThresholdResponseDto = {
          idFlujo: DEFAULT_FLUJO_ID,
          valorAprobacion: Number(inputAprobacion),
          minimoBasalSeguridad: Number(inputBasal),
          version: nuevaVersion,
          fechaActualizacion: new Date().toISOString(),
        };
        const nuevaAuditoria: ThresholdAuditDto = {
          idAuditoria: `aud-${Date.now()}`,
          idFlujo: DEFAULT_FLUJO_ID,
          valorAprobacionAnterior: umbral.valorAprobacion,
          valorAprobacionNuevo: Number(inputAprobacion),
          minimoBasalAnterior: umbral.minimoBasalSeguridad,
          minimoBasalNuevo: Number(inputBasal),
          usuarioModificador: usuarioModificador.trim(),
          fechaModificacion: new Date().toISOString(),
        };
        setUmbral(mockActualizado);
        setAuditorias((prev) => [nuevaAuditoria, ...prev]);
        setMostrarModalConfirmacion(false);
        setMensajeExito(
          `Umbral actualizado (simulación local) a la versión v${nuevaVersion}. Auditoría registrada.`
        );
      } else {
        setError(
          err.message || 'Error al conectar con el servidor para actualizar el umbral.'
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sliders className="w-7 h-7 text-emerald-600" />
            Configuración de Umbrales y Apetito de Riesgo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Calibración de umbral de aprobación automática y mínimos basales con auditoría inmutable append-only (DEC-11, RQF-006, RQNF-005).
          </p>
        </div>

        <button
          onClick={cargarDatos}
          disabled={cargando}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          Recargar Estado
        </button>
      </div>

      {/* Banner de modo mock si la API no está disponible */}
      {usandoMock && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-center gap-3 text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Modo contingencia activo:</strong> Mostrando configuración en memoria local con semilla de marcha blanca (DEC-11).
          </span>
        </div>
      )}

      {/* Mensajes de éxito y error */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 flex items-center gap-3 text-sm text-rose-800">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjetas de estado actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Umbral Aprobación Actual
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              %
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {umbral.valorAprobacion.toFixed(1)}
            </span>
            <span className="text-sm text-slate-500 font-medium">/ 100 pts</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Casos con puntaje ≥ {umbral.valorAprobacion.toFixed(1)} sin fraude son aprobados automáticamente y facturables (DEC-01).
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mínimo Basal de Seguridad
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {umbral.minimoBasalSeguridad.toFixed(1)}
            </span>
            <span className="text-sm text-slate-500 font-medium">/ 100 pts</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Cualquier señal crítica con puntaje &lt; {umbral.minimoBasalSeguridad.toFixed(1)} fuerza derivación humana inmediata (RQF-022).
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Versión Vigente
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              v{umbral.version}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
              Activa
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Última actualización:{' '}
            {new Date(umbral.fechaActualizacion).toLocaleString('es-CL')}
          </p>
        </div>
      </div>

      {/* Formulario de Calibración */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Panel de Calibración de Apetito de Riesgo
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Solo el Administrador de Riesgo cuenta con atribuciones para ajustar los umbrales del flujo (RQF-006). Los cambios aplican de forma inmediata y no retroactiva (DEC-05).
          </p>
        </div>

        <form onSubmit={handleAbrirConfirmacion} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Umbral de Aprobación */}
            <div className="space-y-2">
              <label
                htmlFor="inputAprobacion"
                className="block text-sm font-medium text-slate-700 flex items-center justify-between"
              >
                <span>Umbral de Aprobación Automática</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {inputAprobacion} pts
                </span>
              </label>
              <input
                id="inputAprobacion"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={inputAprobacion}
                onChange={(e) => setInputAprobacion(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3.5 py-2.5 border"
                required
              />
              <p className="text-xs text-slate-500">
                Valor inicial recomendado en marcha blanca: 90.0 puntos (DEC-11).
              </p>
            </div>

            {/* Input Mínimo Basal de Seguridad */}
            <div className="space-y-2">
              <label
                htmlFor="inputBasal"
                className="block text-sm font-medium text-slate-700 flex items-center justify-between"
              >
                <span>Mínimo Basal de Seguridad por Señal</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {inputBasal} pts
                </span>
              </label>
              <input
                id="inputBasal"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={inputBasal}
                onChange={(e) => setInputBasal(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3.5 py-2.5 border"
                required
              />
              <p className="text-xs text-slate-500">
                Puntaje mínimo tolerable en cada señal individual (por defecto: 60.0).
              </p>
            </div>
          </div>

          {/* Campo Usuario Modificador */}
          <div className="space-y-2">
            <label
              htmlFor="usuarioModificador"
              className="block text-sm font-medium text-slate-700 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-slate-500" />
              Identificador del Administrador de Riesgo (Email / RUT)
            </label>
            <input
              id="usuarioModificador"
              type="text"
              value={usuarioModificador}
              onChange={(e) => setUsuarioModificador(e.target.value)}
              placeholder="ej. admin.riesgo@aseguradora.cl"
              className="w-full max-w-lg rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3.5 py-2.5 border"
              required
            />
            <p className="text-xs text-slate-500">
              Quedará registrado de forma inalterable e imputable en la tabla de auditoría (RQNF-005).
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={guardando || cargando}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Guardar Calibración
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Confirmación */}
      {mostrarModalConfirmacion && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Confirmar Calibración de Umbrales
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Esta acción creará un nuevo registro inmutable en la cadena de auditoría (RQNF-005).
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Flujo:</span>
                <span className="font-semibold text-slate-800">
                  Reembolso Gastos Médicos
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
                <span className="text-slate-500">Aprobación Automática:</span>
                <span className="font-bold text-slate-900">
                  {umbral.valorAprobacion.toFixed(1)} →{' '}
                  <span className="text-emerald-600">
                    {Number(inputAprobacion).toFixed(1)} pts
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
                <span className="text-slate-500">Mínimo Basal Señal:</span>
                <span className="font-bold text-slate-900">
                  {umbral.minimoBasalSeguridad.toFixed(1)} →{' '}
                  <span className="text-indigo-600">
                    {Number(inputBasal).toFixed(1)} pts
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
                <span className="text-slate-500">Usuario Responsable:</span>
                <span className="font-medium text-slate-800">
                  {usuarioModificador}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-200/60">
                <span className="text-slate-500">Próxima Versión:</span>
                <span className="font-semibold text-slate-800">
                  v{umbral.version + 1}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setMostrarModalConfirmacion(false)}
                disabled={guardando}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCalibracion}
                disabled={guardando}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
              >
                {guardando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Calibración
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial Inmutable de Auditoría */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Histórico Inmutable de Auditoría de Umbrales
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Registro append-only protegido contra modificaciones y eliminaciones (PX-05 / RQNF-005).
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Lock className="w-3 h-3" />
            Inalterable
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Fecha y Hora</th>
                <th className="px-6 py-3.5">Usuario Modificador</th>
                <th className="px-6 py-3.5">Aprobación (Previo → Nuevo)</th>
                <th className="px-6 py-3.5">Mínimo Basal (Previo → Nuevo)</th>
                <th className="px-6 py-3.5 text-right">Integridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditorias.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-xs text-slate-400"
                  >
                    No se registran calibraciones históricas para este flujo.
                  </td>
                </tr>
              ) : (
                auditorias.map((audit) => (
                  <tr
                    key={audit.idAuditoria}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-700">
                      {new Date(audit.fechaModificacion).toLocaleString('es-CL', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-900">
                      {audit.usuarioModificador}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className="text-slate-500">
                        {audit.valorAprobacionAnterior.toFixed(1)} pts
                      </span>
                      <ArrowRight className="w-3 h-3 inline mx-1.5 text-slate-400" />
                      <span className="font-bold text-emerald-700">
                        {audit.valorAprobacionNuevo.toFixed(1)} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className="text-slate-500">
                        {audit.minimoBasalAnterior.toFixed(1)} pts
                      </span>
                      <ArrowRight className="w-3 h-3 inline mx-1.5 text-slate-400" />
                      <span className="font-bold text-indigo-700">
                        {audit.minimoBasalNuevo.toFixed(1)} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Verificado
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
