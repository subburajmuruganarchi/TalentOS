from app.agents.match_analyzer import MatchAnalyzer
from app.config import Settings
from app.domain.models.matching import MatchAnalysis, MatchRequest, MatchResponse
from app.embeddings.factory import create_embeddings
from app.embeddings.text_builder import build_candidate_profile_text, build_job_description_text
from app.llm.factory import create_chat_model
from app.llm.resolver import resolve_model_name
from app.vector.vector_repository import VectorRepository
from langchain_core.embeddings import Embeddings


class MatchingService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._embeddings: Embeddings | None = None
        self._vector_repo: VectorRepository | None = None
        self._analyzer: MatchAnalyzer | None = None
        self._model_name: str | None = None

    def match(self, request: MatchRequest) -> MatchResponse:
        job_text = build_job_description_text(request.job_description)
        candidate_text = build_candidate_profile_text(request.candidate_profile)

        vector_repo = self._get_vector_repo()
        vector_repo.index_entity(
            organization_id=request.organization_id,
            entity_type="job_description",
            entity_id=request.job_id,
            text=job_text,
            job_id=request.job_id,
        )
        vector_repo.index_entity(
            organization_id=request.organization_id,
            entity_type="candidate_profile",
            entity_id=request.candidate_id,
            text=candidate_text,
            candidate_id=request.candidate_id,
        )

        vector_similarity, job_context, candidate_context = vector_repo.compute_similarity(
            request.organization_id,
            request.job_id,
            request.candidate_id,
        )

        analysis = self._get_analyzer().analyze(
            job_payload=request.job_description.model_dump(mode="json"),
            candidate_payload=request.candidate_profile.model_dump(mode="json"),
            vector_similarity=vector_similarity,
            job_context=job_context,
            candidate_context=candidate_context,
        )

        analysis = self._calibrate_percentage(analysis, vector_similarity)

        return MatchResponse(
            data=analysis,
            vector_similarity=round(vector_similarity, 4),
            provider=self._settings.llm_provider,
            model=self._get_model_name(),
            embedding_model=self._settings.embedding_model,
        )

    def _get_analyzer(self) -> MatchAnalyzer:
        if self._analyzer is None:
            self._analyzer = MatchAnalyzer(create_chat_model(self._settings))
        return self._analyzer

    def _get_model_name(self) -> str:
        if self._model_name is None:
            self._model_name = resolve_model_name(self._settings)
        return self._model_name

    def _get_embeddings(self) -> Embeddings:
        if self._embeddings is None:
            self._embeddings = create_embeddings(self._settings)
        return self._embeddings

    def _get_vector_repo(self) -> VectorRepository:
        if self._vector_repo is None:
            self._vector_repo = VectorRepository(self._settings, self._get_embeddings())
        return self._vector_repo

    @staticmethod
    def _calibrate_percentage(analysis: MatchAnalysis, vector_similarity: float) -> MatchAnalysis:
        """Blend LLM score with vector similarity for stable production scoring."""
        vector_pct = vector_similarity * 100
        blended = round((analysis.match_percentage * 0.65) + (vector_pct * 0.35), 1)
        analysis.match_percentage = max(0.0, min(100.0, blended))
        return analysis
