import json
import sqlite3
import uuid
from typing import Any, Callable

from .database import ConfirmationStore, Database, IdentityStore, utcnow
from .rag import RagEngine
from .security import sanitize_for_llm


class ToolService:
    def __init__(self, database: Database, rag: RagEngine, use_lexical: bool = False):
        self.database = database
        self.identities = IdentityStore(database)
        self.confirmations = ConfirmationStore(database)
        self.rag = rag
        self.use_lexical = use_lexical

    def _record(self, session_id: str | None, tool: str, arguments: dict, ok: bool, summary: str) -> str:
        trace_id = str(uuid.uuid4())
        safe_arguments = sanitize_for_llm(arguments, self.identities.known_names())
        with self.database.connect() as connection:
            connection.execute(
                "INSERT INTO tool_traces VALUES (?, ?, ?, ?, ?, ?, ?)",
                (trace_id, session_id, tool, json.dumps(safe_arguments, ensure_ascii=False), int(ok), summary, utcnow().isoformat()),
            )
            connection.commit()
        return trace_id

    def _run(self, session_id: str | None, tool: str, arguments: dict, operation: Callable[[], Any]) -> dict:
        try:
            data = operation()
            trace_id = self._record(session_id, tool, arguments, True, self._summary(data))
            return {"ok": True, "data": data, "error": None, "trace_id": trace_id}
        except (PermissionError, ValueError, RuntimeError, sqlite3.Error) as exc:
            trace_id = self._record(session_id, tool, arguments, False, str(exc))
            return {"ok": False, "data": None, "error": str(exc), "trace_id": trace_id}

    @staticmethod
    def _summary(data: Any) -> str:
        if isinstance(data, list):
            return f"{len(data)} registro(s) devuelto(s)"
        if isinstance(data, dict):
            return str(data.get("message") or data.get("caso_id") or "Operación completada")[:240]
        return "Operación completada"

    def _authorize_case(self, session_id: str, case_id: str) -> tuple[dict, dict]:
        identity = self.identities.resolve(session_id)
        case = self.database.query_one("SELECT * FROM casos WHERE caso_id=?", (case_id,))
        if not case or case["org_id"] != identity["org_id"]:
            raise PermissionError("Caso inexistente o fuera del alcance de la organización")
        event = self.database.query_one(
            "SELECT estado_resultante, fecha FROM caso_eventos WHERE caso_id=? ORDER BY fecha DESC LIMIT 1", (case_id,)
        )
        case["estado_original"] = case["estado"]
        case["estado_actual"] = event["estado_resultante"] if event else case["estado"]
        return identity, case

    def crear_sesion(self, usuario_id: str) -> dict:
        """Herramienta técnica para autenticar la sesión fuera del modelo."""
        return self._run(None, "crear_sesion", {"usuario_id": usuario_id}, lambda: self.identities.create_session(usuario_id))

    def contexto_sesion(self, session_id: str) -> dict:
        """Valida la sesión y entrega el contexto mínimo a la API, nunca al modelo."""
        def operation() -> dict:
            identity = self.identities.resolve(session_id)
            return {
                "user_id": identity["usuario_id"],
                "display_name": identity["nombre"],
                "org_id": identity["org_id"],
                "role": identity["rol"],
            }
        return self._run(session_id, "contexto_sesion", {}, operation)

    def buscar_reglas(self, session_id: str, pregunta: str, top_k: int = 5) -> dict:
        def operation() -> list[dict]:
            self.identities.resolve(session_id)
            if not pregunta.strip():
                raise ValueError("La pregunta no puede estar vacía")
            search = self.rag.search_lexical if self.use_lexical else self.rag.search
            return search(pregunta, top_k=max(1, min(top_k, 8)))
        return self._run(session_id, "buscar_reglas", {"pregunta": pregunta, "top_k": top_k}, operation)

    def consultar_caso(self, session_id: str, caso_id: str) -> dict:
        def operation() -> dict:
            _, case = self._authorize_case(session_id, caso_id)
            organization = self.database.query_one(
                "SELECT org_id, industria, pais, umbral_aprobacion, umbral_revision, plazo_resolucion_dias_habiles, plazo_antecedentes_dias_habiles FROM organizaciones WHERE org_id=?",
                (case["org_id"],),
            )
            case["organizacion"] = organization
            return case
        return self._run(session_id, "consultar_caso", {"caso_id": caso_id}, operation)

    def listar_senales(self, session_id: str, caso_id: str) -> dict:
        def operation() -> list[dict]:
            self._authorize_case(session_id, caso_id)
            return self.database.query_all("SELECT * FROM senales WHERE caso_id=? ORDER BY senal_id", (caso_id,))
        return self._run(session_id, "listar_senales", {"caso_id": caso_id}, operation)

    def consultar_evidencias(self, session_id: str, caso_id: str) -> dict:
        def operation() -> list[dict]:
            self._authorize_case(session_id, caso_id)
            rows = self.database.query_all("SELECT * FROM evidencias WHERE caso_id=? ORDER BY evidencia_id", (caso_id,))
            return sanitize_for_llm(rows, self.identities.known_names())
        return self._run(session_id, "consultar_evidencias", {"caso_id": caso_id}, operation)

    def consultar_solicitudes(self, session_id: str, caso_id: str) -> dict:
        def operation() -> list[dict]:
            self._authorize_case(session_id, caso_id)
            return self.database.query_all(
                "SELECT solicitud_id, caso_id, usuario_id, fecha, documentos_solicitados, motivo, estado FROM solicitudes_antecedentes WHERE caso_id=? ORDER BY fecha",
                (caso_id,),
            )
        return self._run(session_id, "consultar_solicitudes", {"caso_id": caso_id}, operation)

    def consultar_cambios_umbral(self, session_id: str, org_id: str) -> dict:
        def operation() -> list[dict]:
            identity = self.identities.resolve(session_id)
            if identity["org_id"] != org_id:
                raise PermissionError("Organización fuera del alcance del usuario")
            return self.database.query_all(
                "SELECT cambio_id, org_id, parametro, valor_anterior, valor_nuevo, autor, aprobador_1, aprobador_2, fecha FROM cambios_umbral WHERE org_id=? ORDER BY fecha",
                (org_id,),
            )
        return self._run(session_id, "consultar_cambios_umbral", {"org_id": org_id}, operation)

    def preparar_solicitud_antecedentes(self, session_id: str, caso_id: str, documentos: list[str], motivo: str) -> dict:
        def operation() -> dict:
            identity, case = self._authorize_case(session_id, caso_id)
            self._validate_request(identity, case, documentos, motivo)
            return self.confirmations.create(session_id, {
                "case_id": caso_id,
                "documents": [doc.strip() for doc in documentos],
                "reason": motivo.strip(),
            })
        return self._run(
            session_id, "preparar_solicitud_antecedentes",
            {"caso_id": caso_id, "documentos": documentos, "motivo": motivo}, operation,
        )

    def _validate_request(self, identity: dict, case: dict, documents: list[str], reason: str, connection: sqlite3.Connection | None = None) -> None:
        if identity["rol"] not in {"operador", "supervisor"}:
            raise PermissionError("PRO-ANT §4: solo un operador o supervisor puede registrar una solicitud")
        if case["estado_actual"] == "aprobado_automatico":
            raise ValueError("PRO-ANT §4: no se solicitan antecedentes sobre un caso aprobado automáticamente")
        if not documents or not all(isinstance(doc, str) and doc.strip() for doc in documents):
            raise ValueError("PRO-ANT §2: debe indicar los documentos o capturas requeridos")
        if not reason.strip():
            raise ValueError("PRO-ANT §2: debe indicar un motivo comprensible")
        query = "SELECT COUNT(*) FROM solicitudes_antecedentes WHERE caso_id=?"
        if connection is None:
            count = self.database.query_one("SELECT COUNT(*) AS total FROM solicitudes_antecedentes WHERE caso_id=?", (case["caso_id"],))["total"]
        else:
            count = connection.execute(query, (case["caso_id"],)).fetchone()[0]
        if count >= 2 and identity["rol"] != "supervisor":
            raise PermissionError(
                f"PRO-ANT §4: {case['caso_id']} ya tiene {count} solicitudes; la siguiente debe registrarla un supervisor"
            )

    def solicitar_antecedentes(self, session_id: str, confirmation_token: str) -> dict:
        """Única escritura operacional. Revalida todo dentro de la transacción."""
        def operation() -> dict:
            identity = self.identities.resolve(session_id)
            confirmation = self.confirmations.get(confirmation_token, session_id)
            if confirmation["consumed_at"]:
                return {**confirmation["result"], "idempotent_replay": True}
            payload = confirmation["payload"]
            with self.database.connect() as connection:
                connection.execute("BEGIN IMMEDIATE")
                case_row = connection.execute("SELECT * FROM casos WHERE caso_id=?", (payload["case_id"],)).fetchone()
                if not case_row or case_row["org_id"] != identity["org_id"]:
                    raise PermissionError("Caso inexistente o fuera del alcance de la organización")
                case = dict(case_row)
                event = connection.execute(
                    "SELECT estado_resultante FROM caso_eventos WHERE caso_id=? ORDER BY fecha DESC LIMIT 1", (payload["case_id"],)
                ).fetchone()
                case["estado_actual"] = event[0] if event else case["estado"]
                self._validate_request(identity, case, payload["documents"], payload["reason"], connection)
                request_id = f"SA-{uuid.uuid4().hex[:10].upper()}"
                event_id = f"EV-{uuid.uuid4().hex[:10].upper()}"
                callback_id = f"CB-{uuid.uuid4().hex[:10].upper()}"
                now = utcnow().isoformat()
                connection.execute(
                    "INSERT INTO solicitudes_antecedentes VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (request_id, payload["case_id"], identity["usuario_id"], now,
                     json.dumps(payload["documents"], ensure_ascii=False), payload["reason"], "registrada"),
                )
                connection.execute(
                    "INSERT INTO caso_eventos VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (event_id, payload["case_id"], identity["usuario_id"], now,
                     "solicitud_antecedentes_registrada", "solicitud_antecedentes", request_id),
                )
                callback_payload = {"solicitud_id": request_id, "caso_id": payload["case_id"], "estado": "solicitud_antecedentes"}
                connection.execute(
                    "INSERT INTO callback_eventos VALUES (?, ?, ?, ?, ?, ?)",
                    (callback_id, request_id, "simulador-local", json.dumps(callback_payload), "simulado", now),
                )
                result = {
                    "message": "Solicitud registrada después de la confirmación humana",
                    "solicitud_id": request_id, "caso_id": payload["case_id"],
                    "estado_actual": "solicitud_antecedentes", "callback": "simulado-local",
                    "idempotent_replay": False,
                }
                updated = connection.execute(
                    "UPDATE confirmaciones SET consumed_at=?, result_json=? WHERE token=? AND consumed_at IS NULL",
                    (now, json.dumps(result, ensure_ascii=False), confirmation_token),
                )
                if updated.rowcount != 1:
                    raise RuntimeError("La confirmación ya fue utilizada")
                connection.commit()
                return result
        return self._run(session_id, "solicitar_antecedentes", {"confirmation_token": confirmation_token}, operation)

    def traces(self, session_id: str, limit: int = 30) -> list[dict]:
        self.identities.resolve(session_id)
        return self.database.query_all(
            "SELECT trace_id, tool, arguments_json, ok, summary, created_at FROM tool_traces WHERE session_id=? ORDER BY created_at DESC LIMIT ?",
            (session_id, max(1, min(limit, 100))),
        )

    def consultar_trazas(self, session_id: str, limit: int = 30) -> dict:
        return self._run(session_id, "consultar_trazas", {"limit": limit}, lambda: self.traces(session_id, limit))
