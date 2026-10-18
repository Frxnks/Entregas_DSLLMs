# Manual de Usuario y Guía Operativa: Bandeja de Revisión Asistida (MIRA F1)

**Documento**: Manual de Procedimiento Operativo Estándar (SOP)  
**Módulo**: F1 - Bandeja de Revisión Asistida (Human-in-the-Loop)  
**Versión**: 1.0.0  
**Fecha de Publicación**: Octubre 2026  
**Audiencia**: Analistas Liquidadores de Siniestros, Supervisores de Operaciones y Administradores de Riesgo  
**Atributo de Calidad**: Usabilidad intuitiva sin capacitación previa y tiempo de respuesta < 2s (RQNF-008 / PX-08)  

---

## 1. Introducción y Propósito del Sistema

La **Plataforma MIRA** (*Modelo Inteligente de Revisión Asistida*) es una solución tecnológica de grado corporativo concebida para optimizar la tramitación, evaluación de riesgo y liquidación de siniestros de reembolso de gastos médicos y complementarios de salud.

El módulo **F1 - Bandeja de Revisión Asistida** constituye el espacio de trabajo unificado donde los profesionales liquidadores examinan, validan y resuelven los casos que no fueron aprobados de forma automática por el motor algorítmico. Su diseño ergonómico responde al principio de **Control Humano Efectivo (DEC-04 / Principio II)**:

> **Garantía Constitucional y Regulatoria**: La inteligencia artificial de MIRA actúa exclusivamente como asesora técnica orientativa. Ningún rechazo o decisión adversa es emitida de forma 100% automatizada. Toda resolución desfavorable o caso en zona de incertidumbre requiere la intervención, juicio crítico y firma formal de un liquidador humano.

---

## 2. Principios Operativos y de Negocio

Antes de operar en la plataforma, el analista debe tener presentes los siguientes principios rectores:

| Principio | Identificador | Regla Operativa |
| :--- | :--- | :--- |
| **Prohibición de Rechazo Automático** | DEC-04 / RQF-007 | Si un siniestro obtiene un puntaje inferior al umbral configurado (ej. &lt; 90 puntos), **nunca** se rechaza por el sistema. Se deriva a la bandeja de revisión para evaluación humana. |
| **Precedencia Absoluta de Fraude** | DEC-04 / RQF-023 | Una señal de alerta de fraude confirmada prevalece sobre cualquier puntaje alto (incluso 95 o 100 puntos), forzando la derivación prioritaria a la bandeja con nivel **ALTA**. |
| **Protección y Soberanía de Datos** | DEC-06 / RQNF-003 | En cumplimiento de la Ley 19.628 y estándares de privacidad, el RUT y nombre del asegurado se exhiben enmascarados en las bandejas generales (ej. `18.234.***-*`). |
| **Inalterabilidad Registral** | DEC-05 / RQNF-005 | Toda decisión emitida, con su motivo, estampa cronológica e identidad del liquidador, se almacena bajo el patrón estrictamente *append-only*. Ningún usuario o administrador puede borrar o editar una resolución ya sellada. |
| **Trazabilidad de Discrepancias** | CU-02 / RQF-011 | Si el liquidador aprueba un caso que MIRA recomendó rechazar (o viceversa), el sistema respeta de inmediato la voluntad humana y marca automáticamente el caso con `marcaDiscrepancia = true` para supervisión del equipo de modelos. |

---

## 3. Acceso y Navegación en la Bandeja de Trabajo (`/bandeja`)

Al ingresar a la ruta `/bandeja`, el liquidador dispone de un entorno de trabajo organizado por urgencia y nivel de servicio (SLA).

```
+---------------------------------------------------------------------------------------------------+
|  MIRA | Bandeja de Revisión Asistida                                 Operador: Carlos Valenzuela  |
+---------------------------------------------------------------------------------------------------+
|  [ Casos Pendientes: 12 ]    [ Próximos a Vencer: 3 ]    [ Escalados: 1 ]    [ Resueltos Hoy: 28 ]|
+---------------------------------------------------------------------------------------------------+
|  Filtros: [ Estado: Todos v ]  [ Prioridad: Todas v ]  [ Buscar por ID Caso o Asegurado...      ] |
+---------------------------------------------------------------------------------------------------+
|  ID Caso        Fecha       Asegurado        Puntaje    Sugerencia   SLA Restante    Acción       |
|  CASO-SEED-003  17/10 14:00 M*** C*** (RUT)  75.9 pts   RECHAZAR     14h hábiles     Revisar      |
|  CASO-SEED-002  17/10 16:30 R*** F*** (RUT)  74.0 pts   APROBAR      48h hábiles     Revisar      |
+---------------------------------------------------------------------------------------------------+
```

