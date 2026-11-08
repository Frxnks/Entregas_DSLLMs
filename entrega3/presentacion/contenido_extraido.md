<!-- Slide number: 1 -->
MIRA � Entrega 3
Asistente RAG + MCP para el operador de revisi�n
CU-1 � explicar con evidencia � consultar con permisos � actuar con confirmaci�n

6
20
25
0,90
documentos versionados
preguntas Golden Set
pruebas aprobadas
Recall@5 evidencia

La decisi�n sigue siendo humana
Lagos � Moraga � Chaves � Caru  |  9 de noviembre de 2026
1

### Notes:
Abrir con el objetivo: el asistente explica y prepara acciones, pero no decide. Presentar las cuatro cifras como resultados ya comprobados.

<!-- Slide number: 2 -->
El problema: explicar sin convertir al modelo en juez

1
2
3
4
Caso operativo
Reglas versionadas
Acci�n sensible
Decisi�n humana
Puntaje, se�ales y evidencias viven en datos transaccionales.
Hay vigencias, versiones derogadas y un conflicto 80/85.
Solicitar antecedentes cambia el estado y exige autorizaci�n.
El operador conserva el control y la responsabilidad final.

RAG aporta evidencia; MCP aporta gobierno
2

### Notes:
Explicar que el problema no es solo responder preguntas. Debemos combinar conocimiento documental, datos autorizados y una escritura segura.

<!-- Slide number: 3 -->
Arquitectura: un solo camino autorizado hacia los datos

Next.js
FastAPI
Gemini
FastMCP

/asistente
sesi�n y coordinaci�n
selecci�n de herramientas
permisos y contratos

Motor RAG
SQLite
Separaci�n comprobable
indexaci�n y consulta separadas
datos operacionales
La API no importa SQLite. Toda lectura o escritura operacional pasa por MCP. RAG puede evaluarse sin MCP ni Gemini.

ChromaDB
fragmentos + vectores
3

### Notes:
Defender el reparto: ChromaDB contiene conocimiento est�tico; SQLite contiene estado operacional. MCP es el l�mite de confianza.

<!-- Slide number: 4 -->
RAG: mejora con k=5; persisten dos preguntas incompletas

### Chart

| Category | Recall por evidencia | Preguntas completas |
|---|---|---|
| Secciones | 90.0 | 87.5 |
| Ventanas | 90.0 | 87.5 |

35 fragmentos
Secciones
C01 y V02
cada una recupera 1 de 2 evidencias

40 fragmentos
Ventanas
C01 y V02
cada una recupera 1 de 2 evidencias

Predeterminada: secciones completas
Ambas estrategias empatan; secciones conserva reglas completas.
4

### Notes:
Con k=5, ambas estrategias obtienen Recall 0,90 por evidencia y 0,875 por pregunta. Ambas recuperan R05 y las dos fuentes de C02; C01 y V02 siguen incompletas. Secciones se mantiene por conservar las condiciones completas de cada regla.

<!-- Slide number: 5 -->
MCP: siete puertas antes de una escritura

1
2
3
4
5
6
7

Sesi�n
Organizaci�n
Rol
Estado
L�mite
Contenido
Confirmaci�n

Bloqueos demostrables
Transacci�n at�mica
Idempotencia
El mismo token devuelve el mismo resultado
U-03 � C-010 � tercera solicitud de C-016
Solicitud + evento + callback simulado

La consulta nunca cambia el estado
5

### Notes:
Recorrer las siete validaciones. Destacar que la confirmaci�n no evita revalidar: todo se vuelve a comprobar dentro de BEGIN IMMEDIATE.

<!-- Slide number: 6 -->
Privacidad: minimizaci�n antes de cada llamada externa

Puede viajar a Gemini
Nunca debe viajar
?
�
fragmento + c�digo + secci�n + versi�n

Reglas

nombres de usuarios
1
�
ID ficticio + estado + puntaje + motivo

Caso

RUT, correo y tel�fono
2
�
c�digo + valor + m�nimo necesario

Se�ales

credenciales y API keys
3
�
solo extracto sanitizado

Evidencia

rutas locales y session_id
4
�

Reducci�n de exposici�n ? anonimizaci�n universal
6

### Notes:
Conectar con DEC-06/RQNF-003. Aclarar l�mites: el filtro cubre formatos comunes y nombres conocidos; no se promete anonimizaci�n universal.

<!-- Slide number: 7 -->
Evaluaci�n: recuperaci�n y sistema se miden por separado

25 / 25
20
pruebas automatizadas aprobadas
preguntas Golden Set RAG
U-03 � otra organizaci�n � C-010

Autorizaci�n
1

C-016 � confirmaci�n � idempotencia

Transacci�n
12
con respuesta
2

4
sin respaldo
C-011 � C-012 � C-013 � C-018 � C-020

Casos
3

2
conflictos
PII � C-014 � kit inmutable

Seguridad
4

2
versiones

TypeScript ✓
Next.js build ✓
CLI FastMCP ✓
Golden Set validado · evaluaci�n de generaci�n con Gemini pendiente
7

### Notes:
Separar claramente Golden Set RAG de matriz de integraci�n. El Golden Set fue confirmado por Nikolas el 8 de noviembre; la evaluaci�n de generación con Gemini sigue pendiente.

<!-- Slide number: 8 -->
Demostraci�n: ocho evidencias en un recorrido

Cita abierta
Abstenci�n
Conflicto
Traza MCP
D1
D2
D3
D4
fuente, secci�n y versi�n
pregunta sin respaldo
80 frente a 85
vigente frente a derogada

Confirmaci�n
Guardrail
Cliente CLI
Imprevista
D5
D6
D7
D8
preparar ? confirmar ? releer
rol, estado o tercera solicitud
Streamable HTTP
respuesta con el mismo m�todo

15 min: explicar ? demostrar ? comprobar
8

### Notes:
Este mapeo D1�D8 es una propuesta del equipo. En D5 releer solicitudes; en D7 usar el cliente CLI ya comprobado.

<!-- Slide number: 9 -->
Qu� defendemos y qu� falta cerrar

RAG
MCP
Humano
1
2
3
evidencia trazable
acceso gobernado
decisi�n y confirmaci�n
No inventa reglas
No conf�a en el modelo
No delega responsabilidad

1  Configurar Gemini con control de cuota
Pendientes honestos
2  Ejecutar y anotar generación
3  Ensayar demo D1–D8

Sistema reproducible � controles verificados � resultados no inventados
9

### Notes:
Cerrar con la defensa técnica. Golden Set y controles están verificados; queda pendiente la evaluación de generación con Gemini y el ensayo de demostración D1–D8.
