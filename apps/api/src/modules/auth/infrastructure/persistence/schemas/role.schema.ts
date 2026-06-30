import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../../domain/enums/role.enum';

export type RoleDocument = HydratedDocument<RoleEntity>;

@Schema({ timestamps: true, collection: 'roles' })
export class RoleEntity {
  @Prop({ type: Types.ObjectId, default: null, index: true })
  organizationId!: Types.ObjectId | null;

  @Prop({ type: String, required: true, enum: Object.values(Role) })
  code!: Role;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: [String], default: [] })
  permissionCodes!: string[];

  @Prop({ default: true })
  isSystem!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(RoleEntity);

RoleSchema.index(
  { organizationId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
