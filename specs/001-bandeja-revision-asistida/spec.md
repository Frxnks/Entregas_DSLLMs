# Especificación de Funcionalidad: F1 - Bandeja de revisión asistida

**Rama de Funcionalidad**: `001-bandeja-revision-asistida`  
**Fecha de Creación**: 2026-10-17  
**Estado**: Borrador (Listo para Planificación)  
**Entrada Original**: "F1 - Bandeja de revisión asistida - Lista de casos derivados, razón de derivación, desglose de señales, evidencia con ubicación del hallazgo, decisión del operador con motivo, marca de discrepancia, tiempo restante y alerta de vencimiento."

---

## Clarificaciones

### Sesión 2026-10-17
- Q: ¿Cuál debe ser la acción operativa por defecto que ejecute la plataforma cuando un caso derivado en la bandeja de revisión asistida exceda el plazo límite de resolución (SLA) sin que ningún operador haya emitido su decisión? (RQF-021) → A: Escalar automáticamente el caso a una cola de supervisión con estado `Vencido_Escalado` y notificar al supervisor de siniestros.
- Q: ¿Cómo debe computarse el tiempo restante y la cuenta regresiva del SLA para los casos derivados en la bandeja de revisión asistida? (RQF-021) → A: Computar el SLA en días y horas hábiles laborables (lunes a viernes 08:30–18:30 hrs), pausando en fines de semana y feriados nacionales de Chile.
- Q: ¿Cuál debe ser la política de expiración y liberación del bloqueo temporal de edición cuando un operador toma y abre un caso derivado en la bandeja de revisión asistida? (RQF-024) → A: Esquema híbrido (combinación A y C): lectura concurrente multiusuario permitida, con arriendo temporal de edición (lease) de 15 minutos renovable por actividad (heartbeat), liberación automática tras 15 minutos de inactividad y confirmación atómica de resolución (first-to-submit).

---

## 1. Escenarios de Usuario y Pruebas *(Obligatorio)*

### Historia de Usuario 1 - Visualización Integral del Caso Derivado y Localización de Hallazgos (Prioridad: P1)

Como operador liquidador de siniestros, quiero visualizar en una única pantalla la evidencia, el puntaje obtenido, el desglose de señales, la razón explícita de derivación y la ubicación exacta de los hallazgos en cada documento o imagen, para entender de inmediato la causa de derivación y evaluar la procedencia del caso sin tener que abrir sistemas externos ni buscar manualmente los datos relevantes.

**Por qué esta prioridad**: Es el núcleo operativo de la revisión asistida. Sin una visualización unificada y localizada de los hallazgos de MIRA, el operador pierde más del 50% de su tiempo buscando datos entre documentos o alternando con sistemas legados, anulando el valor del sistema (según se constata en §2.7 y la entrevista ENT5).

**Prueba Independiente**: Puede probarse de manera aislada ingresando un caso derivado con múltiples documentos (boleta e informe médico) que contenga discrepancias numéricas o alteraciones detectadas por el motor. El analista verifica que en una sola pantalla visualiza el caso, la razón de derivación, el desglose de señales y que, al hacer clic sobre un hallazgo, el visor lo sitúa de forma inmediata sobre la coordenada o sección exacta del archivo.

**Escenarios de Aceptación**:

1. **Dado** que un caso ha sido derivado a revisión asistida por discrepancia entre el monto de la boleta y el total declarado, **cuando** el operador selecciona y abre el caso desde su bandeja de trabajo, **entonces** la plataforma presenta en una única interfaz sin transiciones externas: el identificador único (`idCaso`), el puntaje global de confianza, el desglose analítico de las señales, el motivo textual explícito de derivación ("El monto de la boleta no coincide con la suma declarada") y la lista de piezas de evidencia asociadas.
2. **Dado** que el operador está inspeccionando una pieza de evidencia con hallazgos detectados por el motor de análisis, **cuando** el operador selecciona un hallazgo específico en el panel lateral de señales, **entonces** el visor integrado despliega el documento o imagen correspondiente, destacando visualmente la región espacial exacta (recuadro o resaltado de coordenadas) donde la plataforma localizó la discrepancia o alteración.
3. **Dado** que un caso contiene un archivo con problemas de legibilidad según la validación previa, **cuando** el operador abre dicho archivo en la pantalla de revisión, **entonces** el visor muestra la advertencia en lenguaje claro y no técnico indicando la causa específica (ej. "imagen desenfocada o baja resolución").

