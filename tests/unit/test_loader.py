from pathlib import Path

from app.ingestion.loader import load_documents


def test_loads_txt_files(tmp_path: Path):
    (tmp_path / "doc_a.txt").write_text("content of doc a", encoding="utf-8")
    (tmp_path / "doc_b.txt").write_text("content of doc b", encoding="utf-8")

    docs = load_documents(tmp_path)

    assert len(docs) == 2
    ids = {d.doc_id for d in docs}
    assert ids == {"doc_a", "doc_b"}
    assert all(d.file_type == "txt" for d in docs)


def test_skips_non_document_files(tmp_path: Path):
    (tmp_path / "real_doc.txt").write_text("real content", encoding="utf-8")
    (tmp_path / "SOURCES.md").write_text("provenance metadata, not a document", encoding="utf-8")
    (tmp_path / ".gitkeep").write_text("", encoding="utf-8")

    docs = load_documents(tmp_path)

    assert len(docs) == 1
    assert docs[0].doc_id == "real_doc"


def test_empty_directory_returns_no_documents(tmp_path: Path):
    assert load_documents(tmp_path) == []


def test_results_sorted_by_filename(tmp_path: Path):
    (tmp_path / "zzz.txt").write_text("z", encoding="utf-8")
    (tmp_path / "aaa.txt").write_text("a", encoding="utf-8")

    docs = load_documents(tmp_path)

    assert [d.doc_id for d in docs] == ["aaa", "zzz"]
