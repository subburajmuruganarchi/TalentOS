import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { EmploymentType } from '../../domain/enums/job-status.enum';

export class CreateJobDto {
  @IsString()
  @MinLength(2)
  title!: string;

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
