import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CandidateMatch, CandidateMatchDocument } from '../schemas/candidate-match.schema';

@Injectable()
export class CandidateMatchRepository {
  constructor(
    @InjectModel(CandidateMatch.name)
    private readonly matchModel: Model<CandidateMatchDocument>,
  ) {}

  create(data: Partial<CandidateMatch>): Promise<CandidateMatchDocument> {
    return this.matchModel.create(data);
  }

  findLatest(
    organizationId: string,
    jobId: string,
    candidateId: string,
  ): Promise<CandidateMatchDocument | null> {
    return this.matchModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        jobId: new Types.ObjectId(jobId),
        candidateId: new Types.ObjectId(candidateId),
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  upsertLatest(
    organizationId: string,
    jobId: string,
    candidateId: string,
    data: Partial<CandidateMatch>,
  ): Promise<CandidateMatchDocument> {
    return this.matchModel
      .findOneAndUpdate(
        {
          organizationId: new Types.ObjectId(organizationId),
          jobId: new Types.ObjectId(jobId),
          candidateId: new Types.ObjectId(candidateId),
          isDeleted: false,
        },
        { $set: data },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec() as Promise<CandidateMatchDocument>;
  }
}
