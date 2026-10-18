import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PiiMaskingService {
  /**
   * Enmascara un RUT chileno en formato estándar para visualización segura:
   * Ejemplo: 12.345.678-9 -> 12.345.***-*
   * Ejemplo: 12345678-9 -> 12.345.***-*
   */
  public enmascararRut(rut: string | null | undefined): string {
    if (!rut || typeof rut !== 'string') return '';
    if (/^\d{1,2}(?:\.\d{3})+\.\*\*\*-\*$/.test(rut)) return rut;
    const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length < 8) return '***';

    const cuerpo = limpio.slice(0, -1);

    // Formatear cuerpo con puntos
    const parteVisible = cuerpo.slice(0, cuerpo.length - 3);
    let cuerpoFormateado = '';
    let count = 0;
    for (let i = parteVisible.length - 1; i >= 0; i--) {
      cuerpoFormateado = parteVisible[i] + cuerpoFormateado;
      count++;
      if (count === 3 && i > 0) {
        cuerpoFormateado = '.' + cuerpoFormateado;
        count = 0;
      }
    }

    return `${cuerpoFormateado}.***-*`;
  }

  /**
   * Enmascara nombres de personas preservando la primera letra de cada término.
   * Ejemplo: "Juan Carlos Pérez Soto" -> "J*** C*** P*** S***"
   */
  public enmascararNombre(nombre: string | null | undefined): string {
    if (!nombre || typeof nombre !== 'string') return '';
    const palabras = nombre.trim().split(/\s+/);
    return palabras
      .map((palabra) => {
        if (palabra.length <= 1) return palabra;
        return palabra[0].toUpperCase() + '***';
      })
      .join(' ');
  }

  /**
   * Genera el Hash SHA-256 criptográfico de integridad y disociación (DEC-05).
   */
  public generarHashSha256(valor: string): string {
    if (!valor) return '';
    return crypto.createHash('sha256').update(valor.trim().toLowerCase()).digest('hex');
  }

  /**
   * Sanitiza un objeto o DTO para registros públicos o logs previniendo fugas de PII.
   */
  public sanitizarObjeto<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    const clon: Record<string, any> = { ...obj };

    if ('rutTitular' in clon && clon.rutTitular) {
      clon.rutTitular = this.enmascararRut(clon.rutTitular);
    }
    if ('nombreTitular' in clon && clon.nombreTitular) {
      clon.nombreTitular = this.enmascararNombre(clon.nombreTitular);
    }
    if ('rut' in clon && clon.rut) {
      clon.rut = this.enmascararRut(clon.rut);
    }

    return clon as T;
  }
}
