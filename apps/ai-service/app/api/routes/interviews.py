from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, settings
from app.domain.models.interview import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    TranscriptAnalyzeRequest,
    TranscriptAnalyzeResponse,
)
from app.llm.factory import LlmConfigurationError
from app.services.interview_service import InterviewService

router = APIRouter(prefix="/interviews", tags=["Interviews"])


def get_interview_service(
    app_settings: Settings = Depends(lambda: settings),
) -> InterviewService:
    return InterviewService(app_settings)


@router.post(
    "/questions/generate",
    response_model=GenerateQuestionsResponse,
    summary="Generate tailored interview questions from JD and resume",
)
async def generate_interview_questions(
    payload: GenerateQuestionsRequest,
    service: InterviewService = Depends(get_interview_service),
) -> GenerateQuestionsResponse:
    try:
        return service.generate_questions(payload)
    except LlmConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Interview question generation failed: {exc}",
        ) from exc


@router.post(
    "/transcript/analyze",
    response_model=TranscriptAnalyzeResponse,
    summary="Process transcript and generate AI-assisted interview summary",
)
async def analyze_interview_transcript(
    payload: TranscriptAnalyzeRequest,
    service: InterviewService = Depends(get_interview_service),
) -> TranscriptAnalyzeResponse:
    try:
        return service.analyze_transcript(payload)
    except LlmConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Transcript analysis failed: {exc}",
        ) from exc
