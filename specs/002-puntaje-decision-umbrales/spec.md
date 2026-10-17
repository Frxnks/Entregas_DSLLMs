# Especificación de Funcionalidad: F4 - Puntaje y decisión por umbrales

**Rama de Funcionalidad**: `002-puntaje-decision-umbrales`  
**Fecha de Creación**: 2026-10-17  
**Estado**: Borrador (Listo para Planificación)  
**Entrada Original**: "F4 - Puntaje y decisión por umbrales - Cálculo del puntaje con componentes, mínimos por señal, precedencia de señales de fraude y decisión resultante."

---

## 1. Escenarios de Usuario y Pruebas *(Obligatorio)*

### Historia de Usuario 1 - Cálculo del Puntaje de Confianza Multimodal Explicable (Prioridad: P1)

Como plataforma MIRA y analista de riesgo, quiero que el motor calcule un puntaje de confianza numérico consolidado (escala 0 a 100) para cada caso analizado, acompañado del desglose explícito de sus componentes de señal (autenticidad documental, consistencia biométrica, cruce entre fuentes y señales de fraude), para que tanto los sistemas consumidores como los operadores humanos comprendan exactamente los factores cuantitativos que determinaron la evaluación.

**Por qué esta prioridad**: Es la base analítica fundamental de MIRA (§2.5 y §2.6). Un puntaje numérico agregado sin desglose de componentes impide la explicabilidad de las decisiones y no permite distinguir la calidad diferenciada de los hallazgos en cada modalidad analizada.

**Prueba Independiente**: Se ejecuta el motor sobre un expediente médico de prueba con boleta legible y datos validados. Se verifica que el motor emite un puntaje entero entre 0 y 100 y una estructura detallada que desagrega el aporte ponderado de la autenticidad documental, consistencia de datos y ausencia de indicadores de fraude.

**Escenarios de Aceptación**:

1. **Dado** un caso ingresado con toda su evidencia analizable y legible, **cuando** el motor de análisis procesa las piezas del expediente, **entonces** calcula y retorna un puntaje de confianza acotado entre 0 y 100 puntos enteros.
2. **Dado** que se ha calculado el puntaje global del caso, **cuando** se consulta el resultado de la evaluación, **entonces** el sistema provee el desglose completo de cada componente evaluado (autenticidad de documentos, coherencia biométrica, consistencia cruzada de datos y detección de fraude), indicando el puntaje obtenido por cada dimensión y los hallazgos que empujaron el valor hacia arriba o hacia abajo.
3. **Dado** un expediente con información incompleta o ausencia de una señal requerida en el flujo, **cuando** el motor ejecuta la evaluación, **entonces** el sistema nunca asume la ausencia de señal como favorable (§3) y emite un puntaje que refleja la falta de antecedentes, indicando explícitamente qué señal o pieza de información faltó.

---

### Historia de Usuario 2 - Aplicación de Precedencia Absoluta de Señales de Fraude (Prioridad: P1)

Como oficial de cumplimiento y administrador de riesgo, quiero que cualquier señal de fraude activa prevalezca de manera estricta y absoluta sobre el puntaje global del caso, bloqueando de inmediato cualquier aprobación automática y forzando la derivación a revisión humana asistida, para garantizar que ningún caso sospechoso o fraudulento sea aprobado por el sistema.

**Por qué esta prioridad**: Es una regla estricta de negocio y principio de seguridad de MIRA (§3 y Principio Constitucional II). Un caso con documentos aparentemente coherentes pero con indicios de manipulación o suplantación jamás puede ser aprobado por la máquina, sin importar cuán alto sea su puntaje global.

**Prueba Independiente**: Se somete a evaluación un caso cuyo puntaje global ponderado sea de 95 puntos (muy por sobre el umbral de aprobación), pero que contenga una alerta activa de manipulación digital en una imagen o boleta. Se comprueba que el motor no emite aprobación automática y lo deriva inmediatamente a la bandeja de revisión humana con rótulo de alerta de fraude prioritaria.

**Escenarios de Aceptación**:

