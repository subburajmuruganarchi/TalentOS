import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  EmploymentType,
  JobStatus,
} from '../../../domain/enums/job-status.enum';

export type JobDocument = HydratedDocument<Job>;

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(JobStatus),
    default: JobStatus.DRAFT,
  })
  status!: JobStatus;

  @Prop({ type: Types.ObjectId, default: null })
  currentJobDescriptionId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  department!: string | null;

  @Prop({ type: String, trim: true, default: null })
  location!: string | null;

  @Prop({ type: String, enum: Object.values(EmploymentType), default: null })
  employmentType!: EmploymentType | null;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  updatedBy!: Types.ObjectId;

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  deletedBy!: Types.ObjectId | null;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

JobSchema.index({ organizationId: 1, isDeleted: 1, status: 1, createdAt: -1 });
JobSchema.index({ organizationId: 1, isDeleted: 1, title: 1 });