---

### Historia de Usuario 2 - Resolución del Caso por el Operador y Trazabilidad de Discrepancias (Prioridad: P1)

Como operador liquidador, quiero registrar mi decisión formal sobre el caso derivado (aprobar, rechazar o solicitar antecedentes adicionales) adjuntando obligatoriamente el motivo de mi resolución, de modo que mi decisión quede fijada de forma inalterable y cualquier contradicción con la sugerencia de MIRA sea marcada automáticamente para la mejora continua de los modelos.

**Por qué esta prioridad**: Garantiza el estricto cumplimiento del principio constitucional y regulatorio de control humano efectivo (Principio II / DEC-04 y §2.7). Asegura que ningún caso desfavorable se resuelva sin intervención humana y que las discrepancias alimenten el ciclo de calidad de la IA (§2.18).

**Prueba Independiente**: Se prueba abriendo un caso derivado con recomendación de "rechazar" por MIRA. El operador selecciona "aprobar", ingresa una justificación textual y confirma. Se valida que el caso pasa a estado resuelto, que los registros de auditoría no pueden ser alterados y que el caso queda automáticamente etiquetado como discrepancia para el equipo de modelos.

**Escenarios de Aceptación**:

1. **Dado** un operador con un caso derivado abierto en pantalla, **cuando** selecciona una acción resolutiva (aprobar, rechazar o solicitar antecedentes adicionales), **entonces** el sistema le exige el ingreso mandatario de un motivo o justificación textual antes de habilitar la confirmación.
2. **Dado** que el operador confirma su resolución con su motivo, **cuando** el sistema persiste la decisión, **entonces** se genera un registro de auditoría inalterable que contiene: identificación del operador (autenticado vía SSO), estampa de tiempo exacta, decisión tomada, justificación ingresada y estado final del caso.
3. **Dado** que la sugerencia generada por MIRA era desfavorable (rechazar/derivar por riesgo alto) y el operador decide aprobar el caso (o viceversa), **cuando** se registra la decisión, **entonces** el sistema marca automáticamente el caso con la etiqueta de `Discrepancia_Operador_Modelo` y lo envía a la cola de monitoreo del equipo de modelos sin alterar la validez legal inmediata de la decisión del liquidador.

---

### Historia de Usuario 3 - Lista de Casos Derivados, Tiempo Restante y Alertas de Vencimiento de SLA (Prioridad: P2)

Como operador y supervisor de siniestros, quiero visualizar una lista priorizada de todos los casos derivados pendientes en mi bandeja, monitoreando el tiempo restante de cada uno respecto al plazo comprometido (SLA) y recibiendo alertas visuales de vencimiento inminente, para gestionar la carga de trabajo y asegurar que ningún caso supere los límites de tiempo acordados con los asegurados y los entes reguladores.

**Por qué esta prioridad**: La aseguradora tiene plazos perentorios de resolución (3 días hábiles internos / 5 días normativos según ENT4 y §2.7). La ausencia de visibilidad de tiempos restantes y alertas tempranas arriesga multas regulatorias y deterioro del servicio al cliente.

**Prueba Independiente**: Se despliega una bandeja con múltiples casos derivados con diferentes marcas temporales de ingreso. Se verifica que la lista ordena los casos por urgencia, calcula correctamente el tiempo restante decreciente y destaca en colores de advertencia (ámbar/rojo) aquellos casos a menos de 24 horas del vencimiento del SLA.

**Escenarios de Aceptación**:

