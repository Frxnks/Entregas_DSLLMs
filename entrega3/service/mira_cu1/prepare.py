import argparse
import json

from .config import get_settings
from .corpus import load_corpus
from .database import import_kit
from .rag import RagEngine


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa el kit e indexa el corpus de CU-1")
    parser.add_argument("--skip-index", action="store_true", help="Solo importa y verifica SQLite")
    args = parser.parse_args()
    settings = get_settings()
    database = import_kit(settings.workbook_path, settings.database_path)
    documents, chunks = load_corpus(settings.corpus_path)
    report = {"database": database, "documents": len(documents), "section_chunks": len(chunks)}
    if not args.skip_index:
        engine = RagEngine(settings.corpus_path, settings.chroma_path, settings.rag_embedding_model)
        report["indexes"] = [engine.index("sections"), engine.index("windows")]
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

