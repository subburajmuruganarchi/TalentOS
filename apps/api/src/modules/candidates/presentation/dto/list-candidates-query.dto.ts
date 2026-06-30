import { IsEnum, IsOptional } from 'class-validator';
import { CandidateStatus } from '../../domain/enums/candidate-status.enum';

export class ListCandidatesQueryDto {
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;
}
