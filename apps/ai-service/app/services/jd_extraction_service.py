from app.agents.jd_extractor import JobDescriptionExtractor
from app.config import Settings
from app.domain.models.jd_extraction import (
    JobDescriptionExtractResponse,
    JobDescriptionExtraction,
)
from app.llm.factory import LlmConfigurationError, create_chat_model
from app.llm.resolver import resolve_model_name


class JobDescriptionExtractionService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._extractor: JobDescriptionExtractor | None = None
        self._model_name: str | None = None

    def extract(self, text: str) -> JobDescriptionExtractResponse:
        extractor, model_name = self._get_extractor()
        data = extractor.extract(text)
        return JobDescriptionExtractResponse(
            data=data,
            provider=self._settings.llm_provider,
            model=model_name,
        )

    def _get_extractor(self) -> tuple[JobDescriptionExtractor, str]:
        if self._extractor is not None and self._model_name is not None:
            return self._extractor, self._model_name

        llm = create_chat_model(self._settings)
        model_name = resolve_model_name(self._settings)
        self._extractor = JobDescriptionExtractor(llm)
        self._model_name = model_name
        return self._extractor, model_name
