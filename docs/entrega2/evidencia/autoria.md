# Métricas de líneas por commit y carpeta

**Fecha de cálculo:** 18-10-2026
**Base del cálculo:** historial alcanzable desde `HEAD` (`e845bb0`), comparando cada commit con su primer padre. Las métricas se calcularon antes de añadir este informe, para no atribuir sus propias líneas.

## Método y atribución

- Se cuentan líneas añadidas y eliminadas por `git diff --numstat`; las celdas se expresan como `añadidas/eliminadas`.
- Las carpetas se agrupan por primer directorio: `backend`, `frontend`, `specs`, `docs` y `otros` (raíz y demás directorios).
- El merge `a3da8b5` no se cuenta como cambio independiente. El cambio del README se atribuye al commit fuente `2a2078f`, evitando duplicarlo.
- Los 12 commits con prefijo `[IA]` se atribuyen al agente. Los commits anteriores se clasifican según las respuestas del equipo a la consulta commit por commit.
- Los archivos binarios no tienen líneas numstat; se excluyen de los porcentajes de líneas.
- `46a31b1` queda **sin atribuir**: la respuesta recibida en ese campo fue una preferencia sobre consolidar commits, no una clasificación de autoría. Sus 2 líneas se excluyen del denominador de los porcentajes hasta recibir esa clasificación.

## Cambios por commit

| Commit | Autoría declarada | backend +/− | frontend +/− | specs +/− | docs +/− | otros +/− | Total +/− |
|---|---|---:|---:|---:|---:|---:|---:|
| `46a31b1` Initial commit | Pendiente | 0/0 | 0/0 | 0/0 | 0/0 | 2/0 | 2/0 |
| `446e083` Análisis de incongruencias | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 218/2 | 218/2 |
| `fc278b4` Crear prueba.md | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 1/0 | 1/0 |
| `dee62df` Actualizar prueba.md | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 555/0 | 555/0 |
| `afeee31` Revisar registro de prompts | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 72/33 | 72/33 |
| `2a2078f` Update README.md | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 124/146 | 124/146 |
| `e155139` Entrega1 (binarios) | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `a3da8b5` Merge de README | Excluido: merge | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| `528cda9` Reorganización de documentos | Agente | 0/0 | 0/0 | 0/0 | 791/0 | 0/791 | 791/791 |
| `2d1dd10` Inicialización SDD | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 6654/0 | 6654/0 |
| `6eb4baa` Regla de español | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 20/43 | 20/43 |
| `f18ad52` Reglas del documento LLMS | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 63/13 | 63/13 |
| `03d39bf` Decisiones en Constitución | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 46/51 | 46/51 |
| `184d9a3` Specs iniciales F1/F4 | Agente | 0/0 | 0/0 | 393/0 | 0/0 | 0/0 | 393/0 |
| `8310291` Clarificación de specs | Agente | 0/0 | 0/0 | 34/15 | 0/0 | 0/0 | 34/15 |
| `dc16bb1` Documentación SPEC/CLARIFY | Agente | 0/0 | 0/0 | 0/0 | 517/0 | 0/0 | 517/0 |
| `a334b86` Plan técnico y decisiones | Agente | 0/0 | 0/0 | 3110/2 | 458/2 | 0/0 | 3568/4 |
| `253fd9a` Tareas por spec | Agente | 0/0 | 0/0 | 355/0 | 0/0 | 0/0 | 355/0 |
| `0b151a5` Análisis cruzado | Agente | 0/0 | 0/0 | 191/22 | 263/22 | 0/0 | 454/44 |
| `cb630a3` Componentes y enmascaramiento | Agente | 0/0 | 0/0 | 54/26 | 0/0 | 0/0 | 54/26 |
| `6275887` Avance fases 1 y 2 | Agente | 2412/0 | 2494/0 | 19/19 | 0/0 | 10854/0 | 15779/19 |
| `e84179d` Avance fase 3 | Agente | 1142/1 | 1125/0 | 11/11 | 0/0 | 0/0 | 2278/12 |
| `181b860` Avance fase 4 | Agente | 1127/34 | 537/7 | 9/9 | 0/0 | 0/0 | 1673/50 |
| `24799d5` Avance fase 5 | Agente | 1269/59 | 906/37 | 9/9 | 0/0 | 0/0 | 2184/105 |
| `38f03b9` Avance fase 6 | Agente | 1837/5 | 1176/25 | 10/10 | 159/0 | 48/0 | 3230/40 |
| `450e2ff` Avance fase 7 | Agente | 1258/0 | 0/0 | 3/3 | 368/0 | 0/0 | 1629/3 |
| `1f32bef` Correcciones Compose | Equipo | 45/5 | 3/3 | 0/0 | 0/0 | 147/22 | 195/30 |
| `a89ae03` `[IA]` Inicio seguro y PowerShell | Agente | 0/0 | 0/0 | 0/0 | 0/0 | 9/1 | 9/1 |
| `be6583d` `[IA]` Evidencia de clon limpio | Agente | 0/0 | 0/0 | 0/0 | 109/0 | 0/0 | 109/0 |
| `459522e` `[IA]` Evidencia de scoring F4 | Agente | 0/0 | 0/0 | 0/0 | 267/0 | 0/0 | 267/0 |
| `80b46e2` `[IA]` Matriz de pruebas F1/F4 | Agente | 0/0 | 0/0 | 0/0 | 110/0 | 0/0 | 110/0 |
| `383bf83` `[IA]` Enlaces locales E2 | Agente | 0/0 | 0/0 | 0/0 | 26/26 | 0/0 | 26/26 |
| `9c0e5dd` `[IA]` Ejemplo de scoring/seed | Agente | 0/0 | 0/0 | 0/0 | 31/6 | 0/0 | 31/6 |
| `5aed2d6` `[IA]` Plazo hábil | Agente | 0/0 | 0/0 | 0/0 | 2/2 | 0/0 | 2/2 |
| `fe2ae54` `[IA]` Máscara observada | Agente | 0/0 | 0/0 | 0/0 | 3/1 | 0/0 | 3/1 |
| `595bd29` `[IA]` Conteo de líneas specs | Agente | 0/0 | 0/0 | 0/0 | 7/22 | 0/0 | 7/22 |
| `06c63f0` `[IA]` Conteo de requisitos/decisiones | Agente | 0/0 | 0/0 | 0/0 | 6/4 | 0/0 | 6/4 |
| `4c58d95` `[IA]` Estado de implementación E2 | Agente | 0/0 | 0/0 | 0/0 | 8/6 | 0/0 | 8/6 |
| `e845bb0` `[IA]` Auditoría de citas/rutas | Agente | 0/0 | 0/0 | 0/0 | 67/0 | 0/0 | 67/0 |

