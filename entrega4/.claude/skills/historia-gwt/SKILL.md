---
name: historia-gwt
description: Plantilla para escribir una historia de usuario con criterios de aceptación Given/When/Then, el caso de uso y las preguntas de aclaración al cliente. Úsala cuando haya que convertir una necesidad del cliente en una especificación verificable (archivo 02-especificacion.md).
---

# Historia de usuario y caso de uso

1. Copia la estructura de `plantilla-especificacion.md` (en esta misma carpeta) y complétala. No agregues secciones.
2. Historia: una sola, con el formato "Como <rol>, quiero <capacidad>, para <beneficio>".
3. Criterios de aceptación:
   - Numerados AC-1, AC-2, ... sin saltos.
   - Cada uno en Given / When / Then, con valores concretos (puntajes, umbrales, estados), nunca "un valor adecuado".
   - Un solo comportamiento por AC. Si tiene un "y además", se divide.
   - Cada AC indica su fuente: NEC (necesidad) o ACL-n (aclaración n del cliente).
   - Debe poder escribirse una prueba que falle si el sistema no cumple el AC.
4. Caso de uso: actor, precondiciones, flujo principal numerado, flujos alternativos (2a, 3a, ...) y excepciones. Las extensiones dicen qué hace el sistema, no "muestra un error".
5. Preguntas de aclaración:
   - Solo lo que la necesidad no dice o se contradice. Cada una con ID Q-n, por qué importa y 2 o 3 opciones concretas.
   - Mientras una pregunta esté abierta, el AC afectado lleva la marca [NEEDS CLARIFICATION: Q-n].
6. Fuera de alcance: lista explícita de lo que no se construye.
