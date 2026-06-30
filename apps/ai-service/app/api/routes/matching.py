from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, settings
from app.domain.models.matching import MatchRequest, MatchResponse
from app.embeddings.factory import EmbeddingConfigurationError
from app.llm.factory import LlmConfigurationError
from app.services.matching_service import MatchingService

router = APIRouter(prefix="/matching", tags=["Candidate Matching"])


def get_matching_service(
    app_settings: Settings = Depends(lambda: settings),
) -> MatchingService:
    return MatchingService(app_settings)


@router.post(
    "/match",
    response_model=MatchResponse,
    summary="Match candidate profile against job description",
)
async def match_candidate(
    payload: MatchRequest,
    service: MatchingService = Depends(get_matching_service),
) -> MatchResponse:
    try:
        return service.match(payload)
    except (LlmConfigurationError, EmbeddingConfigurationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Candidate matching failed: {exc}",
        ) from exc
