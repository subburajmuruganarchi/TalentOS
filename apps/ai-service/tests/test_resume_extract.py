from io import BytesIO
from unittest.mock import MagicMock

import pytest
from docx import Document
from fastapi.testclient import TestClient

from app.agents.resume_extractor import ResumeExtractor
from app.api.routes.resume import get_resume_extraction_service
from app.config import Settings
from app.domain.models.resume_extraction import (
    CandidateDetails,
    CandidateProfile,
    Certification,
    EducationEntry,
    ExperienceEntry,
    Project,
    Skill,
)
from app.main import app
from app.services.resume_extraction_service import ResumeExtractionService

client = TestClient(app)

SAMPLE_RESUME = (
    "Jane Doe | jane.doe@email.com | +1-555-0100 | San Francisco, CA\n"
    "Senior Software Engineer with 8 years of experience in backend development.\n"
    "Skills: Python, FastAPI, PostgreSQL, AWS, Docker\n"
    "Experience:\n"
    "Acme Corp — Senior Software Engineer (2019 - Present)\n"
    "- Built payment APIs serving 2M users\n"
    "Projects: Payments Platform — microservices in Python\n"
    "Education: B.Tech Computer Science, IIT Delhi, 2016\n"
    "Certifications: AWS Solutions Architect, 2022"
)


@pytest.fixture
def sample_profile() -> CandidateProfile:
    return CandidateProfile(
        candidate=CandidateDetails(
            full_name="Jane Doe",
            email="jane.doe@email.com",
            phone="+1-555-0100",
            location="San Francisco, CA",
            linkedin_url=None,
            summary="Senior Software Engineer with 8 years of experience",
        ),
        skills=[
            Skill(name="Python", proficiency="expert", years=8),
            Skill(name="FastAPI", proficiency="advanced", years=4),
        ],
        experience=[
            ExperienceEntry(
                company="Acme Corp",
                role="Senior Software Engineer",
                start_date="2019-01",
                end_date=None,
                is_current=True,
                highlights=["Built payment APIs serving 2M users"],
            )
        ],
        projects=[
            Project(
                name="Payments Platform",
                description="Microservices in Python",
                technologies=["Python", "PostgreSQL"],
            )
        ],
        education=[
            EducationEntry(
                institution="IIT Delhi",
                degree="B.Tech",
                field_of_study="Computer Science",
                graduation_year=2016,
            )
        ],
        certifications=[
            Certification(name="AWS Solutions Architect", issuer="AWS", year=2022)
        ],
        total_experience_years=8,
    )


def test_resume_extract_validation_rejects_short_text() -> None:
    response = client.post("/api/v1/resumes/extract", json={"text": "short"})
    assert response.status_code == 422


def test_resume_extract_returns_profile_json(sample_profile: CandidateProfile) -> None:
    mock_extractor = MagicMock(spec=ResumeExtractor)
    mock_extractor.extract.return_value = sample_profile

    service = ResumeExtractionService(Settings(openai_api_key="test-key", llm_provider="openai"))
    service._extractor = mock_extractor
    service._model_name = "gpt-4o-mini"

    app.dependency_overrides[get_resume_extraction_service] = lambda: service

    try:
        response = client.post("/api/v1/resumes/extract", json={"text": SAMPLE_RESUME})
        assert response.status_code == 200
        payload = response.json()

        assert payload["provider"] == "openai"
        assert payload["model"] == "gpt-4o-mini"
        assert payload["source"] == "text"
        assert payload["data"]["candidate"]["full_name"] == "Jane Doe"
        assert payload["data"]["candidate"]["email"] == "jane.doe@email.com"
        assert len(payload["data"]["skills"]) == 2
        assert len(payload["data"]["experience"]) == 1
        assert len(payload["data"]["projects"]) == 1
        assert len(payload["data"]["education"]) == 1
        assert len(payload["data"]["certifications"]) == 1
        assert payload["data"]["total_experience_years"] == 8
    finally:
        app.dependency_overrides.clear()


def test_resume_extract_from_docx_document(sample_profile: CandidateProfile) -> None:
    doc = Document()
    doc.add_paragraph(SAMPLE_RESUME)
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    mock_extractor = MagicMock(spec=ResumeExtractor)
    mock_extractor.extract.return_value = sample_profile

    service = ResumeExtractionService(Settings(openai_api_key="test-key", llm_provider="openai"))
    service._extractor = mock_extractor
    service._model_name = "gpt-4o-mini"

    app.dependency_overrides[get_resume_extraction_service] = lambda: service

    try:
        response = client.post(
            "/api/v1/resumes/extract/document",
            files={
                "file": (
                    "resume.docx",
                    buffer.getvalue(),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["source"] == "document"
        assert payload["data"]["candidate"]["full_name"] == "Jane Doe"
        mock_extractor.extract.assert_called_once()
    finally:
        app.dependency_overrides.clear()


def test_resume_extract_rejects_legacy_doc() -> None:
    response = client.post(
        "/api/v1/resumes/extract/document",
        files={"file": ("resume.doc", b"content", "application/msword")},
    )
    assert response.status_code == 400
    assert "Legacy .doc" in response.json()["detail"]


def test_resume_extract_service_unit(sample_profile: CandidateProfile) -> None:
    mock_extractor = MagicMock(spec=ResumeExtractor)
    mock_extractor.extract.return_value = sample_profile

    service = ResumeExtractionService(Settings(openai_api_key="test-key", llm_provider="openai"))
    service._extractor = mock_extractor
    service._model_name = "gpt-4o-mini"

    result = service.extract_from_text(SAMPLE_RESUME)

    assert result.data.candidate.full_name == "Jane Doe"
    mock_extractor.extract.assert_called_once_with(SAMPLE_RESUME)
