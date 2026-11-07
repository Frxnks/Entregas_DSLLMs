from pathlib import Path

import pytest

from mira_cu1.config import KIT_ROOT
from mira_cu1.database import Database, IdentityStore, import_kit
from mira_cu1.rag import RagEngine
from mira_cu1.tools import ToolService


@pytest.fixture
def database(tmp_path: Path) -> Database:
    path = tmp_path / "test.sqlite"
    import_kit(KIT_ROOT / "datos" / "CU-1_datos.xlsx", path)
    return Database(path)


@pytest.fixture
def tools(database: Database, tmp_path: Path) -> ToolService:
    rag = RagEngine(KIT_ROOT / "corpus", tmp_path / "chroma", "unused-in-tool-tests")
    return ToolService(database, rag, use_lexical=True)


@pytest.fixture
def sessions(database: Database) -> dict[str, str]:
    store = IdentityStore(database)
    return {user_id: store.create_session(user_id)["session_id"] for user_id in ("U-01", "U-02", "U-03", "U-04")}

