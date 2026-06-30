import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CommunicationType } from '../../domain/enums/communication-type.enum';

export class InterviewDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  interviewDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  interviewLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingLink?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interviewerNames?: string[];

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;
}

export class CreateCommunicationDraftDto {
  @IsEnum(CommunicationType)
  type!: CommunicationType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;

  @IsOptional()
  interview?: InterviewDetailsDto;
}

export class UpdateCommunicationDraftDto {
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;
}

export class ApproveCommunicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  approvalNotes?: string;
}

export class ListCommunicationsQueryDto {
  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  candidateId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
