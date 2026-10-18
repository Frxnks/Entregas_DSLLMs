import { Inbox, AlertTriangle } from 'lucide-react';

export default function BandejaPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Inbox className="w-7 h-7 text-sky-600" />
            Bandeja de Revisión Asistida
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de siniestros derivados para resolución con control humano y cumplimiento de SLA.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto">
          <Inbox className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">
          Cargando casos derivados de la bandeja...
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Conectando con el servicio de revisión asistida (`ReviewTrayModule`) para listar expedientes con cómputo de SLA hábil y semáforo de urgencia.
        </p>
      </div>
    </div>
  );
}
