class DocumentExtractionError(Exception):
    """Raised when resume document text cannot be extracted."""


ALLOWED_RESUME_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

LEGACY_DOC_MIME = "application/msword"


def extract_text_from_document(content: bytes, mime_type: str) -> str:
    normalized = mime_type.lower().strip()

    if normalized == LEGACY_DOC_MIME:
        raise DocumentExtractionError(
            "Legacy .doc files are not supported for direct parsing. "
            "Convert to DOCX or PDF, or submit extracted text via /resumes/extract."
        )

    if normalized not in ALLOWED_RESUME_MIME_TYPES:
        raise DocumentExtractionError(
            f"Unsupported document type: {mime_type}. Allowed: PDF, DOCX"
        )

    if normalized == "application/pdf":
        return _extract_pdf_text(content)

    return _extract_docx_text(content)


def _extract_pdf_text(content: bytes) -> str:
    from io import BytesIO

    from pypdf import PdfReader

    reader = PdfReader(BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    text = "\n".join(pages).strip()

    if len(text) < 50:
        raise DocumentExtractionError(
            "Could not extract sufficient text from PDF. The file may be scanned or empty."
        )

    return text


def _extract_docx_text(content: bytes) -> str:
    from io import BytesIO

    from docx import Document

    document = Document(BytesIO(content))
    paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    text = "\n".join(paragraphs).strip()

    if len(text) < 50:
        raise DocumentExtractionError(
            "Could not extract sufficient text from DOCX. The file may be empty."
        )

    return text
