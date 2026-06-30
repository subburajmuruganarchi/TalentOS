import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../../domain/enums/role.enum';

export type OrganizationMemberDocument = HydratedDocument<OrganizationMember>;

@Schema({ timestamps: true, collection: 'organization_members' })
export class OrganizationMember {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(Role) })
  role!: Role;

  @Prop({ default: 'active', enum: ['invited', 'active', 'disabled'] })
  status!: string;

  @Prop({ type: Date, default: null })
  joinedAt!: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;
}

export const OrganizationMemberSchema = SchemaFactory.createForClass(OrganizationMember);

OrganizationMemberSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

OrganizationMemberSchema.index({ userId: 1, status: 1 });
