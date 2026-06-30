import json

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from app.domain.models.interview import GenerateQuestionsRequest, InterviewQuestionPack

SYSTEM_PROMPT = """You are an expert technical interviewer designing tailored interview questions.

Generate questions based on the job description and candidate resume/profile.
- Tailor difficulty and depth to the role seniority and candidate experience.
- Do not repeat the same skill across categories unless justified.
- Coding questions: practical problems assessable in 20-40 minutes; include expected_topics.
- Technical questions: depth on stack, tools, and domain knowledge from the JD.
- Architecture questions: system design, trade-offs, scalability, and team practices.

Each question must include:
- clear question text
- rationale tied to JD or resume
- evaluation_criteria (what a strong answer demonstrates)
- difficulty: easy | medium | hard
- follow_up_prompts for the interviewer to probe deeper

Return exactly the requested counts per category.
"""

USER_PROMPT = """Generate interview questions.

Counts:
- coding: {coding_count}
- technical: {technical_count}
- architecture: {architecture_count}

Job description JSON:
{job_json}

Candidate profile JSON:
{candidate_json}
"""


class InterviewQuestionGenerator:
    def __init__(self, llm: BaseChatModel) -> None:
        self._llm = llm.with_structured_output(InterviewQuestionPack)
        self._chain = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", USER_PROMPT),
            ]
        ) | self._llm

    def generate(self, request: GenerateQuestionsRequest) -> InterviewQuestionPack:
        result = self._chain.invoke(
            {
                "coding_count": request.coding_count,
                "technical_count": request.technical_count,
                "architecture_count": request.architecture_count,
                "job_json": json.dumps(
                    request.job_description.model_dump(mode="json"),
                    ensure_ascii=True,
                ),
                "candidate_json": json.dumps(
                    request.candidate_profile.model_dump(mode="json"),
                    ensure_ascii=True,
                ),
            }
        )

        if isinstance(result, InterviewQuestionPack):
            return result
        return InterviewQuestionPack.model_validate(result)
