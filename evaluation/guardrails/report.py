from pydantic import BaseModel


class AdversarialResult(BaseModel):
    """One case's outcome against the real pipeline."""

    case_id: str
    category: str
    question: str
    expected_blocked: bool
    actual_blocked: bool
    blocked_by: list[str] | None
    passed: bool
    notes: str = ""


class AdversarialReport(BaseModel):
    dataset_version: str
    total_cases: int
    total_passed: int
    total_failed: int
    results: list[AdversarialResult]

    @property
    def pass_rate(self) -> float:
        return self.total_passed / self.total_cases if self.total_cases else 0.0


def build_report(dataset_version: str, results: list[AdversarialResult]) -> AdversarialReport:
    total_passed = sum(1 for r in results if r.passed)
    return AdversarialReport(
        dataset_version=dataset_version,
        total_cases=len(results),
        total_passed=total_passed,
        total_failed=len(results) - total_passed,
        results=results,
    )
