import hashlib
import math
import re
from dataclasses import dataclass, asdict
from pathlib import Path


MONTHS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5,
    "junio": 6, "julio": 7, "agosto": 8, "septiembre": 9,
    "octubre": 10, "noviembre": 11, "diciembre": 12,
}


@dataclass(frozen=True)
class Document:
    document_id: str
    code: str
    title: str
    version: str
    status: str
    status_original: str
    valid_from: str
    valid_until: str | None
    validity_original: str
    source: str
    sha256: str
    approx_tokens: int
    origin: str = "kit"
    fictional: bool = True

    def dict(self) -> dict:
        return asdict(self)


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _dates(text: str) -> list[str]:
    matches = re.findall(r"(\d{1,2}) de (\w+) de (\d{4})", text.lower())
    result = []
    for day, month, year in matches:
        if month not in MONTHS:
            continue
        result.append(f"{int(year):04d}-{MONTHS[month]:02d}-{int(day):02d}")
    return result


def read_document(path: Path) -> tuple[Document, str]:
    text = path.read_text(encoding="utf-8-sig")
    header = text.split("\n## ", 1)[0]
    fields = {
        key.strip(): value.strip()
        for key, value in re.findall(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$", header, re.M)
        if key.strip() not in {"Campo", "---"}
    }
    required = {"Código", "Versión", "Estado", "Vigencia"}
    if missing := required - fields.keys():
        raise ValueError(f"{path.name}: faltan metadatos {sorted(missing)}")
    raw_status = fields["Estado"].replace("**", "")
    lowered = raw_status.lower()
    if lowered.startswith("vigente"):
        status = "vigente"
    elif lowered.startswith("derogada"):
        status = "derogada"
    else:
        raise ValueError(f"{path.name}: estado desconocido {raw_status}")
    dates = _dates(fields["Vigencia"])
    if not dates:
        raise ValueError(f"{path.name}: vigencia no interpretable")
    document = Document(
        document_id=f"{fields['Código']}:v{fields['Versión']}",
        code=fields["Código"], title=text.splitlines()[0].removeprefix("# ").strip(),
        version=fields["Versión"], status=status, status_original=fields["Estado"],
        valid_from=dates[0], valid_until=dates[1] if len(dates) > 1 else None,
        validity_original=fields["Vigencia"], source=path.name,
        sha256=file_sha256(path), approx_tokens=math.ceil(len(text) / 4),
    )
    return document, text


def section_chunks(document: Document, text: str) -> list[dict]:
    headings = list(re.finditer(r"^## (.+)$", text, re.M))
    chunks = []
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        body = text[heading.start():end].strip()
        chunks.append({
            **document.dict(), "chunk_id": f"{document.document_id}:section:{index + 1:02d}",
            "section": heading.group(1).strip(), "text": body,
            "line_start": text[:heading.start()].count("\n") + 1,
            "line_end": text[:end].rstrip().count("\n") + 1,
            "strategy": "sections",
        })
    return chunks


def window_chunks(document: Document, text: str, size: int = 450, overlap: int = 90) -> list[dict]:
    """Ventanas breves con 20 % de solapamiento, sin mezclar secciones."""
    if overlap >= size:
        raise ValueError("El solapamiento debe ser menor que el tamaño de ventana")
    sections = section_chunks(document, text)
    chunks = []
    sequence = 0
    for section in sections:
        body = section["text"]
        start = 0
        while start < len(body):
            end = min(len(body), start + size)
            if end < len(body):
                boundary = body.rfind("\n", start, end)
                if boundary > start + size // 2:
                    end = boundary
            sequence += 1
            window_text = body[start:end].strip()
            line_start = section["line_start"] + body[:start].count("\n")
            chunks.append({
                **{k: v for k, v in section.items() if k not in {"chunk_id", "text", "strategy"}},
                "chunk_id": f"{document.document_id}:window:{sequence:02d}",
                "text": window_text, "strategy": "windows",
                "line_start": line_start,
                "line_end": line_start + window_text.count("\n"),
            })
            if end >= len(body):
                break
            start = max(end - overlap, start + 1)
    return chunks


def load_corpus(directory: Path, strategy: str = "sections") -> tuple[list[dict], list[dict]]:
    documents: list[dict] = []
    chunks: list[dict] = []
    for path in sorted(directory.glob("*.md")):
        document, text = read_document(path)
        documents.append(document.dict())
        splitter = section_chunks if strategy == "sections" else window_chunks
        chunks.extend(splitter(document, text))
    if not documents:
        raise ValueError(f"No se encontraron documentos Markdown en {directory}")
    ids = [chunk["chunk_id"] for chunk in chunks]
    if len(ids) != len(set(ids)):
        raise ValueError("Hay identificadores de fragmento duplicados")
    return documents, chunks
