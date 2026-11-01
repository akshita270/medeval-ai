import logging
from pathlib import Path

from pypdf import PdfReader

from app.schemas import RawDocument

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".txt", ".pdf"}


def _read_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def load_documents(raw_dir: Path) -> list[RawDocument]:
    """Load every supported file in `raw_dir` into a RawDocument.

    Non-document files (e.g. SOURCES.md, .gitkeep) and unsupported
    extensions are skipped rather than raising, since a documents
    folder will naturally contain provenance/metadata files alongside
    the actual source material.
    """
    documents: list[RawDocument] = []

    for path in sorted(raw_dir.iterdir()):
        if not path.is_file():
            continue
        suffix = path.suffix.lower()
        if suffix not in SUPPORTED_EXTENSIONS:
            continue

        if suffix == ".txt":
            text = _read_txt(path)
            file_type = "txt"
        else:
            text = _read_pdf(path)
            file_type = "pdf"

        if not text.strip():
            logger.warning("Loaded empty document: %s", path.name)

        documents.append(
            RawDocument(
                doc_id=path.stem,
                file_path=path,
                file_type=file_type,
                text=text,
            )
        )

    return documents