1. **Dado** un caso evaluado cuyo puntaje de confianza global supere el umbral de aprobación automática configurado (ej. puntaje 95 con umbral en 90), **cuando** el motor detecta al menos una señal de fraude activa en cualquiera de las piezas analizadas, **entonces** la plataforma aplica la regla de precedencia absoluta de fraude, inhabilita la aprobación automática y deriva obligatoriamente el caso a revisión asistida.
2. **Dado** un caso derivado por precedencia de fraude, **cuando** el caso ingresa a la bandeja de trabajo humana, **entonces** se etiqueta con prioridad alta y se destaca en la interfaz la alerta específica de fraude que forzó la derivación.
3. **Dado** un caso con señal de fraude activa pero con puntaje bajo (ej. 40 puntos), **cuando** el motor determina el veredicto, **entonces** el sistema jamás emite un rechazo 100% automático (Principio Constitucional II / DEC-04), derivando el caso a revisión humana especializada con la totalidad de antecedentes.

---

### Historia de Usuario 3 - Decisión por Umbrales y Control Estricto de Mínimos por Señal (Prioridad: P1)

Como administrador de riesgo, quiero que la decisión resultante del caso determine la aprobación automática únicamente cuando el puntaje alcance el umbral configurado, no existan alertas de fraude y cada señal individual cumpla con su valor mínimo establecido por flujo, derivando a revisión asistida todo caso que no satisfaga estas condiciones conjuntas.

**Por qué esta prioridad**: Evita el riesgo de "aprobaciones mediocres" levantado por los líderes técnicos y de operaciones (ENT3 y ENT4). Un caso con puntaje total alto debido a una señal excelente no debe compensar una señal crítica deficiente (ej. biometría irregular o comprobante dudoso).

**Prueba Independiente**: Se parametriza un flujo con umbral global de aprobación en 90 puntos y un mínimo específico para la señal de consistencia documental en 80 puntos. Se procesa un caso que obtiene 92 puntos en total pero solo 65 en consistencia documental. Se verifica que el motor rechaza la aprobación automática y lo deriva a revisión humana indicando el incumplimiento del mínimo por señal.

**Escenarios de Aceptación**:

1. **Dado** un caso sin señales de fraude activas y con todas sus señales individuales sobre sus mínimos configurados, **cuando** el puntaje total calculado es mayor o igual al umbral de aprobación del flujo (ej. puntaje 93 frente a umbral de 90), **entonces** el sistema emite la decisión de **Aprobación Automática** sin requerir intervención humana, registrando la validación como facturable (DEC-01 / RQF-015).
2. **Dado** un caso cuyo puntaje total supera el umbral de aprobación (ej. puntaje 91 frente a umbral de 90), **cuando** una o más señales individuales obtienen una calificación inferior a su mínimo configurado en el flujo, **entonces** el sistema no aprueba automáticamente el caso y emite la decisión de **Derivación a Revisión Asistida**, consignando como razón de derivación el incumplimiento del mínimo de la señal correspondiente.
3. **Dado** un caso cuyo puntaje total se ubica por debajo del umbral de aprobación automática y no presenta señales de fraude (ej. puntaje 72 frente a umbral de 90), **cuando** el motor evalúa los umbrales, **entonces** el sistema emite la decisión de **Derivación a Revisión Asistida**, prohibiendo categóricamente cualquier rechazo 100% automático.

---

### Historia de Usuario 4 - Configuración y Auditoría de Umbrales y Mínimos por Flujo (Prioridad: P2)

Como administrador de riesgo de la organización cliente, quiero configurar los umbrales de aprobación y los mínimos exigidos para cada señal según el flujo de negocio, manteniendo una bitácora inalterable de cada cambio con autor, fecha/hora y valor anterior, para gobernar el apetito de riesgo de mi entidad sin requerir modificaciones de software.

**Por qué esta prioridad**: La plataforma atiende múltiples productos y organizaciones con perfiles de riesgo disímiles (§2.6 y DEC-11). La calibración de umbrales debe ser autónoma para el cliente pero estrictamente trazable para efectos de auditoría regulatoria.

**Prueba Independiente**: Un usuario con perfil Administrador de Riesgo modifica el umbral de aprobación de un flujo de 90 a 85 puntos y establece un mínimo de 70 para la señal biométrica. Se valida que el nuevo valor entra en vigencia para los casos nuevos, que se preserva la versión anterior del flujo y que queda registrado el usuario, fecha y valores previos.

**Escenarios de Aceptación**:

