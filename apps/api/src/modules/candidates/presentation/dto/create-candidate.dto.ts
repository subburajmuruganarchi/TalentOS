import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CandidateSource } from '../../domain/enums/candidate-status.enum';

export class CreateCandidateDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(CandidateSource)
  source?: CandidateSource;
}
