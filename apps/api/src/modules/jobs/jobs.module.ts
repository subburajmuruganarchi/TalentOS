import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { JobsService } from './application/jobs.service';
import { NoopJobDescriptionAiProcessor } from './infrastructure/ai/noop-job-description-ai.processor';
import { JOB_DESCRIPTION_AI_PROCESSOR } from './domain/interfaces/job-description-ai-processor.interface';
import { DocumentRepository } from './infrastructure/persistence/repositories/document.repository';
import { JobDescriptionRepository } from './infrastructure/persistence/repositories/job-description.repository';
import { JobRepository } from './infrastructure/persistence/repositories/job.repository';
import {
  DocumentEntity,
  DocumentEntitySchema,
} from './infrastructure/persistence/schemas/document.schema';
import {
  JobDescription,
  JobDescriptionSchema,
} from './infrastructure/persistence/schemas/job-description.schema';
import {
  Job,
  JobSchema,
} from './infrastructure/persistence/schemas/job.schema';
import { LocalDocumentStorage } from './infrastructure/storage/local-document.storage';
import { JobsController } from './presentation/jobs.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: JobDescription.name, schema: JobDescriptionSchema },
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
    ]),
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobRepository,
    JobDescriptionRepository,
    DocumentRepository,
    LocalDocumentStorage,
    {
      provide: JOB_DESCRIPTION_AI_PROCESSOR,
      useClass: NoopJobDescriptionAiProcessor,
    },
  ],
  exports: [JobsService, JOB_DESCRIPTION_AI_PROCESSOR],
})
export class JobsModule {}
