import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MatchRecommendation } from '../../../domain/enums/match-recommendation.enum';

export type CandidateMatchDocument = HydratedDocument<CandidateMatch>;

@Schema({ _id: false })
export class SkillComparison {
  @Prop({ type: String, required: true })
  skill!: string;

  @Prop({ default: true })
  required!: boolean;

  @Prop({ type: String, default: null })
  candidateLevel!: string | null;

  @Prop({ type: String, default: null })
  gap!: string | null;
}

@Schema({ _id: false })
export class MatchResultData {
  @Prop({ required: true })
  matchPercentage!: number;

  @Prop({ type: [SkillComparison], default: [] })
  skillComparison!: SkillComparison[];

  @Prop({ type: [String], default: [] })
  strengths!: string[];

  @Prop({ type: [String], default: [] })
  missingSkills!: string[];

  @Prop({
    type: String,
    required: true,
    enum: Object.values(MatchRecommendation),
  })
  recommendation!: MatchRecommendation;

  @Prop({ type: String, required: true })
  aiRationale!: string;

  @Prop({ type: Number, required: true })
  vectorSimilarity!: number;
}

@Schema({ _id: false })
export class HumanMatchReview {
  @Prop({ default: false })
  overridden!: boolean;

  @Prop({
    type: String,
    enum: Object.values(MatchRecommendation),
    default: null,
  })
  recommendation!: MatchRecommendation | null;

  @Prop({ type: String, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;
}

@Schema({ timestamps: true, collection: 'candidate_matches' })
export class CandidateMatch {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  candidateId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  jobDescriptionId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  resumeId!: Types.ObjectId | null;

  @Prop({ type: MatchResultData, required: true })
  match!: MatchResultData;

  @Prop({ type: String, default: null })
  embeddingModel!: string | null;

  @Prop({ type: String, default: null })
  llmModel!: string | null;

  @Prop({ type: HumanMatchReview, default: () => ({ overridden: false }) })
  humanReview!: HumanMatchReview;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  updatedBy!: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CandidateMatchSchema =
  SchemaFactory.createForClass(CandidateMatch);

CandidateMatchSchema.index({
  organizationId: 1,
  jobId: 1,
  candidateId: 1,
  isDeleted: 1,
  createdAt: -1,
});
CandidateMatchSchema.index(
  { organizationId: 1, jobId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
