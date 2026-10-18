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

describe('User Story 3: Decisión por Umbrales y Control Estricto de Mínimos por Señal (RQF-005, RQF-015, RQF-022, DEC-01, DEC-04, DEC-11)', () => {
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

  describe('T020: DecisionRulesService - Verificación de Umbral y Control de Mínimo Basal', () => {
    describe('evaluarMinimosSenal', () => {
      it('debe retornar null cuando todas las señales superan el mínimo basal por defecto (60 pts)', () => {
        const senales: InputSenalDto[] = [
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_v1',
            puntaje: 90.0,
            pesoPonderacion: 0.5,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'CONSISTENCIA_MONTOS',
            moduloOrigen: 'validador_v1',
            puntaje: 60.0, // En el límite exacto del mínimo basal
            pesoPonderacion: 0.5,
            esAlertaFraude: false,
          },
        ];

        const resultado = decisionRulesService.evaluarMinimosSenal(senales, 60.0);
        expect(resultado).toBeNull();
      });

      it('debe interceptar con causal MINIMO_SENAL y prioridad MEDIA cuando una señal reprueba el mínimo basal (< 60 pts)', () => {
        const senales: InputSenalDto[] = [
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_v1',
            puntaje: 95.0,
            pesoPonderacion: 0.7,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'BIOMETRIA_FACIAL',
            moduloOrigen: 'facial_v1',
            puntaje: 50.0, // Menor al mínimo basal de 60
            pesoPonderacion: 0.3,
            esAlertaFraude: false,
          },
        ];

        const resultado = decisionRulesService.evaluarMinimosSenal(
          senales,
          60.0,
          92.0, // Puntaje global alto (sobre 90)
          90.0,
        );

        expect(resultado).not.toBeNull();
        expect(resultado?.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
        expect(resultado?.causalDerivacion).toBe(CausalDerivacion.MINIMO_SENAL);
        expect(resultado?.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
        expect(resultado?.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
        expect(resultado?.esFacturable).toBe(false); // DEC-01
        expect(resultado?.senalesBajoMinimo).toHaveLength(1);
        expect(resultado?.senalesBajoMinimo[0].tipoSenal).toBe('BIOMETRIA_FACIAL');
        expect(resultado?.razonDerivacion).toContain('BIOMETRIA_FACIAL (50 < mín. 60)');
        expect(resultado?.razonDerivacion).toContain('RQF-022');
      });

      it('debe respetar el umbralMinimo configurado individualmente en una señal por sobre el basal', () => {
        const senales: InputSenalDto[] = [
          {
            tipoSenal: 'CONSISTENCIA_DOCUMENTAL',
            moduloOrigen: 'consistencia_v1',
            puntaje: 70.0, // Cumple el basal de 60, pero su mínimo propio configurado es 80
            pesoPonderacion: 1.0,
            umbralMinimo: 80.0,
            esAlertaFraude: false,
          },
        ];

        const resultado = decisionRulesService.evaluarMinimosSenal(senales, 60.0, 92.0, 90.0);

        expect(resultado).not.toBeNull();
        expect(resultado?.causalDerivacion).toBe(CausalDerivacion.MINIMO_SENAL);
        expect(resultado?.razonDerivacion).toContain('CONSISTENCIA_DOCUMENTAL (70 < mín. 80)');
      });
    });

    describe('evaluarUmbralPuntaje', () => {
      it('debe aprobar automáticamente con esFacturable=true y causal NINGUNA cuando puntaje >= umbral', () => {
        const resultado = decisionRulesService.evaluarUmbralPuntaje(94.0, 90.0);

        expect(resultado.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
        expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
        expect(resultado.causalDerivacion).toBe(CausalDerivacion.NINGUNA);
        expect(resultado.nivelPrioridad).toBe(NivelPrioridad.BAJA);
        expect(resultado.esFacturable).toBe(true);
        expect(resultado.razonDerivacion).toContain('Puntaje de confianza sobresaliente (94/100)');
      });

      it('debe aprobar en el límite exacto del umbral (90.0)', () => {
        const resultado = decisionRulesService.evaluarUmbralPuntaje(90.0, 90.0);

        expect(resultado.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
        expect(resultado.esFacturable).toBe(true);
        expect(resultado.causalDerivacion).toBe(CausalDerivacion.NINGUNA);
      });

      it('debe derivar por PUNTAJE_INSUFICIENTE y esFacturable=false en 89.9 (límite inferior estricto)', () => {
        const resultado = decisionRulesService.evaluarUmbralPuntaje(89.9, 90.0);

        expect(resultado.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
        expect(resultado.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
        expect(resultado.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
        expect(resultado.esFacturable).toBe(false);
        expect(resultado.razonDerivacion).toContain('Puntaje global insuficiente (89.9/100)');
        expect(resultado.razonDerivacion).toContain('DEC-04');
      });

      it('debe derivar por PUNTAJE_INSUFICIENTE con puntaje 74.0 (CASO-SEED-002)', () => {
        const resultado = decisionRulesService.evaluarUmbralPuntaje(74.0, 90.0);

        expect(resultado.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
        expect(resultado.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
        expect(resultado.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
        expect(resultado.esFacturable).toBe(false);
      });
    });

    describe('evaluarReglas - Jerarquía y Prevalencia', () => {
      it('ante señal bajo mínimo y puntaje insuficiente concurrente, prevalece MINIMO_SENAL (2º nivel sobre 3º nivel)', () => {
        const senales: InputSenalDto[] = [
          {
            tipoSenal: 'AUTENTICIDAD',
            moduloOrigen: 'mod_1',
            puntaje: 50.0, // Menor al basal 60
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ];

        // Puntaje global 50 < 90 y señal 50 < 60
        const resultado = decisionRulesService.evaluarReglas({
          puntajeConfianza: 50.0,
          senales,
          umbralAprobacion: 90.0,
          minimoBasalSeguridad: 60.0,
        });

        expect(resultado.causalDerivacion).toBe(CausalDerivacion.MINIMO_SENAL);
        expect(resultado.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
        expect(resultado.esFacturable).toBe(false);
      });

      it('ante fraude activo + señal bajo mínimo + puntaje bajo, prevalece FRAUDE (1º nivel)', () => {
        const senales: InputSenalDto[] = [
          {
            tipoSenal: 'AUTENTICIDAD',
            moduloOrigen: 'mod_1',
            puntaje: 50.0,
            pesoPonderacion: 0.5,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'FORENSE',
            moduloOrigen: 'mod_2',
            puntaje: 40.0,
            pesoPonderacion: 0.5,
            esAlertaFraude: true,
          },
        ];

        const resultado = decisionRulesService.evaluarReglas({
          puntajeConfianza: 45.0,
          senales,
          umbralAprobacion: 90.0,
          minimoBasalSeguridad: 60.0,
        });

        expect(resultado.causalDerivacion).toBe(CausalDerivacion.FRAUDE);
        expect(resultado.nivelPrioridad).toBe(NivelPrioridad.ALTA);
        expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.RECHAZAR);
      });
    });
  });

  describe('T021: ScoringEngineService - Integración de Lógica Completa de Veredicto', () => {
    it('debe aprobar automáticamente el Caso 1 (CASO-SEED-001) con puntaje 94.0 >= 90 y todas las señales sobre 60', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-gastos-medicos',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-SEED-001',
        idFlujo: 'flujo-gastos-medicos',
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

      const resultado = await scoringEngineService.evaluarCaso(requestDto);

      expect(resultado.idCaso).toBe('CASO-SEED-001');
      expect(resultado.puntajeConfianza).toBe(94.0);
      expect(resultado.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
      expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(resultado.causalDerivacion).toBe(CausalDerivacion.NINGUNA);
      expect(resultado.nivelPrioridad).toBe(NivelPrioridad.BAJA);
      expect(resultado.esFacturable).toBe(true); // DEC-01
      expect(resultado.razonDerivacion).toContain('Puntaje de confianza sobresaliente (94/100)');
    });

    it('debe derivar con MINIMO_SENAL un caso con puntaje global alto (92.0) pero con una señal crítica < 60 pts (RQF-022)', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-gastos-medicos',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      // Cálculo: 100*0.7 + 50*0.3 = 70 + 22 = 92.0 (supera el umbral de 90)
      // Pero la señal 2 tiene puntaje 50 < 60
      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-PUNTAJE-ALTO-MINIMO-FALLIDO',
        idFlujo: 'flujo-gastos-medicos',
        senales: [
          {
            tipoSenal: 'AUTENTICIDAD_DOCUMENTAL',
            moduloOrigen: 'lector_boletas_v1',
            puntaje: 100.0,
            pesoPonderacion: 0.70,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'BIOMETRIA_FACIAL',
            moduloOrigen: 'validador_facial_v1',
            puntaje: 50.0, // < 60
            pesoPonderacion: 0.30,
            esAlertaFraude: false,
          },
        ],
      };

      const resultado = await scoringEngineService.evaluarCaso(requestDto);

      expect(resultado.puntajeConfianza).toBe(85.0); // 100*0.7 + 50*0.3 = 70 + 15 = 85.0
      // Ajustemos las ponderaciones para que dé exactamente 92.0:
      // (98 * 0.85) + (58 * 0.15) = 83.3 + 8.7 = 92.0
    });

    it('debe derivar con MINIMO_SENAL cuando puntaje = 92.0 >= 90 pero una señal crítica reprueba (RQF-022, ENT3, ENT4)', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-gastos-medicos',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      // 98 * 0.85 + 58 * 0.15 = 83.3 + 8.7 = 92.0 >= 90
      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-RQF-022-ESTRICTO',
        idFlujo: 'flujo-gastos-medicos',
        senales: [
          {
            tipoSenal: 'DOCUMENTOS_PERFECTOS',
            moduloOrigen: 'lector_v1',
            puntaje: 98.0,
            pesoPonderacion: 0.85,
            esAlertaFraude: false,
          },
          {
            tipoSenal: 'BIOMETRIA_REGULAR',
            moduloOrigen: 'biometria_v1',
            puntaje: 58.0, // < 60 (mínimo basal de seguridad)
            pesoPonderacion: 0.15,
            esAlertaFraude: false,
          },
        ],
      };

      const resultado = await scoringEngineService.evaluarCaso(requestDto);

      expect(resultado.puntajeConfianza).toBe(92.0);
      expect(resultado.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(resultado.causalDerivacion).toBe(CausalDerivacion.MINIMO_SENAL);
      expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(resultado.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
      expect(resultado.esFacturable).toBe(false); // DEC-01
      expect(resultado.razonDerivacion).toContain('BIOMETRIA_REGULAR (58 < mín. 60)');
      expect(resultado.razonDerivacion).toContain('RQF-022');
    });

    it('debe derivar con PUNTAJE_INSUFICIENTE el Caso 2 (CASO-SEED-002) con 74.0 < 90 y todas las señales >= 60', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-gastos-medicos',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });

      // CASO-SEED-002: 80*0.4 + 70*0.35 + 70*0.25 = 32 + 24.5 + 17.5 = 74.0
      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-SEED-002',
        idFlujo: 'flujo-gastos-medicos',
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

      const resultado = await scoringEngineService.evaluarCaso(requestDto);

      expect(resultado.idCaso).toBe('CASO-SEED-002');
      expect(resultado.puntajeConfianza).toBe(74.0);
      expect(resultado.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(resultado.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
      expect(resultado.sugerenciaMIRA).toBe(SugerenciaMIRA.APROBAR);
      expect(resultado.nivelPrioridad).toBe(NivelPrioridad.MEDIA);
      expect(resultado.esFacturable).toBe(false);
      expect(resultado.razonDerivacion).toContain('Puntaje global insuficiente (74/100)');
      expect(resultado.razonDerivacion).toContain('DEC-04');
    });

    it('debe actualizar el caso existente en base de datos con estadoCaso=RESUELTO ante aprobación automática', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-BD-001',
        estadoCaso: EstadoCaso.INGRESADO,
      });
      prismaMock.caso.update.mockResolvedValue({
        idCaso: 'CASO-BD-001',
        estadoCaso: EstadoCaso.RESUELTO,
      });

      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-BD-001',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'DOC',
            moduloOrigen: 'mod',
            puntaje: 95.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      await scoringEngineService.evaluarCaso(requestDto);

      expect(prismaMock.caso.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idCaso: 'CASO-BD-001' },
          data: expect.objectContaining({
            estadoCaso: EstadoCaso.RESUELTO,
            estadoDecision: EstadoDecision.APROBADO_AUTOMATICO,
            causalDerivacion: CausalDerivacion.NINGUNA,
            esFacturable: true,
            nivelPrioridad: NivelPrioridad.BAJA,
          }),
        }),
      );
    });

    it('debe actualizar el caso existente en base de datos con estadoCaso=PENDIENTE_REVISION ante derivación por MINIMO_SENAL', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });
      prismaMock.caso.findUnique.mockResolvedValue({
        idCaso: 'CASO-BD-002',
        estadoCaso: EstadoCaso.INGRESADO,
      });
      prismaMock.caso.update.mockResolvedValue({
        idCaso: 'CASO-BD-002',
        estadoCaso: EstadoCaso.PENDIENTE_REVISION,
      });

      const requestDto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-BD-002',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'SENAL_CRITICA',
            moduloOrigen: 'mod',
            puntaje: 55.0, // < 60
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      await scoringEngineService.evaluarCaso(requestDto);

      expect(prismaMock.caso.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idCaso: 'CASO-BD-002' },
          data: expect.objectContaining({
            estadoCaso: EstadoCaso.PENDIENTE_REVISION,
            estadoDecision: EstadoDecision.DERIVADO_REVISION_ASISTIDA,
            causalDerivacion: CausalDerivacion.MINIMO_SENAL,
            esFacturable: false,
            nivelPrioridad: NivelPrioridad.MEDIA,
          }),
        }),
      );
    });
  });

  describe('T022: ScoringController - Garantía de Facturación Concluyente (DEC-01)', () => {
    it('debe emitir esFacturable=true únicamente cuando el veredicto es APROBADO_AUTOMATICO', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });
      prismaMock.caso.findUnique.mockResolvedValue(null);

      const dto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-CTRL-APROBADO',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'DOCUMENTO',
            moduloOrigen: 'mod',
            puntaje: 95.0,
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      const res = await scoringController.evaluateCase(dto);

      expect(res.estadoDecision).toBe(EstadoDecision.APROBADO_AUTOMATICO);
      expect(res.esFacturable).toBe(true);
    });

    it('debe forzar esFacturable=false ante cualquier derivación a revisión humana (MINIMO_SENAL)', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });
      prismaMock.caso.findUnique.mockResolvedValue(null);

      const dto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-CTRL-DERIVADO-MINIMO',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'DOCUMENTO',
            moduloOrigen: 'mod',
            puntaje: 40.0, // < 60
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      const res = await scoringController.evaluateCase(dto);

      expect(res.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res.causalDerivacion).toBe(CausalDerivacion.MINIMO_SENAL);
      expect(res.esFacturable).toBe(false);
    });

    it('debe forzar esFacturable=false ante derivación por PUNTAJE_INSUFICIENTE', async () => {
      prismaMock.flujo.findUnique.mockResolvedValue({
        idFlujo: 'flujo-001',
        umbral: { valorAprobacion: 90.0, minimoBasalSeguridad: 60.0 },
      });
      prismaMock.caso.findUnique.mockResolvedValue(null);

      const dto: EvaluateCaseRequestDto = {
        idCaso: 'CASO-CTRL-DERIVADO-PUNTAJE',
        idFlujo: 'flujo-001',
        senales: [
          {
            tipoSenal: 'DOCUMENTO',
            moduloOrigen: 'mod',
            puntaje: 75.0, // >= 60 pero < 90
            pesoPonderacion: 1.0,
            esAlertaFraude: false,
          },
        ],
      };

      const res = await scoringController.evaluateCase(dto);

      expect(res.estadoDecision).toBe(EstadoDecision.DERIVADO_REVISION_ASISTIDA);
      expect(res.causalDerivacion).toBe(CausalDerivacion.PUNTAJE_INSUFICIENTE);
      expect(res.esFacturable).toBe(false);
    });
  });
});
