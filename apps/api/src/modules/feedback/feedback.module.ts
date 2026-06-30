import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  Candidate,
  CandidateSchema,
} from '../candidates/infrastructure/persistence/schemas/candidate.schema';
import {
  Interview,
  InterviewSchema,
} from '../interviews/infrastructure/persistence/schemas/interview.schema';
import {
  Job,
  JobSchema,
} from '../jobs/infrastructure/persistence/schemas/job.schema';
import { FeedbackAnalysisService } from './application/feedback-analysis.service';
import { AiFeedbackClient } from './infrastructure/ai/ai-feedback.client';
import { FeedbackAnalysisRepository } from './infrastructure/persistence/repositories/feedback-analysis.repository';
import { FeedbackContextRepository } from './infrastructure/persistence/repositories/feedback-context.repository';
import {
  FeedbackAnalysis,
  FeedbackAnalysisSchema,
} from './infrastructure/persistence/schemas/feedback-analysis.schema';
import { FeedbackController } from './presentation/feedback.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: FeedbackAnalysis.name, schema: FeedbackAnalysisSchema },
      { name: Interview.name, schema: InterviewSchema },
      { name: Job.name, schema: JobSchema },
      { name: Candidate.name, schema: CandidateSchema },
    ]),
  ],
  controllers: [FeedbackController],
  providers: [
    FeedbackAnalysisService,
    FeedbackAnalysisRepository,
    FeedbackContextRepository,
    AiFeedbackClient,
  ],
  exports: [FeedbackAnalysisService],
})
export class FeedbackModule {}
