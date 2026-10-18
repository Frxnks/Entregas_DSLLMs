import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScoringEngineService } from '../src/scoring/scoring-engine.service';
import { ScoringController } from '../src/scoring/scoring.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { InputSenalDto, EvaluateCaseRequestDto } from '../src/scoring/dto/evaluate-case.dto';
import { EstadoDecision, SugerenciaMIRA, CausalDerivacion } from '@prisma/client';
import { DecisionRulesService } from '../src/scoring/decision-rules.service';

describe('ScoringEngineService (User Story 1 - Cálculo de Puntaje y Desglose Explicable)', () => {
  let service: ScoringEngineService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      caso: {
        findUnique: jest.fn(),
      },
      flujo: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringEngineService,
        DecisionRulesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ScoringEngineService>(ScoringEngineService);
  });

  describe('Cálculo ponderado de puntaje de confianza (0-100)', () => {
    it('debe calcular el puntaje ponderado normalizado exacto para el Caso 1 (CASO-SEED-001 -> 94.0)', () => {
      // 95*0.40 + 92*0.35 + 95*0.25 = 38.0 + 32.2 + 23.75 = 93.95 => 94.0
      const senales: InputSenalDto[] = [
        {
          tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
          moduloOrigen: 'lector_boletas_v1',
          puntaje: 95.0,
          pesoPonderacion: 0.40,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Estructura íntegra',
        },
        {
          tipoSenal: 'CONSISTENCIA_MONTOS',
          moduloOrigen: 'validador_montos_v1',
          puntaje: 92.0,
          pesoPonderacion: 0.35,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Suma de ítems coincide',
        },
        {
          tipoSenal: 'CRUCE_FUENTES',
          moduloOrigen: 'cruce_prestadores_v1',
          puntaje: 95.0,
          pesoPonderacion: 0.25,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'RUT médico coincide',
        },
      ];

      const puntaje = service.calcularPuntajePonderado(senales);
      expect(puntaje).toBe(94.0);
    });

    it('debe calcular el puntaje ponderado normalizado exacto para el Caso 2 (CASO-SEED-002 -> 74.0)', () => {
      // 80*0.40 + 70*0.35 + 70*0.25 = 32.0 + 24.5 + 17.5 = 74.0
      const senales: InputSenalDto[] = [
        {
          tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
          moduloOrigen: 'lector_boletas_v1',
          puntaje: 80.0,
          pesoPonderacion: 0.40,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Firma y timbre legibles pero con desfase de emisión',
        },
        {
          tipoSenal: 'CONSISTENCIA_MONTOS',
          moduloOrigen: 'validador_montos_v1',
          puntaje: 70.0,
          pesoPonderacion: 0.35,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Desglose parcial',
        },
        {
          tipoSenal: 'CRUCE_FUENTES',
          moduloOrigen: 'cruce_prestadores_v1',
          puntaje: 70.0,
          pesoPonderacion: 0.25,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Especialidad no coincide',
        },
      ];

      const puntaje = service.calcularPuntajePonderado(senales);
      expect(puntaje).toBe(74.0);
    });

    it('debe retornar 0 si la lista de señales está vacía (ausencia de antecedentes no favorable)', () => {
      const puntaje = service.calcularPuntajePonderado([]);
      expect(puntaje).toBe(0);
    });

    it('debe normalizar adecuadamente cuando los pesos no suman 1.0', () => {
      // 80*2 + 60*2 = 280 / 4 = 70.0
      const senales: InputSenalDto[] = [
        {
          tipoSenal: 'SENAL_A',
          moduloOrigen: 'mod_a',
          puntaje: 80.0,
          pesoPonderacion: 2.0,
          esAlertaFraude: false,
        },
        {
          tipoSenal: 'SENAL_B',
          moduloOrigen: 'mod_b',
          puntaje: 60.0,
          pesoPonderacion: 2.0,
          esAlertaFraude: false,
        },
      ];

      const puntaje = service.calcularPuntajePonderado(senales);
      expect(puntaje).toBe(70.0);
    });

    it('debe acotar el puntaje estrictamente entre 0 y 100', () => {
      const senalesSobre: InputSenalDto[] = [
        {
          tipoSenal: 'SENAL_MAX',
          moduloOrigen: 'mod_max',
          puntaje: 120.0,
          pesoPonderacion: 1.0,
          esAlertaFraude: false,
        },
      ];
      expect(service.calcularPuntajePonderado(senalesSobre)).toBe(100);

      const senalesBajo: InputSenalDto[] = [
        {
          tipoSenal: 'SENAL_MIN',
          moduloOrigen: 'mod_min',
          puntaje: -15.0,
          pesoPonderacion: 1.0,
          esAlertaFraude: false,
        },
      ];
      expect(service.calcularPuntajePonderado(senalesBajo)).toBe(0);
    });
  });

  describe('Generación de desglose estructurado de señales (Explicabilidad cuantitativa RQF-004, RQNF-008)', () => {
    it('debe construir un desglose detallado con cada señal, mínimos, cumplimiento y coordenadas', () => {
      const senales: InputSenalDto[] = [
        {
          tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
          moduloOrigen: 'lector_boletas_v1',
          puntaje: 95.0,
          pesoPonderacion: 0.40,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Boleta auténtica',
          ubicacionHallazgo: { page: 1, x: 10, y: 20, width: 100, height: 50 },
        },
        {
          tipoSenal: 'CONSISTENCIA_MONTOS',
          moduloOrigen: 'validador_montos_v1',
          puntaje: 55.0,
          pesoPonderacion: 0.60,
          umbralMinimo: 60.0,
          esAlertaFraude: false,
          descripcion: 'Discrepancia en montos',
        },
      ];

      const breakdown = service.generarDesglose('CASO-TEST-001', senales, 90.0);

      expect(breakdown.idCaso).toBe('CASO-TEST-001');
      expect(breakdown.puntajeConfianza).toBe(71.0); // 95*0.4 + 55*0.6 = 38 + 33 = 71
      expect(breakdown.umbralAprobacion).toBe(90.0);
      expect(breakdown.alertaFraudeActiva).toBe(false);
      expect(breakdown.senales).toHaveLength(2);

      expect(breakdown.senales[0]).toMatchObject({
        tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
        moduloOrigen: 'lector_boletas_v1',
        puntaje: 95.0,
        pesoPonderacion: 0.40,
        umbralMinimo: 60.0,
        cumpleMinimo: true,
        esAlertaFraude: false,
        descripcion: 'Boleta auténtica',
        ubicacionHallazgo: { page: 1, x: 10, y: 20, width: 100, height: 50 },
      });

      expect(breakdown.senales[1]).toMatchObject({
        tipoSenal: 'CONSISTENCIA_MONTOS',
        moduloOrigen: 'validador_montos_v1',
        puntaje: 55.0,
        pesoPonderacion: 0.60,
        umbralMinimo: 60.0,
        cumpleMinimo: false,
        esAlertaFraude: false,
        descripcion: 'Discrepancia en montos',
      });
    });

    it('debe marcar alertaFraudeActiva = true si al menos una señal contiene alerta de fraude', () => {
      const senales: InputSenalDto[] = [
        {
          tipoSenal: 'DETECCION_FRAUDE',
          moduloOrigen: 'detector_fraude_v1',
          puntaje: 20.0,
          pesoPonderacion: 0.50,
          umbralMinimo: 60.0,
          esAlertaFraude: true,
          descripcion: 'Manipulación digital de píxeles',
        },
      ];

      const breakdown = service.generarDesglose('CASO-FRAUDE', senales, 90.0);
      expect(breakdown.alertaFraudeActiva).toBe(true);
      expect(breakdown.senales[0].esAlertaFraude).toBe(true);
    });
  });

  describe('Consulta de desglose por ID de caso persistido (obtenerDesglosePorIdCaso)', () => {
    it('debe retornar el desglose obtenido desde la base de datos si el caso existe', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-SEED-001',
        puntajeConfianza: 94.0,
        flujo: {
          umbral: {
            valorAprobacion: 90.0,
          },
        },
        senales: [
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_boletas_v1',
            puntaje: 95.0,
            pesoPonderacion: 0.40,
            umbralMinimo: 60.0,
            cumpleMinimo: true,
            esAlertaFraude: false,
            descripcion: 'Estructura íntegra',
            ubicacionHallazgo: { page: 1, x: 50, y: 50, width: 200, height: 100 },
          },
        ],
      });

      const result = await service.obtenerDesglosePorIdCaso('CASO-SEED-001');

      expect(result.idCaso).toBe('CASO-SEED-001');
      expect(result.puntajeConfianza).toBe(94.0);
      expect(result.umbralAprobacion).toBe(90.0);
      expect(result.alertaFraudeActiva).toBe(false);
      expect(result.senales).toHaveLength(1);
      expect(result.senales[0].tipoSenal).toBe('AUTENTICIDAD_DOCUMENTAL');
    });

    it('debe lanzar NotFoundException si el caso no existe en la base de datos', async () => {
      prismaMock.caso.findUnique.mockResolvedValue(null);

      await expect(service.obtenerDesglosePorIdCaso('CASO-INEXISTENTE')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Evaluación de Caso (evaluarCaso)', () => {
    it('debe emitir APROBADO_AUTOMATICO y esFacturable=true si el puntaje supera o iguala el umbral de aprobación', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: {
          valorAprobacion: 90.0,
          minimoBasalSeguridad: 60.0,
        },
      });

      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-SEED-001',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_boletas_v1',
            puntaje: 95.0,
            pesoPonderacion: 0.40,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'validador_montos_v1',
            puntaje: 92.0,
            pesoPonderacion: 0.35,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'CRUCE_FUENTES',
            moduloOrigen: 'cruce_prestadores_v1',
            puntaje: 95.0,
            pesoPonderacion: 0.25,
            esAlertaFraude: false,
          },
        ],
      };

      const result = await service.evaluarCaso(requestDto);

      expect(result.idCaso).toBe('CASO-SEED-001');
      expect(result.puntajeConfianza).toBe(94.0);
      expect(result.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
      expect(result.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(result.causalDerivacion).toBe(CausalDerivacion.NINGUNA);
      expect(result.esFacturable).toBe(true);
      expect(result.fechaVencimientoSLA).toBeDefined();
    });

    it('debe emitir DERIVADO_REVISION_ASISTIDA y esFacturable=false si el puntaje es menor al umbral de aprobación', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: {
          valorAprobacion: 90.0,
          minimoBasalSeguridad: 60.0,
        },
      });

      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-SEED-002',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_boletas_v1',
            puntaje: 80.0,
            pesoPonderacion: 0.40,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'validador_montos_v1',
            puntaje: 70.0,
            pesoPonderacion: 0.35,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'CRUCE_FUENTES',
            moduloOrigen: 'cruce_prestadores_v1',
            puntaje: 70.0,
            pesoPonderacion: 0.25,
            esAlertaFraude: false,
          },
        ],
      };

      const result = await service.evaluarCaso(requestDto);

      expect(result.idCaso).toBe('CASO-SEED-002');
      expect(result.puntajeConfianza).toBe(74.0);
      expect(result.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(result.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
      expect(result.esFacturable).toBe(false);
      expect(result.razonDerivacion).toContain('Puntaje global insuficiente');
    });

    it('debe lanzar NotFoundException si el flujo no existe', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue(null);

      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-TEST',
        idFlujo: 'flujo-inexistente',
        senales: [],
      };

      await expect(service.evaluarCaso(requestDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ScoringController (Endpoints POST /evaluate y GET /cases/:idCaso/breakdown)', () => {
    let controller: ScoringController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ScoringController],
        providers: [
          ScoringEngineService,
          DecisionRulesService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

      controller = module.get<ScoringController>(ScoringController);
    });

    it('debe responder a POST evaluate delegando en el servicio de scoring', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0 },
      });

      const dto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-CTRL-001',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_v1',
            puntaje: 95.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      const res = await controller.evaluateCase(dto);
      expect(res.idCaso).toBe('CASO-CTRL-001');
      expect(res.puntajeConfianza).toBe(95.0);
      expect(res.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
    });

    it('debe responder a GET cases/:idCaso/breakdown retornando el desglose estructurado', async () => {
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-CTRL-001',
        puntajeConfianza: 95.0,
        flujo: { umbral: { valorAprobacion: 90.0 } },
        senales: [],
      });

      const res = await controller.getCaseBreakdown('CASO-CTRL-001');
      expect(res.idCaso).toBe('CASO-CTRL-001');
      expect(res.puntajeConfianza).toBe(95.0);
    });
  });
});