## Totales por carpeta

| Carpeta | Añadidas | Eliminadas | Total de líneas cambiadas |
|---|---:|---:|---:|
| `backend` | 9.090 | 104 | 9.194 |
| `frontend` | 6.241 | 72 | 6.313 |
| `specs` | 4.198 | 126 | 4.324 |
| `docs` | 3.192 | 91 | 3.283 |
| `otros` | 18.813 | 1.102 | 19.915 |
| **Total** | **41.534** | **1.495** | **43.029** |

## Porcentajes según la clasificación recibida

El porcentaje se calcula sobre líneas añadidas más eliminadas de los commits atribuidos, no sobre tamaño final de los archivos. Se excluyen los 2 renglones del commit inicial aún sin clasificación; por eso estos porcentajes son provisionales respecto del total completo del historial.

| Autoría | Commits atribuibles | Añadidas | Eliminadas | Líneas cambiadas | % de líneas añadidas atribuibles | % de líneas eliminadas atribuibles | % del total de líneas atribuibles |
|---|---:|---:|---:|---:|---:|---:|---:|
| Agente | 36 | 41.337 | 1.465 | 42.802 | 99,53 % | 97,99 % | 99,48 % |
| Equipo | 1 | 195 | 30 | 225 | 0,47 % | 2,01 % | 0,52 % |
| Sin clasificar (`46a31b1`) | 1 | 2 | 0 | 2 | Excluido | Excluido | Excluido |

**Pendiente para cerrar la atribución total:** indicar si `46a31b1` fue generado por el agente o por el equipo. No se infirió esa autoría a partir del contenido del commit.
