import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AnalyzeFeedbackDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  additionalFeedback?: string;
}

export class ListFeedbackAnalysesQueryDto {
  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  candidateId?: string;

  @IsOptional()
  @IsString()
  interviewId?: string;
}
