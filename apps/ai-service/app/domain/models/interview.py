from enum import Enum

from pydantic import BaseModel, Field

from app.domain.models.matching import JobDescriptionInput
from app.domain.models.resume_extraction import CandidateProfile


class QuestionType(str, Enum):
    CODING = "coding"
    TECHNICAL = "technical"
    ARCHITECTURE = "architecture"


class InterviewQuestion(BaseModel):
    type: QuestionType
    question: str = Field(min_length=1)
    rationale: str = Field(description="Why this question is relevant for this candidate/role")
    evaluation_criteria: list[str] = Field(default_factory=list)
    difficulty: str = Field(default="medium", description="easy | medium | hard")
    follow_up_prompts: list[str] = Field(default_factory=list)
    expected_topics: list[str] = Field(
        default_factory=list,
        description="For coding questions: algorithms, patterns, or skills to assess",
    )


class InterviewQuestionPack(BaseModel):
    coding: list[InterviewQuestion] = Field(default_factory=list)
    technical: list[InterviewQuestion] = Field(default_factory=list)
    architecture: list[InterviewQuestion] = Field(default_factory=list)


class GenerateQuestionsRequest(BaseModel):
    job_description: JobDescriptionInput
    candidate_profile: CandidateProfile
    coding_count: int = Field(default=2, ge=0, le=5)
    technical_count: int = Field(default=3, ge=0, le=8)
    architecture_count: int = Field(default=2, ge=0, le=5)


class GenerateQuestionsResponse(BaseModel):
    data: InterviewQuestionPack
    provider: str
    model: str


class SpeakerSegment(BaseModel):
    speaker: str = Field(description="interviewer | candidate | unknown")
    text: str


class ProcessedTranscript(BaseModel):
    cleaned_text: str
    speaker_segments: list[SpeakerSegment] = Field(default_factory=list)
    key_topics: list[str] = Field(default_factory=list)


class QuestionResponseNote(BaseModel):
    topic: str
    summary: str
    evidence: str | None = None


class InterviewSummary(BaseModel):
    overall_assessment: str
    strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)
    skill_signals: list[str] = Field(default_factory=list)
    question_responses: list[QuestionResponseNote] = Field(default_factory=list)
    suggested_follow_ups: list[str] = Field(default_factory=list)
    ai_recommendation: str = Field(
        description="AI suggestion only: strong_hire | hire | hold | no_hire",
    )
    rationale: str = Field(
        description="Explanation for HR/interviewer review — not a final hiring decision",
    )


class TranscriptAnalyzeRequest(BaseModel):
    transcript: str = Field(min_length=50, description="Raw interview transcript text")
    job_title: str
    candidate_name: str
    questions: InterviewQuestionPack | None = Field(
        default=None,
        description="Optional question pack used during the interview",
    )


class TranscriptAnalyzeResponse(BaseModel):
    processed: ProcessedTranscript
    summary: InterviewSummary
    provider: str
    model: str
