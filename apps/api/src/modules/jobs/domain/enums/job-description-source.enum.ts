export enum JobDescriptionSourceType {
  UPLOAD = 'upload',
  LINKEDIN_URL = 'linkedin_url',
}

export enum JobDescriptionMimeType {
  PDF = 'application/pdf',
  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT = 'text/plain',
}

export const ALLOWED_JOB_DESCRIPTION_MIME_TYPES = Object.values(
  JobDescriptionMimeType,
);

export const JOB_DESCRIPTION_FILE_EXTENSIONS: Record<
  JobDescriptionMimeType,
  string
> = {
  [JobDescriptionMimeType.PDF]: '.pdf',
  [JobDescriptionMimeType.DOC]: '.doc',
  [JobDescriptionMimeType.DOCX]: '.docx',
  [JobDescriptionMimeType.TXT]: '.txt',
};
