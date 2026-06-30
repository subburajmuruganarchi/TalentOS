import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from '../schemas/resume.schema';

@Injectable()
export class ResumeRepository {
  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
  ) {}

  create(data: Partial<Resume>): Promise<ResumeDocument> {
    return this.resumeModel.create(data);
  }

  createWithId(
    id: Types.ObjectId,
    data: Partial<Resume>,
  ): Promise<ResumeDocument> {
    return this.resumeModel.create({ ...data, _id: id });
  }

  findById(
    organizationId: string,
    resumeId: string,
  ): Promise<ResumeDocument | null> {
    return this.resumeModel
      .findOne({
        _id: new Types.ObjectId(resumeId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }

  findByCandidate(
    organizationId: string,
    candidateId: string,
  ): Promise<ResumeDocument[]> {
    return this.resumeModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        candidateId: new Types.ObjectId(candidateId),
        isDeleted: false,
      })
      .sort({ version: -1 })
      .exec();
  }

  getNextVersion(organizationId: string, candidateId: string): Promise<number> {
    return this.resumeModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        candidateId: new Types.ObjectId(candidateId),
      })
      .sort({ version: -1 })
      .exec()
      .then((latest) => (latest ? latest.version + 1 : 1));
  }

  deactivatePrimary(
    organizationId: string,
    candidateId: string,
  ): Promise<void> {
    return this.resumeModel
      .updateMany(
        {
          organizationId: new Types.ObjectId(organizationId),
          candidateId: new Types.ObjectId(candidateId),
          isPrimary: true,
          isDeleted: false,
        },
        { $set: { isPrimary: false } },
      )
      .exec()
      .then(() => undefined);
  }

  update(
    organizationId: string,
    resumeId: string,
    data: Partial<Resume>,
  ): Promise<ResumeDocument | null> {
    return this.resumeModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(resumeId),
          organizationId: new Types.ObjectId(organizationId),
          isDeleted: false,
        },
        { $set: data },
        { new: true },
      )
      .exec();
  }
}
