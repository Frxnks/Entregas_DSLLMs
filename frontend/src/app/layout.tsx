import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Inbox, Sliders, FileText, UserCheck } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'MIRA - Plataforma de Liquidación Asistida',
  description:
    'Sistema inteligente de liquidación asistida de siniestros de salud con control humano estricto y auditoría inalterable.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full bg-slate-50">
      <body className="h-full flex flex-col font-sans antialiased text-slate-900 bg-slate-50">
        {/* Barra Superior Principal de Navegación */}
        <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logotipo y Título de Plataforma */}
              <div className="flex items-center space-x-3">
                <Link
                  href="/bandeja"
                  className="flex items-center space-x-3 group focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg p-1"
                >
                  <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-inner group-hover:bg-sky-500 transition-colors">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold tracking-tight text-white">
                        MIRA
                      </span>
                      <span className="text-xs bg-sky-950 text-sky-300 font-semibold px-2 py-0.5 rounded border border-sky-800">
                        v2.0
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium hidden sm:block">
                      Liquidación Asistida con Control Humano
                    </p>
                  </div>
                </Link>
              </div>

              {/* Menú de Navegación Central */}
              <nav className="flex items-center space-x-1 sm:space-x-2">
                <Link
                  href="/bandeja"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Inbox className="w-4 h-4 text-sky-400" />
                  <span>Bandeja de Revisión</span>
                </Link>

                <Link
                  href="/configuracion"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Configuración de Umbrales</span>
                </Link>

                <Link
                  href="/discrepancias"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Auditoría Discrepancias</span>
                </Link>
              </nav>

              {/* Estado de Operador y Conexión */}
              <div className="flex items-center space-x-4">
                <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-medium">Red Local (Chile)</span>
                </div>

                <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                  <UserCheck className="w-4 h-4 text-sky-400" />
                  <div className="text-left text-xs">
                    <p className="font-semibold text-slate-200">Operador Activo</p>
                    <p className="text-slate-400">Liquidador Humano</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cintillo de Garantía Constitucional */}
          <div className="bg-sky-950/60 border-t border-sky-900/50 px-4 py-1.5 text-center text-xs text-sky-200">
            <span className="font-semibold text-sky-400">Principio Constitucional II (DEC-04):</span>{' '}
            Prohibición estricta de rechazo 100% automático. Todo siniestro con discrepancias es evaluado por un liquidador humano.
          </div>
        </header>

        {/* Contenedor Principal de Vistas */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Pie de Página Institucional */}
        <footer className="bg-white border-t border-slate-200 text-xs text-slate-500 py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p>
              © 2026 Plataforma MIRA. Todos los derechos reservados. Soberanía territorial de datos (DEC-06).
            </p>
            <p className="font-medium text-slate-600">
              Rastro de Auditoría Inalterable (DEC-05 / RQNF-005)
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
