import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InterviewStatus } from '../../../domain/enums/interview-status.enum';
import { Interview, InterviewDocument } from '../schemas/interview.schema';

export interface ListInterviewsFilter {
  organizationId: string;
  jobId?: string;
  candidateId?: string;
  interviewerId?: string;
  status?: InterviewStatus;
}

@Injectable()
export class InterviewRepository {
  constructor(
    @InjectModel(Interview.name)
    private readonly interviewModel: Model<InterviewDocument>,
  ) {}

  create(data: Partial<Interview>): Promise<InterviewDocument> {
    return this.interviewModel.create(data);
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<InterviewDocument | null> {
    return this.interviewModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }

  findAll(filter: ListInterviewsFilter): Promise<InterviewDocument[]> {
    const query: Record<string, unknown> = {
      organizationId: new Types.ObjectId(filter.organizationId),
      isDeleted: false,
    };

    if (filter.jobId) {
      query.jobId = new Types.ObjectId(filter.jobId);
    }
    if (filter.candidateId) {
      query.candidateId = new Types.ObjectId(filter.candidateId);
    }
    if (filter.interviewerId) {
      query.interviewerId = new Types.ObjectId(filter.interviewerId);
    }
    if (filter.status) {
      query.status = filter.status;
    }

    return this.interviewModel.find(query).sort({ createdAt: -1 }).exec();
  }

  update(
    organizationId: string,
    id: string,
    data: Partial<Interview>,
  ): Promise<InterviewDocument | null> {
    return this.interviewModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          organizationId: new Types.ObjectId(organizationId),
          isDeleted: false,
        },
        { $set: data },
        { new: true },
      )
      .exec();
  }
}
