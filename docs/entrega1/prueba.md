
\documentclass[11pt,a4paper]{article}

\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[margin=2.2cm]{geometry}
\usepackage{longtable}
\usepackage{array}
\usepackage{ragged2e}
\usepackage{enumitem}
\usepackage{xcolor}
\usepackage{graphicx}
\usepackage{hyperref}
\usepackage{parskip}

\newcolumntype{L}[1]{>{\RaggedRight\hspace{0pt}}p{#1}}

% ---------------------------------------------------------------
% Comando para insertar un placeholder de imagen.
% Reemplazar el contenido del \fbox por \includegraphics{...}
% cuando se tenga el archivo de imagen correspondiente.
% ---------------------------------------------------------------
\newcommand{\imagenPlaceholder}[1]{%
\begin{figure}[h!]
    \centering
    \fbox{\parbox[c][6cm][c]{0.75\textwidth}{\centering\Large #1}}
    % \includegraphics[width=0.75\textwidth]{#1.png}
\end{figure}
}

\title{Especificación de requisitos --- Plataforma MIRA (DPRIME SpA)}
\author{
Dante Chávez \\
Nikolas Lagos (representante del cliente) \\
Franko Moraga \\
Felipe Caru
}
\date{}

\begin{document}

\maketitle

\section*{Resumen ejecutivo}

El presente análisis responde a la necesidad de DPRIME SpA de transformar MIRA de una demostración tecnológica a una plataforma que un cliente pueda operar en producción, comprometiendo tiempos de respuesta y sosteniendo sus decisiones ante una auditoría. El trabajo tomó como fuente el documento de necesidades del negocio y las entrevistas a los involucrados, y de ahí se construyó la especificación completa del sistema: qué debe hacer, cómo se prueba y en qué orden se construye.

Del levantamiento surgieron once puntos donde el documento original se contradecía a sí mismo o contradecía lo que dijeron los propios involucrados. Los tres con mayor impacto en el negocio fueron: \textbf{(1)} no existía una definición única de qué se cobra, lo que habría generado disputas de facturación con el cliente piloto desde la primera factura; \textbf{(2)} el diseño original permitía rechazar automáticamente un reembolso sin que una persona lo revisara, lo que la normativa de protección de datos no permite; y \textbf{(3)} el compromiso comercial de operar con casos reales en enero de 2027 no era compatible con el plan de desarrollo, que consideraba video y audio recién en abril.

Se recomienda aprobar el desarrollo de una primera versión (MVP) enfocada solo en reembolsos de gastos médicos con documentos e imágenes, disponible en enero de 2027, dejando video y audio para la entrega final de abril. Antes de iniciar la construcción, se recomienda validar formalmente con el área legal y de tecnología del cliente piloto los puntos de retención de evidencia y de integración con su sistema actual, ya que ambos condicionan la arquitectura desde el primer día.

\section*{Introducción}

Este trabajo desarrolla la especificación de requisitos para la versión productiva de MIRA, la plataforma de inteligencia artificial multimodal que DPRIME SpA está construyendo para convertir evidencia digital ---documentos, imágenes, video y audio--- en decisiones empresariales automatizadas y trazables. El análisis toma como fuente el documento de necesidades elaborado por la Dirección de Producto de DPRIME y las nueve entrevistas de levantamiento realizadas a representantes de DPRIME y de la aseguradora que actúa como cliente piloto.

El alcance de este análisis cubre el ciclo completo de un caso dentro de la plataforma: el ingreso de evidencia por API o carpeta compartida, el motor de análisis sobre documentos e imágenes, el cálculo del puntaje de confianza, las reglas de decisión y umbrales, la bandeja de revisión asistida para el operador humano, y la trazabilidad de cada decisión. Quedan fuera del alcance de esta entrega los módulos de video y audio, la aplicación móvil de captura para el asegurado y la facturación electrónica, en línea con lo que el propio documento de necesidades excluye del proyecto.

Se asume que la plataforma se desplegará en nube pública con los datos de clientes chilenos alojados en territorio nacional, y que el análisis de casos de terceros países queda fuera de esta primera versión. Se asume también que las once decisiones registradas en la bitácora ---validadas por el representante del cliente--- reflejan el criterio vigente del negocio mientras no exista una instrucción posterior que las modifique.

El equipo está compuesto por Dante Chávez, Nikolas Lagos, Franko Moraga y Felipe Caru. En esta entrega, Nikolas Lagos ejerció el rol de representante del cliente, encargándose de resolver las inconsistencias y vacíos detectados en las fuentes primarias y de validar las decisiones que de ahí se derivaron.

\section{Análisis de requisitos}

\subsection*{Glosario de términos del negocio (ampliado)}

\begin{itemize}
    \item \textbf{Organización:} entidad cliente de MIRA (aseguradora) con datos y usuarios aislados de otras organizaciones.
    \item \textbf{Caso:} expediente único que agrupa toda la evidencia recibida sobre un mismo evento o solicitud de reembolso.
    \item \textbf{Evidencia:} archivo digital aportado sobre un caso (documento, imagen, audio o video).
    \item \textbf{Flujo:} secuencia configurada de módulos, reglas de negocio y umbrales de decisión que una organización define para un proceso.
    \item \textbf{Módulo:} capacidad de análisis activable dentro de un flujo (p. ej. lectura de códigos, detección de rostros).
    \item \textbf{Señal:} resultado individual que un módulo produce sobre una evidencia o sobre el caso completo.
    \item \textbf{Umbral:} valor de puntaje a partir del cual corresponde una decisión determinada; lo define la organización, no MIRA.
    \item \textbf{Operador:} persona que resuelve un caso derivado a revisión asistida.
    \item \textbf{Validación:} operación de procesamiento que entrega una decisión automática concluyente sobre un caso (según DEC-01, solo esta se factura).
\end{itemize}

\clearpage

\begin{figure}[h!]
    \centering
    \includegraphics[width=0.75\textwidth]{modelo_dominio_MIRA.png}
\end{figure}

\clearpage

\textbf{Criterio de selección:} se especifican en detalle los tres casos de uso donde un error de especificación obliga a rehacer trabajo de arquitectura completo: errores en la ingesta invalidan todo el análisis posterior (CU-01), errores en la revisión asistida producen decisiones no defendibles ante auditoría (CU-02), y errores en la configuración de umbrales cambian el apetito de riesgo de toda la organización sin control (CU-03).

\subsection*{CU-01: Ingestar Caso y Evidencia}

\begin{itemize}
    \item \textbf{Actor principal:} Sistema Externo del cliente (API) o adaptador de carpeta compartida.
    \item \textbf{Precondición:} Autenticación API activa o conector de carpeta configurado (DEC-08).
    \item \textbf{Flujo principal:}
    \begin{itemize}
        \item El sistema externo envía el expediente con metadatos y archivos de evidencia.
        \item MIRA asigna un idCaso único y permanente.
        \item MIRA verifica la legibilidad y estructura de los archivos.
        \item MIRA responde de inmediato con acuse de recibo asincrónico (HTTP 202) en menos de 1 segundo (DEC-04, DEC-07).
    \end{itemize}
    \item \textbf{Flujo alternativo/excepción:}
    \begin{itemize}
        \item 3a. Evidencia ilegible: la plataforma registra la falla, notifica el error al sistema origen con una razón entendible y detiene el procesamiento de esa pieza sin contabilizar cobro comercial (DEC-01).
        \item 1a. Evidencia adicional sobre un caso ya cerrado: MIRA abre un caso nuevo vinculado al anterior, sin reabrir el caso original.
    \end{itemize}
    \item \textbf{Postcondición:} El caso queda creado en estado ``En procesamiento'', con la evidencia asociada y trazada; o queda registrado el rechazo de una pieza ilegible con su razón, sin bloquear el resto del expediente.
\end{itemize}

\subsection*{CU-02: Revisar Caso Asistido}

\begin{itemize}
    \item \textbf{Actor principal:} Operador (Liquidador).
    \item \textbf{Precondición:} Caso derivado a la bandeja por puntaje inferior al umbral de aprobación automática (90 puntos, DEC-07) o por alerta de fraude activa.
    \item \textbf{Flujo principal:}
    \begin{itemize}
        \item El operador selecciona un caso pendiente de su bandeja de trabajo.
        \item MIRA despliega la evidencia en una sola pantalla, resaltando los hallazgos y mostrando la razón explícita de derivación.
        \item El operador evalúa los antecedentes y emite un veredicto (aprobar / rechazar / solicitar antecedentes).
        \item MIRA guarda el registro inalterable de la decisión humana, con su motivo.
    \end{itemize}
    \item \textbf{Flujo alternativo/excepción:}
    \begin{itemize}
        \item 3a. Discrepancia con la recomendación: si el operador contradice la sugerencia de MIRA, el sistema registra igualmente la decisión del operador y marca el caso para revisión posterior del equipo de modelos (DEC-03), sin alterar lo que el operador decidió.
        \item 3b. Caso cercano a vencer el plazo comprometido: MIRA resalta el tiempo restante antes de que el operador decida.
    \end{itemize}
    \item \textbf{Postcondición:} El caso queda en estado resuelto (aprobado, rechazado o con antecedentes solicitados), con la decisión y su justificación registradas de forma inalterable; nunca queda un caso rechazado sin que un operador haya intervenido (DEC-03, DEC-04).
\end{itemize}

\subsection*{CU-03: Configurar Flujo y Umbrales}

\begin{itemize}
    \item \textbf{Actor principal:} Administrador de Riesgo.
    \item \textbf{Precondición:} Usuario autenticado vía SSO corporativo (DEC-09).
    \item \textbf{Flujo principal:}
    \begin{itemize}
        \item El administrador ingresa al diseñador de flujos.
        \item Modifica los parámetros de umbral (p. ej. fija la aprobación automática en 90 puntos).
        \item Publica la nueva versión del flujo.
    \end{itemize}
    \item \textbf{Flujo alternativo/excepción:}
    \begin{itemize}
        \item 3a. Publicación inválida: si el flujo no tiene al menos un módulo de análisis activo, el sistema impide la publicación.
        \item 3b. Cambio de umbral: el cambio queda registrado con su autor, su fecha y el valor anterior, sin sobrescribir el historial.
    \end{itemize}
    \item \textbf{Postcondición:} Queda publicada una nueva versión inmutable del flujo; la versión anterior se conserva y los casos que ya estaban en curso terminan de procesarse con la versión con la que empezaron.
\end{itemize}

\clearpage

\begin{figure}[h!]
    \centering
    \includegraphics[width=0.75\textwidth]{casos_uso_MIRA.png}
\end{figure}

\clearpage

\subsection*{Criterio de priorización usado}

\begin{itemize}
    \item \textbf{Must:} imprescindible para el MVP de enero 2027 (DEC-10) o exigido por ley/contrato de forma ineludible (ej. DEC-03, DEC-06).
    \item \textbf{Should:} aporta valor significativo pero el MVP puede operar sin él inicialmente.
    \item \textbf{Could:} deseable, se posterga a la entrega de abril 2027 sin bloquear el piloto.
    \item \textbf{Won't (en esta versión):} explícitamente fuera de alcance según §5.1 del documento de necesidades.
\end{itemize}

\subsubsection*{Requisitos funcionales y no funcionales}

\begin{longtable}{|p{1.7cm}|p{1.6cm}|L{5.7cm}|p{1.3cm}|L{2.4cm}|p{1.4cm}|}
\hline
\textbf{ID} & \textbf{Tipo} & \textbf{Requisito} & \textbf{Prioridad} & \textbf{Fuente} & \textbf{Verif.} \\
\hline
\endfirsthead
\hline
\textbf{ID} & \textbf{Tipo} & \textbf{Requisito} & \textbf{Prioridad} & \textbf{Fuente} & \textbf{Verif.} \\
\hline
\endhead
RQF-001 & Funcional & Ingresar expedientes vía API o carpeta compartida, asignando un idCaso único y permanente. & Must & §2.4, ENT7, DEC-08 & PF-01 \\ \hline
RQF-002 & Funcional & Verificar la legibilidad de cada evidencia antes de analizarla y, si falla, indicar la razón en lenguaje no técnico. & Must & §2.4 & PF-02 \\ \hline
RQF-003 & Funcional & Si llega evidencia nueva sobre un caso ya cerrado, abrir un caso nuevo vinculado al anterior sin reabrirlo. & Must & §3 & PF-03 \\ \hline
RQF-004 & Funcional & Calcular un puntaje de confianza (0--100) por caso, con el desglose de las señales que lo componen. & Must & §2.5, §2.6 & PF-04 \\ \hline
RQF-005 & Funcional & Aprobar automáticamente un caso solo si el puntaje alcanza el umbral configurado y no hay señales de fraude activas. & Must & §2.6, DEC-07 & PF-05 \\ \hline
RQF-006 & Funcional & Permitir configurar el umbral de aprobación por flujo, registrando autor, fecha y valor anterior de cada cambio. & Must & §2.6, ENT4, DEC-07 & PF-06, PF-06b \\ \hline
RQF-007 & Funcional & No emitir rechazos 100\% automáticos: todo caso con puntaje insuficiente o señal de fraude se deriva a revisión humana. & Must & ENT6, DEC-03, DEC-04 & PF-07 \\ \hline
RQF-008 & Funcional & Derivar a la bandeja de revisión todo caso bajo el umbral o con alerta de fraude activa. & Must & §2.7, ENT6, DEC-03 & PF-08 \\ \hline
RQF-009 & Funcional & Mostrar al operador, en una sola pantalla, la evidencia, el puntaje, el desglose de señales y la razón de derivación. & Must & §2.7, ENT4, ENT5 & PF-09 \\ \hline
RQF-010 & Funcional & Registrar de forma inalterable la decisión del operador y su motivo. & Must & §2.11 & PF-10 \\ \hline
RQF-011 & Funcional & Marcar un caso para revisión del equipo de modelos cuando el operador contradiga la sugerencia de MIRA. & Must & §2.18, DEC-03 & PF-11 \\ \hline
RQF-012 & Funcional & Proveer un conector de carpeta compartida para integrarse con sistemas centrales que no exponen servicios web. & Must & ENT7, DEC-08 & PF-12 \\ \hline
RQF-013 & Funcional & Autenticar a los usuarios del cliente mediante SSO/SAML federado contra su directorio corporativo. & Must & §2.13, ENT7, DEC-09 & PF-13 \\ \hline
RQF-014 & Funcional & Anonimizar los datos personales (RUT, nombre) de un caso a solicitud del titular, preservando la traza técnica de auditoría. & Should & §2.11, §3, ENT6, DEC-05 & PF-14 \\ \hline
RQF-015 & Funcional & Contabilizar como validación facturable únicamente la decisión automática concluyente. & Should & §2.14, ENT1, ENT8, DEC-01 & PF-15 \\ \hline
RQF-016 & Funcional & Permitir exportar en cualquier momento los flujos, resultados e historial del cliente en un formato no propietario. & Should & §3 & PF-16 \\ \hline
RQF-017 & Funcional & Notificar al sistema de origen mediante callback configurable cuando un caso cambie de estado. & Could & §2.15, CU-04 & PF-17 \\ \hline
RQF-018 & Funcional & Migrar los casos procesados en los pilotos anteriores. & Won't & §5.1 & --- (excluido explícitamente) \\ \hline
RQNF-001 & No funcional & La API debe emitir acuse de recibo (HTTP 202) en menos de 1 segundo desde la recepción del caso. & Must & §4, ENT3, DEC-04 & PX-01 \\ \hline
RQNF-002 & No funcional & El procesamiento del caso debe ser asincrónico para evidencia pesada (múltiples documentos, video), sin bloquear al sistema del cliente. & Must & §4, ENT3, ENT7, DEC-04 & PX-02 \\ \hline
RQNF-003 & No funcional & Los datos de clientes chilenos deben residir en territorio nacional; solo fragmentos sin datos identificatorios se envían a modelos externos. & Must & §4, ENT6, DEC-06 & PX-03 \\ \hline
RQNF-004 & No funcional & La evidencia se conserva cifrada: 90 días en almacenamiento activo y hasta 5 años en almacenamiento frío. & Must & §2.11, ENT6, DEC-02 & PX-04 \\ \hline
RQNF-005 & No funcional & El rastro de auditoría debe ser inalterable e íntegro para todo perfil de usuario, incluido el administrador. & Must & §2.11, ENT6 & PX-05 \\ \hline
RQNF-006 & No funcional & La plataforma debe mantener 99,9\,\% de disponibilidad mensual, encolando casos ante la caída de un servicio externo, sin pérdida de casos. & Must & §4, ENT9 & PX-06 \\ \hline
RQNF-007 & No funcional & La plataforma debe soportar al menos 15.000 casos mensuales por organización sin degradar el tiempo de respuesta. & Should & §2.14, ENT4, ENT8 & PX-07 \\ \hline
RQNF-008 & No funcional & Un operador nuevo debe poder resolver su primer caso sin capacitación previa, con pantallas que cargan en menos de 2 segundos. & Should & §4 & PX-08 \\ \hline
\caption{Requisitos funcionales y no funcionales (RQF/RQNF), tabla única priorizada}
\end{longtable}

\subsubsection*{Pruebas funcionales (Must)}

\begin{longtable}{|p{1.3cm}|p{1.5cm}|L{3.2cm}|L{4.2cm}|L{4.8cm}|}
\hline
\textbf{ID} & \textbf{Verifica} & \textbf{Precondición} & \textbf{Pasos} & \textbf{Resultado esperado} \\
\hline
\endfirsthead
\hline
\textbf{ID} & \textbf{Verifica} & \textbf{Precondición} & \textbf{Pasos} & \textbf{Resultado esperado} \\
\hline
\endhead
PF-01 & RQF-001 & Adaptador de carpeta o API activa & Enviar expediente con 3 documentos vía carpeta compartida & Se crea un idCaso único; se confirma recepción \\ \hline
PF-02 & RQF-002 & Caso con 1 archivo corrupto entre 3 & Ingresar el expediente con una foto ilegible & El archivo ilegible se rechaza con razón entendible; los otros 2 se procesan; no se contabiliza cobro por el ilegible (\textit{camino de excepción de CU-01}) \\ \hline
PF-03 & RQF-003 & Existe un caso ya cerrado (aprobado) & Enviar nueva evidencia referida a ese mismo siniestro & Se crea un caso nuevo vinculado al anterior; el caso original no se reabre \\ \hline
PF-04 & RQF-004 & Caso con evidencia completa y legible & Ejecutar el motor sobre el caso & Se obtiene un puntaje 0--100 con el desglose de cada señal que lo compone \\ \hline
PF-05 & RQF-005 & Umbral de aprobación en 90; caso sin señales de fraude & Procesar un caso con puntaje calculado en 93 & El caso se aprueba automáticamente sin intervención humana \\ \hline
PF-06 & RQF-006 & Administrador de Riesgo autenticado & Cambiar el umbral de aprobación de 90 a 85 y publicar el flujo. & Se guarda el nuevo valor con autor, fecha y valor anterior; la versión anterior del flujo se conserva. \\ \hline
PF-06b & RQF-006 & Administrador de Riesgo autenticado, editando un flujo sin módulos de análisis activos & Intentar publicar el flujo sin ningún módulo activo. & La publicación se rechaza; el flujo no queda publicado \textit{(camino de excepción de CU-03)} \\ \hline
PF-07 & RQF-007 & Caso con puntaje 45 (bajo el umbral) & Ejecutar el motor de reglas sobre el caso & El sistema \textbf{no} emite rechazo automático; el caso se deriva a revisión humana \\ \hline
PF-08 & RQF-008 & Caso con puntaje 95 pero con alerta de fraude activa & Ejecutar el motor de reglas & El caso se deriva a revisión pese al puntaje alto (la señal de fraude prevalece) \\ \hline
PF-09 & RQF-009 & Caso derivado a la bandeja & El operador abre el caso desde su bandeja & La pantalla muestra evidencia, puntaje, señales y la razón de derivación, sin necesidad de otro sistema \\ \hline
PF-10 & RQF-010 & Operador con caso abierto & El operador aprueba el caso con un motivo & La decisión y el motivo quedan guardados de forma inalterable, con fecha y autor \\ \hline
PF-11 & RQF-011 & MIRA sugiere ``rechazar''; el operador decide ``aprobar'' & El operador registra su decisión, contraria a la sugerencia & Se guarda la decisión del operador \textbf{tal como la tomó}; el caso queda marcado para revisión del equipo de modelos \textit{(camino de excepción de CU-02)} \\ \hline
PF-12 & RQF-012 & Sistema central sin servicios web, con carpeta configurada & El conector detecta un archivo nuevo en la carpeta compartida & El conector lo transforma en una llamada de ingesta válida hacia MIRA \\ \hline
PF-13 & RQF-013 & Directorio corporativo del cliente configurado & Un usuario del cliente inicia sesión con sus credenciales corporativas & El acceso se concede sin que el usuario cree una contraseña propia en MIRA \\ \hline
\caption{Pruebas funcionales (PF)}
\end{longtable}

\subsubsection*{Pruebas extra-funcionales}

\begin{longtable}{|p{1.3cm}|L{2.6cm}|L{4.3cm}|L{3.2cm}|L{4.3cm}|}
\hline
\textbf{ID} & \textbf{Atributo} & \textbf{Escenario} & \textbf{Condición aplicada} & \textbf{Umbral de aceptación} \\
\hline
\endfirsthead
\hline
\textbf{ID} & \textbf{Atributo} & \textbf{Escenario} & \textbf{Condición aplicada} & \textbf{Umbral de aceptación} \\
\hline
\endhead
PX-01 & Rendimiento de ingesta & Ingesta simultánea de 100 expedientes vía API & Carga concurrente & 95\,\% de los acuses de recibo (HTTP 202) entregados en $<$ 1 seg \\ \hline
PX-02 & Procesamiento asincrónico & Expediente con 12 documentos + 8 fotos & Caso pesado, sin video & Acuse inmediato $<$ 1 seg; resultado notificado sin bloquear al sistema del cliente \\ \hline
PX-03 & Soberanía de datos & Inspección de tráfico saliente hacia modelos externos & Envío de fragmentos de texto extraídos de evidencia & Cero coincidencias de RUT o nombres completos en la carga útil \\ \hline
PX-04 & Retención e integridad & Solicitud de un expediente con 120 días de antigüedad & Expediente ya migrado a almacenamiento frío & Se recupera sin pérdida de datos en $\leq$ 10 segundos \\ \hline
PX-05 & Auditoría e inalterabilidad & Intento de modificar un registro de auditoría con perfil administrador & Cuenta con máximo privilegio & La operación se rechaza y el intento queda registrado \\ \hline
PX-06 & Disponibilidad y resiliencia & Caída simulada de un proveedor de modelos externos durante 3 horas & Casos siguen llegando durante la caída & Los casos se encolan, ninguno se pierde, y se notifica a DPRIME y al cliente \\ \hline
PX-07 & Volumen & Carga sostenida de 15.000 casos en un mes calendario & Volumen del cliente piloto (DEC-02, H-02) & Sin degradación del tiempo de respuesta respecto al SLA comprometido \\ \hline
PX-08 & Usabilidad & Operador sin capacitación previa recibe su primer caso & Pantalla estándar de revisión asistida & Resuelve el caso sin soporte externo; cada pantalla carga en $<$ 2 seg \\ \hline
\caption{Pruebas extra-funcionales (PX)}
\end{longtable}

Los atributos evaluados (rendimiento, procesamiento asincrónico, soberanía de datos, retención e integridad, auditoría, disponibilidad, volumen y usabilidad) se eligieron por el riesgo de negocio que representan si fallan --incumplimiento contractual, sanción regulatoria o pérdida de confianza del cliente piloto-- y no por la disponibilidad de herramientas de prueba: cada uno corresponde directamente a una decisión registrada en la bitácora (DEC-02, DEC-04, DEC-06, DEC-07) que resolvió una exigencia legal o contractual explícita del cliente.

\subsubsection*{Backlog de producto}

Orden justificado por \textbf{valor de negocio y riesgo}, no por facilidad de implementación: primero lo que sin lo cual nada más funciona (ingesta), luego lo que evita incumplimientos legales (no rechazo automático), luego lo que hace operable el producto día a día, y al final lo que aporta valor incremental (Should/Could).

\begin{longtable}{|p{1.3cm}|L{8.5cm}|p{2.0cm}|p{1.6cm}|p{1.4cm}|}
\hline
\textbf{ID} & \textbf{Historia} & \textbf{Requisitos} & \textbf{Estim.} & \textbf{Prior.} \\
\hline
\endfirsthead
\hline
\textbf{ID} & \textbf{Historia} & \textbf{Requisitos} & \textbf{Estim.} & \textbf{Prior.} \\
\hline
\endhead
HU-001 & Como sistema del cliente, quiero enviar expedientes por API o por carpeta compartida y recibir un idCaso único, para no depender de que MIRA exponga servicios que mi sistema central de 22 años no soporta. & RQF-001, RQF-012 & 8 & Must \\ \hline
HU-002 & Como plataforma, quiero verificar la legibilidad de cada evidencia antes de analizarla, para avisar de inmediato si un archivo no sirve en vez de fallar en silencio. & RQF-002 & 5 & Must \\ \hline
HU-012 & Como sistema, quiero abrir un caso nuevo vinculado cuando llega evidencia sobre un caso ya cerrado, para no perder ni mezclar información con el expediente original. & RQF-003 & 3 & Must \\ \hline
HU-013 & Como plataforma, quiero calcular un puntaje de confianza (0--100) con el desglose de señales por caso, para que la decisión automática y la revisión humana tengan un criterio objetivo. & RQF-004 & 8 & Must \\ \hline
HU-003 & Como administrador de riesgo, quiero que el sistema nunca rechace automáticamente un caso, para cumplir con la normativa de protección de datos sobre decisiones automatizadas. & RQF-007, RQF-008 & 5 & Must \\ \hline
HU-004 & Como liquidador, quiero ver la evidencia, el puntaje y la razón de derivación en una sola pantalla, para decidir sin abrir otros sistemas. & RQF-009 & 8 & Must \\ \hline
HU-005 & Como equipo de modelos, quiero que quede marcado cuando un operador contradice la sugerencia de MIRA, para saber si la plataforma está mejorando o empeorando. & RQF-010, RQF-011 & 3 & Must \\ \hline
HU-006 & Como administrador de riesgo, quiero ajustar el umbral de aprobación por flujo y que quede registrado con autor y fecha, para adecuar la plataforma al apetito de riesgo de mi empresa sin depender de DPRIME. & RQF-005, RQF-006 & 5 & Must \\ \hline
HU-007 & Como usuario del cliente, quiero iniciar sesión con mis credenciales corporativas (SSO), para no administrar una contraseña más. & RQF-013 & 5 & Must \\ \hline
HU-008 & Como oficial de cumplimiento, quiero poder anonimizar los datos personales de un caso cuando el titular lo solicite, sin perder el rastro técnico de auditoría. & RQF-014 & 8 & Should \\ \hline
HU-009 & Como administración de DPRIME, quiero que el sistema cuente automáticamente solo las validaciones concluyentes, para facturar sin planilla manual y sin disputas con el cliente. & RQF-015 & 5 & Should \\ \hline
HU-010 & Como cliente, quiero poder exportar mis flujos, resultados e historial en un formato no propietario, para no quedar atado a MIRA. & RQF-016 & 3 & Should \\ \hline
HU-011 & Como sistema del cliente, quiero recibir una notificación (callback) cuando un caso cambie de estado, para actualizar mi propio sistema sin tener que consultar periódicamente. & RQF-017 & 3 & Could \\ \hline
\caption{Backlog de producto (historias de usuario)}
\end{longtable}

\subsubsection*{Definición de terminado (DoD)}

\begin{enumerate}
    \item Código revisado por un par mediante Pull Request.
    \item Pruebas unitarias con cobertura mínima del 80\,\%.
    \item Prueba funcional asociada (PF-XX) ejecutada y aprobada.
    \item Criterios de aceptación de la historia validados por el representante del cliente.
    \item Sin datos reales de cliente usados en ambientes de prueba (solo datos enmascarados).
    \item Documentación de API y contratos actualizada.
    \item Desplegado en ambiente de integración sin romper flujos de otros clientes.
\end{enumerate}

\clearpage

\subsubsection*{Diagrama de secuencia de sistema}

De los tres casos de uso especificados en detalle, \textbf{CU-02 (Revisar Caso Asistido)} es el más crítico para este diagrama: es el único punto del flujo donde una persona --el operador-- toma una decisión con efecto legal sobre el asegurado, y donde una especificación equivocada produce una decisión no defendible ante auditoría (ver criterio de selección de la sección anterior). Por eso el diagrama de secuencia de sistema se construye sobre CU-02 y no sobre CU-01 o CU-03.

\begin{figure}[h!]
    \centering
    \includegraphics[width=0.75\textwidth]{diagrama_secuencia_MIRA.png}
\end{figure}

\clearpage

\section{Técnicas de Prompting usadas}

\textbf{Técnicas de prompting utilizadas}

\subsection*{1. Grounded Prompting (Anclaje en fuentes)}
\textit{Weller, Marone, Weir, Lawrie, Khashabi \& Van Durme (2024). ``According to\ldots'': Prompting Language Models Improves Quoting from Pre-Training Data. EACL.}

\begin{itemize}
    \item \textbf{Uso:} en la construcción de la tabla de RF/RNF y de la bitácora de decisiones, exigiendo que cada afirmación termine con la fuente exacta (§sección o ENTn) y que las fuentes contradictorias se reporten por separado, sin promediar ni conciliar.
    \item \textbf{Justificación:} el modelo no distingue lo que viene del documento de lo que aprendió en su entrenamiento; sin anclaje rellena huecos con lo que ``suena razonable''.
    \item \textbf{Antes / después:} sin anclaje, el modelo fijó el umbral de aprobación automática en 85 puntos como si fuera un dato firme. Al exigir cita separada por fuente, quedó expuesto que 85 era solo el número usado en la demo (ENT2) mientras que el cliente pedía 90 (ENT4) --- el conflicto quedó reportado como tal, no disuelto en una frase suave, y se convirtió en el Hallazgo H-07/DEC-07.
\end{itemize}

\subsection*{2. Structured Output Prompting (Salida estructurada)}
\textit{Patrón de ingeniería de prompts; contrapunto en Tam et al. (2024), ``Let Me Speak Freely?'', EMNLP --- los formatos rígidos pueden degradar el razonamiento en algunas tareas.}

\begin{itemize}
    \item \textbf{Uso:} en toda la generación de tablas del informe (RF/RNF, casos de prueba, backlog), fijando de antemano el esquema exacto de columnas exigido por la pauta.
    \item \textbf{Justificación:} en prosa libre, un campo que falta se lee igual de bien que uno completo --- la fluidez tapa el hueco. Con esquema fijo, las ausencias se vuelven visibles.
    \item \textbf{Antes / después:} una primera versión del backlog venía en párrafos narrativos, sin ID ni estimación separada. Al fijar la plantilla exacta de HU-018 del enunciado, la salida quedó tabulada y lista para pegar en el informe.
\end{itemize}

\subsection*{3. Plan-and-Solve Prompting (Planificar y ejecutar)}
\textit{Wang, Xu, Lan, Hu, Lan, Lee \& Lim (2023). Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models. ACL.}

\begin{itemize}
    \item \textbf{Uso:} en la construcción del modelo de dominio, separando una fase de solo listar los conceptos del negocio (glosario) de la fase de generar el diagrama Mermaid, sin producir nada hasta revisar el plan.
    \item \textbf{Justificación:} cuando el modelo tiene que decidir qué modelar y modelarlo al mismo tiempo, gana la urgencia por generar y salta directo al diseño técnico.
    \item \textbf{Antes / después:} el primer intento saltó al diseño: generó clases con String, int, DateTime --- persistencia, no dominio --- y sin las entidades Módulo, Señal ni Umbral. Al planificar antes de graficar, salieron esas tres entidades y se eliminaron los tipos de dato.
\end{itemize}

\subsection*{4. Chain-of-Verification, CoVe (Verificación en cadena)}
\textit{Dhuliawala, Komeili, Xu, Raileanu, Li, Celikyilmaz \& Weston (2024). Chain-of-Verification Reduces Hallucination in Large Language Models. Findings of ACL.}

\begin{itemize}
    \item \textbf{Uso:} al revisar el set de pruebas funcionales, generando preguntas de verificación aisladas (``¿este caso de uso tiene cubierto un flujo alternativo o de excepción?'') en vez de simplemente releer la salida ya generada.
    \item \textbf{Justificación:} pedirle al modelo que revise lo que acaba de escribir en el mismo turno lo hace defender su propia salida, no contrastarla contra el criterio real.
    \item \textbf{Antes / después:} el primer set de pruebas cubría solo el camino feliz de CU-01 y CU-03. Al aislar la verificación, aparecieron los huecos: se agregaron PF-02 (evidencia ilegible) y el caso de publicación inválida en CU-03, que corresponden a las excepciones ya declaradas en las especificaciones de caso de uso.
\end{itemize}

\subsection*{5. LLM-as-a-Judge (Archivo  como prompt)}
\textit{Zheng, Chiang, Sheng et al. (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. NeurIPS, Datasets and Benchmarks.}

\begin{itemize}
    \item \textbf{Uso:} para evaluar los criterios de aceptación del backlog contra una rúbrica de criterios binarios (cumple / no cumple), sin nota global, cada incumplimiento con su cita.
    \item \textbf{Justificación:} una nota agregada (``6/7, está bien redactada'') no es discutible ni repetible; una lista de incumplimientos citables sí.
    \item \textbf{Antes / después:} un criterio de aceptación inicial decía ``interfaz rápida y fácil de usar'' --- no discriminable. El juez lo marcó como incumplimiento de ``criterio no verificable'' y exigió reemplazarlo por una condición medible, lo que quedó reflejado en HU-004 (una sola pantalla, con hallazgos resaltados).
\end{itemize}


\section{Inconsistencias detectadas}

Se detectaron once inconsistencias entre el documento de necesidades y las entrevistas de levantamiento. Cada una fue resuelta por el representante del cliente y su decisión quedó registrada en la bitácora (Anexos, DEC-01 a DEC-11).

\begin{longtable}{|p{1.2cm}|L{3.4cm}|L{2.6cm}|L{2.4cm}|L{3.6cm}|p{1.3cm}|}
\hline
\textbf{ID} & \textbf{Hallazgo} & \textbf{Fuentes en conflicto} & \textbf{Tipo} & \textbf{Resolución} & \textbf{Dec.} \\
\hline
\endfirsthead
\hline
\textbf{ID} & \textbf{Hallazgo} & \textbf{Fuentes en conflicto} & \textbf{Tipo} & \textbf{Resolución} & \textbf{Dec.} \\
\hline
\endhead
H-01 & Definición contradictoria de qué es una ``validación'' facturable. & §2.14, §3, ENT1, ENT8 & Conflicto entre interesados & Se factura solo la decisión automática concluyente. & DEC-01 \\ \hline
H-02 & Tramos de volumen tarifados muy por debajo de la operación real del cliente (12.000 casos/mes). & §2.14, ENT4, ENT8 & Vacío (tramo sin tarifa definida) & Se reestructuran los tramos para soportar 15.000+ casos/mes. & DEC-02 \\ \hline
H-03 & Retención de evidencia a 90 días incompatible con exigencias regulatorias de 5--10 años. & §2.11, ENT6 & Contradicción entre fuentes & Evidencia activa 90 días + archivado frío por 5 años. & DEC-03 \\ \hline
H-04 & El documento permite rechazo 100\% automático, prohibido por la normativa de protección de datos. & §2.6, ENT6 & Contradicción entre fuentes & Prohibición del rechazo automático; derivación obligatoria a revisión humana. & DEC-04 \\ \hline
H-05 & Inalterabilidad del rastro de auditoría vs. derecho de supresión de datos personales. & §2.11, §3, ENT6 & Contradicción entre fuentes & Anonimización de PII preservando la traza técnica. & DEC-05 \\ \hline
H-06 & Uso de modelos externos (EE.\,UU./Europa) vs. exigencia contractual de residencia territorial de datos. & §4, ENT6 & Contradicción entre fuentes & Datos en Chile; enmascaramiento de PII antes del envío externo. & DEC-06 \\ \hline
H-07 & Plazo de procesamiento de 5 segundos incompatible con los tiempos reales del motor (30--40 s, video). & §4, ENT3 & Requisito no verificable & Procesamiento asincrónico con acuse HTTP 202 en $<$1 s. & DEC-07 \\ \hline
H-08 & Integración vía API asumida en el documento vs. sistema \textit{legacy} del cliente sin servicios web. & §2.10, ENT7 & Contradicción entre fuentes & Conector adaptador de carpeta compartida. & DEC-08 \\ \hline
H-09 & Gestión de credenciales propia de MIRA vs. exigencia de SSO corporativo. & §2.13, ENT7 & Contradicción entre fuentes & Autenticación federada (SSO/SAML). & DEC-09 \\ \hline
H-10 & Cronograma de ingeniería (producción en abril) vs. compromiso comercial de operar en enero. & §5.2, ENT1 & Conflicto entre interesados & MVP acotado a reembolsos médicos en enero; multimodal completo en abril. & DEC-10 \\ \hline
H-11 & Umbral de aprobación automática (85 puntos) sin respaldo: era solo el valor usado en la demo. & §2.6, ENT2, ENT4 & Decisión pendiente declarada & Umbral configurable por cliente; fijado en 90 para la marcha blanca. & DEC-11 \\ \hline
\caption{Inconsistencias detectadas y su resolución}
\end{longtable}

\textbf{Nota sobre citas:} toda inconsistencia listada arriba está respaldada por al menos una cita textual verificable del cliente, transcrita a continuación para las de mayor impacto comercial y legal. El detalle completo de contexto, alternativas consideradas, justificación e impacto de cada decisión se encuentra en la bitácora (Anexos, DEC-01 a DEC-11).

\subsection*{H-01 --- Criterio de cobro}
\begin{quote}
\textit{``En la propuesta comercial firmada quedamos en que nosotros pagamos por las decisiones que la máquina tome sola de forma útil y clara [\ldots] el cobro comercial aplica solo cuando la máquina decide sola.''} --- Nikolas Lagos
\end{quote}

\subsection*{H-04 --- Prohibición de rechazo automático}
\begin{quote}
\textit{``Por norma de protección de datos personales, ningún sistema puede rechazarle un reembolso a una persona de forma 100\% automática sin que un ejecutivo revise el caso.''} --- Nikolas Lagos
\end{quote}

\subsection*{H-10 --- Choque de cronograma comercial}
\begin{quote}
\textit{``Nosotros tenemos un compromiso comercial para salir a operar con casos reales en enero [\ldots] hagamos un primer lanzamiento en enero enfocado únicamente en reembolsos médicos con documentos e imágenes, y dejemos las cosas más complejas [\ldots] para la entrega final de abril.''} --- Nikolas Lagos
\end{quote}

\subsection*{H-11 --- Umbral sin respaldo empírico}
\begin{quote}
\textit{``El 85 que aparece en el documento es literalmente el número que usamos en la demo [\ldots] no tiene ningún estudio detrás. Para partir en producción quiero partir más conservador: 90 puntos.''} --- Nikolas Lagos
\end{quote}

\section{Discusión}

El modelo fue más útil donde la tarea era \textbf{de traducción estructurada}: convertir las nueve entrevistas y el documento de necesidades en tablas de RF/RNF, backlog y diagramas (Mermaid, PlantUML) con esquema fijo. También ayudó de forma concreta al aplicar Chain-of-Verification sobre el set de pruebas: preguntarle explícitamente ``¿este caso de uso tiene cubierto un flujo alternativo o de excepción?'' hizo aparecer PF-02 y el caso de publicación inválida de CU-03, que una relectura simple no había detectado.

Fue activamente engañoso en dos momentos concretos. El primero: sin exigir cita por fuente separada, fijó el umbral de aprobación automática en 85 puntos como si fuera un dato firme del negocio, cuando en realidad era solo el número usado en la demo (H-11) --- una cifra fluida y segura, pero sin respaldo real. El segundo, más revelador, lo cometimos nosotros al confiar en su propia salida: al generar la bitácora de decisiones, el modelo fue etiquetando los bloques DEC-01, DEC-02, DEC-03\ldots en orden secuencial, pero el contenido de cada bloque correspondía en realidad al hallazgo \textit{siguiente} (el bloque ``DEC-02'' describía la retención de evidencia, tema de H-03; el ``DEC-04'' describía el procesamiento asincrónico, tema de H-07). El desfase pasó una revisión superficial porque cada bloque, leído de forma aislada, es coherente y está bien escrito --- la fluidez tapó el corrimiento. Solo se detectó comparando cada hallazgo contra su decisión, campo por campo, en una pasada dedicada exclusivamente a eso.

Eso responde directamente a cuántas veces el modelo resolvió algo sin avisar: al menos tres --- el umbral sin marca de incertidumbre, un backlog inicial donde casi todo quedó ``Must'' sin discriminar, y el corrimiento de numeración en su propia bitácora, generado con total confianza y sin señal de que algo estuviera mal alineado.

Sin la intervención del representante del cliente, el sistema se habría construido cobrando casos que el cliente no aceptaría pagar, con un rechazo automático prohibido por ley, con un umbral arbitrario sin dueño, y con una bitácora de decisiones internamente inconsistente que un auditor habría podido usar para cuestionar la trazabilidad completa del análisis.

Lo que no delegaríamos la próxima vez: la verificación cruzada de que la numeración y las referencias internas del propio documento sean consistentes. Pedirle al modelo que revise su salida no basta --- hay que aislar esa revisión como una tarea separada, con una pregunta puntual por cada par hallazgo-decisión, tal como exige CoVe.

\section{Conclusiones}

El equipo ahora sabe transformar una descripción de necesidades ambigua y contradictoria en un conjunto de artefactos trazables, distinguiendo con disciplina lo que dice la fuente, lo que infiere el modelo y lo que decide el negocio --- algo que al inicio del curso se hacía de forma intuitiva y sin registro. Aprendimos también que la revisión humana no es solo sobre el contenido técnico de lo que el modelo produce, sino sobre la consistencia interna de su propia estructura: un documento generado por LLM puede estar bien redactado y, aun así, tener sus referencias cruzadas corridas.

Queda pendiente: cerrar la validación formal con el área legal y de tecnología del cliente piloto sobre retención de evidencia (H-03) e integración con el sistema legacy (H-08), como se señaló en el resumen ejecutivo; y completar en Anexos el enlace o captura del backlog en GitHub Projects.

\section{Anexos}

\subsection*{DEC-01}
\begin{itemize}
    \item \textbf{Fecha:} 28-08-2026 \quad \textbf{Asunto:} Unificación del criterio de cobro y facturación comercial por validación concluyente.
    \item \textbf{Contexto:} §2.14 y §3 establecen cobro por resolución útil y concluyente. ENT1 pide cobrar también los casos derivados a revisión. ENT8 sostiene que la propuesta comercial firmada no cobra la revisión humana.
    \item \textbf{Alternativas:} (a) Facturar todo caso ingresado. (b) Facturar únicamente resoluciones automáticas concluyentes, registrando el resto como consumo operativo sin costo directo.
    \item \textbf{Decisión:} (b) --- solo se cobra la decisión automática concluyente emitida en producción.
    \item \textbf{Justificación:} Respeta la propuesta firmada y la postura de Finanzas, evitando disputas de cobranza. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} Impacto: RQF-015, Modelo de Dominio (Entidad Validación/Factura), Backlog HU-009, Hallazgo H-01.
\end{itemize}

\subsection*{DEC-02}
\begin{itemize}
    \item \textbf{Fecha:} 29-08-2026 \quad \textbf{Asunto:} Reestructuración de tramos tarifarios para volúmenes reales del cliente piloto.
    \item \textbf{Contexto:} §2.14 define tramos hasta 2.000, 2.000--5.000 y sobre 5.000 casos/mes. ENT4 reporta 12.000 casos y 40.000 documentos/mes reales. ENT8 confirma que el tramo que aplicaría no tiene tarifa definida.
    \item \textbf{Alternativas:} (a) Forzar la operación a acotarse a 5.000 casos. (b) Reestructurar la tabla de tramos para escalar a 15.000+ casos/mes.
    \item \textbf{Decisión:} (b) --- se parametriza la plataforma para tramos superiores a 15.000 casos.
    \item \textbf{Justificación:} La operación real del piloto supera por mucho los tramos definidos en la demo. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQNF-007, Modelo de Dominio, Hallazgo H-02.
\end{itemize}

\subsection*{DEC-03}
\begin{itemize}
    \item \textbf{Fecha:} 31-08-2026 \quad \textbf{Asunto:} Extensión del plazo de retención de evidencia con almacenamiento por capas (\textit{cold storage}).
    \item \textbf{Contexto:} §2.11 fija la eliminación de evidencia a los 90 días. ENT6 exige retención de 5 a 10 años por exigencias regulatorias.
    \item \textbf{Alternativas:} (a) Eliminar la evidencia a los 90 días. (b) Mantener evidencia activa 90 días y migrarla a almacenamiento frío hasta completar 5 años.
    \item \textbf{Decisión:} (b) --- almacenamiento activo 90 días y archivado cifrado en \textit{cold storage} por 5 años.
    \item \textbf{Justificación:} Cumplimiento con la normativa reguladora del mercado asegurador (SVS/CMF) sin encarecer la infraestructura activa. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQNF-004, PX-04, Arquitectura de Almacenamiento, Hallazgo H-03.
\end{itemize}

\subsection*{DEC-04}
\begin{itemize}
    \item \textbf{Fecha:} 01-09-2026 \quad \textbf{Asunto:} Eliminación del rechazo automático de casos sobre personas.
    \item \textbf{Contexto:} §2.6 contempla rechazar automáticamente casos con puntaje $<$ 60. ENT6 prohíbe el rechazo sin intervención humana significativa.
    \item \textbf{Alternativas:} (a) Permitir el rechazo automático en casos de bajo puntaje. (b) Derivar obligatoriamente todo caso desfavorable a Revisión Asistida.
    \item \textbf{Decisión:} (b) --- no se emiten rechazos automáticos; todo caso bajo el umbral o con fraude activo va a la bandeja de revisión.
    \item \textbf{Justificación:} Cumplimiento de la normativa de protección de datos personales sobre decisiones automatizadas desfavorables. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQF-007, RQF-008, CU-02, Flujo de Excepción SSD, Hallazgo H-04.
\end{itemize}

\subsection*{DEC-05}
\begin{itemize}
    \item \textbf{Fecha:} 02-09-2026 \quad \textbf{Asunto:} Implementación de seudonimización y anonimización en el rastro de auditoría.
    \item \textbf{Contexto:} §2.11 exige rastro de auditoría inalterable. §3 contempla el derecho de supresión de datos personales. ENT6 exige reconciliar ambos principios.
    \item \textbf{Alternativas:} (a) Eliminar el registro de auditoría completo. (b) Anonimizar los datos de identificación personal (PII) manteniendo intacta la traza técnica.
    \item \textbf{Decisión:} (b) --- ante solicitud de borrado se elimina la vinculación con la identidad, pero se conserva el historial técnico inalterable.
    \item \textbf{Justificación:} Reconcilia el derecho al olvido con la inalterabilidad exigida en auditorías. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQF-014, RQNF-005, Pruebas PX-05, Hallazgo H-05.
\end{itemize}

\subsection*{DEC-06}
\begin{itemize}
    \item \textbf{Fecha:} 02-09-2026 \quad \textbf{Asunto:} Enmascaramiento de datos personales previo a llamadas a modelos externos.
    \item \textbf{Contexto:} §4 exige que los datos permanezcan en Chile. §4 y ENT6 indican que los modelos externos operan en EE.\,UU./Europa, lo que constituye transferencia internacional.
    \item \textbf{Alternativas:} (a) Restringir el sistema a modelos locales. (b) Almacenar la evidencia en Chile y enmascarar PII antes de enviar fragmentos a modelos externos.
    \item \textbf{Decisión:} (b) --- evidencia reside en servidores chilenos; un módulo local remueve RUT y nombres antes del envío externo.
    \item \textbf{Justificación:} Garantiza el cumplimiento de soberanía de datos usando modelos de frontera. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQNF-003, Diagrama de Arquitectura, Pruebas PX-03, Hallazgo H-06.
\end{itemize}

\subsection*{DEC-07}
\begin{itemize}
    \item \textbf{Fecha:} 03-09-2026 \quad \textbf{Asunto:} Arquitectura de ingesta y procesamiento asincrónico por eventos.
    \item \textbf{Contexto:} §4 exige procesamiento en menos de 5 segundos. ENT3 advierte que expedientes reales toman 30--40 segundos y video, minutos.
    \item \textbf{Alternativas:} (a) Mantener llamadas sincrónicas con riesgo de timeout. (b) Procesamiento asincrónico con acuse inmediato (HTTP 202) y notificación posterior.
    \item \textbf{Decisión:} (b) --- la API responde en $<$ 1 segundo y notifica el resultado por \textit{webhook}/evento.
    \item \textbf{Justificación:} Previene bloqueos y reintentos duplicados en expedientes pesados. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQNF-001, RQNF-002, Diagrama de Secuencia (SSD), PX-02, Hallazgo H-07.
\end{itemize}

\subsection*{DEC-08}
\begin{itemize}
    \item \textbf{Fecha:} 04-09-2026 \quad \textbf{Asunto:} Adaptador de integración por carpeta compartida para sistemas heredados.
    \item \textbf{Contexto:} §2.10 asume integración vía API REST. ENT7 aclara que el sistema \textit{core} de 22 años solo intercambia archivos por carpeta compartida.
    \item \textbf{Alternativas:} (a) Exigir al cliente modificar su sistema \textit{core}. (b) Proveer un conector adaptador que traduzca los archivos en llamadas API de MIRA.
    \item \textbf{Decisión:} (b) --- se desarrolla un componente adaptador desacoplado para leer/escribir en la carpeta del cliente.
    \item \textbf{Justificación:} Permite la marcha blanca sin forzar inversiones caras en infraestructura \textit{legacy}. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQF-012, CU-01, Diagrama SSD, Hallazgo H-08.
\end{itemize}

\subsection*{DEC-09}
\begin{itemize}
    \item \textbf{Fecha:} 04-09-2026 \quad \textbf{Asunto:} Soporte de autenticación federada (SSO/SAML/OAuth2) para clientes corporativos.
    \item \textbf{Contexto:} §2.13 contempla gestión de usuarios propia de MIRA. ENT7 exige integración obligatoria con el directorio/SSO corporativo.
    \item \textbf{Alternativas:} (a) Mantener únicamente credenciales locales. (b) Implementar un módulo de autenticación federada para clientes corporativos.
    \item \textbf{Decisión:} (b) --- MIRA soportará federación de identidades corporativas como opción preferente.
    \item \textbf{Justificación:} Exigencia mandatoria de ciberseguridad del cliente para evitar administración duplicada de claves. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQF-013, RQNF-008, Arquitectura de Seguridad, Hallazgo H-09.
\end{itemize}

\subsection*{DEC-10}
\begin{itemize}
    \item \textbf{Fecha:} 05-09-2026 \quad \textbf{Asunto:} Reordenamiento de entregas mediante despliegue de un MVP acotado a enero 2027.
    \item \textbf{Contexto:} §5.2 define marcha blanca en febrero y producción en abril de 2027. ENT1 exige operar con casos reales en enero por compromiso comercial.
    \item \textbf{Alternativas:} (a) Adelantar la versión completa con riesgo de fallas. (b) Desplegar un MVP acotado a reembolsos médicos (documentos e imágenes) en enero, dejando la suite multimodal completa para abril.
    \item \textbf{Decisión:} (b) --- MVP simplificado en enero de 2027 para el proceso de mayor volumen del piloto.
    \item \textbf{Justificación:} Cumple el hito comercial sin arriesgar la calidad del motor al posponer modalidades complejas. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} Backlog de Producto, Planificación de Entregas, Hallazgo H-10.
\end{itemize}

\subsection*{DEC-11}

\textbf{Respuesta del Cliente (Nikolas):}

\begin{quote}
\textit{``El 85 que aparece en el documento es literalmente el número que usamos en la demo para que se viera bien en la presentación --- no tiene ningún estudio detrás. Para partir en producción quiero partir más conservador: 90 puntos, y que quede como un parámetro que nosotros podamos mover después, no algo que ustedes dejen fijo en el código.''}
\end{quote}

\begin{itemize}
    \item \textbf{Fecha:} 06-09-2026 \quad \textbf{Asunto:} Parametrización y calibración del umbral de aprobación automática.
    \item \textbf{Contexto:} §2.6 fija umbrales estándar de 85/60 puntos. ENT2 confirma que el 85 corresponde solo a la configuración usada en la demo. ENT4 exige iniciar la marcha blanca con un umbral más conservador (90 puntos), administrable por el cliente.
    \item \textbf{Alternativas:} (a) Codificar los umbrales de forma fija en el sistema. (b) Convertir los umbrales en parámetros configurables por el Administrador de Riesgo de cada cliente.
    \item \textbf{Decisión:} (b) --- los umbrales no quedan fijos en código; para la marcha blanca se establece el umbral de aprobación automática en 90 puntos.
    \item \textbf{Justificación:} Otorga flexibilidad operativa al cliente y evita perpetuar una cifra sin base empírica real. Validado con el Representante del Cliente.
    \item \textbf{Impacto:} RQF-005, RQF-006, Modelo de Dominio (Entidad Flujo/Umbral), Hallazgo H-11.
\end{itemize}

\textit{(Los prompts utilizados y el historial de ejecución se encuentran disponibles en el repositorio Git del proyecto.)}

\subsection*{Backlog en GitHub Projects}

El backlog de producto (Tabla 4) está gestionado en GitHub Projects, con las historias de usuario HU-001 a HU-011 priorizadas y ordenadas según el criterio de valor de negocio y riesgo descrito en la sección correspondiente:

\url{https://github.com/users/Frxnks/projects/1}

\end{document}
