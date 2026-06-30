import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommunicationStatus } from '../../../domain/enums/communication-status.enum';
import { CommunicationType } from '../../../domain/enums/communication-type.enum';
import {
  Communication,
  CommunicationDocument,
} from '../schemas/communication.schema';

export interface ListCommunicationsFilter {
  organizationId: string;
  jobId?: string;
  candidateId?: string;
  status?: CommunicationStatus;
  type?: CommunicationType;
}

@Injectable()
export class CommunicationRepository {
  constructor(
    @InjectModel(Communication.name)
    private readonly communicationModel: Model<CommunicationDocument>,
  ) {}

  create(data: Partial<Communication>): Promise<CommunicationDocument> {
    return this.communicationModel.create(data);
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<CommunicationDocument | null> {
    return this.communicationModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
        isDeleted: false,
      })
      .exec();
  }

  findAll(filter: ListCommunicationsFilter): Promise<CommunicationDocument[]> {
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
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.type) {
      query.type = filter.type;
    }

    return this.communicationModel.find(query).sort({ createdAt: -1 }).exec();
  }

  update(
    organizationId: string,
    id: string,
    data: Partial<Communication>,
  ): Promise<CommunicationDocument | null> {
    return this.communicationModel
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
