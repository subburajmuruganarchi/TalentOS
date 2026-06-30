import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CommunicationStatus } from '../../../domain/enums/communication-status.enum';
import { CommunicationType } from '../../../domain/enums/communication-type.enum';

export type CommunicationDocument = HydratedDocument<Communication>;

@Schema({ _id: false })
export class InterviewDetails {
  @Prop({ type: String, default: null })
  interviewDate!: string | null;

  @Prop({ type: String, default: null })
  interviewLocation!: string | null;

  @Prop({ type: String, default: null })
  meetingLink!: string | null;

  @Prop({ type: [String], default: [] })
  interviewerNames!: string[];

  @Prop({ type: Number, default: null })
  durationMinutes!: number | null;
}

@Schema({ _id: false })
export class AiDraftSnapshot {
  @Prop({ type: String, required: true })
  subject!: string;

  @Prop({ type: String, required: true })
  body!: string;

  @Prop({ type: String, default: null })
  bodyHtml!: string | null;

  @Prop({ type: String, default: null })
  toneNotes!: string | null;

  @Prop({ type: String, default: null })
  llmModel!: string | null;

  @Prop({ type: String, default: null })
  llmProvider!: string | null;
}

@Schema({ _id: false })
export class CommunicationApproval {
  @Prop({ type: Date, default: null })
  requestedAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  requestedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  approvalNotes!: string | null;
}

@Schema({ _id: false })
export class CommunicationDelivery {
  @Prop({ type: Date, default: null })
  sentAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  sentBy!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  messageId!: string | null;

  @Prop({ type: String, default: null })
  error!: string | null;
}

@Schema({ timestamps: true, collection: 'communications' })
export class Communication {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  candidateId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(CommunicationType) })
  type!: CommunicationType;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(CommunicationStatus),
    default: CommunicationStatus.DRAFT,
  })
  status!: CommunicationStatus;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  recipientEmail!: string;

  @Prop({ type: String, required: true, trim: true })
  recipientName!: string;

  @Prop({ type: String, required: true, trim: true })
  subject!: string;

  @Prop({ type: String, required: true })
  body!: string;

  @Prop({ type: String, default: null })
  bodyHtml!: string | null;

  @Prop({ type: AiDraftSnapshot, required: true })
  aiDraft!: AiDraftSnapshot;

  @Prop({ type: InterviewDetails, default: null })
  interviewDetails!: InterviewDetails | null;

  @Prop({ type: CommunicationApproval, default: () => ({}) })
  approval!: CommunicationApproval;

  @Prop({ type: CommunicationDelivery, default: () => ({}) })
  delivery!: CommunicationDelivery;

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

export const CommunicationSchema = SchemaFactory.createForClass(Communication);

CommunicationSchema.index(
  { organizationId: 1, jobId: 1, candidateId: 1, isDeleted: 1, createdAt: -1 },
);
CommunicationSchema.index({ organizationId: 1, status: 1, isDeleted: 1, createdAt: -1 });
