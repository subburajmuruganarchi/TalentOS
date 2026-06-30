from pydantic import BaseModel, Field


class CandidateDetails(BaseModel):
    full_name: str = Field(description="Candidate full name")
    email: str | None = Field(default=None, description="Email address if present")
    phone: str | None = Field(default=None, description="Phone number if present")
    location: str | None = Field(default=None, description="City, region, or country")
    linkedin_url: str | None = Field(default=None, description="LinkedIn profile URL if present")
    summary: str | None = Field(default=None, description="Professional summary or objective")


class Skill(BaseModel):
    name: str
    proficiency: str | None = Field(
        default=None,
        description="e.g. beginner, intermediate, advanced, expert",
    )
    years: float | None = Field(default=None, description="Years of experience with skill")


class ExperienceEntry(BaseModel):
    company: str
    role: str
    start_date: str | None = Field(default=None, description="YYYY-MM or YYYY")
    end_date: str | None = Field(default=None, description="YYYY-MM, YYYY, or Present")
    is_current: bool | None = Field(default=None)
    highlights: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str
    description: str | None = None
    technologies: list[str] = Field(default_factory=list)


class EducationEntry(BaseModel):
    institution: str
    degree: str | None = None
    field_of_study: str | None = None
    graduation_year: int | None = None


class Certification(BaseModel):
    name: str
    issuer: str | None = None
    year: int | None = None


class CandidateProfile(BaseModel):
    candidate: CandidateDetails
    skills: list[Skill] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    total_experience_years: float | None = Field(
        default=None,
        description="Total professional experience in years if inferable",
    )


class ResumeExtractTextRequest(BaseModel):
    text: str = Field(min_length=50, description="Raw resume text")


class ResumeExtractResponse(BaseModel):
    data: CandidateProfile
    provider: str
    model: str
    source: str = Field(description="text or document")
