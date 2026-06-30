import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DocumentEntity,
  DocumentEntityDocument,
} from '../schemas/document.schema';

@Injectable()
export class DocumentRepository {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntityDocument>,
  ) {}

  create(data: Partial<DocumentEntity>): Promise<DocumentEntityDocument> {
    return this.documentModel.create(data);
  }

  findById(
    organizationId: string,
    documentId: string,
  ): Promise<DocumentEntityDocument | null> {
    return this.documentModel
      .findOne({
        _id: new Types.ObjectId(documentId),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }
}
