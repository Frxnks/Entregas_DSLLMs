import { Test, TestingModule } from '@nestjs/testing';
import { ScoringEngineService } from '../src/scoring/scoring-engine.service';
import { DecisionRulesService } from '../src/scoring/decision-rules.service';
import { ScoringController } from '../src/scoring/scoring.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  InputSenalDto,
  EvaluateCaseRequestDto,
} from '../src/scoring/dto/evaluate-case.dto';
import {
  EstadoCaso,
  EstadoDecision,
  SugerenciaMIRA,
  CausalDerivacion,
  NivelPrioridad,
} from '@prisma/client';

describe('User Story 2: Precedencia Absoluta de Señales de Fraude y No Rechazo Automático (DEC-01, DEC-04, RQF-007, RQF-008, RQF-023)', () => {
  let scoringEngineService: ScoringEngineService;
  let decisionRulesService: DecisionRulesService;
  let scoringController: ScoringController;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      flujo: {
        findUnique: jest.fn(),
      },
      caso: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

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

    scoringEngineService = module.get<ScoringEngineService>(ScoringEngineService);
    decisionRulesService = module.get<DecisionRulesService>(DecisionRulesService);
    scoringController = module.get<ScoringController>(ScoringController);
  });

  describe('T016: DecisionRulesService - Métodos de Reglas y Jerarquía Estricta', () => {
    it('tieneAlertaFraude debe retornar true si existe al menos una señal con esAlertaFraude=true', () => {
      const senales: InputSenalDto[] = [
        {
          tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
          moduloOrigen: 'lector_v1',
          puntaje: 95.0,
          pesoPonderacion: 0.5,
          esAlertaFraude: false,
        },
        {
          tipoSenal: 'FORENSE_IMAGEN',
          moduloOrigen: 'forense_v1',
          puntaje: 30.0,
          pesoPonderacion: 0.5,
          esAlertaFraude: true,
          descripcion: 'Alteración de píxeles en recuadro de total',
        },
      ];

      expect(decisionRulesService.tieneAlertaFraude(senales)).toBe(true);
      expect(decisionRulesService.obtenerSenalesFraude(senales)).toHaveLength(1);
    });

    it('tieneAlertaFraude debe retornar false si ninguna señal tiene esAlertaFraude=true o lista vacía', () => {
      expect(decisionRulesService.tieneAlertaFraude([])).toBe(false);

      const senalesLimpias: InputSenalDto[] = [
        {
          tipoSenal: 'DOCUMENTO',
          moduloOrigen: 'mod_1',
          puntaje: 90.0,
          pesoPonderacion: 1.0,
          esAlertaFraude: false,
        },
      ];
      expect(decisionRulesService.tieneAlertaFraude(senalesLimpias)).toBe(false);
      expect(decisionRulesService.obtenerSenalesFraude(senalesLimpias)).toHaveLength(0);
    });

    it('evaluarPrecedenciaFraude debe tipificar veredicto, causal FRAUDE, prioridad ALTA y sugerencia RECHAZAR ante señal de fraude', () => {
      const senales: InputSenalDto[] = [
        {
          tipoSenal: 'ANALISIS_FORENSE',
          moduloOrigen: 'forense_v1',
          puntaje: 25.0,
          pesoPonderacion: 0.3,
          esAlertaFraude: true,
          descripcion: 'Manipulación de tipografía en boleta médica',
        },
      ];

      const resultado = decisionRulesService.evaluarPrecedenciaFraude(senales);

      expect(resultado).not.toBeNull();
      expect(resultado?.esAlertaFraude).toBe(true);
      expect(resultado?.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(resultado?.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
      expect(resultado?.nivelPrioridad).toBe(NivelPrioridad.ALTA);
      expect(resultado?.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      expect(resultado?.esFacturable).toBe(false); // DEC-01
      expect(resultado?.razonDerivacion).toContain('Precedencia absoluta de fraude sobre el puntaje');
      expect(resultado?.razonDerivacion).toContain('DEC-04 / RQF-023');
    });

    it('evaluarPrecedenciaFraude debe retornar null si no existen señales de fraude', () => {
      const senales: InputSenalDto[] = [
        {
          tipoSenal: 'DOCUMENTO',
          moduloOrigen: 'mod_1',
          puntaje: 95.0,
          pesoPonderacion: 1.0,
          esAlertaFraude: false,
        },
      ];

      expect(decisionRulesService.evaluarPrecedenciaFraude(senales)).toBeNull();
    });
  });

  describe('Precedencia Absoluta de Señales de Fraude sobre Puntaje Alto (RQF-023, DEC-04)', () => {
    it('debe interceptar y derivar a revisión asistida un caso con puntaje sobresaliente (98.0) cuando existe una alerta de fraude', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-gastos-medicos',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      // Caso hipotético con señales sobresalientes pero una con alerta de fraude
      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-FRAUDE-SOBRESALIENTE',
        idFlujo: 'flujo-gastos-medicos',
        senales: [
          {
            tipoSenal: 'IDENTIDAD_BENEFICIARIO',
            moduloOrigen: 'cruce_identidad_v1',
            puntaje: 100.0,
            pesoPonderacion: 0.40,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'METADATOS_DOCUMENTALES',
            moduloOrigen: 'metadatos_pdf_v1',
            puntaje: 98.0,
            pesoPonderacion: 0.30,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'FORENSE_IMAGEN',
            moduloOrigen: 'forense_imagen_v1',
            puntaje: 95.0, // Puntaje alto pero con alerta de fraude activa
            pesoPonderacion: 0.30,
            esAlertaFraude: true,
            descripcion: 'Inconsistencia microscópica en el membrete oficial del prestador',
          },
        ],
      };

      const resultado = await scoringEngineService.evaluarCaso(requestDto);

      // Verificación de precedencia absoluta de fraude
      expect(resultado.puntajeConfianza).toBe(97.9); // (100*0.4 + 98*0.3 + 95*0.3) = 40 + 29.4 + 28.5 = 97.9 >= 90
      expect(resultado.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(resultado.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
      expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      expect(resultado.nivelPrioridad).toBe(NivelPrioridad.ALTA);
      expect(resultado.esFacturable).toBe(false); // DEC-01
      expect(resultado.razonDerivacion).toContain('Precedencia absoluta de fraude sobre el puntaje');
      expect(resultado.razonDerivacion).toContain('DEC-04 / RQF-023');
    });

    it('debe aplicar la regla exactamente sobre el Caso 3 de semillas (CASO-SEED-003)', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-reembolso-gastos-medicos',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      // CASO-SEED-003: 96*0.4 + 90*0.3 + 35*0.3 = 38.4 + 27.0 + 10.5 = 75.9
      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-SEED-003',
        idFlujo: 'flujo-reembolso-gastos-medicos',
        senales: [
          {
            tipoSenal: 'CRUCE_FUENTES',
            moduloOrigen: 'cruce_identidad_v1',
            puntaje: 96.0,
            pesoPonderacion: 0.40,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'metadatos_pdf_v1',
            puntaje: 90.0,
            pesoPonderacion: 0.30,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'DETECCION_FRAUDE',
            moduloOrigen: 'forense_imagen_v1',
            puntaje: 35.0,
            pesoPonderacion: 0.30,
            esAlertaFraude: true,
            descripcion: 'Manipulación digital de píxeles detectada en el recuadro del monto total',
          },
        ],
      };

      const resultado = await scoringEngineService.evaluarCaso(requestDto);

      expect(resultado.idCaso).toBe('CASO-SEED-003');
      expect(resultado.puntajeConfianza).toBe(75.9);
      expect(resultado.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(resultado.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
      expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      expect(resultado.nivelPrioridad).toBe(NivelPrioridad.ALTA);
      expect(resultado.esFacturable).toBe(false);
      expect(resultado.razonDerivacion).toContain('Manipulación digital de píxeles');
    });
  });

  describe('Principio II de la Constitución y DEC-04: Prohibición de Rechazo 100% Automático', () => {
    it('NUNCA debe emitir veredicto de rechazo automático en la máquina, transicionando siempre a DERIVADO_REVISION_ASISTIDA', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      // Caso crítico con puntaje extremadamente bajo (0 pts) y fraude grave
      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-CERO-FRAUDULENTO',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'FORENSE_TOTAL',
            moduloOrigen: 'detector_fraude_severo_v1',
            puntaje: 0.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: true,
            descripcion: 'Falsificación integral manifiesta de documento médico',
          },
        ],
      };

      const resultado = await scoringEngineService.evaluarCaso(requestDto);

      // Verificación taxativa de que NO existe estado "RECHAZADO_AUTOMATICO"
      expect(resultado.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(resultado.estadoDecision).not.toBe('RECHAZADO');
      expect(resultado.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
      expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      expect(resultado.esFacturable).toBe(false);
      expect(resultado.nivelPrioridad).toBe(NivelPrioridad.ALTA);
    });
  });

  describe('Jerarquía Estricta ante Causales Concurrentes (RQF-023)', () => {
    it('ante fraude + señal bajo mínimo + puntaje insuficiente, la causal más crítica prevaleciente debe ser FRAUDE', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      // Concurrencia de 3 causales:
      // 1. Puntaje global bajo: (40*0.5 + 30*0.5) = 35.0 < 90
      // 2. Mínimo de señal reprobado: 40 < 60
      // 3. Alerta de fraude activa en señal 2
      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-CONCURRENTE-001',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'AUTENTICIDAD',
            moduloOrigen: 'mod_1',
            puntaje: 40.0,
            pesoPonderacion: 0.5,
            umbralMinimo: 60.0,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'FORENSE',
            moduloOrigen: 'mod_2',
            puntaje: 30.0,
            pesoPonderacion: 0.5,
            umbralMinimo: 60.0,
            esAlertaFraude: true,
            descripcion: 'Doble emisión y manipulación de firma',
          },
        ],
      };

      const resultado = await scoringEngineService.evaluarCaso(requestDto);

      // Prevalencia 1º Fraude (RQF-023)
      expect(resultado.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
      expect(resultado.nivelPrioridad).toBe(NivelPrioridad.ALTA);
      expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      expect(resultado.esFacturable).toBe(false);
    });
  });

  describe('T018: Persistencia del Caso Interceptado por Fraude en Base de Datos', () => {
    it('debe actualizar el caso existente en la base de datos a estado PENDIENTE_REVISION con esFacturable=false y prioridad ALTA', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-EXISTENTE-001',
        estadoCaso: EstadoCaso.INGRESADO,
      });

      prismaMock.caso.update.mockResolvedValue({
        idCaso: 'CASO-EXISTENTE-001',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
      });

      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-EXISTENTE-001',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'FRAUDE_DOC',
            moduloOrigen: 'mod_fraude',
            puntaje: 95.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: true,
            descripcion: 'Falsificación de número de bono',
          },
        ],
      };

      await scoringEngineService.evaluarCaso(requestDto);

      expect(prismaMock.caso.findUnique).toHaveBeenCalledWith({
        where: { idCaso: 'CASO-EXISTENTE-001' },
      });

      expect(prismaMock.caso.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idCaso: 'CASO-EXISTENTE-001' },
          data: expect.objectContaining({
            estadoCaso: EstadoCaso.PENDIENTE_REVISION,
            estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
            causalDerivacion: CausalDerivacion.FRAUDE,
            sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
            nivelPrioridad: NivelPrioridad.ALTA,
            esFacturable: false,
          }),
        }),
      );
    });

    it('debe crear un nuevo caso con persistir=true guardándolo como PENDIENTE_REVISION y esFacturable=false ante fraude', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      prismaMock.caso.findUnique.mockResolvedValue(null);
      prismaMock.caso.create.mockResolvedValue({
        idCaso: 'CASO-NUEVO-002',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
      });

      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-NUEVO-002',
        idFlujo: 'flujo-001',
        persistir: true,
        senales: [
          {
            tipoSenal: 'FRAUDE_DOC',
            moduloOrigen: 'mod_fraude',
            puntaje: 50.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: true,
            descripcion: 'Alteración de fecha',
          },
        ],
      };

      await scoringEngineService.evaluarCaso(requestDto);

      expect(prismaMock.caso.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            idCaso: 'CASO-NUEVO-002',
            idFlujo: 'flujo-001',
            estadoCaso: EstadoCaso.PENDIENTE_REVISION,
            estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
            causalDerivacion: CausalDerivacion.FRAUDE,
            sugerenciaMIRA: SugerenciaMIRA.RECHAZAR,
            nivelPrioridad: NivelPrioridad.ALTA,
            esFacturable: false,
          }),
        }),
      );
    });
  });

  describe('Controlador ScoringController (POST /scoring/evaluate con Alerta de Fraude)', () => {
    it('debe retornar respuesta DTO con estado DERIVADO_REVISION_ASISTIDA, causal FRAUDE, prioridad ALTA y esFacturable=false', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });
      prismaMock.caso.findUnique.mockResolvedValue(null);

      const dto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-CTRL-FRAUDE',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'ALERTA_FRAUDE_DOC',
            moduloOrigen: 'detector_v1',
            puntaje: 92.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: true,
            descripcion: 'Documento duplicado en otra aseguradora',
          },
        ],
      };

      const response = await scoringController.evaluateCase(dto);

      expect(response.idCaso).toBe('CASO-CTRL-FRAUDE');
      expect(response.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(response.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
      expect(response.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      expect(response.nivelPrioridad).toBe(NivelPrioridad.ALTA);
      expect(response.esFacturable).toBe(false);
      expect(response.razonDerivacion).toContain('Precedencia absoluta de fraude sobre el puntaje');
    });
  });
});
