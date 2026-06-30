from app.agents.email_drafter import EmailDrafter
from app.config import Settings
from app.domain.models.communication import (
    CommunicationDraftRequest,
    CommunicationDraftResponse,
)
from app.llm.factory import create_chat_model
from app.llm.resolver import resolve_model_name


class CommunicationDraftService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._drafter: EmailDrafter | None = None
        self._model_name: str | None = None

    def draft(self, request: CommunicationDraftRequest) -> CommunicationDraftResponse:
        draft = self._get_drafter().draft(
            communication_type=request.communication_type,
            context=request.context.model_dump(mode="json"),
        )

        return CommunicationDraftResponse(
            data=draft,
            communication_type=request.communication_type,
            provider=self._settings.llm_provider,
            model=self._get_model_name(),
        )

    def _get_drafter(self) -> EmailDrafter:
        if self._drafter is None:
            self._drafter = EmailDrafter(create_chat_model(self._settings))
        return self._drafter

    def _get_model_name(self) -> str:
        if self._model_name is None:
            self._model_name = resolve_model_name(self._settings)
        return self._model_name
