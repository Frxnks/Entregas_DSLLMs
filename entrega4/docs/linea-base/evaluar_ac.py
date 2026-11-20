"""Evalúa la línea base (docs/linea-base/codigo) contra los 14 AC de 02-especificacion.md.

Mapeo de equivalencias (definido por el equipo, no por la línea base):
  Decisión:  REVISION                 ≡ DERIVAR_A_REVISION
             APROBAR                  ≡ APROBAR
  Motivo:    senal_de_fraude          ≡ FRAUDE
             sin_senales              ≡ SIN_SENALES
             senal_bajo_minimo        ≡ SENAL_BAJO_MINIMO
             puntaje_bajo_umbral      ≡ PUNTAJE_BAJO_UMBRAL
             (aprobación: reasons=()) ≡ NO HAY motivo; la línea base no emite nada
                                        equivalente a PUNTAJE_SOBRE_UMBRAL.
Criterio: un AC cumple solo si coinciden decisión y motivo exigido. Si la línea base
devuelve varios motivos sin indicar cuál prima y el AC exige uno solo, cuenta como NO.
Si el AC no exige motivo (AC-1, AC-11, AC-12, A de AC-13), solo se compara lo exigido.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "codigo"))

from fastapi.testclient import TestClient  # noqa: E402

from mira.api import create_app  # noqa: E402
from mira.decision import ClientConfig, Signal, decide  # noqa: E402

DEC = {"REVISION": "DERIVAR_A_REVISION", "APROBAR": "APROBAR"}
MOT = {
    "senal_de_fraude": "FRAUDE",
    "sin_senales": "SIN_SENALES",
    "senal_bajo_minimo": "SENAL_BAJO_MINIMO",
    "puntaje_bajo_umbral": "PUNTAJE_BAJO_UMBRAL",
}


def run(thr, mn, sigs):
    r = decide([Signal("s", s, f) for s, f in sigs], ClientConfig(thr, mn))
    return DEC[r.decision.value], [MOT[x] for x in r.reasons], r.score


def fmt(dec, mots):
    return f"{dec}" + (f" [{', '.join(mots)}]" if mots else " [sin motivo]")


def juzgar(exp_dec, exp_mot, dec, mots):
    """Devuelve (cumple, nota)."""
    if dec != exp_dec:
        return False, "decisión distinta"
    if exp_mot is None:
        return True, ""
    if not mots:
        return False, f"no entrega motivo ({exp_mot} exigido)"
    if mots == [exp_mot]:
        return True, ""
    if exp_mot in mots and len(mots) > 1:
        return False, "varios motivos sin indicar cuál prima"
    return False, "motivo distinto"


F = lambda s: (s, True)  # señal de fraude
N = lambda s: (s, False)
filas = []


def uno(ac, exp_dec, exp_mot, thr, mn, sigs, extra=None):
    dec, mots, score = run(thr, mn, sigs)
    ok, nota = juzgar(exp_dec, exp_mot, dec, mots)
    esp = fmt(exp_dec, [exp_mot] if exp_mot else [])
    if exp_mot is None:
        esp = exp_dec
    obt = fmt(dec, mots)
    if extra:
        ok, nota, esp, obt = extra(ok, nota, esp, obt, score)
    filas.append((ac, esp, obt, ok, nota))


def ac1(ok, nota, esp, obt, score):
    return score == 94, "", "puntaje 94", f"puntaje {score}"


uno("AC-1", "APROBAR", None, 90, 50, [N(95), N(93)], ac1)
uno("AC-2", "APROBAR", "PUNTAJE_SOBRE_UMBRAL", 90, 50, [N(95), N(93)])
uno("AC-3", "APROBAR", "PUNTAJE_SOBRE_UMBRAL", 85, 50, [N(80), N(90)])
uno("AC-4", "DERIVAR_A_REVISION", "PUNTAJE_BAJO_UMBRAL", 85, 50, [N(80), N(88)])
uno("AC-5", "DERIVAR_A_REVISION", "SENAL_BAJO_MINIMO", 70, 50, [N(100), N(100), N(40)])
uno("AC-6", "APROBAR", "PUNTAJE_SOBRE_UMBRAL", 70, 50, [N(100), N(50)])
uno("AC-7", "DERIVAR_A_REVISION", "SENAL_BAJO_MINIMO", 85, 50, [N(40), N(60)])
uno("AC-8", "DERIVAR_A_REVISION", "FRAUDE", 85, 50, [F(99), N(99)])
uno("AC-9", "DERIVAR_A_REVISION", "FRAUDE", 85, 50, [F(10), N(20)])
uno("AC-10", "DERIVAR_A_REVISION", "SIN_SENALES", 85, 50, [])


def ac11(ok, nota, esp, obt, score):
    return ok, nota, "DERIVAR_A_REVISION (nunca RECHAZAR)", obt


uno("AC-11", "DERIVAR_A_REVISION", None, 85, 0, [N(0), N(0)], ac11)

# AC-12
a, _, _ = run(70, 50, [N(80), N(80)])
b, _, _ = run(90, 50, [N(80), N(80)])
filas.append(("AC-12", "A=APROBAR, B=DERIVAR_A_REVISION", f"A={a}, B={b}",
              a == "APROBAR" and b == "DERIVAR_A_REVISION", ""))
# AC-13
a, _, _ = run(80, 50, [N(100), N(100), N(60)])
b, mb, _ = run(80, 70, [N(100), N(100), N(60)])
okb, nb = juzgar("DERIVAR_A_REVISION", "SENAL_BAJO_MINIMO", b, mb)
filas.append(("AC-13", "A=APROBAR, B=DERIVAR_A_REVISION [SENAL_BAJO_MINIMO]",
              f"A={a}, B={fmt(b, mb)}", a == "APROBAR" and okb, nb))

# AC-14: API con TestClient, cliente sin configuración
c = TestClient(create_app())
r = c.post("/clients/sin-config/decision",
           json={"signals": [{"name": "a", "score": 95}, {"name": "b", "score": 93}]})
det = r.json().get("detail", {})
ok14 = r.status_code >= 400 and "decision" not in r.json() and "configuraci" in str(det).lower()
filas.append(("AC-14", "error de falta de configuración, sin decisión",
              f"HTTP {r.status_code} {det.get('error')}", ok14, ""))

# Tabla
w = [5, 48, 52, 7]
print(f"{'AC':<{w[0]}} | {'esperado':<{w[1]}} | {'obtenido':<{w[2]}} | cumple")
print("-" * 125)
for ac, esp, obt, ok, nota in filas:
    print(f"{ac:<{w[0]}} | {esp:<{w[1]}} | {obt:<{w[2]}} | {'SÍ' if ok else 'NO'}" + (f"  ({nota})" if nota else ""))
print(f"\nTotal: {sum(f[3] for f in filas)}/14")
