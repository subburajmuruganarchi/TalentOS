import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CandidateSource, CandidateStatus } from '../../domain/enums/candidate-status.enum';

export class UpdateCandidateDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

  @IsOptional()
  @IsEnum(CandidateSource)
  source?: CandidateSource;
}
