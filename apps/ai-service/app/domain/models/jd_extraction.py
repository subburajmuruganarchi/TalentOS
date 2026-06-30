from pydantic import BaseModel, Field


class ExperienceRequirement(BaseModel):
    min_years: int | None = Field(
        default=None,
        description="Minimum years of experience required, if stated",
    )
    max_years: int | None = Field(
        default=None,
        description="Maximum years of experience, if stated",
    )
    summary: str = Field(
        description="Concise summary of experience expectations",
    )


class InterviewCriterion(BaseModel):
    criterion: str = Field(description="Name of the evaluation criterion")
    description: str = Field(description="What interviewers should assess")
    weight: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description="Relative weight between 0 and 1, if inferable",
    )


class JobDescriptionExtraction(BaseModel):
    job_title: str
    experience: ExperienceRequirement
    required_skills: list[str] = Field(
        default_factory=list,
        description="Skills mentioned as required or expected",
    )
    mandatory_skills: list[str] = Field(
        default_factory=list,
        description="Skills explicitly marked as mandatory or must-have",
    )
    responsibilities: list[str] = Field(default_factory=list)
    interview_criteria: list[InterviewCriterion] = Field(default_factory=list)


class JobDescriptionExtractRequest(BaseModel):
    text: str = Field(min_length=50, description="Raw job description text")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": (
                        "Senior Backend Engineer — 5+ years building REST APIs with "
                        "Node.js and PostgreSQL. Must have Kubernetes. Responsibilities "
                        "include system design and mentoring."
                    )
                }
            ]
        }
    }


class JobDescriptionExtractResponse(BaseModel):
    data: JobDescriptionExtraction
    provider: str
    model: str
