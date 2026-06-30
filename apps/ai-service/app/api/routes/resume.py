from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.config import Settings, settings
from app.documents.resume_text_extractor import DocumentExtractionError
from app.domain.models.resume_extraction import ResumeExtractResponse, ResumeExtractTextRequest
from app.llm.factory import LlmConfigurationError
from app.services.resume_extraction_service import ResumeExtractionService

router = APIRouter(prefix="/resumes", tags=["Resume Analysis"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


def get_resume_extraction_service(
    app_settings: Settings = Depends(lambda: settings),
) -> ResumeExtractionService:
    return ResumeExtractionService(app_settings)


@router.post(
    "/extract",
    response_model=ResumeExtractResponse,
    summary="Extract candidate profile from resume text",
)
async def extract_resume_from_text(
    payload: ResumeExtractTextRequest,
    service: ResumeExtractionService = Depends(get_resume_extraction_service),
) -> ResumeExtractResponse:
    try:
        return service.extract_from_text(payload.text)
    except LlmConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resume extraction failed: {exc}",
        ) from exc


@router.post(
    "/extract/document",
    response_model=ResumeExtractResponse,
    summary="Extract candidate profile from resume document (PDF, DOCX)",
)
async def extract_resume_from_document(
    file: UploadFile = File(...),
    service: ResumeExtractionService = Depends(get_resume_extraction_service),
) -> ResumeExtractResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds maximum size of 10MB",
        )

    mime_type = file.content_type or "application/octet-stream"

    try:
        return service.extract_from_document(content, mime_type)
    except DocumentExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except LlmConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Resume extraction failed: {exc}",
        ) from exc