1. **Dado** un operador autenticado que ingresa a la bandeja de revisión asistida, **cuando** carga la interfaz principal, **entonces** el sistema despliega la lista completa de casos derivados pendientes asignables a su perfil, indicando por cada caso: `idCaso`, fecha/hora de derivación, razón principal resumida, nivel de riesgo/fraude y tiempo restante para el cumplimiento del SLA.
2. **Dado** un caso cuyo tiempo restante de resolución es inferior al umbral de advertencia configurado (ej. menos de 24 horas hábiles), **cuando** se muestra en la lista o en la vista de detalle, **entonces** la plataforma exhibe una alerta visual prominente de "Vencimiento Inminente" destacando la urgencia operativa.
3. **Dado** un caso que ha superado el plazo máximo de resolución establecido por el cliente sin haber recibido decisión de un operador, **cuando** el tiempo expira, **entonces** el caso pasa automáticamente al estado crítico de `Vencido_Escalado`, es transferido a la cola de supervisión prioritaria y se emite una notificación de contingencia al supervisor de siniestros (conforme a RQF-021 y §2.15).

---

### Casos Borde y Excepciones

- **Evidencia con falla de legibilidad o archivo corrupto**: Si una pieza del expediente no es legible (RQF-002), el visor debe mostrar el mensaje en lenguaje comprensible (ej. "Documento ilegible por iluminación insuficiente") permitiendo al operador revisar el resto de los documentos del caso o solicitar antecedentes complementarios sin bloquear la bandeja.
- **Concurrencia entre operadores y bloqueo híbrido de edición**: Múltiples operadores pueden consultar concurrentemente el caso y su evidencia en modo lectura. Cuando un operador inicia la resolución formal, el sistema asigna un arriendo temporal de edición (*lease*) de 15 minutos renovable mediante pulsos periódicos de actividad (*heartbeat*), notificando visualmente a otros visores que el caso se encuentra en edición activa. Tras 15 minutos de inactividad o cierre voluntario de la vista, el bloqueo se libera automáticamente devolviendo el caso al pool general; la confirmación resolutiva final es atómica (*first-to-submit*), rechazando intentos simultáneos con un mensaje de alerta en tiempo real.
- **Llegada de nueva evidencia sobre un caso en revisión o ya cerrado**: Si ingresa nueva evidencia para un siniestro ya cerrado, MIRA no reabre el caso cerrado sino que crea un caso nuevo vinculado al anterior (RQF-003), mostrándolo en la bandeja como caso vinculado con referencia al historial previo.
- **Caída de servicios externos durante la revisión**: Si los modelos o servicios externos experimentan indisponibilidad, el operador puede continuar revisando la evidencia ya almacenada localmente y emitir su decisión, garantizando la continuidad operativa sin pérdida de casos (RQNF-006).
- **Cómputo de SLA y exclusión de días no laborables**: El cálculo del tiempo restante y la cuenta regresiva del SLA (RQF-021) se computa en días y horas hábiles laborables (lunes a viernes de 08:30 a 18:30 hrs), pausando automáticamente el conteo durante las noches, fines de semana y feriados oficiales de Chile para prevenir falsas alertas de vencimiento durante períodos inhábiles.

---

## 2. Requerimientos *(Obligatorio)*

### Matriz de Trazabilidad de Requisitos Funcionales (RQF)

A continuación se presenta la tabla integral de requisitos funcionales que sustentan la funcionalidad **F1 - Bandeja de revisión asistida**, conservando con estricta validez los identificadores existentes de `LLMS.docx` e incorporando los nuevos requisitos funcionales derivados directamente del documento fundacional `Descripción del proyecto.docx`:

