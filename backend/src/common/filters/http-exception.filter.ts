import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  // Expresión regular para detectar y enmascarar RUT chileno en cadenas de texto
  private readonly rutRegex = /\b(\d{1,2}(?:\.?\d{3}){2}-?[\dkK])\b/g;

  private maskPII(text: string): string {
    if (!text || typeof text !== 'string') return text;
    // Enmascarar RUTs: 12.345.***-*
    return text.replace(this.rutRegex, (rut) => {
      const clean = rut.replace(/\./g, '').replace(/-/g, '');
      if (clean.length < 8) return rut;
      const cuerpo = clean.slice(0, -1);
      const visible = cuerpo.slice(0, cuerpo.length - 4);
      return `${visible}****-*`;
    });
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocurrió un error interno en el servidor.';
    let errorResponse: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        errorResponse = res;
        message = (res as any).message || exception.message || message;
        if (Array.isArray(message)) {
          message = message.join(', ');
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Error no controlado: ${this.maskPII(exception.message)}`, exception.stack);
    }

    const sanitizedMessage = this.maskPII(message);

    const payload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      mensaje: sanitizedMessage,
      ...(errorResponse && typeof errorResponse === 'object' && errorResponse.error
        ? { error: errorResponse.error }
        : {}),
    };

    response.status(status).json(payload);
  }
}
