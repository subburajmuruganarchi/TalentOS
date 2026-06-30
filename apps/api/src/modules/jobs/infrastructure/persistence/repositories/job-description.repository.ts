import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExtractionStatus } from '../../../domain/enums/extraction-status.enum';
import {
  JobDescription,
  JobDescriptionDocument,
} from '../schemas/job-description.schema';

@Injectable()
export class JobDescriptionRepository {
  constructor(
    @InjectModel(JobDescription.name)
    private readonly jobDescriptionModel: Model<JobDescriptionDocument>,
  ) {}

  create(data: Partial<JobDescription>): Promise<JobDescriptionDocument> {
    return this.jobDescriptionModel.create(data);
  }

  findById(
    organizationId: string,
    jobDescriptionId: string,
  ): Promise<JobDescriptionDocument | null> {
    return this.jobDescriptionModel
      .findOne({
        _id: new Types.ObjectId(jobDescriptionId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }

  findActiveByJob(
    organizationId: string,
    jobId: string,
  ): Promise<JobDescriptionDocument | null> {
    return this.jobDescriptionModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        jobId: new Types.ObjectId(jobId),
        isActive: true,
        isDeleted: false,
      })
      .exec();
  }

  findAllByJob(
    organizationId: string,
    jobId: string,
  ): Promise<JobDescriptionDocument[]> {
    return this.jobDescriptionModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        jobId: new Types.ObjectId(jobId),
        isDeleted: false,
      })
      .sort({ version: -1 })
      .exec();
  }

  getNextVersion(organizationId: string, jobId: string): Promise<number> {
    return this.jobDescriptionModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        jobId: new Types.ObjectId(jobId),
      })
      .sort({ version: -1 })
      .exec()
      .then((latest) => (latest ? latest.version + 1 : 1));
  }

  deactivateActiveVersions(
    organizationId: string,
    jobId: string,
  ): Promise<void> {
    return this.jobDescriptionModel
      .updateMany(
        {
          organizationId: new Types.ObjectId(organizationId),
          jobId: new Types.ObjectId(jobId),
          isActive: true,
          isDeleted: false,
        },
        { $set: { isActive: false } },
      )
      .exec()
      .then(() => undefined);
  }

  updateExtraction(
    organizationId: string,
    jobDescriptionId: string,
    extraction: Partial<JobDescription['extraction']>,
    extras: Partial<JobDescription> = {},
  ): Promise<JobDescriptionDocument | null> {
    const update: Record<string, unknown> = { ...extras };

    for (const [key, value] of Object.entries(extraction)) {
      update[`extraction.${key}`] = value;
    }

    return this.jobDescriptionModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(jobDescriptionId),
          organizationId: new Types.ObjectId(organizationId),
          isDeleted: false,
        },
        { $set: update },
        { new: true },
      )
      .exec();
  }

  updateRawText(
    organizationId: string,
    jobDescriptionId: string,
    rawText: string,
    status: ExtractionStatus,
  ): Promise<JobDescriptionDocument | null> {
    return this.jobDescriptionModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(jobDescriptionId),
          organizationId: new Types.ObjectId(organizationId),
          isDeleted: false,
        },
        {
          $set: {
            rawText,
            'extraction.status': status,
          },
        },
        { new: true },
      )
      .exec();
  }
}
