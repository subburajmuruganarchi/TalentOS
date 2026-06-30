import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { Permission } from '../../auth/domain/enums/permission.enum';
import { Role } from '../../auth/domain/enums/role.enum';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/presentation/decorators/permissions.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JobsService } from '../application/jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { LinkedInJobDescriptionDto } from './dto/linkedin-job-description.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Controller('jobs')
@Roles(Role.HR_ADMIN, Role.HR_EMPLOYEE)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @RequirePermissions(Permission.JOBS_WRITE)
  createJob(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateJobDto) {
    return this.jobsService.createJob(user, dto);
  }

  @Get()
  @RequirePermissions(Permission.JOBS_READ)
  listJobs(@CurrentUser() user: AuthenticatedUser, @Query() query: ListJobsQueryDto) {
    return this.jobsService.listJobs(user, query.status);
  }

  @Get(':jobId')
  @RequirePermissions(Permission.JOBS_READ)
  getJob(@CurrentUser() user: AuthenticatedUser, @Param('jobId') jobId: string) {
    return this.jobsService.getJob(user, jobId);
  }

  @Patch(':jobId')
  @RequirePermissions(Permission.JOBS_WRITE)
  updateJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.updateJob(user, jobId, dto);
  }

  @Post(':jobId/job-description/upload')
  @RequirePermissions(Permission.JOBS_WRITE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadJobDescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.jobsService.uploadJobDescription(user, jobId, file);
  }

  @Post(':jobId/job-description/linkedin')
  @RequirePermissions(Permission.JOBS_WRITE)
  submitLinkedInJobDescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: LinkedInJobDescriptionDto,
  ) {
    return this.jobsService.submitLinkedInJobDescription(user, jobId, dto);
  }

  @Get(':jobId/job-description')
  @RequirePermissions(Permission.JOBS_READ)
  getCurrentJobDescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.getCurrentJobDescription(user, jobId);
  }

  @Get(':jobId/job-descriptions')
  @RequirePermissions(Permission.JOBS_READ)
  listJobDescriptionVersions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.jobsService.listJobDescriptionVersions(user, jobId);
  }
}
