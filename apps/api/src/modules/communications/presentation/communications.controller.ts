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
import { CommunicationsService } from '../application/communications.service';
import {
  ApproveCommunicationDto,
  CreateCommunicationDraftDto,
  ListCommunicationsQueryDto,
  UpdateCommunicationDraftDto,
} from './dto/communication.dto';

@Controller()
@Roles(Role.HR_ADMIN, Role.HR_EMPLOYEE)
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Post('jobs/:jobId/candidates/:candidateId/communications/draft')
  @RequirePermissions(Permission.COMMUNICATIONS_READ)
  generateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
    @Param('candidateId') candidateId: string,
    @Body() dto: CreateCommunicationDraftDto,
  ) {
    return this.communicationsService.generateDraft(
      user,
      jobId,
      candidateId,
      dto,
    );
  }

  @Get('communications')
  @RequirePermissions(Permission.COMMUNICATIONS_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCommunicationsQueryDto,
  ) {
    return this.communicationsService.list(user, query);
  }

  @Get('communications/:id')
  @RequirePermissions(Permission.COMMUNICATIONS_READ)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.communicationsService.getById(user, id);
  }

  @Patch('communications/:id')
  @RequirePermissions(Permission.COMMUNICATIONS_READ)
  updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCommunicationDraftDto,
  ) {
    return this.communicationsService.updateDraft(user, id, dto);
  }

  @Post('communications/:id/request-approval')
  @RequirePermissions(Permission.COMMUNICATIONS_READ)
  requestApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.communicationsService.requestApproval(user, id);
  }

  @Post('communications/:id/approve')
  @RequirePermissions(Permission.COMMUNICATIONS_APPROVE)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ApproveCommunicationDto,
  ) {
    return this.communicationsService.approve(user, id, dto);
  }

  @Post('communications/:id/send')
  @RequirePermissions(Permission.COMMUNICATIONS_APPROVE)
  send(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.communicationsService.send(user, id);
  }

  @Post('communications/:id/cancel')
  @RequirePermissions(Permission.COMMUNICATIONS_READ)
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.communicationsService.cancel(user, id);
  }
}
