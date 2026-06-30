import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JobStatus } from '../../../domain/enums/job-status.enum';
import { Job, JobDocument } from '../schemas/job.schema';

@Injectable()
export class JobRepository {
  constructor(@InjectModel(Job.name) private readonly jobModel: Model<JobDocument>) {}

  create(data: Partial<Job>): Promise<JobDocument> {
    return this.jobModel.create(data);
  }

  findById(organizationId: string, jobId: string): Promise<JobDocument | null> {
    return this.jobModel
      .findOne({
        _id: new Types.ObjectId(jobId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }

  findAll(
    organizationId: string,
    filters: { status?: JobStatus } = {},
  ): Promise<JobDocument[]> {
    return this.jobModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
        ...(filters.status ? { status: filters.status } : {}),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  update(
    organizationId: string,
    jobId: string,
    data: Partial<Job>,
  ): Promise<JobDocument | null> {
    return this.jobModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(jobId),
          organizationId: new Types.ObjectId(organizationId),
          isDeleted: false,
        },
        { $set: data },
        { new: true },
      )
      .exec();
  }

  setCurrentJobDescription(
    organizationId: string,
    jobId: string,
    jobDescriptionId: Types.ObjectId,
    updatedBy: Types.ObjectId,
  ): Promise<JobDocument | null> {
    return this.update(organizationId, jobId, {
      currentJobDescriptionId: jobDescriptionId,
      updatedBy,
    });
  }
}
