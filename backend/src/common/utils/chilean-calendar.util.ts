/**
 * Utilitario de jornada hábil en Chile y cálculo de SLA (RQF-021, ENT4)
 * Jornada laboral oficial: Lunes a Viernes de 08:30 a 18:30 hrs (10 horas hábiles diarias).
 * Excluye fines de semana y feriados legales en Chile.
 */

export class ChileanCalendarUtil {
  // Lista de feriados oficiales de Chile (años 2024, 2025, 2026 y 2027)
  private static readonly FERIADOS_CHILE: Set<string> = new Set([
    // 2024
    '2024-01-01',
    '2024-03-29',
    '2024-03-30',
    '2024-05-01',
    '2024-05-21',
    '2024-06-20',
    '2024-06-29',
    '2024-07-16',
    '2024-08-15',
    '2024-09-18',
    '2024-09-19',
    '2024-09-20',
    '2024-10-12',
    '2024-10-27',
    '2024-10-31',
    '2024-11-01',
    '2024-12-08',
    '2024-12-25',
    // 2025
    '2025-01-01',
    '2025-04-18',
    '2025-04-19',
    '2025-05-01',
    '2025-05-21',
    '2025-06-20',
    '2025-06-29',
    '2025-07-16',
    '2025-08-15',
    '2025-09-18',
    '2025-09-19',
    '2025-10-12',
    '2025-10-31',
    '2025-11-01',
    '2025-12-08',
    '2025-12-25',
    // 2026
    '2026-01-01',
    '2026-04-03',
    '2026-04-04',
    '2026-05-01',
    '2026-05-21',
    '2026-06-21',
    '2026-06-29',
    '2026-07-16',
    '2026-08-15',
    '2026-09-18',
    '2026-09-19',
    '2026-10-12',
    '2026-10-31',
    '2026-11-01',
    '2026-12-08',
    '2026-12-25',
    // 2027
    '2027-01-01',
    '2027-03-26',
    '2027-03-27',
    '2027-05-01',
    '2027-05-21',
    '2027-06-21',
    '2027-06-29',
    '2027-07-16',
    '2027-08-15',
    '2027-09-18',
    '2027-09-19',
    '2027-10-12',
    '2027-10-31',
    '2027-11-01',
    '2027-12-08',
    '2027-12-25',
  ]);

  public static readonly HORA_INICIO_JORNADA = 8.5; // 08:30 hrs
  public static readonly HORA_FIN_JORNADA = 18.5; // 18:30 hrs
  public static readonly HORAS_POR_DIA_HABIL = 10.0; // 18:30 - 08:30 = 10 horas

  /**
   * Determina si una fecha corresponde a un día hábil en Chile.
   */
  public static esDiaHabil(fecha: Date): boolean {
    const diaSemana = fecha.getDay();
    if (diaSemana === 0 || diaSemana === 6) {
      return false; // Domingo o Sábado
    }
    const fechaIso = fecha.toISOString().split('T')[0];
    return !this.FERIADOS_CHILE.has(fechaIso);
  }

  /**
   * Agrega un número de días hábiles completos a una fecha dada.
   * Por defecto, computa el plazo perentorio de 3 días hábiles (RQF-021).
   */
  public static agregarDiasHabiles(fechaInicio: Date, diasHabiles: number = 3): Date {
    const fecha = new Date(fechaInicio.getTime());
    let diasAgregados = 0;

    while (diasAgregados < diasHabiles) {
      fecha.setDate(fecha.getDate() + 1);
      if (this.esDiaHabil(fecha)) {
        diasAgregados++;
      }
    }
    return fecha;
  }

  /**
   * Calcula el número de horas hábiles restantes entre la fecha actual y la fecha de vencimiento.
   */
  public static calcularHorasHabilesRestantes(desde: Date = new Date(), hasta: Date): number {
    if (desde >= hasta) {
      return 0;
    }

    let horasTotales = 0;
    const cursor = new Date(desde.getTime());

    // Si el inicio es en el mismo día
    while (cursor < hasta) {
      if (this.esDiaHabil(cursor)) {
        const horaDecimal = cursor.getHours() + cursor.getMinutes() / 60;
        const inicioVentana = Math.max(horaDecimal, this.HORA_INICIO_JORNADA);

        // Verificar si hasta es hoy
        const esMismoDia = cursor.toDateString() === hasta.toDateString();
        const finHoy = esMismoDia
          ? Math.min(hasta.getHours() + hasta.getMinutes() / 60, this.HORA_FIN_JORNADA)
          : this.HORA_FIN_JORNADA;

        if (finHoy > inicioVentana && inicioVentana < this.HORA_FIN_JORNADA) {
          horasTotales += Math.max(0, finHoy - inicioVentana);
        }
      }

      // Avanzar al siguiente día a las 08:30
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(8, 30, 0, 0);
    }

    return Math.round(horasTotales * 10) / 10;
  }

  /**
   * Determina el estado del semáforo visual según las horas hábiles restantes (RQF-021).
   */
  public static determinarEstadoSLA(
    horasRestantes: number,
  ): 'EN_PLAZO' | 'PROXIMO_A_VENCER' | 'VENCIDO_ESCALADO' {
    if (horasRestantes <= 0) {
      return 'VENCIDO_ESCALADO';
    }
    if (horasRestantes <= 24) {
      return 'PROXIMO_A_VENCER';
    }
    return 'EN_PLAZO';
  }
}
