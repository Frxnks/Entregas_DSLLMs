---
name: verificador-trazabilidad
description: Ejecuta un script que comprueba que cada criterio de aceptación (AC-n) de la especificación aparece en una tarea del plan y tiene al menos una prueba test_ac<n>_... en tests/. Úsala después de implementar o corregir código y antes de entregar al revisor; su salida se pega literal en el entregable.
---

# Verificar trazabilidad AC → tarea → prueba

1. Desde la carpeta entrega4/, con el entorno virtual, ejecuta:
   - Windows: `.venv\Scripts\python.exe .claude/skills/verificador-trazabilidad/scripts/verificar.py`
   - Linux/macOS: `.venv/bin/python .claude/skills/verificador-trazabilidad/scripts/verificar.py`
2. El script lee `docs/trabajo/02-especificacion.md`, `docs/trabajo/04-plan.md` y los archivos `tests/test_*.py`. Imprime una tabla por AC y una línea final `RESULTADO: OK` o `RESULTADO: FALLA`.
3. Código de salida: 0 = OK, 1 = falta algún AC o hay pruebas que citan AC inexistentes, 2 = no existe la especificación.
4. Pega la salida completa, sin editarla, en la sección "Verificador de trazabilidad" del entregable.
5. Si el resultado es FALLA, no lo corrijas cambiando nombres de pruebas para que calcen: agrega la prueba que falta o declara el AC como bloqueo.
6. No modifiques el script.