1. **Dado** un Administrador de Riesgo autenticado en el diseñador de flujos, **cuando** ajusta el umbral de aprobación automática o los mínimos individuales por señal y publica la nueva versión del flujo, **entonces** la plataforma persiste el cambio generando una nueva versión inmutable del flujo y registrando en la auditoría el autor (RUT/email), fecha, hora, valor nuevo y valor previo.
2. **Dado** un flujo que cuenta con casos en proceso de análisis al momento de una modificación de umbral, **cuando** dichos casos finalizan su evaluación, **entonces** se evalúan contra la versión de umbrales con la que iniciaron su tramitación, garantizando la consistencia y no retroactividad (§3).
3. **Dado** un intento de publicación de flujo donde se pretenda configurar un umbral de aprobación automática sin módulos de análisis activos o con umbrales inconsistentes (ej. menor a 0 o mayor a 100), **cuando** el usuario solicita publicar, **entonces** la plataforma bloquea la acción emitiendo el mensaje de validación correspondiente (PF-06b).

---

### Casos Borde y Excepciones

- **Puntaje en el límite exacto del umbral**: Si el puntaje total coincide exactamente con el valor del umbral configurado (ej. puntaje 90 con umbral en 90) y no hay señales de fraude ni mínimos incumplidos, el caso se aprueba automáticamente; si el puntaje es 89.9 (o estrictamente inferior a 90), se deriva obligatoriamente a revisión asistida.
- **Caso con puntaje 0 o falla de procesamiento en componentes**: Si la evidencia no puede ser procesada por falla de lectura o formato, el sistema no emite una decisión favorable ficticia; se deriva a revisión indicando el fallo técnico de lectura en lenguaje comprensible (RQF-002).
- **Prohibición absoluta de rechazo 100% automático**: Bajo ninguna circunstancia de puntaje (incluso con puntaje 0 o con múltiples señales críticas desfavorables) la plataforma MIRA emitirá una resolución final de "Rechazado" sin intervención humana resolutiva (Principio II de la Constitución y DEC-04). Todo caso bajo el umbral se deriva a la bandeja de trabajo para revisión de un operador.
- **Señales sin mínimo configurado**: Si para una señal particular el área de riesgo no ha configurado un umbral mínimo específico, dicha señal aporta a la ponderación global sin gatillar por sí sola la regla de derivación por mínimo, rigiendo únicamente el umbral global y la regla de fraude.

---

## 2. Requerimientos *(Obligatorio)*

### Matriz de Trazabilidad de Requisitos Funcionales (RQF)

A continuación se detalla la matriz unificada de requisitos funcionales que rigen la funcionalidad **F4 - Puntaje y decisión por umbrales**, conservando con rigor los identificadores consagrados en `LLMS.docx` e integrando los nuevos requisitos funcionales derivados directamente del documento fundacional `Descripción del proyecto.docx`:

| ID | Tipo | Requisito | Prioridad | Fuente | Verif. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RQF-004** | Funcional | Calcular un puntaje de confianza (0–100) por caso, con el desglose de las señales que lo componen. | Must | §2.5, §2.6 | PF-04 |
| **RQF-005** | Funcional | Aprobar automáticamente un caso solo si el puntaje alcanza el umbral configurado y no hay señales de fraude activas. | Must | §2.6, DEC-11 | PF-05 |
| **RQF-006** | Funcional | Permitir configurar el umbral de aprobación por flujo, registrando autor, fecha y valor anterior de cada cambio. | Must | §2.6, ENT4, DEC-11 | PF-06, PF-06b |
| **RQF-007** | Funcional | No emitir rechazos 100% automáticos: todo caso con puntaje insuficiente o señal de fraude se deriva a revisión humana. | Must | ENT6, DEC-04 | PF-07 |
| **RQF-008** | Funcional | Derivar a la bandeja de revisión todo caso bajo el umbral o con alerta de fraude activa. | Must | §2.7, ENT6, DEC-04 | PF-08 |
| **RQF-022** | Funcional | Derivar obligatoriamente a revisión asistida cualquier caso en el que una o más señales individuales no alcancen el umbral mínimo configurado para dicha señal, aun cuando el puntaje global supere el umbral de aprobación automática. | Must | §2.6, ENT3, ENT4 | PF-22 |
| **RQF-023** | Funcional | Aplicar la regla de precedencia absoluta a las señales de fraude sobre el puntaje total, de modo que cualquier señal de fraude activa inhabilite la aprobación automática y obligue a la derivación a revisión humana o escalamiento, independientemente del puntaje calculado. | Must | §2.6, §3, DEC-04 | PF-23 |

---

### Justificación y Citación Textual de Fuentes para Nuevos Requisitos Funcionales

