import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PermissionEntity, PermissionDocument } from '../schemas/permission.schema';

@Injectable()
export class PermissionRepository {
  constructor(
    @InjectModel(PermissionEntity.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  upsertMany(permissions: Partial<PermissionEntity>[]): Promise<void> {
    const ops = permissions.map((permission) => ({
      updateOne: {
        filter: { code: permission.code },
        update: { $set: permission },
        upsert: true,
      },
    }));

    return this.permissionModel.bulkWrite(ops).then(() => undefined);
  }

  findAll(): Promise<PermissionDocument[]> {
    return this.permissionModel.find().exec();
  }
}
