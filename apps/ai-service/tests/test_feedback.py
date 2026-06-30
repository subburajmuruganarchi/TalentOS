from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.agents.feedback_analyzer import FeedbackAnalyzer
from app.api.routes.feedback import get_feedback_analysis_service
from app.config import Settings
from app.domain.models.feedback import FeedbackAnalysisResult, FeedbackAnalyzeRequest
from app.domain.models.resume_extraction import CandidateDetails, CandidateProfile
from app.main import app
from app.services.feedback_analysis_service import FeedbackAnalysisService

client = TestClient(app)

SAMPLE_TRANSCRIPT = (
    "Interviewer: Walk me through your API design experience.\n"
    "Candidate: I designed REST services with NestJS and handled auth with JWT.\n"
    "Interviewer: How do you communicate trade-offs to stakeholders?\n"
    "Candidate: I use concise docs and visual diagrams in review meetings.\n"
) * 3

SAMPLE_PROFILE = CandidateProfile(
    candidate=CandidateDetails(full_name="Jane Doe", email="jane@email.com"),
    skills=[],
    experience=[],
    projects=[],
    education=[],
    certifications=[],
)


@pytest.fixture
def sample_analysis() -> FeedbackAnalysisResult:
    return FeedbackAnalysisResult(
        technical_score=82.0,
        communication_score=78.0,
        strengths=["Solid API design experience", "Clear communication style"],
        weaknesses=["Limited depth on observability"],
        hiring_recommendation="hire",
        rationale="Strong technical fit with minor gaps.",
    )


def test_feedback_analyze_validation() -> None:
    response = client.post("/api/v1/feedback/analyze", json={"job_title": "Engineer"})
    assert response.status_code == 422


def test_feedback_analyze_returns_scores(sample_analysis: FeedbackAnalysisResult) -> None:
    mock_analyzer = MagicMock(spec=FeedbackAnalyzer)
    mock_analyzer.analyze.return_value = sample_analysis

    service = FeedbackAnalysisService(Settings(openai_api_key="test-key", llm_provider="openai"))
    service._analyzer = mock_analyzer
    service._model_name = "gpt-4o-mini"

    app.dependency_overrides[get_feedback_analysis_service] = lambda: service

    try:
        response = client.post(
            "/api/v1/feedback/analyze",
            json=FeedbackAnalyzeRequest(
                job_title="Backend Engineer",
                interviewer_feedback="Strong technical depth. Good communicator. Recommend hire.",
                interviewer_recommendation="hire",
                transcript=SAMPLE_TRANSCRIPT,
                candidate_profile=SAMPLE_PROFILE,
            ).model_dump(mode="json"),
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["data"]["technical_score"] == 82.0
        assert payload["data"]["communication_score"] == 78.0
        assert payload["data"]["hiring_recommendation"] == "hire"
        assert len(payload["data"]["strengths"]) >= 1
    finally:
        app.dependency_overrides.clear()
