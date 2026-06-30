import json

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from app.domain.models.matching import MatchAnalysis

SYSTEM_PROMPT = """You are an expert technical recruiter performing candidate-job matching.

You receive:
- Structured job description data
- Structured candidate profile data
- A semantic vector similarity score between 0 and 1
- Retrieved context chunks from embeddings

Produce an objective match assessment.
- Use vector_similarity as a strong signal but not the only factor.
- Compare mandatory and required skills explicitly.
- Identify strengths and missing skills with evidence from the profile.
- recommendation must be one of: strong_match, match, weak_match, no_match
- match_percentage must be between 0 and 100 and align with recommendation.
- Do not invent candidate skills or experience not supported by the profile.
"""

USER_PROMPT = """Evaluate this candidate against the job.

Semantic vector similarity (0-1): {vector_similarity}

Job description JSON:
{job_json}

Candidate profile JSON:
{candidate_json}

Retrieved job context:
{job_context}

Retrieved candidate context:
{candidate_context}
"""


class MatchAnalyzer:
    def __init__(self, llm: BaseChatModel) -> None:
        self._llm = llm.with_structured_output(MatchAnalysis)
        self._chain = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", USER_PROMPT),
            ]
        ) | self._llm

    def analyze(
        self,
        *,
        job_payload: dict,
        candidate_payload: dict,
        vector_similarity: float,
        job_context: list[str],
        candidate_context: list[str],
    ) -> MatchAnalysis:
        result = self._chain.invoke(
            {
                "vector_similarity": round(vector_similarity, 4),
                "job_json": json.dumps(job_payload, ensure_ascii=True),
                "candidate_json": json.dumps(candidate_payload, ensure_ascii=True),
                "job_context": "\n---\n".join(job_context) or "N/A",
                "candidate_context": "\n---\n".join(candidate_context) or "N/A",
            }
        )

        if isinstance(result, MatchAnalysis):
            return result
        return MatchAnalysis.model_validate(result)
