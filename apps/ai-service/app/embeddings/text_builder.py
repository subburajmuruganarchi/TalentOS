from app.domain.models.jd_extraction import JobDescriptionExtraction
from app.domain.models.matching import JobDescriptionInput
from app.domain.models.resume_extraction import CandidateProfile


def build_job_description_text(job: JobDescriptionInput) -> str:
    sections: list[str] = [f"Job Title: {job.job_title}"]

    if job.raw_text:
        sections.append(job.raw_text.strip())

    if job.structured:
        sections.append(_format_structured_jd(job.structured))

    return "\n\n".join(section for section in sections if section).strip()


def build_candidate_profile_text(profile: CandidateProfile) -> str:
    sections: list[str] = [
        f"Candidate: {profile.candidate.full_name}",
    ]

    if profile.candidate.email:
        sections.append(f"Email: {profile.candidate.email}")
    if profile.candidate.summary:
        sections.append(f"Summary: {profile.candidate.summary}")

    if profile.skills:
        skill_names = ", ".join(skill.name for skill in profile.skills)
        sections.append(f"Skills: {skill_names}")

    if profile.experience:
        sections.append("Experience:")
        for item in profile.experience:
            sections.append(
                f"- {item.role} at {item.company} ({item.start_date or '?'} - {item.end_date or 'Present'})"
            )
            for highlight in item.highlights:
                sections.append(f"  * {highlight}")

    if profile.projects:
        sections.append("Projects:")
        for project in profile.projects:
            tech = ", ".join(project.technologies) if project.technologies else ""
            sections.append(f"- {project.name}: {project.description or ''} [{tech}]".strip())

    if profile.education:
        sections.append("Education:")
        for edu in profile.education:
            sections.append(
                f"- {edu.degree or ''} {edu.field_of_study or ''} @ {edu.institution}".strip()
            )

    if profile.certifications:
        sections.append("Certifications:")
        for cert in profile.certifications:
            sections.append(f"- {cert.name} ({cert.issuer or 'unknown'})")

    if profile.total_experience_years is not None:
        sections.append(f"Total experience years: {profile.total_experience_years}")

    return "\n".join(sections).strip()


def _format_structured_jd(structured: JobDescriptionExtraction) -> str:
    lines = [
        f"Title: {structured.job_title}",
        f"Experience: {structured.experience.summary}",
    ]

    if structured.experience.min_years is not None:
        lines.append(f"Minimum years: {structured.experience.min_years}")

    if structured.mandatory_skills:
        lines.append("Mandatory skills: " + ", ".join(structured.mandatory_skills))
    if structured.required_skills:
        lines.append("Required skills: " + ", ".join(structured.required_skills))
    if structured.responsibilities:
        lines.append("Responsibilities:")
        lines.extend(f"- {item}" for item in structured.responsibilities)

    return "\n".join(lines)
