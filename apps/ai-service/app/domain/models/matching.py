from enum import Enum

from pydantic import BaseModel, Field

from app.domain.models.jd_extraction import JobDescriptionExtraction
from app.domain.models.resume_extraction import CandidateProfile


class JobDescriptionInput(BaseModel):
    """Job description payload for matching."""

    job_title: str
    raw_text: str | None = Field(default=None, description="Full JD text when available")
    structured: JobDescriptionExtraction | None = Field(
        default=None,
        description="Structured JD extraction when available",
    )


class MatchRequest(BaseModel):
    organization_id: str = Field(min_length=1)
    job_id: str = Field(min_length=1)
    candidate_id: str = Field(min_length=1)
    job_description: JobDescriptionInput
    candidate_profile: CandidateProfile


class SkillComparisonItem(BaseModel):
    skill: str
    required: bool = True
    candidate_level: str | None = Field(
        default=None,
        description="Candidate proficiency if known",
    )
    gap: str | None = Field(
        default=None,
        description="missing | partial | met",
    )


class MatchRecommendation(str, Enum):
    STRONG_MATCH = "strong_match"
    MATCH = "match"
    WEAK_MATCH = "weak_match"
    NO_MATCH = "no_match"


class MatchAnalysis(BaseModel):
    match_percentage: float = Field(ge=0, le=100)
    skill_comparison: list[SkillComparisonItem] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    recommendation: str = Field(
        description="strong_match | match | weak_match | no_match",
    )
    rationale: str = Field(description="Human-readable explanation of the match")


class MatchResponse(BaseModel):
    data: MatchAnalysis
    vector_similarity: float = Field(
        ge=0,
        le=1,
        description="Semantic similarity from embeddings (0-1)",
    )
    provider: str
    model: str
    embedding_model: str
