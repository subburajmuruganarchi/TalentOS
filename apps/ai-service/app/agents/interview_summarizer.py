import json

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.domain.models.interview import (
    InterviewSummary,
    ProcessedTranscript,
    TranscriptAnalyzeRequest,
)


class TranscriptAnalysisResult(BaseModel):
    processed: ProcessedTranscript
    summary: InterviewSummary = Field(
        description="AI-assisted summary for interviewer review — not a final hiring decision",
    )


SYSTEM_PROMPT = """You are an expert interview analyst assisting human interviewers.

Process the raw interview transcript and produce:
1. A cleaned, readable transcript with speaker attribution where possible.
2. Key topics discussed.
3. An objective summary for the interviewer to review.

Rules:
- Base analysis only on transcript content; do not invent statements.
- ai_recommendation is a SUGGESTION only (strong_hire | hire | hold | no_hire).
- The human interviewer makes the final hiring decision.
- Highlight strengths and concerns with evidence from the transcript.
- If questions were provided, map responses to relevant topics in question_responses.
"""

USER_PROMPT = """Analyze this interview transcript.

Job title: {job_title}
Candidate: {candidate_name}

Planned questions (if any):
{questions_json}

Raw transcript:
{transcript}
"""


class InterviewSummarizer:
    def __init__(self, llm: BaseChatModel) -> None:
        self._llm = llm.with_structured_output(TranscriptAnalysisResult)
        self._chain = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", USER_PROMPT),
            ]
        ) | self._llm

    def analyze(self, request: TranscriptAnalyzeRequest) -> TranscriptAnalysisResult:
        questions_json = (
            json.dumps(request.questions.model_dump(mode="json"), ensure_ascii=True)
            if request.questions
            else "None provided"
        )

        result = self._chain.invoke(
            {
                "job_title": request.job_title,
                "candidate_name": request.candidate_name,
                "questions_json": questions_json,
                "transcript": request.transcript.strip(),
            }
        )

        if isinstance(result, TranscriptAnalysisResult):
            return result
        return TranscriptAnalysisResult.model_validate(result)
