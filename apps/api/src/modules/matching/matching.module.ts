import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Candidate, CandidateSchema } from '../candidates/infrastructure/persistence/schemas/candidate.schema';
import {
  JobDescription,
  JobDescriptionSchema,
} from '../jobs/infrastructure/persistence/schemas/job-description.schema';
import { Job, JobSchema } from '../jobs/infrastructure/persistence/schemas/job.schema';
import { MatchingService } from './application/matching.service';
import { AiMatchingClient } from './infrastructure/ai/ai-matching.client';
import { CandidateMatchRepository } from './infrastructure/persistence/repositories/candidate-match.repository';
import { MatchContextRepository } from './infrastructure/persistence/repositories/match-context.repository';
import {
  CandidateMatch,
  CandidateMatchSchema,
} from './infrastructure/persistence/schemas/candidate-match.schema';
import { MatchingController } from './presentation/matching.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: CandidateMatch.name, schema: CandidateMatchSchema },
      { name: Job.name, schema: JobSchema },
      { name: JobDescription.name, schema: JobDescriptionSchema },
      { name: Candidate.name, schema: CandidateSchema },
    ]),
  ],
  controllers: [MatchingController],
  providers: [
    MatchingService,
    CandidateMatchRepository,
    MatchContextRepository,
    AiMatchingClient,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}
