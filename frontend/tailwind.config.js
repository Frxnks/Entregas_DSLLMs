/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mira: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#0f172a',
        },
        // Colores de Semáforo para Gestión de SLA y Urgencia
        sla: {
          verde: {
            DEFAULT: '#16a34a',
            bg: '#f0fdf4',
            border: '#86efac',
            text: '#15803d',
            dot: '#22c55e',
          },
          ambar: {
            DEFAULT: '#d97706',
            bg: '#fffbeb',
            border: '#fde68a',
            text: '#b45309',
            dot: '#f59e0b',
          },
          rojo: {
            DEFAULT: '#dc2626',
            bg: '#fef2f2',
            border: '#fecaca',
            text: '#b91c1c',
            dot: '#ef4444',
          },
          gris: {
            DEFAULT: '#64748b',
            bg: '#f8fafc',
            border: '#cbd5e1',
            text: '#475569',
            dot: '#94a3b8',
          },
        },
      },
    },
  },
  plugins: [],
};
