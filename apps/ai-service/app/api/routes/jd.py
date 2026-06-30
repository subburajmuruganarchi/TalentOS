from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, settings
from app.domain.models.jd_extraction import (
    JobDescriptionExtractRequest,
    JobDescriptionExtractResponse,
)
from app.llm.factory import LlmConfigurationError
from app.services.jd_extraction_service import JobDescriptionExtractionService

router = APIRouter(prefix="/jd", tags=["Job Description"])


def get_jd_extraction_service(
    app_settings: Settings = Depends(lambda: settings),
) -> JobDescriptionExtractionService:
    return JobDescriptionExtractionService(app_settings)


@router.post(
    "/extract",
    response_model=JobDescriptionExtractResponse,
    summary="Extract structured data from job description text",
)
async def extract_job_description(
    payload: JobDescriptionExtractRequest,
    service: JobDescriptionExtractionService = Depends(get_jd_extraction_service),
) -> JobDescriptionExtractResponse:
    try:
        return service.extract(payload.text)
    except LlmConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Job description extraction failed: {exc}",
        ) from exc
