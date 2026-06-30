import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { Permission } from '../../auth/domain/enums/permission.enum';
import { Role } from '../../auth/domain/enums/role.enum';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/presentation/decorators/permissions.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { InterviewsService } from '../application/interviews.service';
import {
  CreateInterviewDto,
  GenerateQuestionsDto,
  ListInterviewsQueryDto,
  SubmitDecisionDto,
  SubmitTranscriptDto,
  UpdateQuestionPackDto,
} from './dto/interview.dto';

@Controller()
@Roles(Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.INTERVIEWER)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('jobs/:jobId/candidates/:candidateId/interviews')
  @RequirePermissions(Permission.INTERVIEWS_WRITE)
  createInterview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: CreateInterviewDto,
  ) {
    return this.interviewsService.createInterview(
      user,
      jobId,
      candidateId,
      dto,
    );
  }

  @Get('interviews')
  @RequirePermissions(Permission.INTERVIEWS_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInterviewsQueryDto,
  ) {
    return this.interviewsService.list(user, query);
  }

  @Get('interviews/:id')
  @RequirePermissions(Permission.INTERVIEWS_READ)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.interviewsService.getById(user, id);
  }

  @Post('interviews/:id/questions/generate')
  @RequirePermissions(Permission.INTERVIEWS_WRITE)
  generateQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GenerateQuestionsDto,
  ) {
    return this.interviewsService.generateQuestions(user, id, dto);
  }

  @Patch('interviews/:id/questions')
  @RequirePermissions(Permission.INTERVIEWS_READ)
  updateQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionPackDto,
  ) {
    return this.interviewsService.updateQuestions(user, id, dto);
  }

  @Post('interviews/:id/transcript')
  submitTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitTranscriptDto,
  ) {
    return this.interviewsService.submitTranscript(user, id, dto);
  }

  @Post('interviews/:id/summary/generate')
  generateSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.interviewsService.generateSummary(user, id);
  }

  @Post('interviews/:id/decision')
  submitDecision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitDecisionDto,
  ) {
    return this.interviewsService.submitDecision(user, id, dto);
  }
}
