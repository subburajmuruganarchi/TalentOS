import json

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from app.domain.models.feedback import FeedbackAnalysisResult, FeedbackAnalyzeRequest

SYSTEM_PROMPT = """You are an expert hiring analyst synthesizing interviewer feedback, interview transcripts, and candidate profiles.

Produce a structured feedback analysis for HR and hiring managers to review.

Rules:
- Weight interviewer feedback heavily — they conducted the interview.
- Use transcript evidence to support or nuance scores; do not invent statements.
- technical_score: depth of technical knowledge, problem-solving, and role-relevant skills (0-100).
- communication_score: clarity, structure, collaboration signals, and professionalism (0-100).
- strengths and weaknesses must be specific and evidence-based.
- hiring_recommendation is an AI synthesis (strong_hire | hire | hold | no_hire), not a binding decision.
- Align scores with the recommendation and rationale.
- Consider candidate profile context but prioritize interview performance.
"""

USER_PROMPT = """Analyze this interview feedback package.

Job title: {job_title}
Interviewer recommendation (if stated): {interviewer_recommendation}

Interviewer feedback:
{interviewer_feedback}

Interview transcript:
{transcript}

Candidate profile JSON:
{candidate_json}
"""


class FeedbackAnalyzer:
    def __init__(self, llm: BaseChatModel) -> None:
        self._llm = llm.with_structured_output(FeedbackAnalysisResult)
        self._chain = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", USER_PROMPT),
            ]
        ) | self._llm

    def analyze(self, request: FeedbackAnalyzeRequest) -> FeedbackAnalysisResult:
        result = self._chain.invoke(
            {
                "job_title": request.job_title,
                "interviewer_recommendation": request.interviewer_recommendation or "Not stated",
                "interviewer_feedback": request.interviewer_feedback.strip(),
                "transcript": request.transcript.strip(),
                "candidate_json": json.dumps(
                    request.candidate_profile.model_dump(mode="json"),
                    ensure_ascii=True,
                ),
            }
        )

        if isinstance(result, FeedbackAnalysisResult):
            return result
        return FeedbackAnalysisResult.model_validate(result)
