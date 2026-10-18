import {
  CaseSummaryDto,
  CaseDetailDto,
  AcquireLeaseRequestDto,
  LeaseResponseDto,
  SubmitDecisionRequestDto,
  DecisionResultDto,
  DiscrepancyItemDto,
  EvaluateCaseRequestDto,
  EvaluationResultResponseDto,
  CaseBreakdownResponseDto,
  ThresholdResponseDto,
  UpdateThresholdDto,
  ThresholdAuditDto,
} from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: options.cache || 'no-store',
  });

  if (!response.ok) {
    let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
    let details: unknown;
    try {
      const errorJson = await response.json();
      details = errorJson;
      if (errorJson.message) {
        errorMessage = Array.isArray(errorJson.message)
          ? errorJson.message.join(', ')
          : errorJson.message;
      }
    } catch {
      // Ignorar si el cuerpo no es JSON
    }
    throw new ApiError(response.status, errorMessage, details);
  }

  return response.json() as Promise<T>;
}

/**
 * Cliente HTTP tipado para interactuar con los módulos F1 (Review Tray) y F4 (Scoring)
 */
export const apiClient = {
  // ==========================================
  // Review Tray (F1)
  // ==========================================

  /**
   * Obtiene la lista priorizada de casos derivados pendientes en la bandeja
   */
  async getReviewCases(params?: {
    estado?: string;
    prioridad?: string;
  }): Promise<CaseSummaryDto[]> {
    const query = new URLSearchParams();
    if (params?.estado) query.append('estado', params.estado);
    if (params?.prioridad) query.append('prioridad', params.prioridad);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<CaseSummaryDto[]>(`/review-tray/cases${queryString}`);
  },

  /**
   * Obtiene la vista integral y hallazgos espaciales de un caso
   */
  async getCaseDetail(idCaso: string): Promise<CaseDetailDto> {
    return request<CaseDetailDto>(`/review-tray/cases/${encodeURIComponent(idCaso)}`);
  },

  /**
   * Adquiere o renueva el arriendo temporal de edición (lease de 15 min)
   */
  async acquireOrRenewLease(
    idCaso: string,
    data: AcquireLeaseRequestDto
  ): Promise<LeaseResponseDto> {
    return request<LeaseResponseDto>(
      `/review-tray/cases/${encodeURIComponent(idCaso)}/lease`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Emite el veredicto formal inalterable del liquidador humano
   */
  async submitDecision(
    idCaso: string,
    data: SubmitDecisionRequestDto
  ): Promise<DecisionResultDto> {
    return request<DecisionResultDto>(
      `/review-tray/cases/${encodeURIComponent(idCaso)}/decision`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Lista los casos resueltos en discrepancia con la sugerencia de MIRA
   */
  async getDiscrepancies(): Promise<DiscrepancyItemDto[]> {
    return request<DiscrepancyItemDto[]>('/review-tray/discrepancies');
  },

  // ==========================================
  // Scoring & Thresholds (F4)
  // ==========================================

  /**
   * Evalúa un caso y ejecuta las reglas de puntuación y precedencia de fraude
   */
  async evaluateCase(
    data: EvaluateCaseRequestDto
  ): Promise<EvaluationResultResponseDto> {
    return request<EvaluationResultResponseDto>('/scoring/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtiene el desglose analítico de señales y factores explicativos
   */
  async getCaseBreakdown(idCaso: string): Promise<CaseBreakdownResponseDto> {
    return request<CaseBreakdownResponseDto>(
      `/scoring/cases/${encodeURIComponent(idCaso)}/breakdown`
    );
  },

  /**
   * Consulta el umbral de aprobación y mínimos basales vigentes de un flujo
   */
  async getThresholds(idFlujo: string): Promise<ThresholdResponseDto> {
    return request<ThresholdResponseDto>(
      `/scoring/thresholds/${encodeURIComponent(idFlujo)}`
    );
  },

  /**
   * Calibra el umbral de aprobación y mínimos basales con registro inalterable
   */
  async updateThresholds(
    idFlujo: string,
    data: UpdateThresholdDto
  ): Promise<ThresholdResponseDto> {
    return request<ThresholdResponseDto>(
      `/scoring/thresholds/${encodeURIComponent(idFlujo)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Consulta el historial inmutable de auditoría de calibración de umbrales
   */
  async getThresholdAudit(idFlujo: string): Promise<ThresholdAuditDto[]> {
    return request<ThresholdAuditDto[]>(
      `/scoring/thresholds/${encodeURIComponent(idFlujo)}/audit`
    );
  },

  /**
   * Construye la URL absoluta para acceder a evidencias estáticas (PDFs, imágenes)
   */
  getEvidenceUrl(urlAlmacenamiento: string): string {
    if (!urlAlmacenamiento) return '';
    if (urlAlmacenamiento.startsWith('http://') || urlAlmacenamiento.startsWith('https://')) {
      return urlAlmacenamiento;
    }
    // Si la URL es relativa (/static/evidence/...)
    const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const cleanPath = urlAlmacenamiento.startsWith('/')
      ? urlAlmacenamiento
      : `/${urlAlmacenamiento}`;
    return `${baseUrl}${cleanPath}`;
  },
};
