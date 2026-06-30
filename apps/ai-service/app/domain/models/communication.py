from enum import Enum

from pydantic import BaseModel, Field


class CommunicationType(str, Enum):
    SHORTLIST = "shortlist"
    INTERVIEW_INVITATION = "interview_invitation"
    REJECTION = "rejection"


class InterviewContext(BaseModel):
    interview_date: str | None = Field(
        default=None,
        description="Scheduled interview date/time in human-readable form",
    )
    interview_location: str | None = Field(
        default=None,
        description="Physical location or 'Remote'",
    )
    meeting_link: str | None = Field(default=None, description="Video conference URL if remote")
    interviewer_names: list[str] = Field(default_factory=list)
    duration_minutes: int | None = Field(default=None, ge=15, le=480)


class CommunicationContext(BaseModel):
    organization_name: str | None = None
    job_title: str
    candidate_name: str
    candidate_email: str | None = None
    recruiter_name: str | None = None
    additional_notes: str | None = Field(
        default=None,
        description="Extra context HR wants reflected in the draft",
    )
    interview: InterviewContext | None = None


class CommunicationDraftRequest(BaseModel):
    communication_type: CommunicationType
    context: CommunicationContext


class CommunicationDraft(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, description="Plain-text email body")
    body_html: str | None = Field(
        default=None,
        description="Optional HTML body; plain text is always required",
    )
    tone_notes: str | None = Field(
        default=None,
        description="Brief note on tone/style choices for HR review",
    )


class CommunicationDraftResponse(BaseModel):
    data: CommunicationDraft
    communication_type: CommunicationType
    provider: str
    model: str
