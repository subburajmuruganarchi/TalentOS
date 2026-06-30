from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, settings
from app.domain.models.communication import CommunicationDraftRequest, CommunicationDraftResponse
from app.llm.factory import LlmConfigurationError
from app.services.communication_draft_service import CommunicationDraftService

router = APIRouter(prefix="/communications", tags=["Communications"])


def get_communication_draft_service(
    app_settings: Settings = Depends(lambda: settings),
) -> CommunicationDraftService:
    return CommunicationDraftService(app_settings)


@router.post(
    "/draft",
    response_model=CommunicationDraftResponse,
    summary="Generate an HR-reviewed email draft (not sent automatically)",
)
async def generate_communication_draft(
    payload: CommunicationDraftRequest,
    service: CommunicationDraftService = Depends(get_communication_draft_service),
) -> CommunicationDraftResponse:
    try:
        return service.draft(payload)
    except LlmConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Email draft generation failed: {exc}",
        ) from exc