| ID | Tipo | Requisito | Prioridad | Fuente | Verif. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RQF-007** | Funcional | No emitir rechazos 100% automáticos: todo caso con puntaje insuficiente o señal de fraude se deriva a revisión humana. | Must | ENT6, DEC-04 | PF-07 |
| **RQF-008** | Funcional | Derivar a la bandeja de revisión todo caso bajo el umbral o con alerta de fraude activa. | Must | §2.7, ENT6, DEC-04 | PF-08 |
| **RQF-009** | Funcional | Mostrar al operador, en una sola pantalla, la evidencia, el puntaje, el desglose de señales y la razón de derivación. | Must | §2.7, ENT4, ENT5 | PF-09 |
| **RQF-010** | Funcional | Registrar de forma inalterable la decisión del operador y su motivo. | Must | §2.11 | PF-10 |
| **RQF-011** | Funcional | Marcar un caso para revisión del equipo de modelos cuando el operador contradiga la sugerencia de MIRA. | Must | §2.18, DEC-04 | PF-11 |
| **RQF-020** | Funcional | Permitir al operador inspeccionar cada pieza de evidencia visualizando el hallazgo detectado y su ubicación espacial exacta dentro del documento o imagen analizada. | Must | §2.5, §2.7, ENT5 | PF-20 |
| **RQF-021** | Funcional | Mostrar en la bandeja de revisión asistida el tiempo restante para la resolución de cada caso según el plazo comprometido computado en días y horas hábiles (lunes a viernes 08:30–18:30 hrs, excluyendo fines de semana y feriados de Chile), emitir alertas visuales cuando un caso esté próximo a vencer (<24h hábiles), y al expirar el plazo sin decisión, escalarlo automáticamente a supervisión con estado `Vencido_Escalado` notificando al supervisor. | Must | §2.7, §2.15, §3, ENT4 | PF-21 |
| **RQF-024** | Funcional | Proveer una interfaz de lista de trabajo en la bandeja de revisión asistida que presente los casos derivados asignables ordenados por prioridad y SLA, soportando lectura concurrente multiusuario y asignando un arriendo temporal de edición (lease de 15 min renovable por heartbeat, liberable tras 15 min de inactividad) con confirmación atómica (first-to-submit) para prevenir colisiones resolutivas. | Must | §2.7, §2.15, ENT4 | PF-24 |

---

### Justificación y Citación Textual de Fuentes para Nuevos Requisitos Funcionales

Para conferir plena validez y trazabilidad conforme a la metodología de ingeniería de requisitos establecida en `LLMS.docx`, se documentan a continuación las citas directas desde `docs/entrega1/Descripción del proyecto.docx` que originan cada nuevo requisito:

1. **RQF-020 (Inspección de evidencia con ubicación espacial del hallazgo)**:
   - **Fuente §2.7 (La revisión asistida)**: *"Debe poder abrir cada pieza de evidencia, ver qué encontró la plataforma en ella y en qué parte del documento o de la imagen lo encontró."*
   - **Fuente ENT5 (Marco Peñailillo, analista liquidador)**: *"Buscar. No revisar: buscar. El monto está en la boleta, la fecha está en el bono, el diagnóstico está en un certificado que a veces viene y a veces no. Yo paso la mitad del tiempo encontrando el dato y la otra mitad decidiendo. Si la máquina me subraya dónde está cada cosa, me cambia el día... Si la máquina dice que el total es ciento veinte mil, quiero ver dónde lo leyó, apretar ahí y que me lleve al pedazo de la boleta."*
   - **Fuente §2.5 (El motor de análisis)**: *"Sobre documentos, debe extraer el texto y entender su estructura: identificar de qué tipo de documento se trata, dónde están los campos relevantes, si hay firmas y timbres... Sobre imágenes, debe describir lo que se ve, detectar objetos y daños, y evaluar si la imagen fue alterada."*

2. **RQF-021 (Tiempo restante y alertas de vencimiento de SLA)**:
   - **Fuente §2.7 (La revisión asistida)**: *"Un caso derivado a revisión debe resolverse dentro del plazo comprometido por el cliente con sus propios asegurados, de modo que la plataforma debe mostrar el tiempo restante y alertar cuando un caso lleve demasiado tiempo detenido."*
   - **Fuente §2.15 (Notificaciones y alertas)**: *"Al operador le corresponde saber cuándo entró un caso a su bandeja y cuándo un caso está por vencer el plazo comprometido."*
   - **Fuente ENT4 (Francisca Leiva, subgerenta de operaciones)**: *"Tenemos comprometidos cinco días hábiles con el asegurado, pero la comisión del mercado nos mide en tres. Internamente trabajamos con tres días. Si un caso queda detenido esperando que alguien lo mire, necesito verlo antes de que se me venza, no después."*
   - **Fuente §3 (Comportamiento esperado del sistema)**: *"El cliente decide qué se hace con los casos que exceden el plazo de resolución sin que nadie los revise: cerrarlos, escalarlos o mantenerlos abiertos."*

