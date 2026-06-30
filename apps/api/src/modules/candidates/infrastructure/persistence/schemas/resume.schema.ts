import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ResumeParseStatus } from '../../../domain/enums/resume-parse-status.enum';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ timestamps: true, collection: 'resumes' })
export class Resume {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  candidateId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  documentId!: Types.ObjectId;

  @Prop({ required: true, default: 1 })
  version!: number;

  @Prop({ default: true })
  isPrimary!: boolean;

  @Prop({ type: String, required: true })
  fileName!: string;

  @Prop({ type: String, required: true })
  mimeType!: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes!: number;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ResumeParseStatus),
    default: ResumeParseStatus.QUEUED,
  })
  parseStatus!: ResumeParseStatus;

  @Prop({ type: String, default: null })
  processingJobId!: string | null;

  @Prop({ type: Types.ObjectId, default: null })
  aiAnalysisId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  parsedAt!: Date | null;

  @Prop({ type: Types.ObjectId, required: true })
  uploadedBy!: Types.ObjectId;

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

export const ResumeSchema = SchemaFactory.createForClass(Resume);

ResumeSchema.index({ organizationId: 1, candidateId: 1, isDeleted: 1, version: -1 });
ResumeSchema.index({ organizationId: 1, candidateId: 1, isPrimary: 1 });
