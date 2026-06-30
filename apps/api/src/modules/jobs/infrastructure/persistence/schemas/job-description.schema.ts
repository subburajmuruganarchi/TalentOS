import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExtractionStatus } from '../../../domain/enums/extraction-status.enum';
import { JobDescriptionSourceType } from '../../../domain/enums/job-description-source.enum';

export type JobDescriptionDocument = HydratedDocument<JobDescription>;

@Schema({ _id: false })
export class JobDescriptionSource {
  @Prop({ type: String, required: true, enum: Object.values(JobDescriptionSourceType) })
  type!: JobDescriptionSourceType;

  @Prop({ type: Types.ObjectId, default: null })
  documentId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  linkedinUrl!: string | null;

  @Prop({ type: String, default: null })
  originalFilename!: string | null;

  @Prop({ type: String, default: null })
  mimeType!: string | null;
}

@Schema({ _id: false })
export class JobDescriptionExtraction {
  @Prop({
    type: String,
    required: true,
    enum: Object.values(ExtractionStatus),
    default: ExtractionStatus.QUEUED,
  })
  status!: ExtractionStatus;

  @Prop({ type: Types.ObjectId, default: null })
  aiAnalysisId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  processingJobId!: string | null;

  @Prop({ type: String, default: null })
  error!: string | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  reviewedBy!: Types.ObjectId | null;
}

@Schema({ timestamps: true, collection: 'job_descriptions' })
export class JobDescription {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ required: true, default: 1 })
  version!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: JobDescriptionSource, required: true })
  source!: JobDescriptionSource;

  @Prop({ type: String, default: null })
  rawText!: string | null;

  @Prop({ type: Object, default: null })
  structuredMetadata!: Record<string, unknown> | null;

  @Prop({ type: JobDescriptionExtraction, required: true })
  extraction!: JobDescriptionExtraction;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  updatedBy!: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  deletedBy!: Types.ObjectId | null;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const JobDescriptionSchema = SchemaFactory.createForClass(JobDescription);

JobDescriptionSchema.index({ organizationId: 1, jobId: 1, isDeleted: 1, version: -1 });
JobDescriptionSchema.index(
  { organizationId: 1, jobId: 1, isActive: 1 },
  { partialFilterExpression: { isActive: true, isDeleted: false } },
);
