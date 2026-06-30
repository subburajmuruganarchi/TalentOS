import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CandidateStatus } from '../../../domain/enums/candidate-status.enum';
import { Candidate, CandidateDocument } from '../schemas/candidate.schema';

@Injectable()
export class CandidateRepository {
  constructor(
    @InjectModel(Candidate.name)
    private readonly candidateModel: Model<CandidateDocument>,
  ) {}

  create(data: Partial<Candidate>): Promise<CandidateDocument> {
    return this.candidateModel.create(data);
  }

  findById(
    organizationId: string,
    candidateId: string,
  ): Promise<CandidateDocument | null> {
    return this.candidateModel
      .findOne({
        _id: new Types.ObjectId(candidateId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }

  findAll(
    organizationId: string,
    filters: { status?: CandidateStatus } = {},
  ): Promise<CandidateDocument[]> {
    return this.candidateModel
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
    candidateId: string,
    data: Partial<Candidate>,
  ): Promise<CandidateDocument | null> {
    return this.candidateModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(candidateId),
          organizationId: new Types.ObjectId(organizationId),
          isDeleted: false,
        },
        { $set: data },
        { new: true },
      )
      .exec();
  }

  setCurrentResume(
    organizationId: string,
    candidateId: string,
    resumeId: Types.ObjectId,
    updatedBy: Types.ObjectId,
  ): Promise<CandidateDocument | null> {
    return this.update(organizationId, candidateId, {
      currentResumeId: resumeId,
      updatedBy,
    });
  }
}
