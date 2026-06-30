import { JobDescriptionSourceType } from '../enums/job-description-source.enum';

export interface JobDescriptionAiQueueRequest {
  organizationId: string;
  jobId: string;
  jobDescriptionId: string;
  sourceType: JobDescriptionSourceType;
  documentId?: string;
  linkedinUrl?: string;
}

export interface JobDescriptionAiQueueResult {
  processingJobId: string;
}

export interface JobDescriptionAiProcessor {
  queueExtraction(
    request: JobDescriptionAiQueueRequest,
  ): Promise<JobDescriptionAiQueueResult>;
}

export const JOB_DESCRIPTION_AI_PROCESSOR = Symbol(
  'JOB_DESCRIPTION_AI_PROCESSOR',
);
