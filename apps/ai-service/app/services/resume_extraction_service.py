from app.agents.resume_extractor import ResumeExtractor
from app.config import Settings
from app.documents.resume_text_extractor import extract_text_from_document
from app.domain.models.resume_extraction import CandidateProfile, ResumeExtractResponse
from app.llm.factory import create_chat_model
from app.llm.resolver import resolve_model_name


class ResumeExtractionService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._extractor: ResumeExtractor | None = None
        self._model_name: str | None = None

    def extract_from_text(self, text: str) -> ResumeExtractResponse:
        profile = self._run_extraction(text)
        return ResumeExtractResponse(
            data=profile,
            provider=self._settings.llm_provider,
            model=self._get_model_name(),
            source="text",
        )

    def extract_from_document(self, content: bytes, mime_type: str) -> ResumeExtractResponse:
        text = extract_text_from_document(content, mime_type)
        profile = self._run_extraction(text)
        return ResumeExtractResponse(
            data=profile,
            provider=self._settings.llm_provider,
            model=self._get_model_name(),
            source="document",
        )

    def _run_extraction(self, text: str) -> CandidateProfile:
        extractor = self._get_extractor()
        return extractor.extract(text)

    def _get_extractor(self) -> ResumeExtractor:
        if self._extractor is None:
            llm = create_chat_model(self._settings)
            self._extractor = ResumeExtractor(llm)
        return self._extractor

    def _get_model_name(self) -> str:
        if self._model_name is None:
            self._model_name = resolve_model_name(self._settings)
        return self._model_name
