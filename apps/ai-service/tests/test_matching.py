from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.agents.match_analyzer import MatchAnalyzer
from app.api.routes.matching import get_matching_service
from app.config import Settings
from app.domain.models.matching import (
    JobDescriptionInput,
    MatchAnalysis,
    MatchRequest,
    SkillComparisonItem,
)
from app.domain.models.resume_extraction import (
    CandidateDetails,
    CandidateProfile,
    Skill,
)
from app.main import app
from app.services.matching_service import MatchingService

client = TestClient(app)

SAMPLE_JOB = JobDescriptionInput(
    job_title="Senior Backend Engineer",
    raw_text="Must have Node.js and PostgreSQL. 5+ years experience.",
    structured=None,
)

SAMPLE_PROFILE = CandidateProfile(
    candidate=CandidateDetails(
        full_name="Jane Doe",
        email="jane@email.com",
        phone=None,
        location=None,
        linkedin_url=None,
        summary="Backend engineer",
    ),
    skills=[Skill(name="Node.js", proficiency="expert", years=6)],
    experience=[],
    projects=[],
    education=[],
    certifications=[],
    total_experience_years=6,
)


@pytest.fixture
def sample_analysis() -> MatchAnalysis:
    return MatchAnalysis(
        match_percentage=82.0,
        skill_comparison=[
            SkillComparisonItem(
                skill="Node.js",
                required=True,
                candidate_level="expert",
                gap="met",
            ),
            SkillComparisonItem(
                skill="PostgreSQL",
                required=True,
                candidate_level=None,
                gap="missing",
            ),
        ],
        strengths=["Strong Node.js experience"],
        missing_skills=["PostgreSQL"],
        recommendation="match",
        rationale="Good backend fit with one skill gap.",
    )


def test_match_endpoint_validation() -> None:
    response = client.post(
        "/api/v1/matching/match",
        json={
            "organization_id": "",
            "job_id": "job1",
            "candidate_id": "cand1",
        },
    )
    assert response.status_code == 422


@patch("app.services.matching_service.VectorRepository")
@patch("app.services.matching_service.create_embeddings")
def test_match_returns_structured_result(
    mock_create_embeddings: MagicMock,
    mock_vector_repo_cls: MagicMock,
    sample_analysis: MatchAnalysis,
) -> None:
    mock_vector_repo = MagicMock()
    mock_vector_repo.index_entity.return_value = []
    mock_vector_repo.compute_similarity.return_value = (0.78, ["jd chunk"], ["resume chunk"])
    mock_vector_repo_cls.return_value = mock_vector_repo

    mock_analyzer = MagicMock(spec=MatchAnalyzer)
    mock_analyzer.analyze.return_value = sample_analysis

    service = MatchingService(Settings(openai_api_key="test-key"))
    service._analyzer = mock_analyzer
    service._model_name = "gpt-4o-mini"
    service._vector_repo = mock_vector_repo

    app.dependency_overrides[get_matching_service] = lambda: service

    try:
        response = client.post(
            "/api/v1/matching/match",
            json=MatchRequest(
                organization_id="org1",
                job_id="job1",
                candidate_id="cand1",
                job_description=SAMPLE_JOB,
                candidate_profile=SAMPLE_PROFILE,
            ).model_dump(mode="json"),
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["vector_similarity"] == 0.78
        assert payload["data"]["recommendation"] == "match"
        assert len(payload["data"]["skill_comparison"]) == 2
        assert "PostgreSQL" in payload["data"]["missing_skills"]
    finally:
        app.dependency_overrides.clear()
