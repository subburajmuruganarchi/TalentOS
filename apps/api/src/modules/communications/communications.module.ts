import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import {
  Candidate,
  CandidateSchema,
} from '../candidates/infrastructure/persistence/schemas/candidate.schema';
import { Job, JobSchema } from '../jobs/infrastructure/persistence/schemas/job.schema';
import { CommunicationsService } from './application/communications.service';
import { AiCommunicationClient } from './infrastructure/ai/ai-communication.client';
import { EMAIL_SENDER } from './infrastructure/email/email-sender.interface';
import { SmtpEmailSender } from './infrastructure/email/smtp-email.sender';
import { CommunicationContextRepository } from './infrastructure/persistence/repositories/communication-context.repository';
import { CommunicationRepository } from './infrastructure/persistence/repositories/communication.repository';
import {
  Communication,
  CommunicationSchema,
} from './infrastructure/persistence/schemas/communication.schema';
import { CommunicationsController } from './presentation/communications.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Communication.name, schema: CommunicationSchema },
      { name: Job.name, schema: JobSchema },
      { name: Candidate.name, schema: CandidateSchema },
    ]),
  ],
  controllers: [CommunicationsController],
  providers: [
    CommunicationsService,
    CommunicationRepository,
    CommunicationContextRepository,
    AiCommunicationClient,
    { provide: EMAIL_SENDER, useClass: SmtpEmailSender },
  ],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
