from app.agents.feedback_analyzer import FeedbackAnalyzer
from app.config import Settings
from app.domain.models.feedback import FeedbackAnalyzeRequest, FeedbackAnalyzeResponse
from app.llm.factory import create_chat_model
from app.llm.resolver import resolve_model_name


class FeedbackAnalysisService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._analyzer: FeedbackAnalyzer | None = None
        self._model_name: str | None = None

    def analyze(self, request: FeedbackAnalyzeRequest) -> FeedbackAnalyzeResponse:
        result = self._get_analyzer().analyze(request)
        return FeedbackAnalyzeResponse(
            data=result,
            provider=self._settings.llm_provider,
            model=self._get_model_name(),
        )

    def _get_analyzer(self) -> FeedbackAnalyzer:
        if self._analyzer is None:
            self._analyzer = FeedbackAnalyzer(create_chat_model(self._settings))
        return self._analyzer

    def _get_model_name(self) -> str:
        if self._model_name is None:
            self._model_name = resolve_model_name(self._settings)
        return self._model_name
