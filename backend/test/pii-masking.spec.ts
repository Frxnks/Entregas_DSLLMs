import { PiiMaskingService } from '../src/common/services/pii-masking.service';

describe('PiiMaskingService', () => {
  let service: PiiMaskingService;

  beforeEach(() => {
    service = new PiiMaskingService();
  });

  describe('enmascararRut', () => {
    it('debe enmascarar un RUT con puntos y guion', () => {
      const rut = '12.345.678-9';
      const enmascarado = service.enmascararRut(rut);
      expect(enmascarado).toBe('12.345.***-*');
    });

    it('debe enmascarar un RUT sin puntos pero con guion', () => {
      const rut = '18234567-8';
      const enmascarado = service.enmascararRut(rut);
      expect(enmascarado).toBe('18.234.***-*');
    });

    it('debe preservar un RUT que ya está enmascarado', () => {
      expect(service.enmascararRut('18.234.***-*')).toBe('18.234.***-*');
    });

    it('debe retornar cadena vacía si el RUT es nulo o indefinido', () => {
      expect(service.enmascararRut(null)).toBe('');
      expect(service.enmascararRut(undefined)).toBe('');
    });
  });

  describe('enmascararNombre', () => {
    it('debe ocultar los caracteres de cada apellido y nombre excepto la inicial', () => {
      const nombre = 'Rodrigo Fuentes Tapia';
      const enmascarado = service.enmascararNombre(nombre);
      expect(enmascarado).toBe('R*** F*** T***');
    });
  });

  describe('generarHashSha256', () => {
    it('debe generar un hash determinista SHA-256 de 64 caracteres en hexadecimal', () => {
      const hash1 = service.generarHashSha256('18234567-8');
      const hash2 = service.generarHashSha256('18234567-8');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  describe('sanitizarObjeto', () => {
    it('debe sanitizar los campos rutTitular y nombreTitular sin alterar otros atributos', () => {
      const caso = {
        idCaso: 'CASO-001',
        rutTitular: '18.234.567-8',
        nombreTitular: 'Rodrigo Fuentes Tapia',
        puntaje: 74,
      };

      const sanitizado = service.sanitizarObjeto(caso);
      expect(sanitizado.idCaso).toBe('CASO-001');
      expect(sanitizado.rutTitular).toBe('18.234.***-*');
      expect(sanitizado.nombreTitular).toBe('R*** F*** T***');
      expect(sanitizado.puntaje).toBe(74);
    });
  });
});
