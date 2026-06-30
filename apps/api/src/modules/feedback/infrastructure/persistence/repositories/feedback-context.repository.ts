import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Candidate,
  CandidateDocument,
} from '../../../../candidates/infrastructure/persistence/schemas/candidate.schema';
import {
  Interview,
  InterviewDocument,
} from '../../../../interviews/infrastructure/persistence/schemas/interview.schema';
import { Job, JobDocument } from '../../../../jobs/infrastructure/persistence/schemas/job.schema';

export interface FeedbackAnalysisContext {
  interview: InterviewDocument;
  job: JobDocument;
  candidate: CandidateDocument;
}

@Injectable()
export class FeedbackContextRepository {
  constructor(
    @InjectModel(Interview.name) private readonly interviewModel: Model<InterviewDocument>,
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Candidate.name) private readonly candidateModel: Model<CandidateDocument>,
  ) {}

  async load(organizationId: string, interviewId: string): Promise<FeedbackAnalysisContext> {
    const interview = await this.interviewModel
      .findOne({
        _id: new Types.ObjectId(interviewId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const job = await this.jobModel
      .findOne({
        _id: interview.jobId,
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const candidate = await this.candidateModel
      .findOne({
        _id: interview.candidateId,
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return { interview, job, candidate };
  }
}
