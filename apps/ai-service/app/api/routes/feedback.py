from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, settings
from app.domain.models.feedback import FeedbackAnalyzeRequest, FeedbackAnalyzeResponse
from app.llm.factory import LlmConfigurationError
from app.services.feedback_analysis_service import FeedbackAnalysisService

router = APIRouter(prefix="/feedback", tags=["Feedback Analysis"])


def get_feedback_analysis_service(
    app_settings: Settings = Depends(lambda: settings),
) -> FeedbackAnalysisService:
    return FeedbackAnalysisService(app_settings)


@router.post(
    "/analyze",
    response_model=FeedbackAnalyzeResponse,
    summary="Analyze interviewer feedback, transcript, and candidate profile",
)
async def analyze_feedback(
    payload: FeedbackAnalyzeRequest,
    service: FeedbackAnalysisService = Depends(get_feedback_analysis_service),
) -> FeedbackAnalyzeResponse:
    try:
        return service.analyze(payload)
    except LlmConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Feedback analysis failed: {exc}",
        ) from exc
