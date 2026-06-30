import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ default: 'active', enum: ['active', 'suspended', 'trial'] })
  status!: string;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
