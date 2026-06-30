import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../../../domain/enums/role.enum';
import { RoleEntity, RoleDocument } from '../schemas/role.schema';

@Injectable()
export class RoleRepository {
  constructor(@InjectModel(RoleEntity.name) private readonly roleModel: Model<RoleDocument>) {}

  upsertSystemRole(
    code: Role,
    name: string,
    permissionCodes: string[],
  ): Promise<RoleDocument> {
    return this.roleModel
      .findOneAndUpdate(
        { organizationId: null, code, isDeleted: false },
        {
          $set: {
            name,
            permissionCodes,
            isSystem: true,
          },
          $setOnInsert: {
            organizationId: null,
            code,
            isDeleted: false,
          },
        },
        { upsert: true, new: true },
      )
      .exec() as Promise<RoleDocument>;
  }

  findSystemRole(code: Role): Promise<RoleDocument | null> {
    return this.roleModel
      .findOne({ organizationId: null, code, isDeleted: false })
      .exec();
  }
}
