import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AiInterviewRecommendation } from '../../../domain/enums/interviewer-recommendation.enum';
import { InterviewQuestionType } from '../../../domain/enums/interview-question-type.enum';
import { InterviewStatus } from '../../../domain/enums/interview-status.enum';
import { InterviewerRecommendation } from '../../../domain/enums/interviewer-recommendation.enum';

export type InterviewDocument = HydratedDocument<Interview>;

@Schema({ _id: false })
export class InterviewQuestion {
  @Prop({
    type: String,
    required: true,
    enum: Object.values(InterviewQuestionType),
  })
  type!: InterviewQuestionType;

  @Prop({ type: String, required: true })
  question!: string;

  @Prop({ type: String, required: true })
  rationale!: string;

  @Prop({ type: [String], default: [] })
  evaluationCriteria!: string[];

  @Prop({ type: String, default: 'medium' })
  difficulty!: string;

  @Prop({ type: [String], default: [] })
  followUpPrompts!: string[];

  @Prop({ type: [String], default: [] })
  expectedTopics!: string[];
}

@Schema({ _id: false })
export class InterviewQuestionPack {
  @Prop({ type: [InterviewQuestion], default: [] })
  coding!: InterviewQuestion[];

  @Prop({ type: [InterviewQuestion], default: [] })
  technical!: InterviewQuestion[];

  @Prop({ type: [InterviewQuestion], default: [] })
  architecture!: InterviewQuestion[];
}

@Schema({ _id: false })
export class AiQuestionSnapshot {
  @Prop({ type: InterviewQuestionPack, required: true })
  pack!: InterviewQuestionPack;

  @Prop({ type: String, default: null })
  llmModel!: string | null;

  @Prop({ type: String, default: null })
  llmProvider!: string | null;

  @Prop({ type: Date, default: null })
  generatedAt!: Date | null;
}

@Schema({ _id: false })
export class SpeakerSegment {
  @Prop({ type: String, required: true })
  speaker!: string;

  @Prop({ type: String, required: true })
  text!: string;
}

@Schema({ _id: false })
export class ProcessedTranscriptData {
  @Prop({ type: String, required: true })
  cleanedText!: string;

  @Prop({ type: [SpeakerSegment], default: [] })
  speakerSegments!: SpeakerSegment[];

  @Prop({ type: [String], default: [] })
  keyTopics!: string[];

  @Prop({ type: Date, default: null })
  processedAt!: Date | null;
}

@Schema({ _id: false })
export class QuestionResponseNote {
  @Prop({ type: String, required: true })
  topic!: string;

  @Prop({ type: String, required: true })
  summary!: string;

  @Prop({ type: String, default: null })
  evidence!: string | null;
}

@Schema({ _id: false })
export class AiInterviewSummary {
  @Prop({ type: String, required: true })
  overallAssessment!: string;

  @Prop({ type: [String], default: [] })
  strengths!: string[];

  @Prop({ type: [String], default: [] })
  concerns!: string[];

  @Prop({ type: [String], default: [] })
  skillSignals!: string[];

  @Prop({ type: [QuestionResponseNote], default: [] })
  questionResponses!: QuestionResponseNote[];

  @Prop({ type: [String], default: [] })
  suggestedFollowUps!: string[];

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AiInterviewRecommendation),
  })
  aiRecommendation!: AiInterviewRecommendation;

  @Prop({ type: String, required: true })
  rationale!: string;

  @Prop({ type: String, default: null })
  llmModel!: string | null;

  @Prop({ type: Date, default: null })
  generatedAt!: Date | null;
}

@Schema({ _id: false })
export class InterviewerDecision {
  @Prop({
    type: String,
    enum: Object.values(InterviewerRecommendation),
    default: null,
  })
  recommendation!: InterviewerRecommendation | null;

  @Prop({ type: String, default: null })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, default: null })
  decidedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  decidedAt!: Date | null;

  @Prop({ default: false })
  overridesAiSummary!: boolean;
}

@Schema({ timestamps: true, collection: 'interviews' })
export class Interview {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  candidateId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  interviewerId!: Types.ObjectId | null;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(InterviewStatus),
    default: InterviewStatus.SCHEDULED,
  })
  status!: InterviewStatus;

  @Prop({ type: Date, default: null })
  scheduledAt!: Date | null;

  @Prop({ type: Number, default: 60 })
  durationMinutes!: number;

  @Prop({ type: AiQuestionSnapshot, default: null })
  aiQuestions!: AiQuestionSnapshot | null;

  @Prop({ type: InterviewQuestionPack, default: () => ({}) })
  questionPack!: InterviewQuestionPack;

  @Prop({ type: String, default: null })
  rawTranscript!: string | null;

  @Prop({ type: ProcessedTranscriptData, default: null })
  processedTranscript!: ProcessedTranscriptData | null;

  @Prop({ type: AiInterviewSummary, default: null })
  aiSummary!: AiInterviewSummary | null;

  @Prop({ type: InterviewerDecision, default: () => ({}) })
  interviewerDecision!: InterviewerDecision;

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

export const InterviewSchema = SchemaFactory.createForClass(Interview);

InterviewSchema.index({
  organizationId: 1,
  jobId: 1,
  candidateId: 1,
  isDeleted: 1,
  createdAt: -1,
});
InterviewSchema.index({
  organizationId: 1,
  interviewerId: 1,
  status: 1,
  isDeleted: 1,
});
