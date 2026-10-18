import { Sliders, Shield } from 'lucide-react';

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sliders className="w-7 h-7 text-emerald-600" />
            Configuración de Umbrales y Apetito de Riesgo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Calibración parametrizable de umbral de aprobación automática y mínimos basales con auditoría inmutable (DEC-11).
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">
          Módulo de Calibración de Umbrales
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Permite al Administrador de Riesgo ajustar el umbral de aprobación automática (valor por defecto: 90.0) y mínimos basales (60.0).
        </p>
      </div>
    </div>
  );
}
