export enum ResumeMimeType {
  PDF = 'application/pdf',
  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export const ALLOWED_RESUME_MIME_TYPES = Object.values(ResumeMimeType);
