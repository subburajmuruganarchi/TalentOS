import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { EmploymentType, JobStatus } from '../../domain/enums/job-status.enum';

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
}
