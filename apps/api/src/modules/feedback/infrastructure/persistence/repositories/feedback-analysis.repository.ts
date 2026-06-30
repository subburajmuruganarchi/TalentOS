import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FeedbackAnalysis,
  FeedbackAnalysisDocument,
} from '../schemas/feedback-analysis.schema';

export interface ListFeedbackAnalysesFilter {
  organizationId: string;
  jobId?: string;
  candidateId?: string;
  interviewId?: string;
}

@Injectable()
export class FeedbackAnalysisRepository {
  constructor(
    @InjectModel(FeedbackAnalysis.name)
    private readonly feedbackAnalysisModel: Model<FeedbackAnalysisDocument>,
  ) {}

  upsertByInterview(
    organizationId: string,
    interviewId: string,
    data: Partial<FeedbackAnalysis>,
  ): Promise<FeedbackAnalysisDocument> {
    return this.feedbackAnalysisModel
      .findOneAndUpdate(
        {
          organizationId: new Types.ObjectId(organizationId),
          interviewId: new Types.ObjectId(interviewId),
          isDeleted: false,
        },
        { $set: data },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec() as Promise<FeedbackAnalysisDocument>;
  }

  findLatestByInterview(
    organizationId: string,
    interviewId: string,
  ): Promise<FeedbackAnalysisDocument | null> {
    return this.feedbackAnalysisModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        interviewId: new Types.ObjectId(interviewId),
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  findById(organizationId: string, id: string): Promise<FeedbackAnalysisDocument | null> {
    return this.feedbackAnalysisModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }

  findAll(filter: ListFeedbackAnalysesFilter): Promise<FeedbackAnalysisDocument[]> {
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
    if (filter.interviewId) {
      query.interviewId = new Types.ObjectId(filter.interviewId);
    }

    return this.feedbackAnalysisModel.find(query).sort({ createdAt: -1 }).exec();
  }
}
