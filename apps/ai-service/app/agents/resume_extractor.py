from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from app.domain.models.resume_extraction import CandidateProfile

SYSTEM_PROMPT = """You are an expert resume parser and technical recruiter.

Extract structured candidate profile information from resume text accurately.
- Use only information explicitly present in the resume; do not invent details.
- If a field is missing, use null for scalars and empty lists for collections.
- Normalize skill names (e.g. "Node JS" -> "Node.js").
- Parse experience in reverse-chronological order when possible.
- For dates, prefer YYYY-MM format when month is known, otherwise YYYY.
- total_experience_years should be estimated only when experience entries support it.
"""

USER_PROMPT = """Analyze the following resume and return a structured candidate profile.

Resume text:
{resume_text}
"""


class ResumeExtractor:
    def __init__(self, llm: BaseChatModel) -> None:
        self._llm = llm.with_structured_output(CandidateProfile)
        self._chain = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", USER_PROMPT),
            ]
        ) | self._llm

    def extract(self, text: str) -> CandidateProfile:
        result = self._chain.invoke({"resume_text": text.strip()})
        if isinstance(result, CandidateProfile):
            return result
        return CandidateProfile.model_validate(result)
