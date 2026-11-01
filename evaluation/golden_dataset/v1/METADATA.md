# Golden Dataset v1

**Status:** 30 questions drafted and verified (initial target met). Every answerable question's `supporting_evidence` was programmatically confirmed to be a verbatim substring of the actual cleaned source document before being committed to this file — see `/private/tmp/.../scratchpad/build_golden_v1.py` build script (not part of the repo) for the extraction/verification methodology.

**Category breakdown:** factual (8), multi_document (5), reasoning (5), insufficient_evidence (5), misleading (4), hallucination_resistance (3).
**Difficulty breakdown:** easy (5), medium (17), hard (8).
**Answerability:** 22 answerable, 8 unanswerable (5 insufficient_evidence + 3 hallucination_resistance).

**Still needed before this dataset is truly "reviewed," not just internally consistent:** a human (ideally with clinical knowledge) should read through the `expected_answer` text for medical accuracy and phrasing quality — the verification above only proves the *evidence quotes* are real and verbatim; it does not certify that my paraphrased `expected_answer` summaries are clinically precise.

**Built against document corpus:** the 10 documents in `data/raw_documents/` as of this version (see `data/raw_documents/SOURCES.md` for their exact identities/licenses). If documents are added, removed, or re-chunked in a way that changes retrievable content, a new dataset version (`v2/`) should be created rather than silently editing this one — otherwise past evaluation results stop being comparable to what the dataset actually tested.

**Config this dataset assumes:** chunk_size=800, chunk_overlap=100, embedding_model=text-embedding-3-small (see `app/config.py` defaults at the time this version was created).

**Fields:** see `evaluation/golden_dataset/schema.py` (`GoldenQuestion`) for the authoritative definition.
