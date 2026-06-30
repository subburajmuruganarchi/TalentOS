import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';

@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
  ) {}

  create(data: Partial<Organization>): Promise<OrganizationDocument> {
    return this.organizationModel.create(data);
  }

  findById(id: string): Promise<OrganizationDocument | null> {
    return this.organizationModel.findOne({ _id: id, isDeleted: false }).exec();
  }

  findBySlug(slug: string): Promise<OrganizationDocument | null> {
    return this.organizationModel
      .findOne({ slug: slug.toLowerCase(), isDeleted: false })
      .exec();
  }
}