3. **RQF-024 (Lista de casos derivados y gestión de trabajo en bandeja)**:
   - **Fuente §2.7 (La revisión asistida)**: *"Los casos que no se resuelven solos llegan a una bandeja de trabajo. Esta parte del producto casi no existe hoy y es, según el cliente piloto, la que decide si la plataforma se usa o no. El operador debe ver, en una sola pantalla, la evidencia del caso, el puntaje obtenido, el desglose de las señales y —sobre todo— la razón por la cual el caso fue derivado."*
   - **Fuente §2.15 (Notificaciones y alertas)**: *"Al operador le corresponde saber cuándo entró un caso a su bandeja y cuándo un caso está por vencer el plazo comprometido. Al supervisor le corresponde enterarse cuando la bandeja crece por sobre lo habitual..."*

---

### Casos de Prueba de Verificación Funcional Asociados

| ID | Verifica | Precondición | Pasos | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **PF-07** | RQF-007 | Caso con puntaje 45 (bajo el umbral). | Ejecutar el motor de reglas sobre el caso. | El sistema no emite rechazo automático; el caso se deriva obligatoriamente a revisión humana. |
| **PF-08** | RQF-008 | Caso con puntaje 95 pero con alerta de fraude activa. | Ejecutar el motor de reglas. | El caso se deriva a revisión pese al puntaje alto (la señal de fraude prevalece sobre el puntaje). |
| **PF-09** | RQF-009 | Caso derivado presente en la bandeja. | El operador abre el caso desde su bandeja. | La pantalla muestra evidencia, puntaje, señales y la razón de derivación en una sola vista, sin necesidad de otro sistema. |
| **PF-10** | RQF-010 | Operador con caso derivado abierto. | El operador aprueba el caso ingresando un motivo. | La decisión y el motivo quedan guardados de forma inalterable, con fecha, hora y autor. |
| **PF-11** | RQF-011 | MIRA sugiere “rechazar”; el operador decide “aprobar”. | El operador registra su decisión, contraria a la sugerencia. | Se guarda la decisión del operador tal como la tomó; el caso queda marcado automáticamente para revisión del equipo de modelos. |
| **PF-20** | RQF-020 | Caso en bandeja con hallazgo de inconsistencia en boleta. | El operador hace clic en el hallazgo en el desglose de señales. | El visor enfoca y destaca la coordenada exacta de la boleta donde se ubica el hallazgo detectado. |
| **PF-21** | RQF-021 | Caso con plazo comprometido de 3 días que alcanza su límite de tiempo sin resolución de un operador. | Monitorear el temporizador del caso al expirar el SLA. | El caso transiciona automáticamente a estado `Vencido_Escalado`, se transfiere a la cola de supervisión prioritaria y se despacha notificación al supervisor. |
| **PF-24** | RQF-024 | Dos operadores abren simultáneamente el mismo caso derivado de la lista de trabajo. | Ambos operadores visualizan la evidencia en lectura; el Operador 1 toma la edición y el Operador 2 intenta resolver en paralelo. | Ambos visualizan la evidencia en lectura; el Operador 1 adquiere el lease de edición (15 min con heartbeat); la interfaz del Operador 2 muestra advertencia de edición activa por otro usuario; tras 15 min de inactividad de Op1, el lease se libera automáticamente; la confirmación final es atómica sin colisiones. |

---

### Entidades Principales del Dominio

