from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.agents.interview_question_generator import InterviewQuestionGenerator
from app.agents.interview_summarizer import InterviewSummarizer, TranscriptAnalysisResult
from app.api.routes.interviews import get_interview_service
from app.config import Settings
from app.domain.models.interview import (
    GenerateQuestionsRequest,
    InterviewQuestion,
    InterviewQuestionPack,
    InterviewSummary,
    ProcessedTranscript,
    QuestionType,
    TranscriptAnalyzeRequest,
)
from app.domain.models.matching import JobDescriptionInput
from app.domain.models.resume_extraction import (
    CandidateDetails,
    CandidateProfile,
)
from app.main import app
from app.services.interview_service import InterviewService

client = TestClient(app)

SAMPLE_JD = JobDescriptionInput(
    job_title="Senior Backend Engineer",
    raw_text="Node.js, PostgreSQL, system design required.",
    structured=None,
)

SAMPLE_PROFILE = CandidateProfile(
    candidate=CandidateDetails(full_name="Jane Doe", email="jane@email.com"),
    skills=[],
    experience=[],
    projects=[],
    education=[],
    certifications=[],
)

SAMPLE_TRANSCRIPT = (
    "Interviewer: Tell me about your experience with Node.js.\n"
    "Candidate: I have built APIs for six years using Express and NestJS.\n"
    "Interviewer: How would you design a rate-limited public API?\n"
    "Candidate: I would use a gateway with token buckets and Redis for counters.\n"
) * 3


@pytest.fixture
def sample_question_pack() -> InterviewQuestionPack:
    return InterviewQuestionPack(
        coding=[
            InterviewQuestion(
                type=QuestionType.CODING,
                question="Implement rate limiting for an API endpoint",
                rationale="JD requires API experience",
                evaluation_criteria=["Correctness", "Edge cases"],
                difficulty="medium",
                expected_topics=["hash maps", "time windows"],
            )
        ],
        technical=[
            InterviewQuestion(
                type=QuestionType.TECHNICAL,
                question="Explain PostgreSQL indexing trade-offs",
                rationale="Role uses PostgreSQL heavily",
                evaluation_criteria=["Depth", "Practical examples"],
                difficulty="medium",
            )
        ],
        architecture=[
            InterviewQuestion(
                type=QuestionType.ARCHITECTURE,
                question="Design a multi-tenant SaaS backend",
                rationale="Senior role requires system design",
                evaluation_criteria=["Scalability", "Isolation"],
                difficulty="hard",
            )
        ],
    )


def test_generate_questions_validation() -> None:
    response = client.post(
        "/api/v1/interviews/questions/generate",
        json={"coding_count": 2},
    )
    assert response.status_code == 422


def test_generate_questions_returns_pack(sample_question_pack: InterviewQuestionPack) -> None:
    mock_generator = MagicMock(spec=InterviewQuestionGenerator)
    mock_generator.generate.return_value = sample_question_pack

    service = InterviewService(Settings(openai_api_key="test-key", llm_provider="openai"))
    service._question_generator = mock_generator
    service._model_name = "gpt-4o-mini"

    app.dependency_overrides[get_interview_service] = lambda: service

    try:
        response = client.post(
            "/api/v1/interviews/questions/generate",
            json=GenerateQuestionsRequest(
                job_description=SAMPLE_JD,
                candidate_profile=SAMPLE_PROFILE,
            ).model_dump(mode="json"),
        )
        assert response.status_code == 200
        payload = response.json()
        assert len(payload["data"]["coding"]) == 1
        assert len(payload["data"]["technical"]) == 1
        assert len(payload["data"]["architecture"]) == 1
    finally:
        app.dependency_overrides.clear()


def test_analyze_transcript_returns_summary() -> None:
    analysis = TranscriptAnalysisResult(
        processed=ProcessedTranscript(
            cleaned_text="Cleaned transcript",
            key_topics=["Node.js", "Rate limiting"],
        ),
        summary=InterviewSummary(
            overall_assessment="Strong backend fundamentals",
            strengths=["Clear API design thinking"],
            concerns=["Limited depth on observability"],
            skill_signals=["Node.js", "Redis"],
            ai_recommendation="hire",
            rationale="Good technical depth for the role.",
        ),
    )

    mock_summarizer = MagicMock(spec=InterviewSummarizer)
    mock_summarizer.analyze.return_value = analysis

    service = InterviewService(Settings(openai_api_key="test-key", llm_provider="openai"))
    service._summarizer = mock_summarizer
    service._model_name = "gpt-4o-mini"

    app.dependency_overrides[get_interview_service] = lambda: service

    try:
        response = client.post(
            "/api/v1/interviews/transcript/analyze",
            json=TranscriptAnalyzeRequest(
                transcript=SAMPLE_TRANSCRIPT,
                job_title="Backend Engineer",
                candidate_name="Jane Doe",
            ).model_dump(mode="json"),
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["summary"]["ai_recommendation"] == "hire"
        assert "Node.js" in payload["processed"]["key_topics"]
    finally:
        app.dependency_overrides.clear()
