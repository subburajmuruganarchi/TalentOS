import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { FeedbackHiringRecommendation } from '../../../domain/enums/feedback-hiring-recommendation.enum';
import { InterviewerRecommendation } from '../../../../interviews/domain/enums/interviewer-recommendation.enum';

export type FeedbackAnalysisDocument = HydratedDocument<FeedbackAnalysis>;

@Schema({ _id: false })
export class FeedbackInputSnapshot {
  @Prop({ type: String, required: true })
  interviewerFeedback!: string;

  @Prop({ type: String, enum: Object.values(InterviewerRecommendation), default: null })
  interviewerRecommendation!: InterviewerRecommendation | null;

  @Prop({ type: String, required: true })
  transcript!: string;

  @Prop({ type: Object, required: true })
  candidateProfile!: Record<string, unknown>;
}

@Schema({ _id: false })
export class FeedbackAnalysisData {
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  technicalScore!: number;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  communicationScore!: number;

  @Prop({ type: [String], default: [] })
  strengths!: string[];

  @Prop({ type: [String], default: [] })
  weaknesses!: string[];

  @Prop({ type: String, required: true, enum: Object.values(FeedbackHiringRecommendation) })
  hiringRecommendation!: FeedbackHiringRecommendation;

  @Prop({ type: String, required: true })
  rationale!: string;
}

@Schema({ timestamps: true, collection: 'feedback_analyses' })
export class FeedbackAnalysis {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  candidateId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  interviewId!: Types.ObjectId;

  @Prop({ type: FeedbackInputSnapshot, required: true })
  input!: FeedbackInputSnapshot;

  @Prop({ type: FeedbackAnalysisData, required: true })
  analysis!: FeedbackAnalysisData;

  @Prop({ type: String, default: null })
  llmModel!: string | null;

  @Prop({ type: String, default: null })
  llmProvider!: string | null;

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

export const FeedbackAnalysisSchema = SchemaFactory.createForClass(FeedbackAnalysis);

FeedbackAnalysisSchema.index(
  { organizationId: 1, interviewId: 1, isDeleted: 1, createdAt: -1 },
);
FeedbackAnalysisSchema.index(
  { organizationId: 1, jobId: 1, candidateId: 1, isDeleted: 1, createdAt: -1 },
);
FeedbackAnalysisSchema.index(
  { organizationId: 1, interviewId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
