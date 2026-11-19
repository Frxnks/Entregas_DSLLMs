---
name: revision-contra-spec
description: Rúbrica binaria para revisar código y pruebas contra una especificación aprobada, criterio por criterio, y plantilla del informe de revisión con veredicto APROBADO, CAMBIOS o ESCALAR A HUMANO. Úsala cada vez que haya que revisar una implementación (archivo 06-revision-<N>.md).
---

# Revisión contra la especificación

Aplica a cada AC estas cuatro preguntas. Cada una es SÍ o NO, sin puntajes ni nota global.

- R1 Implementado: ¿hay código en src/ que produce el comportamiento del Then? (cita archivo y línea)
- R2 Probado: ¿hay una prueba test_ac<n>_... que ejercita el Given y el When del AC?
- R3 Prueba válida: ¿la prueba fallaría si el comportamiento no se cumpliera? Es NO si solo verifica detalles internos, si su assert es trivial o si usa valores distintos a los del AC.
- R4 Sin reglas inventadas: ¿el código evita agregar condiciones, umbrales o estados que la especificación no tiene?

Reglas del veredicto:
- APROBADO: los cuatro criterios en SÍ para todos los AC, y la salida de pytest y del verificador pegada en el entregable muestra todo en verde.
- CAMBIOS: al menos un NO. Cada NO se convierte en un hallazgo H-n.
- ESCALAR A HUMANO: es la vuelta 2 y queda algún NO.

Un hallazgo sin evidencia (archivo y línea, o AC incumplido) no se reporta. No se califica estilo ni gusto personal.

Escribe el informe con la estructura de `plantilla-informe.md` (en esta misma carpeta).
