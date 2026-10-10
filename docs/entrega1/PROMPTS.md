Registro de Prompts y Tecnicas Utilizadas - Proyecto MIRA 

este documento registra el historial de prompts estructurado paso a paso para la construccion del analisis de requisitos y los 7 artefactos del sistema MIRA. Detalla el flujo de trabajo asistido por IA, destacando que tecnica de la rubrica se utilizo en cada fase. 

Fase 1: Exploracion y Deteccion de Inconsistencias 

Tecnica utilizada: Prompting Estandar Sin tecnica especifica. 
Prompt  
lee detalladamente el documento de mira y las entrevistas . cruza la info del doc con lo que dicen los entrevistados. identifica todas las contradicciones , vacios o conflictos de interes . devuelve una tabla con columnas: ID, Hallazgo, Fuentes en conflicto, Tipo, Resolucion y Dec  pero sin responder ya que no eh hablado con el cliente aun . 

Salida de la IA 
He detectado 11 inconsistencias críticas. (Aquí me da las tablas) 

Fase 2: Artefacto "Requisitos Funcionales y No Funcionales" 

Técnica utilizada: Grounded Prompting (Anclaje en fuentes). 
Prompt  
actua como ingeniero de requisitos. extrae los requisitos funcionales (RQF) y no funcionales (RQNF) para MIRA . regla estricta: cada afirmacion en la columna fuente tiene que llevar la cita exacta del doc . si las fuentes se contradicen usa la resolucion qu tomamos en las decisiones.  

Salida de la IA  
Aquí nos da la tabla de RQF Y RQNF 

Fase 3: Artefacto "Modelo de Dominio" 

Técnica utilizada: Plan-and-Solve Prompting (Planificar y ejecutar).  
Prompt (Parte 1 - Plan) 
vamos a hacer el modelo de dominio conceptual para MIRA. NO generes codigo mermaid ni dibujes relaciones todavia . paso 1 (plan): enumera solo los conceptos del negocio (glosario). tienes estrictamente prohibido usar tipos de datos tecnicos  asegurate de incluir entidades como modulo, señal y umbral. paso 2 (ejecucion): solo cuando yo te apruebe el glosario generamos el codigo . devuelve solo el resultado del paso 1 

Salida de la IA (Parte 1) 
Paso 1 - Conceptos del negocio identificados: Organización, Caso, Evidencia, Flujo, Módulo, Señal, Umbral, Operador, Decisión. no se incluyeron identificadores de base de datos. quedo a la espera de tu aprobación. 

Prompt(Parte 2 - Ejecución) 
plan aprobado . ejecuta el paso 2: genera el codigo mermaid   

Salida de la IA (Parte 2) 
ClassDiagram... mas codigo 
 
Fase 4: Artefacto "Casos de Uso" 

Técnica utilizada: Prompting Estándar.  
Prompt   
basado en el contexto de MIRA redacta en formato extendido los 3 casos de uso mas criticos donde un error obliga a rehacer la arquitectura. identificalos como CU-01 , CU-02 y CU-03 . incluye actor principal, precondicion y flujos 

Salida de la IA 
CU-01: Ingestar Caso y Evidencia Actor principal: Sistema Externo del cliente (API) o adaptador de carpeta compartida... Flujo alternativo: 3a. Evidencia ilegible... 
CU-02: Revisar Caso Asistido Flujo alternativo: 3a. Discrepancia con la recomendación... 
CU-03: Configurar Flujo y Umbrales Flujo alternativo: 3a. Publicación inválida... 

Fase 5: Artefacto "Backlog de Producto" 

Técnica utilizada: Structured Output Prompting .  
Prompt  
convierte los requisitos en el backlog de producto. no escribas parrafos ni texto libre . devuelve exclusivamente una tabla usando este esquema exacto de columnas: | ID | historia | requisitos | estima | priorida | sigue estrictamente esta plantilla de ejemplo (HU-018): | HU-018 | Como tecnico en terreno, quiero declarar los repuestos | RQF-014 | 8 | Must | . si algun dato falta no lo inventes porfavor se estricto 

Salida de la IA 
Nos da una tabla. De HU-01 a HU-011 

Fase 6: Artefactos "Pruebas Funcionales y Extra-funcionales" 

Técnica utilizada: Chain-of-Verification. 
Prompt (Turno 1 - Generación Base) 
genera la tabla de pruebas funcionales para los requisitos Must, con columnas ID, verifica, precondicion, pasos, resultado. luego genera la tabla de pruebas extra-funcionales  

Salida de la IA (Turno 1) 
Generó versión inicial de Tablas 2 y 3 

Prompt (Turno 2 - Verificar) 
revisa la tabla de pruebas funcionales que acabas de generar. NO la modifiques todavia . responde unicamente a esta pregunta de verificacion aislada: este set de pruebas tiene cubierto al menos un flujo alternativo o de excepcion para el  CU-01 y el CU-03? 

Salida de la IA (Turno 2) 
la respuesta es NO. Las pruebas actuales (PF-01 y PF-06) solo recorren el camino feliz. Faltan los flujos de excepción documentados. 

Prompt (Turno 3 - Corregir) 
basado en esa verificacion corrige la tabla agregando los casos que faltan: PF-02 para probar la evidencia ilegible (CU-01) y PF-06 paar probar el intento de publicacion de un flujo sin modulos activos (CU-03) 

Salida de la IA (Turno 3) 
*Corrige*  

Fase 7: Artefacto "Diagrama de Secuencia de Sistema" 
Técnica utilizada: Prompting Estándar. Nota: Asegura que el diagrama se construya enfocándose en las fronteras del sistema, sin exponer arquitectura interna. 

Prompt
genera el codigo mermaid  para el diagrama de secuencia de sistema del caso de uso (revisar caso asistido) . trata a la plataforma MIRA estrictamente como una caja negra. incluye un bloque alt para el flujo de excepcion donde la decision del operador es distinta de la sugerencia osea la decicion 3 o dec-03 

Salida de la IA 
*Nos genera el codigo mermaid* 
 
Fase 8: Refinamiento de Calidad (Criterios de Aceptación) 

Técnica utilizada: LLM-as-a-Judge (Rubrica como prompt).  
Prompt 
actua como auditor de asegurador de calidad. evalua el criterio de aceptacion propuesto inicialmente para la historia de usuario que decia: 'La interfaz debe ser rápida y fácil de usar' . evaluarlo contra esta rubrica : - C1: el requisito es verificable y medible objetivamente? (cumple/no cumple) - C2: evita el uso de sesgos o adjetivos vagos? (cumple/no cumple). detalla cada incumplimiento . no des calificacion global 

Salida de la IA 
C1 (Criterio no verificable): No Cumple. 'Fácil de usar' no es automatizable en una prueba. 
C2 (Adjetivo vago): No Cumple. 'Rápida' es un sesgo de apreciación. Corrección sugerida: 'La pantalla carga en menos de 2 segundos y muestra la evidencia, el puntaje y la razón de derivación en una sola vista'. 
