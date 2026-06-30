import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Candidate,
  CandidateDocument,
} from '../../../../candidates/infrastructure/persistence/schemas/candidate.schema';
import {
  JobDescription,
  JobDescriptionDocument,
} from '../../../../jobs/infrastructure/persistence/schemas/job-description.schema';
import { Job, JobDocument } from '../../../../jobs/infrastructure/persistence/schemas/job.schema';

export interface InterviewContext {
  job: JobDocument;
  jobDescription: JobDescriptionDocument;
  candidate: CandidateDocument;
}

@Injectable()
export class InterviewContextRepository {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(JobDescription.name)
    private readonly jobDescriptionModel: Model<JobDescriptionDocument>,
    @InjectModel(Candidate.name) private readonly candidateModel: Model<CandidateDocument>,
  ) {}

  async load(organizationId: string, jobId: string, candidateId: string): Promise<InterviewContext> {
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

    let jobDescription: JobDescriptionDocument | null = null;

    if (job.currentJobDescriptionId) {
      jobDescription = await this.jobDescriptionModel
        .findOne({
          _id: job.currentJobDescriptionId,
          organizationId: new Types.ObjectId(organizationId),
          isDeleted: false,
        })
        .exec();
    }

    if (!jobDescription) {
      jobDescription = await this.jobDescriptionModel
        .findOne({
          organizationId: new Types.ObjectId(organizationId),
          jobId: job._id,
          isActive: true,
          isDeleted: false,
        })
        .exec();
    }

    if (!jobDescription) {
      throw new NotFoundException('Active job description not found for this job');
    }

    return { job, jobDescription, candidate };
  }
}
