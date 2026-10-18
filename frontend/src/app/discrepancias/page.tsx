import { FileText, AlertCircle } from 'lucide-react';

export default function DiscrepanciasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-amber-600" />
            Auditoría de Decisiones con Discrepancia
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Histórico inalterable de resoluciones humanas que difirieron de la sugerencia algorítmica de MIRA (CU-02, RQF-011).
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">
          Supervisión de Modelos y Reentrenamiento
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Acceso para el equipo de modelos de IA con el registro consolidado de casos donde el criterio del liquidador sobreseyó la recomendación algorítmica.
        </p>
      </div>
    </div>
  );
}
