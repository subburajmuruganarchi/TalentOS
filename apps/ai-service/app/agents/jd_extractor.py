from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from app.domain.models.jd_extraction import JobDescriptionExtraction

SYSTEM_PROMPT = """You are an expert technical recruiter and HR analyst.

Extract structured information from job descriptions accurately.
- Use only information present in the text; do not invent requirements.
- If a field is not mentioned, use sensible defaults: empty lists, null years, or a brief summary noting it was not specified.
- mandatory_skills must be a subset of skills explicitly required or marked as must-have.
- required_skills may include broader expected skills that are not strictly mandatory.
- interview_criteria should reflect how a candidate would be evaluated for this role.
"""

USER_PROMPT = """Analyze the following job description and return structured extraction.

Job description text:
{jd_text}
"""


class JobDescriptionExtractor:
    def __init__(self, llm: BaseChatModel) -> None:
        self._llm = llm.with_structured_output(JobDescriptionExtraction)
        self._chain = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", USER_PROMPT),
            ]
        ) | self._llm

    def extract(self, text: str) -> JobDescriptionExtraction:
        result = self._chain.invoke({"jd_text": text.strip()})
        if isinstance(result, JobDescriptionExtraction):
            return result
        return JobDescriptionExtraction.model_validate(result)
