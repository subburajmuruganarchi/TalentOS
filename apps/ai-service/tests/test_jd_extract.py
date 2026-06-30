from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.agents.jd_extractor import JobDescriptionExtractor
from app.api.routes.jd import get_jd_extraction_service
from app.config import Settings
from app.domain.models.jd_extraction import (
    ExperienceRequirement,
    InterviewCriterion,
    JobDescriptionExtraction,
)
from app.main import app
from app.services.jd_extraction_service import JobDescriptionExtractionService

client = TestClient(app)

SAMPLE_JD = (
    "Senior Backend Engineer — We are hiring a Senior Backend Engineer with 5+ years "
    "of experience building scalable APIs. Must have: Node.js, PostgreSQL, REST APIs. "
    "Required: Docker, CI/CD. Responsibilities include designing microservices, code "
    "reviews, and mentoring junior developers. Interview focus: system design, coding, "
    "and communication skills."
)


@pytest.fixture
def sample_extraction() -> JobDescriptionExtraction:
    return JobDescriptionExtraction(
        job_title="Senior Backend Engineer",
        experience=ExperienceRequirement(
            min_years=5,
            max_years=None,
            summary="5+ years building scalable APIs",
        ),
        required_skills=["Node.js", "PostgreSQL", "REST APIs", "Docker", "CI/CD"],
        mandatory_skills=["Node.js", "PostgreSQL", "REST APIs"],
        responsibilities=[
            "Designing microservices",
            "Code reviews",
            "Mentoring junior developers",
        ],
        interview_criteria=[
            InterviewCriterion(
                criterion="System design",
                description="Assess architecture and scalability thinking",
                weight=0.4,
            ),
            InterviewCriterion(
                criterion="Coding",
                description="Evaluate implementation skills",
                weight=0.4,
            ),
            InterviewCriterion(
                criterion="Communication",
                description="Evaluate clarity and collaboration",
                weight=0.2,
            ),
        ],
    )


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["llm_provider"] == "openai"


def test_jd_extract_validation_rejects_short_text() -> None:
    response = client.post("/api/v1/jd/extract", json={"text": "too short"})
    assert response.status_code == 422


def test_jd_extract_returns_structured_json(sample_extraction: JobDescriptionExtraction) -> None:
    mock_extractor = MagicMock(spec=JobDescriptionExtractor)
    mock_extractor.extract.return_value = sample_extraction

    service = JobDescriptionExtractionService(
        Settings(openai_api_key="test-key", llm_provider="openai")
    )
    service._extractor = mock_extractor
    service._model_name = "gpt-4o-mini"

    app.dependency_overrides[get_jd_extraction_service] = lambda: service

    try:
        response = client.post("/api/v1/jd/extract", json={"text": SAMPLE_JD})
        assert response.status_code == 200
        payload = response.json()

        assert payload["provider"] == "openai"
        assert payload["model"] == "gpt-4o-mini"
        assert payload["data"]["job_title"] == "Senior Backend Engineer"
        assert payload["data"]["experience"]["min_years"] == 5
        assert "Node.js" in payload["data"]["mandatory_skills"]
        assert len(payload["data"]["responsibilities"]) == 3
        assert len(payload["data"]["interview_criteria"]) == 3
    finally:
        app.dependency_overrides.clear()


def test_jd_extract_service_unit(sample_extraction: JobDescriptionExtraction) -> None:
    mock_extractor = MagicMock(spec=JobDescriptionExtractor)
    mock_extractor.extract.return_value = sample_extraction

    service = JobDescriptionExtractionService(
        Settings(openai_api_key="test-key", llm_provider="openai")
    )
    service._extractor = mock_extractor
    service._model_name = "gpt-4o-mini"

    result = service.extract(SAMPLE_JD)

    assert result.data.job_title == "Senior Backend Engineer"
    mock_extractor.extract.assert_called_once_with(SAMPLE_JD)
