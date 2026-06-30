import json

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from app.domain.models.communication import CommunicationDraft, CommunicationType

SYSTEM_PROMPT = """You are an expert HR communications writer for a professional recruitment platform.

Write candidate emails that are:
- Professional, warm, and respectful
- Clear and concise
- Legally safe (no promises of employment, no discriminatory language)
- Ready for HR to review and send — not auto-sent

Rules:
- Use only facts provided in the context; do not invent interview details, dates, or offers.
- For rejection emails: be empathetic, thank the candidate, and encourage future applications when appropriate.
- For shortlist emails: congratulate and explain clear next steps.
- For interview invitations: include all provided scheduling details; if details are missing, use placeholders like "[DATE]" or "[TIME]" and note them in tone_notes.
- subject must be specific and professional (under 120 characters).
- body must be plain text with paragraph breaks; no markdown.
- body_html is optional simple HTML (p tags, br) mirroring the plain body.
- tone_notes: one sentence explaining your tone choices for HR reviewers.
"""

TYPE_GUIDANCE: dict[CommunicationType, str] = {
    CommunicationType.SHORTLIST: (
        "Draft a shortlist / progression email informing the candidate they have been "
        "selected to move forward in the hiring process for the role."
    ),
    CommunicationType.INTERVIEW_INVITATION: (
        "Draft an interview invitation email with scheduling details from the context. "
        "Include what to prepare and who they will meet when provided."
    ),
    CommunicationType.REJECTION: (
        "Draft a respectful rejection email after the hiring process. "
        "Be kind, brief, and professional."
    ),
}


USER_PROMPT = """Communication type: {communication_type}
Type guidance: {type_guidance}

Context JSON:
{context_json}

Return the email draft for HR review. Do not mention that this was AI-generated.
"""


class EmailDrafter:
    def __init__(self, llm: BaseChatModel) -> None:
        self._llm = llm.with_structured_output(CommunicationDraft)
        self._chain = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("human", USER_PROMPT),
            ]
        ) | self._llm

    def draft(
        self,
        communication_type: CommunicationType,
        context: dict,
    ) -> CommunicationDraft:
        result = self._chain.invoke(
            {
                "communication_type": communication_type.value,
                "type_guidance": TYPE_GUIDANCE[communication_type],
                "context_json": json.dumps(context, ensure_ascii=True),
            }
        )

        if isinstance(result, CommunicationDraft):
            return result
        return CommunicationDraft.model_validate(result)
