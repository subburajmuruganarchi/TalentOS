import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InterviewQuestionType } from '../../domain/enums/interview-question-type.enum';
import { InterviewerRecommendation } from '../../domain/enums/interviewer-recommendation.enum';

export class InterviewQuestionDto {
  @IsEnum(InterviewQuestionType)
  type!: InterviewQuestionType;

  @IsString()
  @MinLength(1)
  question!: string;

  @IsString()
  @MinLength(1)
  rationale!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evaluationCriteria?: string[];

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  followUpPrompts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expectedTopics?: string[];
}

export class UpdateQuestionPackDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewQuestionDto)
  coding?: InterviewQuestionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewQuestionDto)
  technical?: InterviewQuestionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewQuestionDto)
  architecture?: InterviewQuestionDto[];
}

export class CreateInterviewDto {
  @IsOptional()
  @IsString()
  interviewerId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;
}

export class GenerateQuestionsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  codingCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  technicalCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  architectureCount?: number;
}

export class SubmitTranscriptDto {
  @IsString()
  @MinLength(50)
  @MaxLength(100000)
  transcript!: string;
}

export class SubmitDecisionDto {
  @IsEnum(InterviewerRecommendation)
  recommendation!: InterviewerRecommendation;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  overridesAiSummary?: boolean;
}

export class ListInterviewsQueryDto {
  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  candidateId?: string;

  @IsOptional()
  @IsString()
  interviewerId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
