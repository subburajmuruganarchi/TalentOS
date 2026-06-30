from pydantic import BaseModel, Field

from app.domain.models.resume_extraction import CandidateProfile


class FeedbackAnalyzeRequest(BaseModel):
    job_title: str = Field(min_length=1)
    interviewer_feedback: str = Field(
        min_length=10,
        description="Interviewer notes and qualitative feedback",
    )
    interviewer_recommendation: str | None = Field(
        default=None,
        description="Interviewer stated recommendation if provided",
    )
    transcript: str = Field(min_length=50, description="Interview transcript text")
    candidate_profile: CandidateProfile


class FeedbackAnalysisResult(BaseModel):
    technical_score: float = Field(ge=0, le=100, description="Technical competency score")
    communication_score: float = Field(ge=0, le=100, description="Communication and clarity score")
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    hiring_recommendation: str = Field(
        description="AI synthesis: strong_hire | hire | hold | no_hire",
    )
    rationale: str = Field(
        description="Evidence-based explanation for HR review — not a final hiring decision",
    )


class FeedbackAnalyzeResponse(BaseModel):
    data: FeedbackAnalysisResult
    provider: str
    model: str
