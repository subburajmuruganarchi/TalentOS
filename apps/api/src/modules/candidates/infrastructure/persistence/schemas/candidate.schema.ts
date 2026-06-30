import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  CandidateSource,
  CandidateStatus,
} from '../../../domain/enums/candidate-status.enum';
import { ResumeParseStatus } from '../../../domain/enums/resume-parse-status.enum';

export type CandidateDocument = HydratedDocument<Candidate>;

@Schema({ _id: false })
export class CandidateSkill {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, default: null })
  proficiency!: string | null;

  @Prop({ type: Number, default: null })
  years!: number | null;

  @Prop({ type: String, default: 'ai' })
  source!: string;
}

@Schema({ _id: false })
export class CandidateExperience {
  @Prop({ type: String, required: true })
  company!: string;

  @Prop({ type: String, required: true })
  role!: string;

  @Prop({ type: String, default: null })
  startDate!: string | null;

  @Prop({ type: String, default: null })
  endDate!: string | null;

  @Prop({ type: [String], default: [] })
  highlights!: string[];
}

@Schema({ _id: false })
export class CandidateProfile {
  @Prop({ type: String, default: null })
  summary!: string | null;

  @Prop({ type: Number, default: null })
  totalExperienceYears!: number | null;

  @Prop({ type: [CandidateSkill], default: [] })
  skills!: CandidateSkill[];

  @Prop({ type: [CandidateExperience], default: [] })
  experience!: CandidateExperience[];

  @Prop({ type: [Object], default: [] })
  education!: Record<string, unknown>[];

  @Prop({ type: [Object], default: [] })
  certifications!: Record<string, unknown>[];

  @Prop({ type: [Object], default: [] })
  projects!: Record<string, unknown>[];
}

@Schema({ _id: false })
export class CandidateExtraction {
  @Prop({
    type: String,
    required: true,
    enum: Object.values(ResumeParseStatus),
    default: ResumeParseStatus.QUEUED,
  })
  status!: ResumeParseStatus;

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

@Schema({ timestamps: true, collection: 'candidates' })
export class Candidate {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, default: null })
  phone!: string | null;

  @Prop({ type: String, required: true, trim: true })
  fullName!: string;

  @Prop({ type: String, required: true, enum: Object.values(CandidateSource) })
  source!: CandidateSource;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(CandidateStatus),
    default: CandidateStatus.ACTIVE,
  })
  status!: CandidateStatus;

  @Prop({ type: Types.ObjectId, default: null })
  currentResumeId!: Types.ObjectId | null;

  @Prop({ type: CandidateProfile, default: () => ({}) })
  profile!: CandidateProfile;

  @Prop({ type: CandidateExtraction, required: true })
  extraction!: CandidateExtraction;

  @Prop({ type: Types.ObjectId, default: null })
  assignedRecruiterId!: Types.ObjectId | null;

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

export const CandidateSchema = SchemaFactory.createForClass(Candidate);

CandidateSchema.index(
  { organizationId: 1, email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
CandidateSchema.index({
  organizationId: 1,
  isDeleted: 1,
  status: 1,
  createdAt: -1,
});
CandidateSchema.index({
  organizationId: 1,
  isDeleted: 1,
  assignedRecruiterId: 1,
});
