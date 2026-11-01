import json
from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field, model_validator


class QuestionCategory(str, Enum):
    FACTUAL = "factual"
    MULTI_DOCUMENT = "multi_document"
    REASONING = "reasoning"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    MISLEADING = "misleading"
    HALLUCINATION_RESISTANCE = "hallucination_resistance"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class GoldenQuestion(BaseModel):
    """One hand-reviewed evaluation case.

    `supporting_evidence` holds the actual quoted passage(s) the
    `expected_answer` is grounded in -- not just a document id -- so
    "is this reference answer really supported by the source?" is a
    mechanical check against real text, not an assumption.

    For an unanswerable (insufficient_evidence) question, `expected_answer`
    is still filled in -- it describes the *correct abstention response* --
    but `supporting_doc_ids`/`supporting_evidence` are empty, since by
    definition no document actually supports an answer.
    """

    question_id: str
    question: str
    expected_answer: str
    supporting_doc_ids: list[str] = Field(default_factory=list)
    supporting_evidence: list[str] = Field(default_factory=list)
    category: QuestionCategory
    difficulty: DifficultyLevel
    is_answerable: bool

    @model_validator(mode="after")
    def _answerability_matches_evidence(self) -> "GoldenQuestion":
        if self.is_answerable and not self.supporting_doc_ids:
            raise ValueError(f"{self.question_id}: answerable question has no supporting_doc_ids")
        if not self.is_answerable and self.supporting_doc_ids:
            raise ValueError(
                f"{self.question_id}: unanswerable question has supporting_doc_ids "
                "(an unanswerable question should have no evidence by definition)"
            )
        return self


def load_golden_dataset(path: Path) -> list[GoldenQuestion]:
    """Load and validate a versioned golden dataset from its .jsonl file.

    Validation failures raise immediately with the offending line number --
    a malformed or inconsistent row should never silently enter an
    evaluation run.
    """
    questions: list[GoldenQuestion] = []
    seen_ids: set[str] = set()

    with path.open(encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                question = GoldenQuestion.model_validate(row)
            except Exception as e:
                raise ValueError(f"{path}:{line_number}: invalid golden dataset row: {e}") from e

            if question.question_id in seen_ids:
                raise ValueError(f"{path}:{line_number}: duplicate question_id '{question.question_id}'")
            seen_ids.add(question.question_id)
            questions.append(question)

    return questions
