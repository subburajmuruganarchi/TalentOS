import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../../../domain/enums/role.enum';
import {
  OrganizationMember,
  OrganizationMemberDocument,
} from '../schemas/organization-member.schema';

@Injectable()
export class OrganizationMemberRepository {
  constructor(
    @InjectModel(OrganizationMember.name)
    private readonly memberModel: Model<OrganizationMemberDocument>,
  ) {}

  create(
    data: Partial<OrganizationMember>,
  ): Promise<OrganizationMemberDocument> {
    return this.memberModel.create(data);
  }

  findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMemberDocument | null> {
    return this.memberModel
      .findOne({
        userId,
        organizationId,
        isDeleted: false,
        status: 'active',
      })
      .exec();
  }

  findActiveByUser(userId: string): Promise<OrganizationMemberDocument[]> {
    return this.memberModel
      .find({ userId, isDeleted: false, status: 'active' })
      .exec();
  }

  findByUserAndRole(
    userId: string,
    role: Role,
  ): Promise<OrganizationMemberDocument | null> {
    return this.memberModel
      .findOne({ userId, role, isDeleted: false, status: 'active' })
      .exec();
  }
}
