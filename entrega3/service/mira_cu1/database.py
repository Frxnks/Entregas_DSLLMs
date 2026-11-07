import hashlib
import json
import re
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

from openpyxl import load_workbook

from .corpus import file_sha256


TABLES: dict[str, list[str]] = {
    "organizaciones": ["org_id", "nombre", "industria", "pais", "umbral_aprobacion", "umbral_revision", "plazo_resolucion_dias_habiles", "plazo_antecedentes_dias_habiles"],
    "usuarios": ["usuario_id", "nombre", "org_id", "rol"],
    "casos": ["caso_id", "org_id", "tipo_proceso", "fecha_ingreso", "estado", "puntaje", "decision_sugerida", "motivo_derivacion", "operador_asignado", "vence_el", "version_flujo"],
    "senales": ["senal_id", "caso_id", "codigo", "valor", "minimo", "bajo_minimo", "es_fraude", "activa", "detalle"],
    "evidencias": ["evidencia_id", "caso_id", "tipo", "nombre_archivo", "paginas", "legible", "texto_extraido"],
    "solicitudes_antecedentes": ["solicitud_id", "caso_id", "usuario_id", "fecha", "documentos_solicitados", "motivo", "estado"],
    "cambios_umbral": ["cambio_id", "org_id", "parametro", "valor_anterior", "valor_nuevo", "autor", "aprobador_1", "aprobador_2", "fecha"],
}
NUMERIC_COLUMNS = {
    "umbral_aprobacion", "umbral_revision", "plazo_resolucion_dias_habiles",
    "plazo_antecedentes_dias_habiles", "puntaje", "valor", "minimo", "paginas",
    "valor_anterior", "valor_nuevo",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Database:
    def __init__(self, path: Path):
        self.path = path

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
        finally:
            connection.close()

    def query_one(self, sql: str, params: tuple[Any, ...] = ()) -> dict | None:
        with self.connect() as connection:
            row = connection.execute(sql, params).fetchone()
            return dict(row) if row else None

    def query_all(self, sql: str, params: tuple[Any, ...] = ()) -> list[dict]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(sql, params).fetchall()]


def _read_workbook(path: Path) -> dict[str, list[list[Any]]]:
    workbook = load_workbook(path, read_only=True, data_only=False)
    try:
        expected = {"LEEME", *TABLES}
        if set(workbook.sheetnames) != expected:
            raise ValueError(f"Hojas inesperadas. Esperadas: {sorted(expected)}")
        result: dict[str, list[list[Any]]] = {}
        for table, expected_columns in TABLES.items():
            rows = list(workbook[table].values)
            if list(rows[0]) != expected_columns:
                raise ValueError(f"Columnas inesperadas en {table}")
            records: list[list[Any]] = []
            seen: set[Any] = set()
            for row in rows[1:]:
                if all(value is None for value in row):
                    continue
                if row[0] is None or row[0] in seen:
                    raise ValueError(f"Clave primaria vacía o duplicada en {table}")
                if any(isinstance(value, str) and value.startswith("=") for value in row):
                    raise ValueError(f"El importador no evalúa fórmulas: {table}/{row[0]}")
                seen.add(row[0])
                records.append(list(row))
            result[table] = records
        return result
    finally:
        workbook.close()