Conforme a la metodología formal de auditoría de requisitos y las pautas establecidas en `LLMS.docx`, se documentan a continuación las citas textuales íntegras extraídas desde `docs/entrega1/Descripción del proyecto.docx` que validan la incorporación de los nuevos requerimientos funcionales:

1. **RQF-022 (Derivación por incumplimiento de mínimos individuales por señal)**:
   - **Fuente §2.6 (El nivel de confianza y la decisión)**: *"Cuando el puntaje sea suficiente pero alguna señal individual esté por debajo de su mínimo, el caso debe derivarse a revisión aunque el total lo permita. El detalle de qué señales tienen mínimo propio y cuáles son sus valores está pendiente de definir con el área de riesgo del cliente piloto."*
   - **Fuente ENT3 (Sebastián Alarcón, líder de ingeniería de modelos)**: *"Comercialmente es brillante y técnicamente es peligroso. Un número entre cero y cien esconde que las señales miden cosas distintas. Un ochenta y siete por documentos perfectos y biometría regular no es lo mismo que un ochenta y siete por todo mediocre. Si el flujo solo mira el total, vamos a aprobar automáticamente casos que ningún analista aprobaría. Por eso insisto en los mínimos por señal, aunque nadie ha definido cuáles son."*
   - **Fuente ENT4 (Francisca Leiva, subgerenta de operaciones de siniestros)**: *"Si el flujo solo mira el total, vamos a aprobar automáticamente casos que ningún analista aprobaría. Por eso insisto en los mínimos por señal, aunque nadie ha definido cuáles son."*

2. **RQF-023 (Precedencia absoluta de señales de fraude sobre el puntaje)**:
   - **Fuente §3 (Comportamiento esperado del sistema)**: *"Las señales de fraude tienen precedencia sobre el puntaje total. Un caso con una señal de fraude activa se deriva o se escala, cualquiera sea su puntaje... La ausencia de una señal nunca se interpreta como señal favorable."*
   - **Fuente §2.6 (El nivel de confianza y la decisión)**: *"La aprobación automática debe aplicarse a partir de 80 puntos cuando el caso no presente ninguna señal de fraude activa."*
   - **Fuente Principio Constitucional II (Control Humano y Prohibición de Rechazo Automático) [DEC-04]**: *"El sistema NUNCA DEBE emitir rechazos 100% automáticos sobre casos de personas [DEC-04]. Todo caso cuyo puntaje sea inferior al umbral de aprobación automática configurado o que presente señales de alerta o fraude activas DEBE derivarse obligatoriamente a la bandeja de revisión asistida para evaluación y resolución por parte de un operador humano calificado (liquidador) [DEC-04]. Jamás podrá quedar un caso rechazado sin intervención humana resolutiva."*

---

### Casos de Prueba de Verificación Funcional Asociados

| ID | Verifica | Precondición | Pasos | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **PF-04** | RQF-004 | Caso con evidencia completa y legible. | Ejecutar el motor de análisis y ponderación sobre el caso. | Se obtiene un puntaje acotado en 0–100 con el desglose pormenorizado de cada señal que lo compone. |
| **PF-05** | RQF-005 | Umbral de aprobación en 90; caso sin señales de fraude ni mínimos incumplidos. | Procesar un caso con puntaje calculado en 93. | El caso se aprueba automáticamente sin intervención humana y se marca como validación facturable. |
| **PF-06** | RQF-006 | Administrador de Riesgo autenticado en el diseñador de flujos. | Modificar el umbral de aprobación de 90 a 85 y publicar el flujo. | Se guarda el nuevo valor con autor, fecha, hora y valor previo; la versión anterior del flujo se conserva inmutable. |
| **PF-06b** | RQF-006 | Administrador de Riesgo autenticado, editando un flujo sin módulos de análisis activos. | Intentar publicar el flujo sin ningún módulo activo. | La publicación se rechaza de forma síncrona; el flujo no queda publicado. |
| **PF-07** | RQF-007 | Caso con puntaje 45 (bajo el umbral). | Ejecutar el motor de reglas sobre el caso. | El sistema no emite rechazo automático; el caso se deriva obligatoriamente a revisión humana. |
| **PF-08** | RQF-008 | Caso con puntaje 95 pero con alerta de fraude activa. | Ejecutar el motor de reglas de decisión. | El caso se deriva a revisión asistida pese a su puntaje sobresaliente (la señal de fraude prevalece). |
| **PF-22** | RQF-022 | Caso con puntaje global de 92 (superior al umbral de 90), pero con señal biométrica en 50 (mínimo de dicha señal configurado en 60). | Ejecutar el motor de reglas y evaluación de umbrales. | El caso no se aprueba automáticamente; se deriva a revisión asistida indicando como causa el incumplimiento del mínimo en biometría. |
| **PF-23** | RQF-023 | Caso con puntaje global de 98 y señal de fraude documental activa. | Ejecutar el motor de reglas. | La regla de precedencia intercepta el caso; se impide la aprobación automática y se deriva de inmediato con prioridad alta a revisión humana. |

