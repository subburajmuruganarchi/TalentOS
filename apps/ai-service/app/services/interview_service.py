from app.agents.interview_question_generator import InterviewQuestionGenerator
from app.agents.interview_summarizer import InterviewSummarizer
from app.config import Settings
from app.domain.models.interview import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    TranscriptAnalyzeRequest,
    TranscriptAnalyzeResponse,
)
from app.llm.factory import create_chat_model
from app.llm.resolver import resolve_model_name


class InterviewService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._question_generator: InterviewQuestionGenerator | None = None
        self._summarizer: InterviewSummarizer | None = None
        self._model_name: str | None = None

    def generate_questions(self, request: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
        pack = self._get_question_generator().generate(request)
        return GenerateQuestionsResponse(
            data=pack,
            provider=self._settings.llm_provider,
            model=self._get_model_name(),
        )

    def analyze_transcript(self, request: TranscriptAnalyzeRequest) -> TranscriptAnalyzeResponse:
        result = self._get_summarizer().analyze(request)
        return TranscriptAnalyzeResponse(
            processed=result.processed,
            summary=result.summary,
            provider=self._settings.llm_provider,
            model=self._get_model_name(),
        )

    def _get_question_generator(self) -> InterviewQuestionGenerator:
        if self._question_generator is None:
            self._question_generator = InterviewQuestionGenerator(create_chat_model(self._settings))
        return self._question_generator

    def _get_summarizer(self) -> InterviewSummarizer:
        if self._summarizer is None:
            self._summarizer = InterviewSummarizer(create_chat_model(self._settings))
        return self._summarizer

    def _get_model_name(self) -> str:
        if self._model_name is None:
            self._model_name = resolve_model_name(self._settings)
        return self._model_name