def _row_hash(columns: list[str], values: list[Any]) -> str:
    payload = json.dumps(dict(zip(columns, values)), ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def import_kit(workbook_path: Path, database_path: Path) -> dict:
    """Crea una base nueva o verifica que los registros originales sigan intactos."""
    database_path.parent.mkdir(parents=True, exist_ok=True)
    rows_by_table = _read_workbook(workbook_path)
    source_hash = file_sha256(workbook_path)
    connection = sqlite3.connect(database_path, timeout=10)
    try:
        connection.row_factory = sqlite3.Row
        connection.execute("BEGIN IMMEDIATE")
        exists = connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='_kit_import'"
        ).fetchone()
        if exists:
            recorded = connection.execute("SELECT sha256 FROM _kit_import").fetchone()
            if not recorded or recorded[0] != source_hash:
                raise ValueError("La base existente proviene de otro archivo Excel")
            verify_original_records(connection, rows_by_table)
            connection.commit()
            return {"status": "verificado", "sha256": source_hash, "rows": {k: len(v) for k, v in rows_by_table.items()}}

        connection.execute("CREATE TABLE _kit_import (sha256 TEXT PRIMARY KEY, source TEXT NOT NULL, imported_at TEXT NOT NULL)")
        connection.execute("CREATE TABLE _kit_rows (table_name TEXT NOT NULL, primary_key TEXT NOT NULL, row_hash TEXT NOT NULL, PRIMARY KEY(table_name, primary_key))")
        for table, columns in TABLES.items():
            if not re.fullmatch(r"[a-z_][a-z0-9_]*", table) or not all(re.fullmatch(r"[a-z_][a-z0-9_]*", col) for col in columns):
                raise ValueError("Identificador SQL no permitido")
            definitions = []
            for index, column in enumerate(columns):
                sql_type = "NUMERIC" if column in NUMERIC_COLUMNS else "TEXT"
                definitions.append(f"{column} {sql_type}" + (" PRIMARY KEY NOT NULL" if index == 0 else ""))
            connection.execute(f"CREATE TABLE {table} ({', '.join(definitions)})")
            placeholders = ",".join("?" for _ in columns)
            connection.executemany(f"INSERT INTO {table} VALUES ({placeholders})", rows_by_table[table])
            connection.executemany(
                "INSERT INTO _kit_rows VALUES (?, ?, ?)",
                [(table, str(row[0]), _row_hash(columns, row)) for row in rows_by_table[table]],
            )
            primary_key = columns[0]
            connection.execute(
                f"CREATE TRIGGER protect_{table}_update BEFORE UPDATE ON {table} "
                f"WHEN EXISTS (SELECT 1 FROM _kit_rows WHERE table_name='{table}' AND primary_key=CAST(OLD.{primary_key} AS TEXT)) "
                "BEGIN SELECT RAISE(ABORT, 'Los registros originales del kit son inmutables'); END"
            )
            connection.execute(
                f"CREATE TRIGGER protect_{table}_delete BEFORE DELETE ON {table} "
                f"WHEN EXISTS (SELECT 1 FROM _kit_rows WHERE table_name='{table}' AND primary_key=CAST(OLD.{primary_key} AS TEXT)) "
                "BEGIN SELECT RAISE(ABORT, 'Los registros originales del kit son inmutables'); END"
            )

        connection.executescript("""
            CREATE TABLE sesiones (
                session_id TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(usuario_id),
                created_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
            );
            CREATE TABLE confirmaciones (
                token TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sesiones(session_id),
                payload_json TEXT NOT NULL, payload_hash TEXT NOT NULL, created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL, consumed_at TEXT, result_json TEXT
            );
            CREATE TABLE caso_eventos (
                evento_id TEXT PRIMARY KEY, caso_id TEXT NOT NULL REFERENCES casos(caso_id),
                usuario_id TEXT NOT NULL REFERENCES usuarios(usuario_id), fecha TEXT NOT NULL,
                tipo TEXT NOT NULL, estado_resultante TEXT NOT NULL,
                solicitud_id TEXT REFERENCES solicitudes_antecedentes(solicitud_id)
            );
            CREATE TABLE callback_eventos (
                callback_id TEXT PRIMARY KEY, solicitud_id TEXT NOT NULL,
                target TEXT NOT NULL, payload_json TEXT NOT NULL, estado TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE tool_traces (
                trace_id TEXT PRIMARY KEY, session_id TEXT, tool TEXT NOT NULL,
                arguments_json TEXT NOT NULL, ok INTEGER NOT NULL, summary TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        connection.execute("INSERT INTO _kit_import VALUES (?, ?, ?)", (source_hash, workbook_path.name, utcnow().isoformat()))
        verify_original_records(connection, rows_by_table)
        connection.commit()
        return {"status": "importado", "sha256": source_hash, "rows": {k: len(v) for k, v in rows_by_table.items()}}
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def verify_original_records(connection: sqlite3.Connection, expected: dict[str, list[list[Any]]]) -> None:
    for table, rows in expected.items():
        columns = TABLES[table]
        primary_key = columns[0]
        for row in rows:
            found = connection.execute(
                f"SELECT {', '.join(columns)} FROM {table} WHERE {primary_key} = ?", (row[0],)
            ).fetchone()
            if found is None or list(found) != row:
                raise ValueError(f"Registro original ausente o alterado: {table}/{row[0]}")
            recorded = connection.execute(
                "SELECT row_hash FROM _kit_rows WHERE table_name=? AND primary_key=?", (table, str(row[0]))
            ).fetchone()
            if not recorded or recorded[0] != _row_hash(columns, row):
                raise ValueError(f"Huella de integridad inválida: {table}/{row[0]}")


class IdentityStore:
    def __init__(self, database: Database):
        self.database = database

    def create_session(self, user_id: str, ttl_hours: int = 8) -> dict:
        user = self.database.query_one("SELECT usuario_id, nombre, org_id, rol FROM usuarios WHERE usuario_id=?", (user_id,))
        if not user:
            raise PermissionError("Usuario no reconocido")
        session_id = str(uuid.uuid4())
        created = utcnow()
        expires = created + timedelta(hours=ttl_hours)
        with self.database.connect() as connection:
            connection.execute(
                "INSERT INTO sesiones VALUES (?, ?, ?, ?, NULL)",
                (session_id, user_id, created.isoformat(), expires.isoformat()),
            )
            connection.commit()
        return {"session_id": session_id, "user_id": user["usuario_id"], "role": user["rol"], "org_id": user["org_id"], "display_name": user["nombre"]}

    def resolve(self, session_id: str) -> dict:
        row = self.database.query_one(
            """SELECT s.session_id, s.expires_at, s.revoked_at, u.usuario_id, u.nombre, u.org_id, u.rol
               FROM sesiones s JOIN usuarios u ON u.usuario_id=s.usuario_id WHERE s.session_id=?""",
            (session_id,),
        )
        if not row or row["revoked_at"] or datetime.fromisoformat(row["expires_at"]) <= utcnow():
            raise PermissionError("Sesión inválida o vencida")
        return row

    def known_names(self) -> list[str]:
        return [row["nombre"] for row in self.database.query_all("SELECT nombre FROM usuarios")]


class ConfirmationStore:
    def __init__(self, database: Database):
        self.database = database

    def create(self, session_id: str, payload: dict, ttl_minutes: int = 10) -> dict:
        payload_json = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        payload_hash = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()
        token = str(uuid.uuid4())
        created = utcnow()
        expires = created + timedelta(minutes=ttl_minutes)
        with self.database.connect() as connection:
            connection.execute(
                "INSERT INTO confirmaciones VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)",
                (token, session_id, payload_json, payload_hash, created.isoformat(), expires.isoformat()),
            )
            connection.commit()
        return {"token": token, **payload, "expires_at": expires.isoformat()}

    def get(self, token: str, session_id: str) -> dict:
        row = self.database.query_one("SELECT * FROM confirmaciones WHERE token=?", (token,))
        if not row or row["session_id"] != session_id:
            raise PermissionError("Confirmación inválida para esta sesión")
        if datetime.fromisoformat(row["expires_at"]) <= utcnow():
            raise PermissionError("La confirmación venció")
        return {**row, "payload": json.loads(row["payload_json"]), "result": json.loads(row["result_json"]) if row["result_json"] else None}