### 3.1. Indicadores de Carga y Semáforos de SLA Hábil

La plataforma computa el tiempo restante para cada caso con estricta sujeción al **calendario laboral de Chile** (lunes a viernes de 08:30 a 18:30 hrs, descontando fines de semana y feriados nacionales):

1. **Verde (`EN_PLAZO`)**: El siniestro cuenta con más de 24 horas hábiles disponibles respecto al compromiso de 3 días hábiles internos.
2. **Ámbar (`PROXIMO_A_VENCER`)**: Restan menos de 24 horas hábiles para el vencimiento. Requiere atención prioritaria por el equipo de liquidación.
3. **Rojo (`VENCIDO_ESCALADO`)**: El caso sobrepasó las horas hábiles comprometidas sin resolución de un analista. El sistema lo escala automáticamente a la cola prioritaria del supervisor de operaciones.

### 3.2. Concurrencia y Arriendo Temporal de Edición (*Lease*)

Para prevenir colisiones de trabajo entre analistas simultáneos, la plataforma implementa una política híbrida de concurrencia:
- **Lectura Multiusuario Ilimitada**: Varios liquidadores pueden consultar concurrentemente la evidencia y el historial de un caso sin restricciones.
- **Arriendo de Edición (*Lease* de 15 Minutos)**: Cuando un liquidador abre formalmente el expediente para liquidarlo, se le asigna un arriendo exclusivo de 15 minutos, identificable con la leyenda `"En edición por ti"`. Los demás analistas visualizan el caso bloqueado con la etiqueta `"En edición por [Nombre del Operador]"` y pueden ingresar en modo *Sólo Lectura*.
- **Renovación y Liberación Automática**: Cada interacción del analista en la interfaz envía un pulso (*heartbeat*) que renueva el arriendo. Si el analista permanece inactivo por más de 15 minutos o regresa a la lista, el arriendo expira devolviendo el caso al pozo común.
- **Confirmación Atómica (*First-to-Submit*)**: En caso excepcional de concurrencia simultánea, el primer veredicto recibido por el servidor se consolida y bloquea intentos superpuestos.

---

## 4. Inspección del Expediente Integral (`/bandeja/:idCaso`)

Al hacer clic en **"Revisar Expediente"**, la plataforma despliega una vista integral consolidada en una sola pantalla, eliminando la necesidad de abrir herramientas de terceros o visores externos (RQF-009).

### 4.1. Visor de Evidencias con Detección Espacial de Hallazgos (RQF-020)

El costado izquierdo de la pantalla alberga el **Visor de Evidencias**, diseñado para agilizar la labor inspectiva del liquidador:
- **Pestañas de Documentos**: Permite alternar entre los distintos archivos adjuntos al expediente (boletas electrónicas, bonos Fonasa/Isapre, recetas médicas, informes de alta).
- **Capa de Bounding Boxes (Recuadros de Localización)**: Los hallazgos detectados por MIRA se dibujan directamente sobre las coordenadas exactas del documento:
  - **Recuadros Rojos Pulsantes**: Identifican alteraciones tipográficas, incoherencias de píxeles o presunto fraude documental.
  - **Recuadros Ámbar**: Destacan descalces de fechas, diferencias entre el copago calculado y el declarado, o antecedentes complementarios omitidos.
- **Interacción Bidireccional**: Al hacer clic sobre cualquier señal en el panel derecho, el visor enfoca de inmediato la coordenada del hallazgo, mostrando el valor extraído y el puntaje de confianza asignado.

### 4.2. Tratamiento de Archivos con Ilegibilidad Técnica (RQF-002)

Si una pieza de evidencia presenta problemas de escaneo, baja resolución o iluminación insuficiente, el visor no bloquea la gestión del siniestro. En su lugar, despliega una notificación descriptiva:

> **Aviso de Calidad**: *"Documento con baja legibilidad detectada (contraste deficiente en zona de firma). Puede examinar el resto de los documentos del caso o solicitar una reimpresión legible al asegurado mediante la opción Solicitar Antecedentes."*

---

## 5. Panel de Resolución Formal del Liquidador

Ubicado en la sección derecha inferior del expediente, este panel permite emitir el dictamen legal vinculante del siniestro.

### 5.1. Selección del Veredicto

El analista debe escoger una de las tres opciones disponibles:

