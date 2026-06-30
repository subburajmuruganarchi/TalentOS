import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/domain/interfaces/authenticated-user.interface';
import { Permission } from '../../auth/domain/enums/permission.enum';
import { Role } from '../../auth/domain/enums/role.enum';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/presentation/decorators/permissions.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { FeedbackAnalysisService } from '../application/feedback-analysis.service';
import { AnalyzeFeedbackDto, ListFeedbackAnalysesQueryDto } from './dto/feedback.dto';

@Controller()
@Roles(Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.INTERVIEWER)
export class FeedbackController {
  constructor(private readonly feedbackAnalysisService: FeedbackAnalysisService) {}

  @Post('interviews/:id/feedback/analyze')
  @RequirePermissions(Permission.FEEDBACK_WRITE)
  analyzeInterviewFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') interviewId: string,
    @Body() dto: AnalyzeFeedbackDto,
  ) {
    return this.feedbackAnalysisService.analyzeInterviewFeedback(user, interviewId, dto);
  }

  @Get('interviews/:id/feedback/analysis')
  @RequirePermissions(Permission.INTERVIEWS_READ)
  getByInterview(@CurrentUser() user: AuthenticatedUser, @Param('id') interviewId: string) {
    return this.feedbackAnalysisService.getByInterview(user, interviewId);
  }

  @Get('feedback/analyses')
  @RequirePermissions(Permission.INTERVIEWS_READ)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListFeedbackAnalysesQueryDto) {
    return this.feedbackAnalysisService.list(user, query);
  }

  @Get('feedback/analyses/:id')
  @RequirePermissions(Permission.INTERVIEWS_READ)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.feedbackAnalysisService.getById(user, id);
  }
}
