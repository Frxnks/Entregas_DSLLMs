import pytest

from mira_cu1.generation_evaluation import _select_questions, score_generation_report


def _sample(
    sample_id: str,
    question_type: str,
    should_answer: bool,
    state: str,
    *,
    citation_verdict: bool | None = None,
    faithful: bool | None = None,
    handling_correct: bool | None = None,
    status: str = "completed",
    failure_class: str | None = None,
) -> dict:
    citations = [{"chunk_id": f"{sample_id}:chunk"}] if citation_verdict is not None else []
    return {
        "id": sample_id,
        "type": question_type,
        "should_answer": should_answer,
        "status": status,
        "response": {"state": state, "citations": citations},
        "review": {
            "citation_assessments": [
                {"chunk_id": citation["chunk_id"], "supports_answer": citation_verdict, "note": ""}
                for citation in citations
            ],
            "faithful": faithful,
            "handling_correct": handling_correct,
            "failure_class": failure_class,
            "notes": "",
        },
    }


def test_score_generation_report_computes_reviewed_metrics():
    report = {
        "samples": [
            _sample("R01", "answerable", True, "evidencia", citation_verdict=True, faithful=True),
            _sample("R02", "answerable", True, "abstencion", faithful=False, failure_class="generation"),
            _sample("N01", "unanswerable", False, "abstencion", faithful=True),
            _sample("C01", "current_conflict", True, "conflicto", handling_correct=True, faithful=True),
            _sample(
                "V01", "version_change", True, "evidencia", handling_correct=False,
                faithful=False, failure_class="generation",
            ),
        ]
    }

    scores = score_generation_report(report)

    assert scores["complete_golden_set"] is False
    assert scores["citation_precision"] == {
        "correct": 1, "reviewed": 1, "unreviewed": 0, "value": 1.0,
    }
    assert scores["faithfulness"]["faithful"] == 3
    assert scores["faithfulness"]["reviewed"] == 5
    assert scores["abstention"]["correct"] == 1
    assert scores["abstention"]["unjustified"] == 1
    assert scores["conflict_and_version_handling"]["correct"] == 1
    assert scores["conflict_and_version_handling"]["reviewed"] == 2
    assert scores["failure_classification"]["generation"] == 2
    assert scores["unclassified_failures"] == []
    assert scores["manual_review_complete"] is True


def test_score_generation_report_does_not_count_operational_error_as_abstention():
    report = {
        "samples": [
            _sample("N01", "unanswerable", False, "error", status="error", failure_class="operational"),
        ]
    }

    scores = score_generation_report(report)

    assert scores["operational_errors"] == 1
    assert scores["abstention"]["correct"] == 0
    assert scores["abstention"]["correct_rate"] == 0.0
    assert scores["faithfulness"]["reviewed"] == 0
    assert scores["failure_classification"]["operational"] == 1
    assert scores["unclassified_failures"] == []


def test_score_generation_report_requires_each_emitted_citation_to_be_reviewed():
    report = {
        "samples": [
            _sample("R01", "answerable", True, "evidencia"),
        ]
    }
    report["samples"][0]["response"]["citations"] = [{"chunk_id": "R01:chunk"}]

    with pytest.raises(ValueError, match="revisiones de citas no coinciden"):
        score_generation_report(report)


def test_score_generation_report_rejects_failure_class_for_non_failure_value():
    sample = _sample("R01", "answerable", True, "evidencia", faithful=True)
    sample["review"]["failure_class"] = ["recovery"]

    with pytest.raises(ValueError, match="failure_class no reconocido"):
        score_generation_report({"samples": [sample]})


def test_select_questions_can_resume_without_repeating_completed_samples():
    questions = [{"id": f"R{index:02}"} for index in range(1, 21)]

    selected = _select_questions(questions, limit=19, start_from="R02")

    assert [question["id"] for question in selected] == [f"R{index:02}" for index in range(2, 21)]


def test_select_questions_rejects_unknown_start_id():
    with pytest.raises(ValueError, match="No existe la pregunta"):
        _select_questions([{"id": "R01"}], start_from="R99")