1. **APROBAR (Botón Verde)**: Certifica que el siniestro cumple con la cobertura de la póliza y que los comprobantes son fidedignos.
2. **RECHAZAR (Botón Rojo)**: Determina la improcedencia del reembolso por exclusión de póliza, duplicidad o fraude constatado.
3. **SOLICITAR ANTECEDENTES (Botón Ámbar)**: Mantiene el caso en pausa controlada y requiere documentos complementarios al asegurado (ej. informe del médico tratante o desglose de hospitalización).

### 5.2. Motivo Explicativo Obligatorio (RQF-010)

> **Mandato de Calidad**: El botón de confirmación permanece **inhabilitado** hasta que el liquidador redacte una justificación fundamentada de al menos **10 caracteres**. 

El sistema cuenta con un contador en tiempo real (`X / 10 caracteres`). En la justificación se recomienda detallar:
- Los documentos inspeccionados.
- Las consultas adicionales realizadas con el prestador o prestadora de salud.
- El fundamento técnico que sustenta el veredicto adoptado.

### 5.3. Diálogo de Confirmación y Registro Inalterable

Al presionar **"Emitir Resolución Formal"**, se abre un diálogo modal de confirmación atómica que resume:
- El caso a resolver.
- El veredicto escogido y la justificación ingresada.
- Si existe discrepancia respecto a la recomendación de MIRA.
- Una advertencia de inmutabilidad legal.

Al presionar **"Confirmar y Sellar Veredicto"**, el caso transiciona al estado `RESUELTO`, se libera el arriendo de edición y se consolida la transacción inalterable en la base de datos de auditoría.

---

## 6. Monitoreo de Discrepancias (`/discrepancias`)

Diseñado para supervisores de siniestros y el equipo de aseguramiento de calidad de modelos de IA, este módulo lista todos los expedientes donde el veredicto humano se apartó del criterio algorítmico (CU-02 / RQF-011).

- **Propósito**: Proveer retroalimentación para la calibración periódica de las reglas del motor y el reentrenamiento de modelos de visión y lenguaje.
- **Detalle Visible**: ID de Caso, Fecha de Resolución, Operador responsable, Recomendación de MIRA vs. Veredicto del Liquidador, y la Justificación obligatoria completa.

---

## 7. Calibración de Umbrales y Apetito de Riesgo (`/configuracion`)

Accesible para usuarios con perfil de **Administrador de Riesgo**, este módulo permite ajustar dinámicamente los parámetros de aprobación del flujo (DEC-11 / RQF-006):

- **Umbral de Aprobación Automática (Valor por defecto: 90.0 puntos)**: Porcentaje mínimo de confianza ponderada requerido para que un expediente sea aprobado de forma automática e inmediata sin pasar por la bandeja.
- **Mínimo Basal de Seguridad (Valor por defecto: 60.0 puntos)**: Nivel mínimo que debe cumplir cada señal individual. Si una señal crítica obtiene una puntuación menor al mínimo basal, el caso es derivado a revisión asistida aunque su promedio supere los 90 puntos.
- **No Retroactividad (DEC-05)**: Toda modificación al umbral rige únicamente para siniestros ingresados con posterioridad a la calibración. Los casos históricos preservan intacto su veredicto original.
- **Auditoría Append-Only de Calibraciones**: Cada cambio genera una nueva versión secuencial (`v1`, `v2`, etc.) y queda registrado en la tabla inmutable `auditorias_umbral` con el usuario modificador, valores anteriores y nuevos.

---

## 8. Protocolos de Contingencia y Preguntas Frecuentes

### ¿Qué ocurre si se interrumpe la conexión con los modelos de IA externos? (PX-06)
La bandeja de revisión asistida opera sobre la infraestructura local de contingencia. Los casos derivados y sus evidencias permanecen resguardados en almacenamiento local, permitiendo que el liquidador continúe revisando y resolviendo casos con normalidad sin degradar el servicio ni arriesgar la pérdida de información.

### ¿Qué sucede si un caso supera las 72 horas hábiles sin resolverse?
El motor de temporizadores escala automáticamente el expediente al estado `VENCIDO_ESCALADO`, marcándolo con la máxima prioridad visual y despachando una alerta al supervisor de siniestros para su asignación inmediata.

### ¿Se puede rectificar una decisión humana emitida por error?
Por exigencias de cumplimiento regulatorio (RQNF-005), las decisiones formalizadas son inalterables y no admiten borrado ni edición directa. Ante un error material de liquidación, el supervisor debe ingresar un caso complementario vinculado (RQF-003) donde se exponga la rectificación justificada, garantizando la trazabilidad integral requerida por la CMF y auditores externos.

---

*Fin del Manual Operativo - Plataforma MIRA 2026*
