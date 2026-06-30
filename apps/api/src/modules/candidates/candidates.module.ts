import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CandidatesService } from './application/candidates.service';
import { RESUME_AI_PROCESSOR } from './domain/interfaces/resume-ai-processor.interface';
import { NoopResumeAiProcessor } from './infrastructure/ai/noop-resume-ai.processor';
import { CandidateRepository } from './infrastructure/persistence/repositories/candidate.repository';
import { CandidateStoredFileRepository } from './infrastructure/persistence/repositories/candidate-stored-file.repository';
import { ResumeRepository } from './infrastructure/persistence/repositories/resume.repository';
import {
  CandidateStoredFile,
  CandidateStoredFileSchema,
} from './infrastructure/persistence/schemas/candidate-stored-file.schema';
import {
  Candidate,
  CandidateSchema,
} from './infrastructure/persistence/schemas/candidate.schema';
import {
  Resume,
  ResumeSchema,
} from './infrastructure/persistence/schemas/resume.schema';
import { ResumeFileStorage } from './infrastructure/storage/resume-file.storage';
import { CandidatesController } from './presentation/candidates.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: CandidateStoredFile.name, schema: CandidateStoredFileSchema },
    ]),
  ],
  controllers: [CandidatesController],
  providers: [
    CandidatesService,
    CandidateRepository,
    ResumeRepository,
    CandidateStoredFileRepository,
    ResumeFileStorage,
    {
      provide: RESUME_AI_PROCESSOR,
      useClass: NoopResumeAiProcessor,
    },
  ],
  exports: [CandidatesService, RESUME_AI_PROCESSOR],
})
export class CandidatesModule {}