- **BandejaRevision**: Conjunto ordenado y priorizado de casos derivados que requieren intervención humana resolutiva, con filtros por estado, plazo restante y severidad de riesgo.
- **Caso**: Unidad fundamental de tramitación identificada por `idCaso` único, permanente e inalterable, que almacena el expediente del siniestro, estado del ciclo de vida, puntaje global, motivo de derivación, fecha límite de SLA y atributos de concurrencia híbrida (`bloqueoEdicion`: usuario activo, timestamp y expiración de lease de 15 min).
- **PiezaEvidencia**: Archivo digital (documento escaneado, fotografía, PDF) aportado como respaldo del caso, con atributos de legibilidad, texto extraído, capas de metadatos y hallazgos asociados.
- **HallazgoLocalizado**: Objeto de señalamiento analítico generado por un módulo de análisis (ej. monto incongruente, fecha desfasada, edición de imagen) que cuenta con descripción técnica, texto identificado y coordenadas espaciales (`bounding box` o región delimitada) dentro de la pieza de evidencia.
- **DesgloseSenales**: Estructura analítica compuesta por los resultados individuales de cada módulo activo (autenticidad documental, consistencia biométrica, cruce de fuentes, señales de fraude) que justifican de forma transparente el puntaje global.
- **DecisionOperador**: Registro legal inalterable generado por la acción resolutiva del liquidador (`Aprobado`, `Rechazado`, `Solicitud_Antecedentes`), que incluye identificador del usuario autenticado vía SSO, fecha/hora exacta, justificación textual obligatoria y bandera de discrepancia.
- **AlertaVencimientoSLA**: Componente de monitoreo de tiempo que computa la diferencia entre la fecha/hora de ingreso a la bandeja y el plazo comprometido por la aseguradora en días y horas hábiles laborables (lunes a viernes 08:30–18:30 hrs, excluyendo feriados nacionales de Chile, nominalmente 3 días hábiles según ENT4), emitiendo indicadores de estado (`En_Plazo`, `Proximo_A_Vencer`, `Vencido_Escalado`).

---

## 3. Criterios de Éxito *(Obligatorio)*

### Resultados Medibles

- **SC-001**: El operador humano puede inspeccionar toda la información esencial de un caso derivado (evidencia, puntaje, desglose de señales, razón de derivación y ubicación de hallazgos) en una vista consolidada en menos de 2 segundos de tiempo de carga inicial (RQNF-008).
- **SC-002**: El 100% de los casos derivados a la bandeja contienen un motivo explícito de derivación comprensible en lenguaje natural de negocio, eliminando derivaciones opacas basadas únicamente en números crudos.
- **SC-003**: En el 100% de los documentos e imágenes con hallazgos de inconsistencia o alteración, el operador puede navegar con un solo clic a la región espacial exacta del hallazgo resaltada en el visor.
- **SC-004**: El 100% de las resoluciones de operadores quedan guardadas con carácter inalterable (autor, fecha y motivo), cumpliendo con el principio de que ningún caso desfavorable quede rechazado sin intervención humana calificada (Principio II / DEC-04).
- **SC-005**: El 100% de las discrepancias entre la recomendación de MIRA y la decisión humana quedan automáticamente registradas y etiquetadas para auditoría del equipo de modelos (§2.18).
- **SC-006**: La bandeja de trabajo calcula y refresca en tiempo real el tiempo restante de resolución de cada caso en horario hábil laborable (pausando en noches, fines de semana y feriados oficiales de Chile), disparando alertas visuales automáticas para el 100% de los casos que alcancen el umbral de vencimiento inminente (< 24 horas hábiles restantes).

---

## 4. Supuestos y Dependencias

- **Supuesto de usuarios y perfiles**: Los operadores que utilizan la bandeja son liquidadores o analistas de riesgo debidamente autenticados mediante SSO corporativo (SAML/OAuth2) provisto por el directorio de la aseguradora (RQF-013).
- **Supuesto de alcance de canal**: Para el MVP (enero 2027), la bandeja soporta documentos (PDF, boletas, bonos médicos) e imágenes (fotografías de respaldo), difiriendo la inspección de audio y video para la versión multimodal de abril 2027 (DEC-10).
- **Dependencia de configuración de SLA**: El cliente asegurador define formalmente en el sistema los plazos máximos comprometidos para la resolución de casos derivados (valor base: 3 días hábiles según ENT4).
- **Dependencia de almacenamiento seguro**: La visualización de evidencia consume los archivos cifrados almacenados en territorio chileno, preservando la inalterabilidad de los documentos originales (Principio III y VI).
