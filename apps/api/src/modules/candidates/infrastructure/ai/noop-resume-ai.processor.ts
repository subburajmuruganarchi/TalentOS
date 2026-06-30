import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ResumeAiProcessor,
  ResumeAiQueueRequest,
  ResumeAiQueueResult,
} from '../../domain/interfaces/resume-ai-processor.interface';

/**
 * Placeholder resume AI processor. Replace with FastAPI client when AI service is ready.
 */
@Injectable()
export class NoopResumeAiProcessor implements ResumeAiProcessor {
  private readonly logger = new Logger(NoopResumeAiProcessor.name);

  async queueParsing(request: ResumeAiQueueRequest): Promise<ResumeAiQueueResult> {
    const processingJobId = randomUUID();

    this.logger.log(
      `Resume parsing queued [processingJobId=${processingJobId}] ` +
        `candidateId=${request.candidateId} resumeId=${request.resumeId}`,
    );

    return { processingJobId };
  }
}
