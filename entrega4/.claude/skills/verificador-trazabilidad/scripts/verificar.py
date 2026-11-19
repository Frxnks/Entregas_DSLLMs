"""Verificador de trazabilidad AC -> tarea -> prueba (MIRA, Entrega 4).

Uso (desde entrega4/):
    python .claude/skills/verificador-trazabilidad/scripts/verificar.py

Lee los AC definidos en la especificación, los AC citados en el plan y las
pruebas nombradas test_ac<N>_... en tests/. Imprime una tabla y termina con
código 0 si todo AC tiene tarea y prueba, o 1 si falta algo.
"""
import argparse
import pathlib
import re
import sys

AC_RE = re.compile(r"\bAC-(\d+)\b")
TEST_RE = re.compile(r"^\s*def\s+(test_ac(\d+)_\w*)\s*\(", re.MULTILINE)


def ac_ids(path: pathlib.Path) -> set[int]:
    if not path.is_file():
        return set()
    return {int(n) for n in AC_RE.findall(path.read_text(encoding="utf-8"))}


def tests_por_ac(carpeta: pathlib.Path) -> dict[int, list[str]]:
    resultado: dict[int, list[str]] = {}
    if not carpeta.is_dir():
        return resultado
    for archivo in sorted(carpeta.rglob("test_*.py")):
        texto = archivo.read_text(encoding="utf-8")
        for nombre, n in TEST_RE.findall(texto):
            resultado.setdefault(int(n), []).append(f"{archivo.name}::{nombre}")
    return resultado


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--spec", default="docs/trabajo/02-especificacion.md")
    p.add_argument("--plan", default="docs/trabajo/04-plan.md")
    p.add_argument("--tests", default="tests")
    a = p.parse_args()

    spec, plan, tests = pathlib.Path(a.spec), pathlib.Path(a.plan), pathlib.Path(a.tests)
    if not spec.is_file():
        print(f"ERROR: no existe la especificacion {spec}")
        return 2

    acs = ac_ids(spec)
    en_plan = ac_ids(plan)
    pruebas = tests_por_ac(tests)
    if not plan.is_file():
        print(f"AVISO: no existe el plan {plan}; la columna 'En plan' queda en NO")

    print("| AC | En plan | Pruebas | Estado |")
    print("|---|---|---|---|")
    faltan = 0
    for n in sorted(acs):
        lista = pruebas.get(n, [])
        ok = n in en_plan and bool(lista)
        faltan += 0 if ok else 1
        print(f"| AC-{n} | {'SI' if n in en_plan else 'NO'} | "
              f"{', '.join(lista) if lista else '-'} | {'OK' if ok else 'FALTA'} |")

    huerfanas = sorted(set(pruebas) - acs)
    print()
    print(f"AC en la especificacion: {len(acs)}")
    print(f"AC completos (tarea y prueba): {len(acs) - faltan}")
    print(f"AC con algo faltante: {faltan}")
    if huerfanas:
        print("Pruebas que citan AC inexistentes en la spec: "
              + ", ".join(f"AC-{n}" for n in huerfanas))
    resultado = "OK" if faltan == 0 and not huerfanas else "FALLA"
    print(f"RESULTADO: {resultado}")
    return 0 if resultado == "OK" else 1


if __name__ == "__main__":
    sys.exit(main())
