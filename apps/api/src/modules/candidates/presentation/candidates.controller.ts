import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { Permission } from '../../auth/domain/enums/permission.enum';
import { Role } from '../../auth/domain/enums/role.enum';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/presentation/decorators/permissions.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { CandidatesService } from '../application/candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { ListCandidatesQueryDto } from './dto/list-candidates-query.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

const RESUME_UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@Controller('candidates')
@Roles(Role.HR_ADMIN, Role.HR_EMPLOYEE)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @RequirePermissions(Permission.CANDIDATES_WRITE)
  createCandidate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCandidateDto,
  ) {
    return this.candidatesService.createCandidate(user, dto);
  }

  @Get()
  @RequirePermissions(Permission.CANDIDATES_READ)
  listCandidates(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCandidatesQueryDto,
  ) {
    return this.candidatesService.listCandidates(user, query.status);
  }

  @Post('resumes/bulk-upload')
  @RequirePermissions(Permission.CANDIDATES_WRITE)
  @UseInterceptors(FilesInterceptor('files', 20, RESUME_UPLOAD_OPTIONS))
  bulkUploadResumes(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.candidatesService.bulkUploadResumes(user, files);
  }

  @Get(':candidateId')
  @RequirePermissions(Permission.CANDIDATES_READ)
  getCandidate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('candidateId') candidateId: string,
  ) {
    return this.candidatesService.getCandidate(user, candidateId);
  }

  @Patch(':candidateId')
  @RequirePermissions(Permission.CANDIDATES_WRITE)
  updateCandidate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.candidatesService.updateCandidate(user, candidateId, dto);
  }

  @Post(':candidateId/resumes/upload')
  @RequirePermissions(Permission.CANDIDATES_WRITE)
  @UseInterceptors(FilesInterceptor('files', 20, RESUME_UPLOAD_OPTIONS))
  uploadResumes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('candidateId') candidateId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.candidatesService.uploadResumesToCandidate(
      user,
      candidateId,
      files,
    );
  }

  @Get(':candidateId/resumes')
  @RequirePermissions(Permission.CANDIDATES_READ)
  listResumes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('candidateId') candidateId: string,
  ) {
    return this.candidatesService.listResumes(user, candidateId);
  }
}
