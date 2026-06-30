from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.agents.email_drafter import EmailDrafter
from app.api.routes.communications import get_communication_draft_service
from app.config import Settings
from app.domain.models.communication import (
    CommunicationContext,
    CommunicationDraft,
    CommunicationDraftRequest,
    CommunicationType,
)
from app.main import app
from app.services.communication_draft_service import CommunicationDraftService

client = TestClient(app)


@pytest.fixture
def sample_draft() -> CommunicationDraft:
    return CommunicationDraft(
        subject="Interview Invitation — Backend Engineer at Acme",
        body="Dear Jane,\n\nWe would like to invite you to interview...",
        body_html="<p>Dear Jane,</p><p>We would like to invite you to interview...</p>",
        tone_notes="Professional and welcoming tone with clear next steps.",
    )


def test_communication_draft_validation() -> None:
    response = client.post(
        "/api/v1/communications/draft",
        json={"communication_type": "shortlist"},
    )
    assert response.status_code == 422


def test_communication_draft_returns_structured_json(sample_draft: CommunicationDraft) -> None:
    mock_drafter = MagicMock(spec=EmailDrafter)
    mock_drafter.draft.return_value = sample_draft

    service = CommunicationDraftService(Settings(openai_api_key="test-key", llm_provider="openai"))
    service._drafter = mock_drafter
    service._model_name = "gpt-4o-mini"

    app.dependency_overrides[get_communication_draft_service] = lambda: service

    try:
        response = client.post(
            "/api/v1/communications/draft",
            json=CommunicationDraftRequest(
                communication_type=CommunicationType.INTERVIEW_INVITATION,
                context=CommunicationContext(
                    job_title="Backend Engineer",
                    candidate_name="Jane Doe",
                    candidate_email="jane@email.com",
                    interview={
                        "interview_date": "March 15, 2026 at 2:00 PM",
                        "meeting_link": "https://meet.example.com/abc",
                    },
                ),
            ).model_dump(mode="json"),
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["communication_type"] == "interview_invitation"
        assert payload["data"]["subject"].startswith("Interview Invitation")
        assert "Jane" in payload["data"]["body"]
    finally:
        app.dependency_overrides.clear()
