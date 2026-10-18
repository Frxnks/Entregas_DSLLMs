import { ChileanCalendarUtil } from '../src/common/utils/chilean-calendar.util';

describe('ChileanCalendarUtil', () => {
  describe('esDiaHabil', () => {
    it('debe retornar false para sábados y domingos', () => {
      // 2026-10-17 es sábado, 2026-10-18 es domingo
      const sabado = new Date('2026-10-17T12:00:00Z');
      const domingo = new Date('2026-10-18T12:00:00Z');
      expect(ChileanCalendarUtil.esDiaHabil(sabado)).toBe(false);
      expect(ChileanCalendarUtil.esDiaHabil(domingo)).toBe(false);
    });

    it('debe retornar false para feriados oficiales de Chile', () => {
      // 1 de enero, 18 de septiembre, 25 de diciembre
      const anoNuevo = new Date('2026-01-01T12:00:00Z');
      const fiestasPatrias = new Date('2026-09-18T12:00:00Z');
      const navidad = new Date('2026-12-25T12:00:00Z');
      expect(ChileanCalendarUtil.esDiaHabil(anoNuevo)).toBe(false);
      expect(ChileanCalendarUtil.esDiaHabil(fiestasPatrias)).toBe(false);
      expect(ChileanCalendarUtil.esDiaHabil(navidad)).toBe(false);
    });

    it('debe retornar true para un día de semana ordinario laborable', () => {
      // 2026-10-19 es lunes ordinario no feriado
      const lunes = new Date('2026-10-19T12:00:00Z');
      expect(ChileanCalendarUtil.esDiaHabil(lunes)).toBe(true);
    });
  });

  describe('agregarDiasHabiles', () => {
    it('debe sumar 3 días hábiles saltando fin de semana', () => {
      // Si parte un jueves (2026-10-15), 1: viernes (16), 2: lunes (19), 3: martes (20)
      const jueves = new Date('2026-10-15T10:00:00Z');
      const vencimiento = ChileanCalendarUtil.agregarDiasHabiles(jueves, 3);
      expect(vencimiento.toISOString().split('T')[0]).toBe('2026-10-20');
    });
  });

  describe('determinarEstadoSLA', () => {
    it('debe clasificar como EN_PLAZO si quedan más de 24 horas hábiles', () => {
      expect(ChileanCalendarUtil.determinarEstadoSLA(30)).toBe('EN_PLAZO');
    });

    it('debe clasificar como PROXIMO_A_VENCER si quedan 24 horas hábiles o menos', () => {
      expect(ChileanCalendarUtil.determinarEstadoSLA(24)).toBe('PROXIMO_A_VENCER');
      expect(ChileanCalendarUtil.determinarEstadoSLA(14)).toBe('PROXIMO_A_VENCER');
      expect(ChileanCalendarUtil.determinarEstadoSLA(1)).toBe('PROXIMO_A_VENCER');
    });

    it('debe clasificar como VENCIDO_ESCALADO si quedan 0 o menos horas', () => {
      expect(ChileanCalendarUtil.determinarEstadoSLA(0)).toBe('VENCIDO_ESCALADO');
      expect(ChileanCalendarUtil.determinarEstadoSLA(-5)).toBe('VENCIDO_ESCALADO');
    });
  });
});
