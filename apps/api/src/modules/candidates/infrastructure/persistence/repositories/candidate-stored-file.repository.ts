import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CandidateStoredFile,
  CandidateStoredFileDocument,
} from '../schemas/candidate-stored-file.schema';

@Injectable()
export class CandidateStoredFileRepository {
  constructor(
    @InjectModel(CandidateStoredFile.name)
    private readonly fileModel: Model<CandidateStoredFileDocument>,
  ) {}

  create(
    data: Partial<CandidateStoredFile>,
  ): Promise<CandidateStoredFileDocument> {
    return this.fileModel.create(data);
  }

  findById(
    organizationId: string,
    fileId: string,
  ): Promise<CandidateStoredFileDocument | null> {
    return this.fileModel
      .findOne({
        _id: new Types.ObjectId(fileId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }
}
