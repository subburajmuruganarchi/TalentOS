import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  JobDescriptionAiProcessor,
  JobDescriptionAiQueueRequest,
  JobDescriptionAiQueueResult,
} from '../../domain/interfaces/job-description-ai-processor.interface';

/**
 * Placeholder AI processor. Replace with FastAPI client when AI service is ready.
 */
@Injectable()
export class NoopJobDescriptionAiProcessor implements JobDescriptionAiProcessor {
  private readonly logger = new Logger(NoopJobDescriptionAiProcessor.name);

  async queueExtraction(
    request: JobDescriptionAiQueueRequest,
  ): Promise<JobDescriptionAiQueueResult> {
    const processingJobId = randomUUID();

    this.logger.log(
      `AI extraction queued [processingJobId=${processingJobId}] ` +
        `jobId=${request.jobId} jobDescriptionId=${request.jobDescriptionId} ` +
        `sourceType=${request.sourceType}`,
    );

    return { processingJobId };
  }
}
