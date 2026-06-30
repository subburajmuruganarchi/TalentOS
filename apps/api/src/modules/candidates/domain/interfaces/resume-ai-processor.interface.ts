export interface ResumeAiQueueRequest {
  organizationId: string;
  candidateId: string;
  resumeId: string;
  documentId: string;
}

export interface ResumeAiQueueResult {
  processingJobId: string;
}

export interface ResumeAiProcessor {
  queueParsing(request: ResumeAiQueueRequest): Promise<ResumeAiQueueResult>;
}

export const RESUME_AI_PROCESSOR = Symbol('RESUME_AI_PROCESSOR');
