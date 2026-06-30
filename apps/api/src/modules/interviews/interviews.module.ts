import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  Candidate,
  CandidateSchema,
} from '../candidates/infrastructure/persistence/schemas/candidate.schema';
import {
  JobDescription,
  JobDescriptionSchema,
} from '../jobs/infrastructure/persistence/schemas/job-description.schema';
import { Job, JobSchema } from '../jobs/infrastructure/persistence/schemas/job.schema';
import { InterviewsService } from './application/interviews.service';
import { AiInterviewClient } from './infrastructure/ai/ai-interview.client';
import { InterviewContextRepository } from './infrastructure/persistence/repositories/interview-context.repository';
import { InterviewRepository } from './infrastructure/persistence/repositories/interview.repository';
import { Interview, InterviewSchema } from './infrastructure/persistence/schemas/interview.schema';
import { InterviewsController } from './presentation/interviews.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Interview.name, schema: InterviewSchema },
      { name: Job.name, schema: JobSchema },
      { name: JobDescription.name, schema: JobDescriptionSchema },
      { name: Candidate.name, schema: CandidateSchema },
    ]),
  ],
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    InterviewRepository,
    InterviewContextRepository,
    AiInterviewClient,
  ],
  exports: [InterviewsService],
})
export class InterviewsModule {}
