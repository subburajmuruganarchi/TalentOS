import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Candidate,
  CandidateDocument,
} from '../../../../candidates/infrastructure/persistence/schemas/candidate.schema';
import { Job, JobDocument } from '../../../../jobs/infrastructure/persistence/schemas/job.schema';

export interface CommunicationContext {
  job: JobDocument;
  candidate: CandidateDocument;
}

@Injectable()
export class CommunicationContextRepository {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Candidate.name) private readonly candidateModel: Model<CandidateDocument>,
  ) {}

  async load(organizationId: string, jobId: string, candidateId: string): Promise<CommunicationContext> {
    const job = await this.jobModel
      .findOne({
        _id: new Types.ObjectId(jobId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const candidate = await this.candidateModel
      .findOne({
        _id: new Types.ObjectId(candidateId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return { job, candidate };
  }
}