---

### Entidades Principales del Dominio

- **Caso**: Instancia del expediente procesado con identificador permanente `idCaso`, versión del flujo aplicada y veredicto resolutivo final.
- **PuntajeConfianza**: Valor cuantitativo normalizado entre 0 y 100 que resume el grado de certeza de legitimidad del caso.
- **ComponenteSenal**: Dimensión específica evaluada (Documentos, Biometría, Cruce de Fuentes, Fraude) que contiene: identificador del módulo generador, puntaje parcial (0–100), ponderación en el flujo, umbral mínimo particular (opcional) y estado de bandera de fraude (`Activa`/`Inactiva`).
- **UmbralFlujo**: Esquema de calibración de riesgo gobernado por la organización, que establece: umbral general de aprobación automática (valor por defecto en piloto: 90 puntos [DEC-11]), umbrales mínimos por componente de señal y reglas de precedencia.
- **DecisionResultante**: Estado resolutivo formal determinado por la máquina (`Aprobado_Automatico`, `Derivado_A_Revision_Humana_Puntaje`, `Derivado_A_Revision_Humana_Fraude`, `Derivado_A_Revision_Humana_Minimo_Senal`).
- **RegistroAuditoriaUmbral**: Entrada histórica inmutable que certifica: flujo modificado, parámetro ajustado, valor anterior, valor nuevo, usuario autor (autenticado por SSO) y estampa de tiempo.

---

## 3. Criterios de Éxito *(Obligatorio)*

### Resultados Medibles

- **SC-001**: El motor de evaluación calcula el puntaje de confianza (0–100) y su desglose completo de señales para el 100% de los expedientes con evidencia legible, sin generar estados indeterminados ni puntajes nulos.
- **SC-002**: 0% de rechazos 100% automáticos emitidos por la plataforma: el 100% de los casos cuyo puntaje sea insuficiente o presenten indicios adversos son derivados obligatoriamente a revisión por operadores humanos calificados (Principio II de la Constitución / DEC-04).
- **SC-003**: 0% de casos aprobados automáticamente cuando exista al menos una señal de fraude activa, garantizando el 100% de cumplimiento de la regla de precedencia absoluta del fraude sin importar que el puntaje total alcance 100 puntos.
- **SC-004**: El 100% de los casos que igualan o superan el umbral global de aprobación pero reprueban el valor mínimo configurado en cualquiera de sus señales individuales son derivados a revisión humana asistida con el detalle explícito de la señal reprobada.
- **SC-005**: El 100% de las modificaciones a umbrales o mínimos por señal quedan registradas en una bitácora de auditoría inalterable con autor, fecha/hora y valor previo, conservando las versiones históricas para casos en curso (§3).
- **SC-006**: Únicamente los casos con decisión de aprobación automática concluyente (sin intervención de operador) son contabilizados como validaciones facturables, con 0% de cobro sobre casos derivados a revisión humana (Principio V / DEC-01 / RQF-015).

---

## 4. Supuestos y Dependencias

- **Supuesto de umbral de marcha blanca**: Para el inicio del piloto con la aseguradora, el umbral de aprobación automática se establece en 90 puntos según lo acordado con el Representante del Cliente y Operaciones (DEC-11, ENT4), pudiendo ser recalibrado por el Administrador de Riesgo.
- **Supuesto de modalidades del MVP**: Para la entrega de enero de 2027 (MVP), los componentes de señal activos corresponden a análisis de documentos e imágenes; las señales de audio y video se incorporan en la entrega multimodal de abril de 2027 (DEC-10).
- **Dependencia de ausencia de señales**: Conforme a la regla fundacional de MIRA (§3), la falta de antecedentes o falla de lectura de una pieza requerida nunca se computa como señal aprobatoria y previene la aprobación automática.
- **Dependencia de trazabilidad inalterable**: Todo resultado de puntaje, desglose de componentes y decisión resultante se almacena con firma o registro inalterable para sustentar auditorías legales o revisiones de modelos (Principio IV y §2.11).
